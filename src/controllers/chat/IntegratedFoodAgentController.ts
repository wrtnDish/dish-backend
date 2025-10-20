import { FullnessLevel } from "../../api/structures/food/IFoodRecommendation";
import { ILatLng } from "../../api/structures/weather/IWeatherForecast";
import { RestaurantProvider } from "../../providers/restaurant/RestaurantProvider";
import { FoodEvaluationService } from "../../services/FoodEvaluationService";
import { FoodScoringService } from "../../services/FoodScoringService";
import { FoodService } from "../../services/FoodService";
import { IntegratedScoringService } from "../../services/IntegratedScoringService";
import { WeatherAnalysisService } from "../../services/WeatherAnalysisService";
import { WeatherService } from "../../services/WeatherService";
import { UserHistoryService } from "../../services/UserHistoryService";
import { FOOD_CATEGORIES } from "../../data/foodCategories";

/**
 * 통합 음식 카테고리 추천 AI 에이전트 컨트롤러
 * 
 * @description
 * 사용자의 배고픔 정도, 현재 위치 날씨, 요일별 선호도를 종합하여 
 * 상위 2개 음식 카테고리를 추천하는 컨트롤러입니다.
 * 
 * **카테고리 추천 플로우:**
 * 1. 사용자: "음식 추천해줘" → askForFoodRecommendation() 호출
 * 2. 사용자: 포만감(1~3)과 지역 응답 → getCategoryRecommendation() 호출
 * 3. 시스템: 통합 점수 계산 → 상위 2개 카테고리 선정 → 카테고리와 이유 반환
 * 
 * **추가 기능:**
 * - 음식점 정보까지 원하는 경우: getSmartFoodRecommendation() 사용 가능
 * 
 * **점수 계산 기준:**
 * - 현재 지역 날씨 기반 가산점 (날씨-음식 적합도)
 * - 요일별 사용자 선호도 가산점 (user_history.json 분석)
 * - 배고픔 정도에 따른 음식량 적합도
 */
export class IntegratedFoodAgentController {  
  private readonly foodService: FoodService;
  private readonly foodEvaluationService: FoodEvaluationService;
  private readonly weatherService: WeatherService;
  private readonly integratedScoringService: IntegratedScoringService;
  
  constructor() {
    // 서비스 인스턴스들을 직접 생성 (의존성 주입 대신)
    this.weatherService = new WeatherService();
    this.foodService = new FoodService();
    this.integratedScoringService = new IntegratedScoringService();
    
    const weatherAnalysisService = new WeatherAnalysisService();
    const foodScoringService = new FoodScoringService();
    
    this.foodEvaluationService = new FoodEvaluationService(
      this.weatherService,
      weatherAnalysisService,
      foodScoringService
    );
  }

  /**
   * 음식 추천해줘 - 메인 음식 추천 진입점 (통계 포함)
   *
   * @description
   * 사용자가 "음식 추천해줘", "맛집 추천해줘" 등으로 요청할 때 호출되는 메서드입니다.
   * 먼저 오늘 요일의 과거 선택 통계를 보여주고, 배고픔 정도(1~3)와 현재 위치를 질문합니다.
   *
   * @returns 배고픔 정도와 위치 질문 정보 + 오늘 요일 선택 통계
   */
  public async askForFoodRecommendation(): Promise<{
    question: string;
    hungerLevels: Array<{
      level: FullnessLevel;
      description: string;
      emoji: string;
    }>;
    locationGuide: string;
    instruction: string;
    examples: string[];
    todayStats?: string;  // 통계 추가
  }> {
    // 오늘 요일 선택 통계 조회
    const userHistoryService = new UserHistoryService();
    const stats = await userHistoryService.getDaySelectionStats();

    let statsMessage = '';
    if (stats.totalSelections > 0) {
      const medalEmojis = ['🥇', '🥈', '🥉'];
      const topThree = stats.topSelections.slice(0, 3).map((item, index) => {
        let categoryInfo = `${medalEmojis[index]} ${item.category} (${item.count}번)`;

        // 음식점 정보가 있으면 추가
        if (item.restaurants.length > 0) {
          const restaurantNames = item.restaurants.slice(0, 2).map(r => r.name).join(', ');
          categoryInfo += ` - ${restaurantNames}`;
        }

        return categoryInfo;
      }).join('\n     ');

      statsMessage = `\n\n📊 참고로, 지금까지 **${stats.dayKo}**에는\n     ${topThree}\n     을/를 선택하셨어요!`;
    }

    return {
      question: `🍽️ 맞춤 음식을 추천해드리기 위해 배고픔 정도와 현재 위치를 알려주세요!${statsMessage}`,
      hungerLevels: [
        {
          level: 3,
          description: "매우 배고픔",
          emoji: "😋"
        },
        {
          level: 2,
          description: "보통",
          emoji: "🤔"
        },
        {
          level: 1,
          description: "배부름",
          emoji: "😊"
        }
      ],
      locationGuide: "📍 현재 계신 지역명을 말씀해주세요 (예: 서울, 대전, 강남구, 홍대 등)",
      instruction: "배고픔 정도(1-3)와 위치를 함께 알려주세요.",
      examples: [
        "3, 대전",
        "2, 강남구",
        "1, 홍대",
        "매우 배고픔, 서울"
      ],
      todayStats: statsMessage
    };
  }

  /**
   * 포만감과 지역 정보 분석 및 상위 2개 카테고리 + 맛집 추천
   * 
   * @description
   * 사용자가 포만감과 지역 정보를 제공했을 때 이를 분석하여 상위 2개 음식 카테고리를 추천하고,
   * 각 카테고리에 맞는 맛집 정보를 Naver API를 통해 함께 제공합니다.
   * "3, 대전 한밭대", "배고픔 2, 서울 강남" 등의 형태의 답변을 처리합니다.
   * 
   * @param input 사용자의 포만감과 지역 정보
   * @returns 통합 점수 기반 상위 2개 카테고리 추천 및 맛집 정보
   */
  public async recommendFoodFromInput(input: {
    /**
     * 사용자 입력 메시지 (예: "3, 대전 한밭대", "배고픔 2, 서울 강남")
     */
    userMessage: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      selectedCategories: {
        first: string;
        second: string;
        reasons: string[];
      };
      restaurants: {
        category1: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
        category2: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
      };
      analysis: {
        weather: string;
        dayOfWeek: string;
        hungerLevel: string;
        locationInfo: string;
        scoringDetails: string;
      };
    };
    error?: string;
  }> {
    try {
      // 사용자 입력에서 포만감과 지역 정보 추출
      const parsedInput = this.parseUserInput(input.userMessage);
      
      if (!parsedInput.hungerLevel) {
        return {
          success: false,
          message: "포만감 정도를 파악할 수 없습니다. 1~3 사이의 숫자로 다시 알려주세요.",
          error: "포만감 정보 누락"
        };
      }

      // 추출된 정보로 카테고리 추천 실행
      return await this.getCategoryRecommendation({
        hungerLevel: parsedInput.hungerLevel,
        locationName: parsedInput.location || "대전"
      });

    } catch (error) {
      console.error("포만감 입력 처리 중 오류:", error);
      return {
        success: false,
        message: "입력을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      };
    }
  }

  /**
   * 상위 2개 카테고리 추천 및 맛집 정보 제공
   * 
   * @description
   * 배고픔 정도, 현재 위치 날씨, 요일별 선호도를 종합하여 상위 2개 카테고리를 추천하고,
   * 각 카테고리에 맞는 맛집 정보를 Naver API를 통해 함께 제공합니다.
   * 
   * @param request 카테고리 추천 요청 정보
   * @returns 상위 2개 카테고리 추천 및 맛집 정보
   */
  public async getCategoryRecommendation(request: {
    /**
     * 배고픔 정도 (1: 배부름, 2: 보통, 3: 매우 배고픔)
     */
    hungerLevel: FullnessLevel;
    
    /**
     * 현재 위치 (위경도 또는 지역명)
     */
    location?: ILatLng;
    
    /**
     * 지역명 (위경도 대신 사용 가능)
     */
    locationName?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      selectedCategories: {
        first: string;
        second: string;
        reasons: string[];
      };
      restaurants: {
        category1: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
        category2: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
      };
      analysis: {
        weather: string;
        dayOfWeek: string;
        hungerLevel: string;
        locationInfo: string;
        scoringDetails: string;
      };
    };
    error?: string;
  }> {
    try {
      // 기본 설정
      const currentDay = this.getCurrentDay();
      const searchLocation = request.locationName || "대전";
      const defaultLocation: ILatLng = { lat: 36.3518, lng: 127.3005 };
      const location = request.location || defaultLocation;

      console.log(`🍽️ 카테고리 추천 및 맛집 검색 시작: ${searchLocation}, 배고픔 레벨 ${request.hungerLevel}, ${currentDay}`);

      // 1. 현재 날씨 조건 조회
      const weatherConditions = await this.getWeatherConditions(location);
      console.log("📊 날씨 조회 완료:", weatherConditions);

      // 2. 통합 점수 계산으로 상위 2개 카테고리 선정
      const topCategories = await this.integratedScoringService.calculateIntegratedScore(
        weatherConditions,
        request.hungerLevel,
        currentDay
      );

      if (topCategories.length < 2) {
        throw new Error("상위 2개 카테고리 선정 실패");
      }

      console.log(`🎯 선정된 카테고리: 1위 ${topCategories[0].nameKo} (${topCategories[0].score}점), 2위 ${topCategories[1].nameKo} (${topCategories[1].score}점)`);

      // 3. 각 카테고리별로 Naver API 검색 (병렬 처리)
      const [category1Result, category2Result] = await Promise.all([
        this.searchRestaurants(searchLocation, topCategories[0].nameKo),
        this.searchRestaurants(searchLocation, topCategories[1].nameKo)
      ]);

      console.log(`🔍 맛집 검색 완료: ${topCategories[0].nameKo} ${category1Result.total}개, ${topCategories[1].nameKo} ${category2Result.total}개`);

      // 4. 결과 포맷팅
      const hungerDesc = request.hungerLevel === 3 ? "매우 배고픔" :
                        request.hungerLevel === 2 ? "보통" : "배부름";
      const weatherDesc = weatherConditions.temperature === 'hot' ? '더운 날씨' :
                         weatherConditions.temperature === 'cold' ? '추운 날씨' : '온화한 날씨';

      // Markdown 포맷으로 풍부한 응답 생성
      const formatRestaurant = (r: any, index: number) => {
        const title = r.title.replace(/<[^>]*>/g, ''); // HTML 태그 제거
        const phone = r.telephone || '정보없음';
        return `${index + 1}. **${title}**\n   - 📍 ${r.address}\n   - 📞 ${phone}`;
      };

      const successMessage = `
## 음식 추천 결과

### 분석 정보
- **지역**: ${searchLocation}
- **날씨**: ${weatherDesc} (🌡️ ${weatherConditions.actualTemperature || 'N/A'}°C, 💧 ${weatherConditions.actualHumidity || 'N/A'}%)
- **배고픔**: ${hungerDesc} (${request.hungerLevel}/3)
- **요일**: ${this.getKoreanDay(currentDay)}

---

### 추천 카테고리 Top 2

#### 🥇 1위: ${topCategories[0].nameKo}
**선정 이유**: ${topCategories[0].reason}
**점수**: ${topCategories[0].score.toFixed(1)}점

**추천 맛집** (총 ${category1Result.total}곳)
${category1Result.restaurants.slice(0, 3).map(formatRestaurant).join('\n\n')}

---

#### 🥈 2위: ${topCategories[1].nameKo}
**선정 이유**: ${topCategories[1].reason}
**점수**: ${topCategories[1].score.toFixed(1)}점

**추천 맛집** (총 ${category2Result.total}곳)
${category2Result.restaurants.slice(0, 3).map(formatRestaurant).join('\n\n')}

---

💡 **Tip**: 실제로 드신 음식을 나중에 알려주시면 더 정확한 추천을 해드릴 수 있어요!
`.trim();

      return {
        success: true,
        message: successMessage,
        data: {
          selectedCategories: {
            first: topCategories[0].nameKo,
            second: topCategories[1].nameKo,
            reasons: [
              `1위 ${topCategories[0].nameKo}: ${topCategories[0].reason}`,
              `2위 ${topCategories[1].nameKo}: ${topCategories[1].reason}`
            ]
          },
          restaurants: {
            category1: {
              categoryName: topCategories[0].nameKo,
              searchQuery: category1Result.query,
              restaurants: category1Result.restaurants || [],
              totalCount: category1Result.total || 0
            },
            category2: {
              categoryName: topCategories[1].nameKo,
              searchQuery: category2Result.query,
              restaurants: category2Result.restaurants || [],
              totalCount: category2Result.total || 0
            }
          },
          analysis: {
            weather: `${weatherDesc} (기온: ${weatherConditions.actualTemperature || 'N/A'}°C, 습도: ${weatherConditions.actualHumidity || 'N/A'}%)`,
            dayOfWeek: `${currentDay} (${this.getKoreanDay(currentDay)})`,
            hungerLevel: `${request.hungerLevel}/3 (${hungerDesc})`,
            locationInfo: `${searchLocation} 지역`,
            scoringDetails: `날씨 적합도, ${this.getKoreanDay(currentDay)} 요일별 선호도, 배고픔 정도를 종합하여 계산`
          }
        }
      };

    } catch (error) {
      console.error("❌ 카테고리 추천 및 맛집 검색 중 오류 발생:", error);
      
      return {
        success: false,
        message: "죄송합니다. 일시적인 오류가 발생했습니다. 기본 추천을 제공해드립니다.",
        data: {
          selectedCategories: {
            first: "한식",
            second: "치킨",
            reasons: ["기본 추천 (오류 발생)"]
          },
          restaurants: {
            category1: {
              categoryName: "한식",
              searchQuery: `${request.locationName || "대전"} 한식 맛집`,
              restaurants: [],
              totalCount: 0
            },
            category2: {
              categoryName: "치킨",
              searchQuery: `${request.locationName || "대전"} 치킨 맛집`,
              restaurants: [],
              totalCount: 0
            }
          },
          analysis: {
            weather: "날씨 정보 없음",
            dayOfWeek: this.getCurrentDay(),
            hungerLevel: `${request.hungerLevel}/3`,
            locationInfo: request.locationName || "대전",
            scoringDetails: "오류로 인한 기본 추천"
          }
        },
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      };
    }
  }

  /**
   * 사용자 입력에서 포만감과 지역 정보를 추출합니다.
   */
  private parseUserInput(userMessage: string): {
    hungerLevel: FullnessLevel | null;
    location: string | null;
  } {
    const message = userMessage.toLowerCase().trim();
    
    let hungerLevel: FullnessLevel | null = null;
    let location: string | null = null;

    // 포만감 레벨 추출 (숫자 우선)
    const numberMatch = message.match(/\b([1-3])\b/);
    if (numberMatch) {
      hungerLevel = parseInt(numberMatch[1]) as FullnessLevel;
    } else {
      // 텍스트 기반 포만감 추출
      if (message.includes('매우 배고') || message.includes('많이 배고') || message.includes('완전 배고')) {
        hungerLevel = 3;
      } else if (message.includes('보통') || message.includes('적당')) {
        hungerLevel = 2;
      } else if (message.includes('배부') || message.includes('포만') || message.includes('안 배고')) {
        hungerLevel = 1;
      }
    }

    // 콤마로 구분된 형태 처리 (예: "3, 대전 한밭대")
    const commaMatch = message.match(/([1-3])\s*,\s*(.+)/);
    if (commaMatch) {
      hungerLevel = parseInt(commaMatch[1]) as FullnessLevel;
      const locationPart = commaMatch[2].trim();
      
      // 정확한 위치 정보를 그대로 사용 (전체 문자열)
      location = locationPart;
      
      console.log(`📍 콤마 구분 위치 추출: "${locationPart}"`);
    } else {
      // 콤마가 없는 경우 - 지역 키워드로 추출
      location = this.extractLocationFromText(userMessage);
    }

    console.log(`📝 입력 분석: "${userMessage}" → 포만감: ${hungerLevel}, 지역: ${location}`);
    
    return { hungerLevel, location };
  }

  /**
   * 텍스트에서 지역 정보를 추출합니다.
   */
  private extractLocationFromText(text: string): string | null {
    const message = text.toLowerCase().trim();
    
    // 더 상세한 지역 키워드 (구체적인 지역을 우선 검색)
    const specificLocationKeywords = [
      // 서울 구체적 지역
      '강남구', '서초구', '송파구', '강동구', '마포구', '용산구', '종로구', '중구', '성동구', '광진구',
      '동대문구', '중랑구', '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '양천구',
      '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
      // 서울 동네/지역
      '홍대', '신촌', '명동', '강남', '건대', '잠실', '신림', '이태원', '압구정', '청담',
      '여의도', '목동', '신사', '논현', '삼성동', '역삼동', '선릉', '판교',
      
      // 대전 구체적 지역
      '대전 유성구', '대전 서구', '대전 중구', '대전 동구', '대전 대덕구',
      '유성구', '서구', '중구', '동구', '대덕구',
      '한밭대', '충남대', '카이스트', '둔산', '노은', '관평', '신성동', '도안',
      
      // 부산 구체적 지역
      '부산 해운대구', '부산 남구', '부산 동구', '부산 서구', '부산 중구', '부산 영도구',
      '해운대', '광안리', '남포동', '센텀시티',
      
      // 기타 시/도
      '인천', '대구', '광주', '울산', '세종',
      '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주도',
      
      // 기타 도시
      '수원', '성남', '안양', '고양', '용인', '부천', '청주', '천안', '전주', '포항', '창원', '진주'
    ];
    
    // 일반 지역 키워드 (기본 시/도명)
    const generalLocationKeywords = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'];
    
    // 1. 먼저 구체적인 지역을 찾음
    for (const keyword of specificLocationKeywords) {
      if (message.includes(keyword.toLowerCase()) || text.includes(keyword)) {
        console.log(`🎯 구체적 지역 발견: "${keyword}"`);
        return keyword;
      }
    }
    
    // 2. 구체적인 지역을 찾지 못하면 일반 지역 검색
    for (const keyword of generalLocationKeywords) {
      if (message.includes(keyword.toLowerCase()) || text.includes(keyword)) {
        console.log(`📍 일반 지역 발견: "${keyword}"`);
        return keyword;
      }
    }
    
    // 3. 아무것도 찾지 못하면 null 반환
    return null;
  }

  /**
   * 스마트 음식 추천 - 통합 점수 기반 최종 추천
   * 
   * @description
   * 배고픔 정도, 현재 위치 날씨, 요일별 선호도를 종합하여 상위 2개 카테고리를 선정하고
   * Naver API를 통해 실제 맛집 정보를 제공합니다.
   * 
   * @param request 스마트 추천 요청 정보
   * @returns 통합 분석 결과와 맛집 추천
   */
  public async getSmartFoodRecommendation(request: {
    /**
     * 배고픔 정도 (1: 배부름, 2: 보통, 3: 매우 배고픔)
     */
    hungerLevel: FullnessLevel;
    
    /**
     * 현재 위치 (위경도 또는 지역명)
     */
    location?: ILatLng;
    
    /**
     * 지역명 (위경도 대신 사용 가능)
     */
    locationName?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      selectedCategories: {
        first: string;
        second: string;
        reasons: string[];
      };
      restaurants: {
        category1: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
        category2: {
          categoryName: string;
          searchQuery: string;
          restaurants: any[];
          totalCount: number;
        };
      };
      analysis: {
        weather: string;
        dayOfWeek: string;
        hungerLevel: string;
        scoringDetails: string;
      };
    };
    error?: string;
  }> {
    try {
      // 기본 설정
      const currentDay = this.getCurrentDay();
      const searchLocation = request.locationName || "대전";
      const defaultLocation: ILatLng = { lat: 36.3518, lng: 127.3005 };
      const location = request.location || defaultLocation;

      console.log(`🍽️ 음식 추천 시작: ${searchLocation}, 배고픔 레벨 ${request.hungerLevel}, ${currentDay}`);

      // 1. 현재 날씨 조건 조회
      const weatherConditions = await this.getWeatherConditions(location);
      console.log("📊 날씨 조회 완료:", weatherConditions);

      // 2. 통합 점수 계산으로 상위 2개 카테고리 선정
      const topCategories = await this.integratedScoringService.calculateIntegratedScore(
        weatherConditions,
        request.hungerLevel,
        currentDay
      );

      if (topCategories.length < 2) {
        throw new Error("상위 2개 카테고리 선정 실패");
      }

      console.log(`🎯 선정된 카테고리: 1위 ${topCategories[0].nameKo} (${topCategories[0].score}점), 2위 ${topCategories[1].nameKo} (${topCategories[1].score}점)`);

      // 3. 각 카테고리별로 Naver API 검색
      const [category1Result, category2Result] = await Promise.all([
        this.searchRestaurants(searchLocation, topCategories[0].nameKo),
        this.searchRestaurants(searchLocation, topCategories[1].nameKo)
      ]);

      console.log(`🔍 맛집 검색 완료: ${topCategories[0].nameKo} ${category1Result.total}개, ${topCategories[1].nameKo} ${category2Result.total}개`);

      // 4. 결과 포맷팅
      const hungerDesc = request.hungerLevel === 3 ? "매우 배고픔" :
                        request.hungerLevel === 2 ? "보통" : "배부름";
      const weatherDesc = weatherConditions.temperature === 'hot' ? '더운 날씨' :
                         weatherConditions.temperature === 'cold' ? '추운 날씨' : '온화한 날씨';

      // Markdown 포맷으로 풍부한 응답 생성
      const formatRestaurant = (r: any, index: number) => {
        const title = r.title.replace(/<[^>]*>/g, ''); // HTML 태그 제거
        const phone = r.telephone || '정보없음';
        return `${index + 1}. **${title}**\n   - 📍 ${r.address}\n   - 📞 ${phone}`;
      };

      const successMessage = `
## 🍽️ 음식 추천 결과

### 📊 분석 정보
- **지역**: ${searchLocation}
- **날씨**: ${weatherDesc} (🌡️ ${weatherConditions.actualTemperature || 'N/A'}°C, 💧 ${weatherConditions.actualHumidity || 'N/A'}%)
- **배고픔**: ${hungerDesc} (${request.hungerLevel}/3)
- **요일**: ${this.getKoreanDay(currentDay)}

---

### 🎯 추천 카테고리 Top 2

#### 🥇 1위: ${topCategories[0].nameKo}
**선정 이유**: ${topCategories[0].reason}
**점수**: ${topCategories[0].score.toFixed(1)}점

**추천 맛집** (총 ${category1Result.total}곳)
${category1Result.restaurants.slice(0, 3).map(formatRestaurant).join('\n\n')}

---

#### 🥈 2위: ${topCategories[1].nameKo}
**선정 이유**: ${topCategories[1].reason}
**점수**: ${topCategories[1].score.toFixed(1)}점

**추천 맛집** (총 ${category2Result.total}곳)
${category2Result.restaurants.slice(0, 3).map(formatRestaurant).join('\n\n')}

---

💡 **Tip**: 실제로 드신 음식을 나중에 알려주시면 더 정확한 추천을 해드릴 수 있어요!
`.trim();

      return {
        success: true,
        message: successMessage,
        data: {
          selectedCategories: {
            first: topCategories[0].nameKo,
            second: topCategories[1].nameKo,
            reasons: [
              `1위 ${topCategories[0].nameKo}: ${topCategories[0].reason}`,
              `2위 ${topCategories[1].nameKo}: ${topCategories[1].reason}`
            ]
          },
          restaurants: {
            category1: {
              categoryName: topCategories[0].nameKo,
              searchQuery: category1Result.query,
              restaurants: category1Result.restaurants || [],
              totalCount: category1Result.total || 0
            },
            category2: {
              categoryName: topCategories[1].nameKo,
              searchQuery: category2Result.query,
              restaurants: category2Result.restaurants || [],
              totalCount: category2Result.total || 0
            }
          },
          analysis: {
            weather: `${weatherDesc} (기온: ${weatherConditions.actualTemperature || 'N/A'}°C, 습도: ${weatherConditions.actualHumidity || 'N/A'}%)`,
            dayOfWeek: `${currentDay} (${this.getKoreanDay(currentDay)})`,
            hungerLevel: `${request.hungerLevel}/3 (${hungerDesc})`,
            scoringDetails: `날씨 적합도, ${this.getKoreanDay(currentDay)} 요일별 선호도, 배고픔 정도를 종합하여 계산`
          }
        }
      };

    } catch (error) {
      console.error("❌ 스마트 음식 추천 중 오류 발생:", error);
      
      return {
        success: false,
        message: "죄송합니다. 일시적인 오류가 발생했습니다. 기본 추천을 제공해드립니다.",
        data: {
          selectedCategories: {
            first: "한식",
            second: "치킨",
            reasons: ["기본 추천 (오류 발생)"]
          },
          restaurants: {
            category1: {
              categoryName: "한식",
              searchQuery: `${request.locationName || "대전"} 한식 맛집`,
              restaurants: [],
              totalCount: 0
            },
            category2: {
              categoryName: "치킨",
              searchQuery: `${request.locationName || "대전"} 치킨 맛집`,
              restaurants: [],
              totalCount: 0
            }
          },
          analysis: {
            weather: "날씨 정보 없음",
            dayOfWeek: this.getCurrentDay(),
            hungerLevel: `${request.hungerLevel}/3`,
            scoringDetails: "오류로 인한 기본 추천"
          }
        },
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      };
    }
  }

  /**
   * 현재 요일을 영어로 반환합니다.
   */
  private getCurrentDay(): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = new Date();
    return days[today.getDay()];
  }

  /**
   * 영어 요일을 한글로 변환합니다.
   */
  private getKoreanDay(englishDay: string): string {
    const dayMap: { [key: string]: string } = {
      "Sunday": "일요일",
      "Monday": "월요일", 
      "Tuesday": "화요일",
      "Wednesday": "수요일",
      "Thursday": "목요일",
      "Friday": "금요일",
      "Saturday": "토요일"
    };
    return dayMap[englishDay] || englishDay;
  }

  /**
   * 날씨 조건을 조회합니다.
   */
  private async getWeatherConditions(location: ILatLng) {
    try {
      const weatherEvaluation = await this.foodEvaluationService.evaluateFoodByWeather({
        location: location
      });
      return weatherEvaluation.weather;
    } catch (error) {
      console.warn("날씨 조회 실패, 기본값 사용:", error);
      // 기본 날씨 조건 반환 (타입 명시)
      return {
        temperature: "moderate" as const,
        humidity: "moderate" as const,
        actualTemperature: 20,
        actualHumidity: 50
      };
    }
  }

  /**
   * Naver API를 사용하여 맛집을 검색합니다.
   * 
   * @description
   * 사용자가 입력한 구체적인 위치 정보를 활용하여 더 정확한 맛집 검색을 수행합니다.
   * "대전 한밭대" → "대전 한밭대 근처 한식 맛집" 형태로 검색
   */
  private async searchRestaurants(location: string, category: string): Promise<any> {
    try {
      // 더 구체적인 검색 쿼리 생성
      let searchQuery: string;
      
      // 구체적인 지역이 포함된 경우 (예: "대전 한밭대", "서울 강남구")
      if (location.includes(' ') || location.length > 3) {
        searchQuery = `${location} 근처 ${category} 맛집`;
      } else {
        // 일반적인 시/도명인 경우 (예: "대전", "서울")
        searchQuery = `${location} ${category} 맛집`;
      }
      
      console.log(`🔍 맛집 검색 쿼리: "${searchQuery}"`);
      
      const result = await RestaurantProvider.search({
        query: searchQuery,
        display: 5 // 상위 5개 맛집만 조회
      });
      
      return {
        query: searchQuery,
        category: category,
        restaurants: result.items || [],
        total: result.total || 0
      };
    } catch (error) {
      console.error(`${category} 맛집 검색 실패:`, error);
      
      // 오류 발생 시 기본 검색 쿼리로 재시도
      const fallbackQuery = `${location} ${category}`;
      console.log(`🔄 재시도 검색 쿼리: "${fallbackQuery}"`);
      
      try {
        const fallbackResult = await RestaurantProvider.search({
          query: fallbackQuery,
          display: 5
        });
        
        return {
          query: fallbackQuery,
          category: category,
          restaurants: fallbackResult.items || [],
          total: fallbackResult.total || 0,
          note: "기본 검색으로 재시도됨"
        };
      } catch (fallbackError) {
        console.error(`${category} 재시도 검색도 실패:`, fallbackError);
        return {
          query: `${location} ${category} 맛집`,
          category: category,
          restaurants: [],
          total: 0,
          error: "검색 실패"
        };
      }
    }
  }



  /**
   * 레거시 호환성을 위한 기존 메소드 (숨김 처리)
   * @hidden
   * @deprecated 이 메소드는 더 이상 사용하지 않습니다. askForFoodRecommendation을 사용하세요.
   */
  private async askForFullnessOnly(): Promise<{
    question: string;
    fullnessOptions: Array<{
      level: FullnessLevel;
      description: string;
      emoji: string;
    }>;
    instruction: string;
  }> {
    // 새로운 통합 메소드로 리다이렉트
    const newFormat = await this.askForFoodRecommendation();
    return {
      question: newFormat.question,
      fullnessOptions: newFormat.hungerLevels,
      instruction: newFormat.instruction
    };
  }

  /**
   * 레거시 메소드 (숨김 처리)
   * @hidden
   * @deprecated 이 메소드는 더 이상 사용하지 않습니다. askForFoodRecommendation을 사용하세요.
   */
  private async askForHungerAndLocation(): Promise<any> {
    return await this.askForFoodRecommendation();
  }

  /**
   * 특정 요일의 음식 선택 통계를 조회합니다.
   *
   * @description
   * 사용자가 특정 요일에 과거에 선택했던 음식 카테고리 및 음식점의 통계를 보여줍니다.
   * 요일을 지정하지 않으면 오늘 요일의 통계를 보여줍니다.
   *
   * @example
   * 사용자: "월요일에 내가 주로 뭐 먹었어?"
   * 사용자: "화요일 통계 보여줘"
   * 사용자: "내 선택 통계 보여줘" (오늘 요일)
   */
  public async getTodayFoodStatistics(input: {
    /**
     * 조회할 요일 (선택사항)
     * 예: "월요일", "화요일", "Monday", "Tuesday" 등
     * 지정하지 않으면 오늘 요일
     */
    dayOfWeek?: string;
  } = {}): Promise<{
    success: boolean;
    message: string;
    data?: {
      day: string;
      dayKo: string;
      totalSelections: number;
      topSelections: Array<{
        category: string;
        count: number;
        percentage: number;
      }>;
    };
  }> {
    try {
      const userHistoryService = new UserHistoryService();

      // 요일 파싱 (한글 → 영어 변환)
      let targetDay: string | undefined = undefined;
      if (input?.dayOfWeek) {
        targetDay = this.parseDayOfWeek(input.dayOfWeek);
      }

      const stats = await userHistoryService.getDaySelectionStats(targetDay);

      if (stats.totalSelections === 0) {
        return {
          success: true,
          message: `아직 ${stats.dayKo}에 선택하신 음식 기록이 없습니다. 추천을 받고 실제로 드신 음식을 알려주시면 통계가 쌓여요!`,
          data: stats
        };
      }

      // Markdown 포맷으로 통계 메시지 생성
      const medalEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const statsLines = stats.topSelections.map((item, index) => {
        let line = `${medalEmojis[index]} **${item.category}** - ${item.count}번 (${item.percentage}%)`;

        // 자주 방문한 음식점 정보 추가
        if (item.restaurants.length > 0) {
          const restaurantList = item.restaurants.map(r => `${r.name} (${r.count}번)`).join(', ');
          line += `\n   - 자주 방문: ${restaurantList}`;
        }

        return line;
      }).join('\n\n');

      const message = `
## 📊 ${stats.dayKo} 음식 선택 통계

지금까지 **${stats.dayKo}**에 총 **${stats.totalSelections}번** 음식을 선택하셨네요!

### 선택 Top ${stats.topSelections.length}
${statsLines}

이 정보를 참고해서 새로운 추천을 받아보세요! 🍽️
`.trim();

      return {
        success: true,
        message,
        data: stats
      };

    } catch (error) {
      console.error("❌ 통계 조회 중 오류:", error);
      return {
        success: false,
        message: "통계를 불러오는 중 오류가 발생했습니다."
      };
    }
  }

  /**
   * 사용자가 실제로 선택한 음식을 히스토리에 저장합니다.
   *
   * @description
   * 추천 후 사용자가 실제로 선택한 음식/맛집을 히스토리에 저장하여
   * 향후 더 정확한 추천을 제공합니다.
   *
   * @example
   * 사용자: "아까 추천받은 거 치킨 먹었어"
   * 사용자: "한식 골랐어요"
   * 사용자: "교촌치킨 대전 둔산점에서 먹었어"
   */
  public async confirmUserSelection(input: {
    /**
     * 실제로 선택한 음식 카테고리 또는 맛집 이름
     * 예: "치킨", "한식", "교촌치킨", "신전떡볶이"
     */
    selectedFood: string;

    /**
     * 선택한 음식이 속한 카테고리 (선택사항)
     * AI가 자동으로 추론 가능
     */
    category?: string;

    /**
     * 실제로 방문한 음식점 이름 (선택사항)
     * 예: "교촌치킨 대전 둔산점", "홍콩반점 강남점"
     */
    restaurantName?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const userHistoryService = new UserHistoryService();

      // 음식 이름에서 카테고리 자동 매칭 (category가 없는 경우)
      let finalCategory = input.category;
      if (!finalCategory) {
        finalCategory = this.matchFoodCategory(input.selectedFood);
      }

      // 히스토리에 저장
      await userHistoryService.saveUserSelection({
        selectedFood: input.selectedFood,
        category: finalCategory,
        restaurantName: input.restaurantName
      });

      const restaurantPart = input.restaurantName ? ` (${input.restaurantName})` : '';
      return {
        success: true,
        message: `${input.selectedFood}${restaurantPart} 선택을 기록했습니다! 다음 추천 때 이 정보를 활용할게요 😊`
      };

    } catch (error) {
      console.error("❌ 사용자 선택 저장 중 오류:", error);
      return {
        success: false,
        message: "선택 저장 중 오류가 발생했습니다. 다시 시도해주세요."
      };
    }
  }

  /**
   * 음식 이름에서 카테고리를 추론합니다.
   */
  private matchFoodCategory(foodName: string): string | undefined {
    const lowerFood = foodName.toLowerCase();

    // FOOD_CATEGORIES를 순회하며 키워드 매칭
    for (const category of FOOD_CATEGORIES) {
      if (
        lowerFood.includes(category.nameKo.toLowerCase()) ||
        lowerFood.includes(category.name.toLowerCase())
      ) {
        return category.nameKo;
      }
    }

    return undefined;
  }

  /**
   * 요일 문자열을 파싱하여 영어 요일명으로 변환합니다.
   *
   * @param dayString 요일 문자열 (예: "월요일", "화요일", "Monday", "Tuesday")
   * @returns 영어 요일명 (예: "Monday", "Tuesday") 또는 undefined
   */
  private parseDayOfWeek(dayString: string): string | undefined {
    const lowerDay = dayString.toLowerCase().trim();

    // 한글 요일 매핑
    const koreanDayMap: { [key: string]: string } = {
      "일요일": "Sunday",
      "월요일": "Monday",
      "화요일": "Tuesday",
      "수요일": "Wednesday",
      "목요일": "Thursday",
      "금요일": "Friday",
      "토요일": "Saturday",
      "일": "Sunday",
      "월": "Monday",
      "화": "Tuesday",
      "수": "Wednesday",
      "목": "Thursday",
      "금": "Friday",
      "토": "Saturday"
    };

    // 영어 요일 매핑 (소문자)
    const englishDayMap: { [key: string]: string } = {
      "sunday": "Sunday",
      "monday": "Monday",
      "tuesday": "Tuesday",
      "wednesday": "Wednesday",
      "thursday": "Thursday",
      "friday": "Friday",
      "saturday": "Saturday",
      "sun": "Sunday",
      "mon": "Monday",
      "tue": "Tuesday",
      "wed": "Wednesday",
      "thu": "Thursday",
      "fri": "Friday",
      "sat": "Saturday"
    };

    // 한글 매핑 시도
    for (const [korKey, engValue] of Object.entries(koreanDayMap)) {
      if (dayString.includes(korKey)) {
        return engValue;
      }
    }

    // 영어 매핑 시도
    if (englishDayMap[lowerDay]) {
      return englishDayMap[lowerDay];
    }

    // 매칭 실패 시 undefined 반환
    console.warn(`요일 파싱 실패: "${dayString}"`);
    return undefined;
  }

}

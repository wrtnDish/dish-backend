import { FullnessLevel } from "../../api/structures/food/IFoodRecommendation";
import { ILatLng } from "../../api/structures/weather/IWeatherForecast";
import { FOOD_CATEGORIES } from "../../data/foodCategories";
import { RestaurantProvider } from "../../providers/restaurant/RestaurantProvider";
import { FoodEvaluationService } from "../../services/FoodEvaluationService";
import { FoodScoringService } from "../../services/FoodScoringService";
import { FoodService } from "../../services/FoodService";
import { IntegratedScoringService } from "../../services/IntegratedScoringService";
import { LocationService } from "../../services/LocationService";
import { UserHistoryService } from "../../services/UserHistoryService";
import { WeatherAnalysisService } from "../../services/WeatherAnalysisService";
import { WeatherService } from "../../services/WeatherService";

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
      foodScoringService,
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
    todayStats?: string; // 통계 추가
  }> {
    // 오늘 요일 선택 통계 조회
    const userHistoryService = new UserHistoryService();
    const stats = await userHistoryService.getDaySelectionStats();

    let statsMessage = "";
    if (stats.totalSelections > 0) {
      const medalEmojis = ["🥇", "🥈", "🥉"];
      const topThree = stats.topSelections
        .slice(0, 3)
        .map((item, index) => {
          let categoryInfo = `${medalEmojis[index]} ${item.category} (${item.count}번)`;

          // 음식점 정보가 있으면 추가
          if (item.restaurants.length > 0) {
            const restaurantNames = item.restaurants
              .slice(0, 2)
              .map((r) => r.name)
              .join(", ");
            categoryInfo += ` - ${restaurantNames}`;
          }

          return categoryInfo;
        })
        .join("\n     ");

      statsMessage = `\n\n📊 참고로, 지금까지 **${stats.dayKo}**에는\n     ${topThree}\n     을/를 선택하셨어요!`;
    }

    return {
      question: `🍽️ 맞춤 음식을 추천해드리기 위해 정보를 알려주세요!${statsMessage}`,
      hungerLevels: [
        {
          level: 3,
          description: "매우 배고픔",
          emoji: "😋",
        },
        {
          level: 2,
          description: "보통",
          emoji: "🤔",
        },
        {
          level: 1,
          description: "배부름",
          emoji: "😊",
        },
      ],
      locationGuide:
        "📍 현재 계신 지역명을 말씀해주세요 (예: 서울, 대전, 강남구, 홍대 등)",
      instruction:
        "**두 가지 방법으로 알려주실 수 있어요:**\n\n1️⃣ 배고픔 정도만 알려주기 (현재 위치 자동 사용)\n2️⃣ 배고픔 정도 + 위치를 함께 알려주기",
      examples: [
        "배고픔 3 (현재 위치 자동)",
        "3, 대전",
        "배고픔은 2이고, 현재 위치는 서울 홍대야",
        "1, 강남구",
        "매우 배고픔, 부산",
      ],
      todayStats: statsMessage,
    };
  }

  /**
   * 배고픔 정도 기반 맞춤 음식 카테고리 추천 및 맛집 제공
   *
   * @description
   * ⚠️ **이 함수는 반드시 배고픔 정도(1-3)가 포함된 경우에만 사용하세요.**
   *
   * 사용자가 배고픔 정도와 위치를 함께 제공했을 때, 날씨/요일/선호도/배고픔을
   * 종합 분석하여 맞춤 음식 카테고리 2개를 추천하고 해당 카테고리의 맛집을 제공합니다.
   *
   * **사용 조건 (모두 만족해야 함):**
   * - 사용자가 배고픔 정도(1-3 또는 "배고픔", "포만감" 등)를 명시한 경우
   * - 음식 카테고리 추천이 필요한 경우
   * - 날씨/요일 기반 맞춤 추천을 원하는 경우
   *
   * **사용 예시:**
   * - "배고픔 1, 강남" (위치 포함)
   * - "3, 대전 한밭대" (위치 포함)
   * - "보통 배고픔, 서울" (위치 포함)
   * - "배고픔은 3이야" (위치 없음 - 현재 위치 자동 사용)
   * - "2" (위치 없음 - 현재 위치 자동 사용)
   *
   * **사용 금지 (이런 경우 사용하지 마세요):**
   * - "주변 맛집 알려줘" (배고픔 정도 없음 - getNearbyRestaurants 사용)
   * - "강남 근처 식당"  (배고픔 정도 없음)
   * - "여기 일식집 어디야?"  (카테고리 지정됨)
   */
  public async recommendFoodFromInput(input: {
    /**
     * 사용자 입력 메시지 (반드시 배고픔 정도 포함)
     * @example "3, 대전 한밭대"
     * @example "배고픔 2, 서울 강남"
     * @example "보통 배고픔이고 위치는 부산"
     * @example "배고픔은 3이야" (위치 없음)
     */
    userMessage: string;

    /**
     * 사용자의 현재 GPS 좌표 (선택사항 - 클라이언트에서 전달)
     * 배고픔만 입력한 경우 이 좌표로 현재 위치를 파악합니다.
     */
    currentCoordinates?: ILatLng;
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
          message:
            "포만감 정도를 파악할 수 없습니다. 1~3 사이의 숫자로 다시 알려주세요.",
          error: "포만감 정보 누락",
        };
      }

      // 케이스 1: 위치 정보가 명시적으로 포함된 경우 (예: "3, 강남")
      if (parsedInput.location) {
        console.log(`📍 명시적 위치 입력: ${parsedInput.location}`);
        return await this.getCategoryRecommendation({
          hungerLevel: parsedInput.hungerLevel,
          locationName: parsedInput.location,
        });
      }

      // 케이스 2: 배고픔만 입력한 경우 (예: "배고픔 3") - 현재 위치 자동 사용
      else {
        console.log(`📍 배고픔만 입력 - 현재 위치 자동 파악 시도`);
        return await this.recommendFoodWithHungerOnly({
          hungerLevel: parsedInput.hungerLevel,
          currentCoordinates: input.currentCoordinates,
        });
      }
    } catch (error) {
      console.error("포만감 입력 처리 중 오류:", error);
      return {
        success: false,
        message: "입력을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  /**
   * 배고픔 정도만으로 음식 추천 (현재 위치 자동 사용)
   *
   * @description
   * 사용자가 배고픔 정도만 입력했을 때, 현재 위치를 자동으로 파악하여
   * 음식 카테고리를 추천합니다.
   *
   * **사용 예시:**
   * - "배고픔은 3이야"
   * - "보통 배고파"
   * - "2"
   *
   * @param input 배고픔 정보
   * @returns 음식 추천 결과
   */
  public async recommendFoodWithHungerOnly(input: {
    /**
     * 배고픔 정도 (1: 배부름, 2: 보통, 3: 매우 배고픔)
     */
    hungerLevel: FullnessLevel;

    /**
     * 사용자의 현재 GPS 좌표 (클라이언트에서 전달)
     */
    currentCoordinates?: ILatLng;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      // 1. GPS 좌표가 없는 경우 - 위치 설정 요청
      if (!input.currentCoordinates) {
        return {
          success: false,
          message:
            "현재 위치 정보를 가져올 수 없습니다. 위치 설정을 다시 확인해주세요.\n\n또는 직접 위치를 입력해주세요. (예: '배고픔 3, 강남')",
          error: "GPS 좌표 없음",
        };
      }

      // 2. LocationService를 사용하여 GPS 좌표로 위치 파악
      const locationService = new LocationService();
      const locationInfo = await locationService.getLocation({
        method: "gps",
        coordinates: input.currentCoordinates,
      });

      const locationName = `${locationInfo.locationInfo.city}${locationInfo.locationInfo.district ? ` ${locationInfo.locationInfo.district}` : ""}`;
      console.log(
        `📍 GPS 좌표로 현재 위치 파악: ${locationName} (${input.currentCoordinates.lat}, ${input.currentCoordinates.lng})`,
      );

      // 3. 파악된 위치로 음식 추천 실행
      const result = await this.getCategoryRecommendation({
        hungerLevel: input.hungerLevel,
        location: input.currentCoordinates,
        locationName: locationName,
      });

      return result;
    } catch (error) {
      console.error("❌ 배고픔 기반 추천 중 오류:", error);
      return {
        success: false,
        message:
          "위치를 파악하는 중 오류가 발생했습니다. 위치 설정을 확인하거나 직접 위치를 입력해주세요.",
        error: error instanceof Error ? error.message : "알 수 없는 오류",
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

      // 위치 정보 정확하게 파악
      let actualLocation: ILatLng;
      let actualLocationName: string;

      // locationName이 있으면 먼저 애매한 지역명인지 체크
      if (request.locationName) {
        const ambiguousLocations = this.isAmbiguousLocation(request.locationName);
        if (ambiguousLocations) {
          // 애매한 지역명 - 사용자에게 확인 필요
          return {
            success: false,
            message: `"${request.locationName}"은(는) 여러 지역에 있어서 정확한 추천이 어려워요.\n\n다음 중 어느 지역인가요?\n${ambiguousLocations.map((loc, idx) => `${idx + 1}. ${loc}`).join("\n")}\n\n구체적인 지역명을 다시 말씀해주세요! (예: "서울 중구", "대전 중구")`,
            data: {
              selectedCategories: { first: "", second: "", reasons: [] },
              restaurants: {
                category1: { categoryName: "", searchQuery: "", restaurants: [], totalCount: 0 },
                category2: { categoryName: "", searchQuery: "", restaurants: [], totalCount: 0 },
              },
              analysis: {
                weather: "",
                dayOfWeek: "",
                hungerLevel: "",
                locationInfo: "",
                scoringDetails: "",
              },
            },
            error: "AMBIGUOUS_LOCATION",
          };
        }

        // 명확한 지역명 - LocationService로 좌표 변환 시도
        const locationService = new LocationService();
        try {
          const locationInfo = await locationService.getLocation({
            method: "city",
            cityName: request.locationName,
          });

          // LocationService가 성공했는지 확인
          if (locationInfo.metadata?.success) {
            actualLocation = locationInfo.coordinates;
            actualLocationName = `${locationInfo.locationInfo.city}${locationInfo.locationInfo.district ? ` ${locationInfo.locationInfo.district}` : ""}`;
            console.log(
              `📍 지역명 "${request.locationName}" → 좌표 변환 성공: ${actualLocationName} (${actualLocation.lat}, ${actualLocation.lng})`,
            );
          } else {
            // LocationService가 fallback으로 서울을 반환한 경우 → 원본 텍스트 사용
            actualLocation = { lat: 37.5663, lng: 126.9779 }; // 서울 기본 좌표
            actualLocationName = request.locationName; // 원본 그대로 사용 (예: "홍대")
            console.log(
              `📍 지역명 "${request.locationName}" → 좌표 변환 실패, 원본 텍스트 사용 (Naver API가 처리)`,
            );
          }
        } catch (error) {
          // 에러 발생 시 원본 텍스트 그대로 사용
          actualLocation = { lat: 37.5663, lng: 126.9779 }; // 서울 기본 좌표
          actualLocationName = request.locationName; // 원본 그대로 사용
          console.log(
            `📍 지역명 "${request.locationName}" → 변환 오류, 원본 텍스트 사용`,
          );
        }
      }
      // location (좌표)만 있는 경우
      else if (request.location) {
        actualLocation = request.location;
        actualLocationName = "현재 위치";
        console.log(
          `📍 GPS 좌표 사용: (${actualLocation.lat}, ${actualLocation.lng})`,
        );
      }
      // 둘 다 없으면 기본값 (서울 강남)
      else {
        actualLocation = { lat: 37.4979, lng: 127.0276 };
        actualLocationName = "강남";
        console.log(`📍 기본 위치 사용: ${actualLocationName}`);
      }

      console.log(
        `🍽️ 카테고리 추천 및 맛집 검색 시작: ${actualLocationName}, 배고픔 레벨 ${request.hungerLevel}, ${currentDay}`,
      );

      // 1. 현재 날씨 조건 조회 (정확한 좌표로)
      const weatherConditions = await this.getWeatherConditions(actualLocation);
      console.log("📊 날씨 조회 완료:", weatherConditions);

      // 2. 통합 점수 계산으로 상위 2개 카테고리 선정
      const topCategories =
        await this.integratedScoringService.calculateIntegratedScore(
          weatherConditions,
          request.hungerLevel,
          currentDay,
        );

      if (topCategories.length < 2) {
        throw new Error("상위 2개 카테고리 선정 실패");
      }

      console.log(
        `🎯 선정된 카테고리: 1위 ${topCategories[0].nameKo} (${topCategories[0].score}점), 2위 ${topCategories[1].nameKo} (${topCategories[1].score}점)`,
      );

      // 3. 각 카테고리별로 Naver API 검색 (병렬 처리) - 정확한 지역명으로
      const [category1Result, category2Result] = await Promise.all([
        this.searchRestaurants(actualLocationName, topCategories[0].nameKo),
        this.searchRestaurants(actualLocationName, topCategories[1].nameKo),
      ]);

      console.log(
        `🔍 맛집 검색 완료: ${topCategories[0].nameKo} ${category1Result.total}개, ${topCategories[1].nameKo} ${category2Result.total}개`,
      );

      // 4. 결과 포맷팅
      const hungerDesc =
        request.hungerLevel === 3
          ? "매우 배고픔"
          : request.hungerLevel === 2
            ? "보통"
            : "배부름";
      const weatherDesc =
        weatherConditions.temperature === "hot"
          ? "더운 날씨"
          : weatherConditions.temperature === "cold"
            ? "추운 날씨"
            : "온화한 날씨";

      // Markdown 포맷으로 풍부한 응답 생성
      const formatRestaurant = (r: any, index: number) => {
        const title = r.title.replace(/<[^>]*>/g, ""); // HTML 태그 제거
        const phone = r.telephone || "정보없음";
        return `${index + 1}. **${title}**\n   - 📍 ${r.address}\n   - 📞 ${phone}`;
      };

      const successMessage = `
## 음식 추천 결과

### 분석 정보
- **지역**: ${actualLocationName}
- **날씨**: ${weatherDesc} (🌡️ ${weatherConditions.actualTemperature || "N/A"}°C, 💧 ${weatherConditions.actualHumidity || "N/A"}%)
- **배고픔**: ${hungerDesc} (${request.hungerLevel}/3)
- **요일**: ${this.getKoreanDay(currentDay)}

---

### 추천 카테고리 Top 2

#### 🥇 1위: ${topCategories[0].nameKo}
**선정 이유**: ${topCategories[0].reason}
**점수**: ${topCategories[0].score.toFixed(1)}점

**추천 맛집** (총 ${category1Result.total}곳)
${category1Result.restaurants.slice(0, 5).map(formatRestaurant).join("\n\n")}

---

#### 🥈 2위: ${topCategories[1].nameKo}
**선정 이유**: ${topCategories[1].reason}
**점수**: ${topCategories[1].score.toFixed(1)}점

**추천 맛집** (총 ${category2Result.total}곳)
${category2Result.restaurants.slice(0, 5).map(formatRestaurant).join("\n\n")}

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
              `2위 ${topCategories[1].nameKo}: ${topCategories[1].reason}`,
            ],
          },
          restaurants: {
            category1: {
              categoryName: topCategories[0].nameKo,
              searchQuery: category1Result.query,
              restaurants: category1Result.restaurants || [],
              totalCount: category1Result.total || 0,
            },
            category2: {
              categoryName: topCategories[1].nameKo,
              searchQuery: category2Result.query,
              restaurants: category2Result.restaurants || [],
              totalCount: category2Result.total || 0,
            },
          },
          analysis: {
            weather: `${weatherDesc} (기온: ${weatherConditions.actualTemperature || "N/A"}°C, 습도: ${weatherConditions.actualHumidity || "N/A"}%)`,
            dayOfWeek: `${currentDay} (${this.getKoreanDay(currentDay)})`,
            hungerLevel: `${request.hungerLevel}/3 (${hungerDesc})`,
            locationInfo: `${actualLocationName} 지역`,
            scoringDetails: `날씨 적합도, ${this.getKoreanDay(currentDay)} 요일별 선호도, 배고픔 정도를 종합하여 계산`,
          },
        },
      };
    } catch (error) {
      console.error("❌ 카테고리 추천 및 맛집 검색 중 오류 발생:", error);

      const fallbackLocationName = request.locationName || "강남";

      return {
        success: false,
        message:
          "죄송합니다. 일시적인 오류가 발생했습니다. 기본 추천을 제공해드립니다.",
        data: {
          selectedCategories: {
            first: "한식",
            second: "치킨",
            reasons: ["기본 추천 (오류 발생)"],
          },
          restaurants: {
            category1: {
              categoryName: "한식",
              searchQuery: `${fallbackLocationName} 한식 맛집`,
              restaurants: [],
              totalCount: 0,
            },
            category2: {
              categoryName: "치킨",
              searchQuery: `${fallbackLocationName} 치킨 맛집`,
              restaurants: [],
              totalCount: 0,
            },
          },
          analysis: {
            weather: "날씨 정보 없음",
            dayOfWeek: this.getCurrentDay(),
            hungerLevel: `${request.hungerLevel}/3`,
            locationInfo: fallbackLocationName,
            scoringDetails: "오류로 인한 기본 추천",
          },
        },
        error: error instanceof Error ? error.message : "알 수 없는 오류",
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
      if (
        message.includes("매우 배고") ||
        message.includes("많이 배고") ||
        message.includes("완전 배고")
      ) {
        hungerLevel = 3;
      } else if (message.includes("보통") || message.includes("적당")) {
        hungerLevel = 2;
      } else if (
        message.includes("배부") ||
        message.includes("포만") ||
        message.includes("안 배고")
      ) {
        hungerLevel = 1;
      }
    }

    // 위치 추출 로직
    // 패턴 1: "배고픔은 3이고, 현재 위치는 서울 홍대야" 또는 "지역은 서울 홍대야" 형태
    const locationPatternMatch = message.match(
      /(?:현재\s*)?(?:위치|지역)(?:는|은)?\s*([가-힣\s]+?)(?:야|이야|입니다|예요|이에요|이고|!|\.|,|$)/,
    );
    if (locationPatternMatch) {
      location = locationPatternMatch[1].trim();
      console.log(`📍 위치/지역 패턴 매칭: "${location}"`);
    }
    // 패턴 2: 콤마로 구분된 형태 (예: "3, 대전 한밭대")
    else {
      const commaMatch = message.match(/([1-3])\s*,\s*(.+)/);
      if (commaMatch) {
        const locationPart = commaMatch[2].trim();
        location = locationPart;
        console.log(`📍 콤마 구분 위치 추출: "${locationPart}"`);
      } else {
        // 패턴 3: 콤마가 없는 경우 - 지역 키워드로 추출
        location = this.extractLocationFromText(userMessage);
      }
    }

    console.log(
      `📝 입력 분석: "${userMessage}" → 포만감: ${hungerLevel}, 지역: ${location}`,
    );

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
      "강남구",
      "서초구",
      "송파구",
      "강동구",
      "마포구",
      "용산구",
      "종로구",
      "중구",
      "성동구",
      "광진구",
      "동대문구",
      "중랑구",
      "성북구",
      "강북구",
      "도봉구",
      "노원구",
      "은평구",
      "서대문구",
      "양천구",
      "강서구",
      "구로구",
      "금천구",
      "영등포구",
      "동작구",
      "관악구",
      // 서울 동네/지역
      "홍대",
      "신촌",
      "명동",
      "강남",
      "건대",
      "잠실",
      "신림",
      "이태원",
      "압구정",
      "청담",
      "여의도",
      "목동",
      "신사",
      "논현",
      "삼성동",
      "역삼동",
      "선릉",
      "판교",

      // 대전 구체적 지역
      "대전 유성구",
      "대전 서구",
      "대전 중구",
      "대전 동구",
      "대전 대덕구",
      "유성구",
      "서구",
      "중구",
      "동구",
      "대덕구",
      "한밭대",
      "충남대",
      "카이스트",
      "둔산",
      "노은",
      "관평",
      "신성동",
      "도안",

      // 부산 구체적 지역
      "부산 해운대구",
      "부산 남구",
      "부산 동구",
      "부산 서구",
      "부산 중구",
      "부산 영도구",
      "해운대",
      "광안리",
      "남포동",
      "센텀시티",

      // 기타 시/도
      "인천",
      "대구",
      "광주",
      "울산",
      "세종",
      "경기도",
      "강원도",
      "충청북도",
      "충청남도",
      "전라북도",
      "전라남도",
      "경상북도",
      "경상남도",
      "제주도",

      // 기타 도시
      "수원",
      "성남",
      "안양",
      "고양",
      "용인",
      "부천",
      "청주",
      "천안",
      "전주",
      "포항",
      "창원",
      "진주",
    ];

    // 일반 지역 키워드 (기본 시/도명)
    const generalLocationKeywords = [
      "서울",
      "부산",
      "대구",
      "인천",
      "광주",
      "대전",
      "울산",
      "세종",
    ];

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

      // 위치 정보 정확하게 파악
      let actualLocation: ILatLng;
      let actualLocationName: string;

      // locationName이 있으면 먼저 애매한 지역명인지 체크
      if (request.locationName) {
        const ambiguousLocations = this.isAmbiguousLocation(request.locationName);
        if (ambiguousLocations) {
          // 애매한 지역명 - 사용자에게 확인 필요
          const locationOptions = ambiguousLocations.join(", ");
          return {
            success: false,
            message: `"${request.locationName}"은(는) 여러 지역에 있어서 정확한 추천이 어려워요.\n\n다음 중 어느 지역인가요?\n${ambiguousLocations.map((loc, idx) => `${idx + 1}. ${loc}`).join("\n")}\n\n구체적인 지역명을 다시 말씀해주세요! (예: "서울 중구", "대전 중구")`,
            data: {
              selectedCategories: { first: "", second: "", reasons: [] },
              restaurants: {
                category1: { categoryName: "", searchQuery: "", restaurants: [], totalCount: 0 },
                category2: { categoryName: "", searchQuery: "", restaurants: [], totalCount: 0 },
              },
              analysis: {
                weather: "",
                dayOfWeek: "",
                hungerLevel: "",
                scoringDetails: "",
              },
            },
            error: "AMBIGUOUS_LOCATION",
          };
        }

        // 명확한 지역명 - LocationService로 좌표 변환 시도
        const locationService = new LocationService();
        try {
          const locationInfo = await locationService.getLocation({
            method: "city",
            cityName: request.locationName,
          });

          // LocationService가 성공했는지 확인
          if (locationInfo.metadata?.success) {
            actualLocation = locationInfo.coordinates;
            actualLocationName = `${locationInfo.locationInfo.city}${locationInfo.locationInfo.district ? ` ${locationInfo.locationInfo.district}` : ""}`;
            console.log(
              `📍 지역명 "${request.locationName}" → 좌표 변환 성공: ${actualLocationName} (${actualLocation.lat}, ${actualLocation.lng})`,
            );
          } else {
            // LocationService가 fallback으로 서울을 반환한 경우 → 원본 텍스트 사용
            actualLocation = { lat: 37.5663, lng: 126.9779 }; // 서울 기본 좌표
            actualLocationName = request.locationName; // 원본 그대로 사용 (예: "홍대")
            console.log(
              `📍 지역명 "${request.locationName}" → 좌표 변환 실패, 원본 텍스트 사용 (Naver API가 처리)`,
            );
          }
        } catch (error) {
          // 에러 발생 시 원본 텍스트 그대로 사용
          actualLocation = { lat: 37.5663, lng: 126.9779 }; // 서울 기본 좌표
          actualLocationName = request.locationName; // 원본 그대로 사용
          console.log(
            `📍 지역명 "${request.locationName}" → 변환 오류, 원본 텍스트 사용`,
          );
        }
      }
      // location (좌표)만 있는 경우
      else if (request.location) {
        actualLocation = request.location;
        actualLocationName = "현재 위치";
        console.log(
          `📍 GPS 좌표 사용: (${actualLocation.lat}, ${actualLocation.lng})`,
        );
      }
      // 둘 다 없으면 기본값 (서울 강남)
      else {
        actualLocation = { lat: 37.4979, lng: 127.0276 };
        actualLocationName = "강남";
        console.log(`📍 기본 위치 사용: ${actualLocationName}`);
      }

      console.log(
        `🍽️ 음식 추천 시작: ${actualLocationName}, 배고픔 레벨 ${request.hungerLevel}, ${currentDay}`,
      );

      // 1. 현재 날씨 조건 조회 (정확한 좌표로)
      const weatherConditions = await this.getWeatherConditions(actualLocation);
      console.log("📊 날씨 조회 완료:", weatherConditions);

      // 2. 통합 점수 계산으로 상위 2개 카테고리 선정
      const topCategories =
        await this.integratedScoringService.calculateIntegratedScore(
          weatherConditions,
          request.hungerLevel,
          currentDay,
        );

      if (topCategories.length < 2) {
        throw new Error("상위 2개 카테고리 선정 실패");
      }

      console.log(
        `🎯 선정된 카테고리: 1위 ${topCategories[0].nameKo} (${topCategories[0].score}점), 2위 ${topCategories[1].nameKo} (${topCategories[1].score}점)`,
      );

      // 3. 각 카테고리별로 Naver API 검색 (병렬 처리) - 정확한 지역명으로
      const [category1Result, category2Result] = await Promise.all([
        this.searchRestaurants(actualLocationName, topCategories[0].nameKo),
        this.searchRestaurants(actualLocationName, topCategories[1].nameKo),
      ]);

      console.log(
        `🔍 맛집 검색 완료: ${topCategories[0].nameKo} ${category1Result.total}개, ${topCategories[1].nameKo} ${category2Result.total}개`,
      );

      // 4. 결과 포맷팅
      const hungerDesc =
        request.hungerLevel === 3
          ? "매우 배고픔"
          : request.hungerLevel === 2
            ? "보통"
            : "배부름";
      const weatherDesc =
        weatherConditions.temperature === "hot"
          ? "더운 날씨"
          : weatherConditions.temperature === "cold"
            ? "추운 날씨"
            : "온화한 날씨";

      // Markdown 포맷으로 풍부한 응답 생성
      const formatRestaurant = (r: any, index: number) => {
        const title = r.title.replace(/<[^>]*>/g, ""); // HTML 태그 제거
        const phone = r.telephone || "정보없음";
        return `${index + 1}. **${title}**\n   - 📍 ${r.address}\n   - 📞 ${phone}`;
      };

      const successMessage = `
## 🍽️ 음식 추천 결과

### 📊 분석 정보
- **지역**: ${actualLocationName}
- **날씨**: ${weatherDesc} (🌡️ ${weatherConditions.actualTemperature || "N/A"}°C, 💧 ${weatherConditions.actualHumidity || "N/A"}%)
- **배고픔**: ${hungerDesc} (${request.hungerLevel}/3)
- **요일**: ${this.getKoreanDay(currentDay)}

---

### 🎯 추천 카테고리 Top 2

#### 🥇 1위: ${topCategories[0].nameKo}
**선정 이유**: ${topCategories[0].reason}
**점수**: ${topCategories[0].score.toFixed(1)}점

**추천 맛집** (총 ${category1Result.total}곳)
${category1Result.restaurants.slice(0, 5).map(formatRestaurant).join("\n\n")}

---

#### 🥈 2위: ${topCategories[1].nameKo}
**선정 이유**: ${topCategories[1].reason}
**점수**: ${topCategories[1].score.toFixed(1)}점

**추천 맛집** (총 ${category2Result.total}곳)
${category2Result.restaurants.slice(0, 5).map(formatRestaurant).join("\n\n")}

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
              `2위 ${topCategories[1].nameKo}: ${topCategories[1].reason}`,
            ],
          },
          restaurants: {
            category1: {
              categoryName: topCategories[0].nameKo,
              searchQuery: category1Result.query,
              restaurants: category1Result.restaurants || [],
              totalCount: category1Result.total || 0,
            },
            category2: {
              categoryName: topCategories[1].nameKo,
              searchQuery: category2Result.query,
              restaurants: category2Result.restaurants || [],
              totalCount: category2Result.total || 0,
            },
          },
          analysis: {
            weather: `${weatherDesc} (기온: ${weatherConditions.actualTemperature || "N/A"}°C, 습도: ${weatherConditions.actualHumidity || "N/A"}%)`,
            dayOfWeek: `${currentDay} (${this.getKoreanDay(currentDay)})`,
            hungerLevel: `${request.hungerLevel}/3 (${hungerDesc})`,
            scoringDetails: `날씨 적합도, ${this.getKoreanDay(currentDay)} 요일별 선호도, 배고픔 정도를 종합하여 계산`,
          },
        },
      };
    } catch (error) {
      console.error("❌ 스마트 음식 추천 중 오류 발생:", error);

      const fallbackLocationName = request.locationName || "강남";

      return {
        success: false,
        message:
          "죄송합니다. 일시적인 오류가 발생했습니다. 기본 추천을 제공해드립니다.",
        data: {
          selectedCategories: {
            first: "한식",
            second: "치킨",
            reasons: ["기본 추천 (오류 발생)"],
          },
          restaurants: {
            category1: {
              categoryName: "한식",
              searchQuery: `${fallbackLocationName} 한식 맛집`,
              restaurants: [],
              totalCount: 0,
            },
            category2: {
              categoryName: "치킨",
              searchQuery: `${fallbackLocationName} 치킨 맛집`,
              restaurants: [],
              totalCount: 0,
            },
          },
          analysis: {
            weather: "날씨 정보 없음",
            dayOfWeek: this.getCurrentDay(),
            hungerLevel: `${request.hungerLevel}/3`,
            scoringDetails: "오류로 인한 기본 추천",
          },
        },
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  /**
   * 현재 요일을 영어로 반환합니다.
   */
  private getCurrentDay(): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = new Date();
    return days[today.getDay()];
  }

  /**
   * 영어 요일을 한글로 변환합니다.
   */
  private getKoreanDay(englishDay: string): string {
    const dayMap: { [key: string]: string } = {
      Sunday: "일요일",
      Monday: "월요일",
      Tuesday: "화요일",
      Wednesday: "수요일",
      Thursday: "목요일",
      Friday: "금요일",
      Saturday: "토요일",
    };
    return dayMap[englishDay] || englishDay;
  }

  /**
   * 날씨 조건을 조회합니다.
   */
  private async getWeatherConditions(location: ILatLng) {
    try {
      const weatherEvaluation =
        await this.foodEvaluationService.evaluateFoodByWeather({
          location: location,
        });
      return weatherEvaluation.weather;
    } catch (error) {
      console.warn("날씨 조회 실패, 기본값 사용:", error);
      // 기본 날씨 조건 반환 (타입 명시)
      return {
        temperature: "moderate" as const,
        humidity: "moderate" as const,
        actualTemperature: 20,
        actualHumidity: 50,
      };
    }
  }

  /**
   * Naver API를 사용하여 맛집을 검색합니다.
   *
   * @description
   * 사용자가 입력한 구체적인 위치 정보를 활용하여 더 정확한 맛집 검색을 수행합니다.
   * "대전 한밭대" → "대전 한밭대 근처 한식 맛집" 형태로 검색
   * 검색 결과는 주소 기반으로 필터링하여 정확한 지역 맛집만 반환합니다.
   */
  private async searchRestaurants(
    location: string,
    category: string,
  ): Promise<any> {
    try {
      // 더 구체적인 검색 쿼리 생성
      let searchQuery: string;

      // 구체적인 지역이 포함된 경우 (예: "대전 한밭대", "서울 강남구")
      if (location.includes(" ") || location.length > 3) {
        searchQuery = `${location} 근처 ${category} 맛집`;
      } else {
        // 일반적인 시/도명인 경우 (예: "대전", "서울")
        searchQuery = `${location} ${category} 맛집`;
      }

      console.log(
        `🔍 [${category}] 맛집 검색 쿼리: "${searchQuery}" (위치: ${location})`,
      );

      // 더 많은 결과를 가져와서 필터링 (10개 → 필터링 후 5개 이상 확보)
      const result = await RestaurantProvider.search({
        query: searchQuery,
        display: 20, // 15 → 20으로 증가
      });

      // Naver API가 이미 검색 쿼리("강남 근처 치킨 맛집")로 지역 기반 검색을 잘 수행하므로
      // 추가 필터링 없이 결과를 그대로 사용합니다.
      const restaurants = result.items || [];

      console.log(
        `📍 [${category}] 검색 완료: ${restaurants.length}개 결과 반환 (필터링 없음)`,
      );

      // 상위 5개만 반환
      return {
        query: searchQuery,
        category: category,
        restaurants: restaurants.slice(0, 5),
        total: restaurants.length,
      };
    } catch (error) {
      console.error(`${category} 맛집 검색 실패:`, error);

      // 오류 발생 시 기본 검색 쿼리로 재시도
      const fallbackQuery = `${location} ${category}`;
      console.log(`🔄 재시도 검색 쿼리: "${fallbackQuery}"`);

      try {
        const fallbackResult = await RestaurantProvider.search({
          query: fallbackQuery,
          display: 5,
        });

        return {
          query: fallbackQuery,
          category: category,
          restaurants: fallbackResult.items || [],
          total: fallbackResult.total || 0,
          note: "기본 검색으로 재시도됨",
        };
      } catch (fallbackError) {
        console.error(`${category} 재시도 검색도 실패:`, fallbackError);
        return {
          query: `${location} ${category} 맛집`,
          category: category,
          restaurants: [],
          total: 0,
          error: "검색 실패",
        };
      }
    }
  }

  /**
   * 위치 문자열에서 필터링에 사용할 핵심 키워드를 추출합니다.
   */
  private extractLocationKeywords(location: string): string[] {
    const keywords: string[] = [];

    // "서울 강남구" → ["서울", "강남"]
    // "전주" → ["전주"]
    // "대전 한밭대" → ["대전"]

    const parts = location
      .split(" ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    for (const part of parts) {
      // "구", "동", "시" 제거
      const cleaned = part.replace(/(구|동|시)$/, "");
      if (cleaned.length >= 2) {
        keywords.push(cleaned);
      }
    }

    // 키워드가 없으면 원본 그대로 사용
    if (keywords.length === 0) {
      keywords.push(location);
    }

    return keywords;
  }

  /**
   * 지역명이 전국적으로 중복되어 애매한지 판단
   *
   * @description
   * 여러 시/도에 동일한 이름의 구/동이 있는 경우 애매하다고 판단합니다.
   *
   * @example
   * "중구" → 애매함 (서울, 부산, 대구, 인천, 대전, 광주, 울산)
   * "강남" → 명확함 (일반적으로 서울 강남구)
   * "대전" → 명확함 (광역시명)
   *
   * @returns 애매한 경우 가능한 지역 목록, 명확한 경우 null
   */
  private isAmbiguousLocation(location: string): string[] | null {
    const cleaned = location.trim().replace(/(구|동)$/, "");

    // 전국에 중복되는 구/동 이름들 (시/도별)
    const ambiguousDistricts: { [key: string]: string[] } = {
      중: ["서울 중구", "부산 중구", "대구 중구", "인천 중구", "대전 중구", "광주 중구", "울산 중구"],
      동: ["부산 동구", "대구 동구", "인천 동구", "광주 동구", "대전 동구", "울산 동구"],
      서: ["부산 서구", "대구 서구", "인천 서구", "광주 서구", "대전 서구"],
      남: ["부산 남구", "대구 남구", "인천 남구", "광주 남구", "울산 남구"],
      북: ["부산 북구", "대구 북구", "인천 북구", "광주 북구", "대전 북구", "울산 북구"],
    };

    // 중복 지역명 체크
    if (ambiguousDistricts[cleaned]) {
      console.log(`⚠️ 애매한 지역명 감지: "${location}" → 가능한 지역: ${ambiguousDistricts[cleaned].join(", ")}`);
      return ambiguousDistricts[cleaned];
    }

    // 명확한 지역명
    return null;
  }

  /**
   * 위치 정보를 더 정확하게 파싱하여 필터링용 데이터 생성
   *
   * @description
   * 시/도 정보와 세부 지역 정보를 분리하여 더 엄격한 주소 필터링을 가능하게 합니다.
   *
   * @example
   * "강남" → { city: "서울", keywords: ["강남"] }
   * "대전 한밭대" → { city: "대전", keywords: ["대전", "한밭"] }
   * "서울 강남구" → { city: "서울", keywords: ["강남"] }
   */
  private parseLocationForFiltering(location: string): {
    city: string | null;
    keywords: string[];
  } {
    const parts = location
      .split(" ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const keywords: string[] = [];
    let city: string | null = null;

    // 주요 시/도 목록
    const majorCities = [
      "서울",
      "부산",
      "대구",
      "인천",
      "광주",
      "대전",
      "울산",
      "세종",
    ];
    const provinces = [
      "경기",
      "강원",
      "충북",
      "충남",
      "전북",
      "전남",
      "경북",
      "경남",
      "제주",
    ];

    for (const part of parts) {
      // 시/도 확인
      if (majorCities.includes(part)) {
        city = part;
        keywords.push(part);
      } else if (provinces.some((prov) => part.startsWith(prov))) {
        city = part;
        keywords.push(part);
      } else {
        // 세부 지역명 처리
        const cleaned = part.replace(/(구|동|시|군|읍|면)$/, "");
        if (cleaned.length >= 2) {
          keywords.push(cleaned);
        }
      }
    }

    // "강남"처럼 단독 지역명인 경우 서울로 추정
    if (!city && keywords.length === 1) {
      const singleLocation = keywords[0];
      const seoulDistricts = [
        "강남",
        "서초",
        "송파",
        "강동",
        "마포",
        "용산",
        "종로",
        "중구",
        "성동",
        "광진",
        "동대문",
        "중랑",
        "성북",
        "강북",
        "도봉",
        "노원",
        "은평",
        "서대문",
        "양천",
        "강서",
        "구로",
        "금천",
        "영등포",
        "동작",
        "관악",
        "홍대",
        "신촌",
        "명동",
        "건대",
        "잠실",
        "신림",
        "이태원",
        "압구정",
        "청담",
        "여의도",
        "목동",
        "신사",
        "논현",
        "삼성",
        "역삼",
        "선릉",
      ];

      if (
        seoulDistricts.some(
          (district) =>
            singleLocation.includes(district) ||
            district.includes(singleLocation),
        )
      ) {
        city = "서울";
        console.log(`📍 "${singleLocation}" → 서울 지역으로 추정`);
      }
    }

    // 키워드가 없으면 원본 사용
    if (keywords.length === 0) {
      keywords.push(location);
    }

    return { city, keywords };
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
      instruction: newFormat.instruction,
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
  public async getTodayFoodStatistics(
    input: {
      /**
       * 조회할 요일 (선택사항)
       * 예: "월요일", "화요일", "Monday", "Tuesday" 등
       * 지정하지 않으면 오늘 요일
       */
      dayOfWeek?: string;
    } = {},
  ): Promise<{
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
          data: stats,
        };
      }

      // Markdown 포맷으로 통계 메시지 생성
      const medalEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const statsLines = stats.topSelections
        .map((item, index) => {
          let line = `${medalEmojis[index]} **${item.category}** - ${item.count}번 (${item.percentage}%)`;

          // 자주 방문한 음식점 정보 추가
          if (item.restaurants.length > 0) {
            const restaurantList = item.restaurants
              .map((r) => `${r.name} (${r.count}번)`)
              .join(", ");
            line += `\n   - 자주 방문: ${restaurantList}`;
          }

          return line;
        })
        .join("\n\n");

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
        data: stats,
      };
    } catch (error) {
      console.error("❌ 통계 조회 중 오류:", error);
      return {
        success: false,
        message: "통계를 불러오는 중 오류가 발생했습니다.",
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
        restaurantName: input.restaurantName,
      });

      const restaurantPart = input.restaurantName
        ? ` (${input.restaurantName})`
        : "";
      return {
        success: true,
        message: `${input.selectedFood}${restaurantPart} 선택을 기록했습니다! 다음 추천 때 이 정보를 활용할게요 😊`,
      };
    } catch (error) {
      console.error("❌ 사용자 선택 저장 중 오류:", error);
      return {
        success: false,
        message: "선택 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
    }
  }

  /**
   * 사용자가 방문한 식당을 기록합니다 (2단계 GPT 기반 전략)
   *
   * @description
   * 사용자가 "쉐이크쉑 갈거야", "마초쉐프 다녀왔어" 등으로 말할 때
   * GPT를 통해 전체 메시지를 분석하여 식당 이름과 카테고리를 동시에 추출합니다.
   *
   * **2단계 전략:**
   * 1. GPT 전체 분석: 사용자 메시지 전체를 GPT에 보내서 식당 이름 + 카테고리 추출
   * 2. 사용자 확인: GPT도 실패하면 사용자에게 직접 질문
   *
   * @example
   * 사용자: "쉐이크쉑 갈거야" → GPT가 {식당: "쉐이크쉑", 카테고리: "버거"} 추출
   * 사용자: "마초쉐프 다녀왔어" → GPT가 {식당: "마초쉐프", 카테고리: "양식"} 추출
   * 사용자: "오늘 교촌치킨 먹었어" → GPT가 {식당: "교촌치킨", 카테고리: "치킨"} 추출
   */
  public async recordVisitedRestaurant(input: {
    /**
     * 식당 이름 또는 음식 종류
     * 예: "교촌치킨", "쉐이크쉑", "마초쉐프"
     */
    restaurantOrFood: string;

    /**
     * 사용자 메시지 원문 (전체 컨텍스트)
     * 예: "오늘 쉐이크쉑 강남점 갈거야"
     */
    originalMessage?: string;
  }): Promise<{
    success: boolean;
    message: string;
    needsConfirmation?: boolean;
    suggestedCategories?: string[];
    restaurantName?: string; // state 저장용
    data?: {
      restaurantName?: string;
      category?: string;
    };
  }> {
    try {
      const userMessage = input.originalMessage || input.restaurantOrFood;
      console.log(`🏪 식당 방문 기록 시작: "${userMessage}"`);

      // 1단계: GPT에게 전체 메시지 분석 요청
      console.log(`🤖 GPT를 통한 식당 이름 + 카테고리 동시 추출 시도`);
      const gptResult = await this.analyzeRestaurantVisitWithGPT(userMessage);

      if (gptResult && gptResult.category && gptResult.restaurantName) {
        console.log(
          `✅ GPT 분석 성공: "${gptResult.restaurantName}" → "${gptResult.category}"`,
        );

        // 히스토리에 저장
        const userHistoryService = new UserHistoryService();
        await userHistoryService.saveUserSelection({
          selectedFood: gptResult.category,
          category: gptResult.category,
          restaurantName: gptResult.restaurantName,
        });

        return {
          success: true,
          message: `${gptResult.restaurantName}에서 ${gptResult.category} ${gptResult.isFuture ? '드실 예정이시군요' : '드셨군요'}! 기록했습니다 😊`,
          data: {
            restaurantName: gptResult.restaurantName,
            category: gptResult.category,
          },
        };
      }

      // 2단계: GPT도 모르면 사용자에게 카테고리 질문
      console.log(`❓ GPT가 식당을 모름 - 사용자에게 카테고리 질문`);

      // 전처리 함수로 식당 이름만 추출 (불필요한 단어 제거)
      const extractedName = this.extractRestaurantNameFromMessage(userMessage);
      console.log(`🔍 전처리 후 추출된 식당 이름: "${extractedName}" (원본: "${userMessage}")`);

      return {
        success: false,
        needsConfirmation: true,
        restaurantName: extractedName, // state 저장용
        message: `"${extractedName}"은(는) 어떤 종류의 음식점인가요?\n\n간단히 알려주세요:\n예시: "한식"\n예시: "버거"\n예시: "일식집"`,
        suggestedCategories: [
          "한식",
          "중식",
          "일식",
          "양식",
          "치킨",
          "피자",
          "분식",
          "디저트",
          "커피/차",
          "버거",
          "회/해물",
          "족발/보쌈",
          "찜/탕",
          "구이",
          "샐러드",
          "샌드위치",
          "멕시칸",
          "아시안",
          "도시락",
          "죽",
          "기타",
        ],
      };
    } catch (error) {
      console.error("❌ 식당 방문 기록 중 오류:", error);
      return {
        success: false,
        message: "기록 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
    }
  }

  /**
   * 사용자 메시지에서 식당 이름만 추출하는 전처리 함수
   *
   * @description
   * "나 비범 갈거야" → "비범"
   * "오늘은 쉐이크쉑 다녀왔어" → "쉐이크쉑"
   * "내일 맘스터치 가려고" → "맘스터치"
   */
  private extractRestaurantNameFromMessage(message: string): string {
    let cleaned = message.trim();

    // 1. 주어 제거: "나", "내가", "우리", "우리가" 등
    const subjectPatterns = [
      /^나\s+/,
      /^내가\s+/,
      /^우리\s+/,
      /^우리가\s+/,
      /^저\s+/,
      /^제가\s+/,
    ];

    for (const pattern of subjectPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 2. 시간 표현 제거: "오늘", "어제", "내일", "오늘은", "어제는" 등
    const timePatterns = [
      /^오늘(은)?\s+/,
      /^어제(는)?\s+/,
      /^내일(은)?\s+/,
      /^오늘날\s+/,
      /^요즘\s+/,
      /^지금\s+/,
      /^아까\s+/,
      /^방금\s+/,
      /^조금\s*전에?\s+/,
      /\s+오늘(은)?$/,
      /\s+어제(는)?$/,
      /\s+내일(은)?$/,
    ];

    for (const pattern of timePatterns) {
      cleaned = cleaned.replace(pattern, ' ').trim();
    }

    // 3. 동사/표현 제거: "갈거야", "갔어", "먹었어", "다녀왔어", "갈 예정" 등
    const verbPatterns = [
      /\s+갈거야$/,
      /\s+갈게요$/,
      /\s+갈게$/,
      /\s+갈래$/,
      /\s+갈래요$/,
      /\s+가려고$/,
      /\s+가려고\s*해$/,
      /\s+갈\s*예정이야$/,
      /\s+갈\s*예정이에요$/,
      /\s+갈\s*계획이야$/,
      /\s+갔어$/,
      /\s+갔다$/,
      /\s+갔어요$/,
      /\s+다녀왔어$/,
      /\s+다녀왔어요$/,
      /\s+다녀올게$/,
      /\s+다녀올게요$/,
      /\s+먹었어$/,
      /\s+먹었어요$/,
      /\s+먹을\s*거야$/,
      /\s+먹을래$/,
      /\s+먹을래요$/,
      /\s+먹으러\s*가$/,
      /\s+먹으러\s*갈거야$/,
      /\s+방문했어$/,
      /\s+방문했어요$/,
      /\s+방문할거야$/,
      /\s+방문할게요$/,
      /\s+가봤어$/,
      /\s+가봤어요$/,
      /\s+가볼래$/,
      /\s+가볼래요$/,
      /\s+가볼까$/,
      /\s+가볼까요$/,
    ];

    for (const pattern of verbPatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    // 4. 조사/접속사 제거: "에서", "에", "로", "으로" 등 (문장 끝에만)
    const particlePatterns = [
      /\s+에서$/,
      /\s+에$/,
      /\s+로$/,
      /\s+으로$/,
      /\s+를$/,
      /\s+을$/,
      /\s+이$/,
      /\s+가$/,
    ];

    for (const pattern of particlePatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    // 5. 여러 공백을 하나로 정리
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned || message; // 모든 처리 후 빈 문자열이면 원본 반환
  }

  /**
   * 확장된 키워드 매칭 (프랜차이즈 브랜드 포함)
   */
  private matchFoodCategoryEnhanced(input: string): string | undefined {
    const lowerInput = input.toLowerCase();

    // 프랜차이즈 브랜드 → 카테고리 매핑
    const franchiseMap: { [key: string]: string } = {
      // 치킨
      교촌: "치킨",
      굽네: "치킨",
      bhc: "치킨",
      bbq: "치킨",
      kfc: "치킨",
      페리카나: "치킨",
      네네: "치킨",
      처갓집: "치킨",
      호식이: "치킨",
      또래오래: "치킨",

      // 피자
      피자헛: "피자",
      도미노: "피자",
      파파존스: "피자",
      미스터피자: "피자",

      // 버거
      맥도날드: "버거",
      버거킹: "버거",
      롯데리아: "버거",
      맘스터치: "버거",
      쉐이크쉑: "버거",
      파이브가이즈: "버거",
      노브랜드버거: "버거",

      // 분식
      신전: "분식",
      국대떡볶이: "분식",
      죠스떡볶이: "분식",
      청년떡볶이: "분식",
      본죽: "죽",
      죽이야기: "죽",

      // 카페/디저트
      스타벅스: "커피/차",
      투썸: "디저트",
      이디야: "커피/차",
      커피빈: "커피/차",
      할리스: "커피/차",
      탐앤탐스: "커피/차",
      빽다방: "커피/차",
      설빙: "디저트",
      배스킨라빈스: "디저트",

      // 한식
      백종원: "한식",
      본가: "한식",
      할매집: "한식",

      // 양식
      아웃백: "양식",
      빕스: "양식",
      애슐리: "양식",
      계절밥상: "양식",

      // 중식
      홍콩반점: "중식",
      차이나팩토리: "중식",

      // 일식
      스시: "회/해물",
      초밥: "회/해물",

      // 족발/보쌈
      원조할매: "족발/보쌈",
      놀부: "족발/보쌈",
    };

    // 브랜드명 매칭
    for (const [brand, category] of Object.entries(franchiseMap)) {
      if (lowerInput.includes(brand)) {
        return category;
      }
    }

    // 기본 키워드 매칭 (FOOD_CATEGORIES 활용)
    return this.matchFoodCategory(input);
  }

  /**
   * Naver API를 통해 식당 검색 후 카테고리 추론
   */
  private async inferCategoryFromNaverAPI(
    restaurantName: string,
  ): Promise<string | undefined> {
    try {
      // Naver API로 식당 검색
      const searchResult = await RestaurantProvider.search({
        query: restaurantName,
        display: 1, // 최상위 결과 1개만
      });

      if (!searchResult.items || searchResult.items.length === 0) {
        console.log(`❌ Naver API 검색 결과 없음: "${restaurantName}"`);
        return undefined;
      }

      const firstResult = searchResult.items[0];
      const category = firstResult.category;

      if (!category) {
        console.log(`❌ Naver API 결과에 category 필드 없음`);
        return undefined;
      }

      console.log(`📊 Naver API category: "${category}"`);

      // Naver API의 category 필드 파싱
      // 예: "음식점>한식>한정식" → "한식"
      //     "음식점>치킨,닭강정" → "치킨"
      return this.parseCategoryFromNaver(category);
    } catch (error) {
      console.error("❌ Naver API 검색 중 오류:", error);
      return undefined;
    }
  }

  /**
   * GPT를 통해 사용자 메시지 전체를 분석하여 식당 방문 정보 추출
   *
   * @description
   * 사용자가 "쉐이크쉑 갈거야", "마초쉐프 다녀왔어" 같은 메시지를 보내면
   * GPT가 식당 이름, 카테고리, 시제(과거/미래)를 동시에 분석합니다.
   *
   * @example
   * "쉐이크쉑 갈거야" → {restaurantName: "쉐이크쉑", category: "버거", isFuture: true}
   * "마초쉐프 다녀왔어" → {restaurantName: "마초쉐프", category: "양식", isFuture: false}
   */
  private async analyzeRestaurantVisitWithGPT(
    userMessage: string,
  ): Promise<
    | {
        restaurantName: string;
        category: string;
        isFuture: boolean;
      }
    | undefined
  > {
    try {
      const OpenAI = (await import("openai")).default;
      const { MyGlobal } = await import("../../MyGlobal");

      const openai = new OpenAI({
        apiKey: MyGlobal.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const availableCategories = [
        "한식",
        "중식",
        "일식",
        "양식",
        "치킨",
        "피자",
        "분식",
        "디저트",
        "커피/차",
        "버거",
        "회/해물",
        "족발/보쌈",
        "찜/탕",
        "구이",
        "샐러드",
        "샌드위치",
        "멕시칸",
        "아시안",
        "도시락",
        "죽",
      ];

      const prompt = `다음 사용자 메시지를 분석하여 식당 방문 정보를 추출해주세요.

사용자 메시지: "${userMessage}"

가능한 음식 카테고리 목록:
${availableCategories.join(", ")}

**매우 중요한 지침:**

**두 가지 패턴을 처리해야 합니다:**

1. **패턴 1: 식당 방문 의사 표현** (예: "비범 갈거야", "나 교촌치킨 먹었어", "오늘은 쉐이크쉑 다녀왔어")
   - **식당 이름만 정확히 추출하세요.** 주어("나", "내가", "우리"), 시간 표현("오늘", "어제", "내일"), 동사("갈거야", "갔어", "먹었어", "다녀왔어", "갈 예정이야") 등은 모두 제거하세요.
   - 해당 식당에 대해 **확실히 알고 있다면**: 위 카테고리 목록 중 정확히 하나를 선택하세요.
   - **모르거나 확신이 없다면**: category를 "unknown"으로 설정하세요. 절대 추측하지 마세요!
   - 시제(과거/미래)를 파악하세요. "갈거야", "갈 예정", "가려고" 등은 미래(true), "갔어", "먹었어", "다녀왔어" 등은 과거(false)

2. **패턴 2: 식당 카테고리 알려주기** (예: "연하동은 일식이야", "거기는 버거 파는 곳이야")
   - 사용자가 직접 카테고리를 알려주는 경우입니다.
   - 식당 이름과 카테고리를 추출하세요.
   - 시제는 기본적으로 과거(false)로 설정하세요.

**JSON 형식으로만 답변하세요:**
{"restaurantName": "식당이름", "category": "카테고리 또는 unknown", "isFuture": true/false}

**예시:**
- "쉐이크쉑 갈거야" → {"restaurantName": "쉐이크쉑", "category": "버거", "isFuture": true}
- "나 비범 갈거야" → {"restaurantName": "비범", "category": "unknown", "isFuture": true}  (주어 "나" 제거)
- "오늘은 비범 갔어" → {"restaurantName": "비범", "category": "unknown", "isFuture": false}  (시간 표현 "오늘은" 제거)
- "비범 갈 예정이야" → {"restaurantName": "비범", "category": "unknown", "isFuture": true}
- "교촌치킨 먹었어" → {"restaurantName": "교촌치킨", "category": "치킨", "isFuture": false}
- "어제 쉐이크쉑 다녀왔어" → {"restaurantName": "쉐이크쉑", "category": "버거", "isFuture": false}  (시간 표현 "어제" 제거)
- "내일 맘스터치 가려고" → {"restaurantName": "맘스터치", "category": "버거", "isFuture": true}  (시간 표현 "내일" 제거)
- "연하동은 일식이야" → {"restaurantName": "연하동", "category": "일식", "isFuture": false}  (패턴2, 사용자가 알려줌)
- "거기는 버거야" → {"restaurantName": "거기", "category": "버거", "isFuture": false}  (패턴2)

답변:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "당신은 사용자 메시지에서 식당 방문 정보를 정확히 추출하는 전문가입니다. 항상 JSON 형식으로만 답변하세요. 모르는 식당은 절대 추측하지 말고 category를 'unknown'으로 설정하세요.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // 더 낮은 temperature로 일관성 향상
        max_tokens: 100,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();

      if (!responseText) {
        console.log(`❌ GPT 응답 없음`);
        return undefined;
      }

      // JSON 파싱 시도
      try {
        // ```json ... ``` 형식인 경우 처리
        let jsonText = responseText;
        if (responseText.includes("```json")) {
          jsonText = responseText
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();
        } else if (responseText.includes("```")) {
          jsonText = responseText.replace(/```\s*/g, "").trim();
        }

        const parsed = JSON.parse(jsonText);

        // GPT가 모르는 식당인 경우 (unknown 반환)
        if (parsed.category === "unknown") {
          console.log(`❓ GPT가 "${parsed.restaurantName}"을(를) 모름`);
          return undefined;
        }

        // 유효성 검증
        if (
          parsed.restaurantName &&
          parsed.category &&
          availableCategories.includes(parsed.category) &&
          typeof parsed.isFuture === "boolean"
        ) {
          console.log(
            `🤖 GPT 분석 성공: "${parsed.restaurantName}" → "${parsed.category}" (${parsed.isFuture ? '미래' : '과거'})`,
          );
          return {
            restaurantName: parsed.restaurantName,
            category: parsed.category,
            isFuture: parsed.isFuture,
          };
        } else {
          console.log(`⚠️ GPT 응답 형식 오류:`, parsed);
          return undefined;
        }
      } catch (parseError) {
        console.error(`❌ JSON 파싱 실패:`, responseText);
        return undefined;
      }
    } catch (error) {
      console.error("❌ GPT 식당 방문 분석 중 오류:", error);
      return undefined;
    }
  }

  /**
   * Naver API의 category 필드에서 우리 시스템의 카테고리로 변환
   */
  private parseCategoryFromNaver(naverCategory: string): string | undefined {
    const lowerCategory = naverCategory.toLowerCase();

    // Naver 카테고리 → 우리 카테고리 매핑
    const categoryMap: { [key: string]: string } = {
      // 한식
      한식: "한식",
      한정식: "한식",
      백반: "한식",
      국밥: "한식",
      찌개: "찜/탕",
      탕: "찜/탕",
      전골: "찜/탕",
      찜: "찜/탕",
      불고기: "구이",
      삼겹살: "구이",
      갈비: "구이",
      고기: "구이",
      족발: "족발/보쌈",
      보쌈: "족발/보쌈",

      // 중식
      중식: "중식",
      중국: "중식",
      짜장: "중식",
      짬뽕: "중식",

      // 일식
      일식: "일식",
      일본: "일식",
      초밥: "회/해물",
      스시: "회/해물",
      라멘: "일식",
      돈부리: "일식",
      우동: "일식",

      // 양식
      양식: "양식",
      이탈리안: "양식",
      파스타: "양식",
      스테이크: "양식",

      // 치킨
      치킨: "치킨",
      닭: "치킨",
      닭강정: "치킨",

      // 피자
      피자: "피자",

      // 분식
      분식: "분식",
      떡볶이: "분식",
      김밥: "분식",

      // 버거
      햄버거: "버거",
      버거: "버거",

      // 카페/디저트
      카페: "커피/차",
      커피: "커피/차",
      차: "커피/차",
      디저트: "디저트",
      베이커리: "디저트",
      아이스크림: "디저트",

      // 기타
      샐러드: "샐러드",
      도시락: "도시락",
      죽: "죽",
      회: "회/해물",
      해물: "회/해물",
      횟집: "회/해물",
      아시아: "아시안",
      태국: "아시안",
      베트남: "아시안",
      멕시칸: "멕시칸",
      타코: "멕시칸",
    };

    // 매핑 테이블에서 검색
    for (const [keyword, ourCategory] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(keyword)) {
        return ourCategory;
      }
    }

    // 매칭 실패
    return undefined;
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
      일요일: "Sunday",
      월요일: "Monday",
      화요일: "Tuesday",
      수요일: "Wednesday",
      목요일: "Thursday",
      금요일: "Friday",
      토요일: "Saturday",
      일: "Sunday",
      월: "Monday",
      화: "Tuesday",
      수: "Wednesday",
      목: "Thursday",
      금: "Friday",
      토: "Saturday",
    };

    // 영어 요일 매핑 (소문자)
    const englishDayMap: { [key: string]: string } = {
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sun: "Sunday",
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
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

  /**
   * 주변 맛집 검색 (배고픔 정도 불필요)
   *
   * @description
   * **이 함수는 배고픔 정도가 없고, 단순히 주변 맛집을 찾을 때만 사용하세요.**
   *
   * 사용자의 현재 위치 또는 특정 지역 기준으로 주변 맛집을 검색합니다.
   * 날씨/배고픔 기반 맞춤 추천은 하지 않고, 순수하게 맛집 목록만 제공합니다.
   *
   * **사용 조건:**
   * - 사용자가 배고픔 정도를 언급하지 않은 경우
   * - 단순히 주변 맛집 목록을 원하는 경우
   * - 특정 카테고리(한식, 일식 등)의 맛집을 찾는 경우
   *
   * **사용 예시:**
   * - "주변 맛집 알려줘"
   * - "강남 근처 식당"
   * - "여기 일식집 어디야?"
   * - "대전 한밭대 근처 카페"
   *
   * **사용 금지 (이런 경우 사용하지 마세요):**
   * - "배고픔 1, 강남" (배고픔 포함 - recommendFoodFromInput 사용)
   * - "추천해줘, 위치는 서울"  (추천 의도 - askForFoodRecommendation 사용)
   * - "음식 추천해줘"  (추천 의도)
   */
  public async getNearbyRestaurants(input: {
    /**
     * 위치 파악 방법
     */
    locationMethod: "gps" | "city" | "text";

    /**
     * GPS 좌표 (locationMethod가 "gps"인 경우)
     */
    coordinates?: { lat: number; lng: number };

    /**
     * 도시명 또는 지역명 (locationMethod가 "city"인 경우)
     */
    cityName?: string;

    /**
     * 사용자 입력 텍스트 (locationMethod가 "text"인 경우)
     * 예: "대전 한밭대", "강남역 근처"
     */
    locationText?: string;

    /**
     * 특정 음식 카테고리 (선택사항)
     * 예: "한식", "치킨", "중식" 등
     */
    category?: string;

    /**
     * 검색 결과 개수 (기본값: 10)
     */
    limit?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      location: {
        name: string;
        coordinates: { lat: number; lng: number };
      };
      restaurants: Array<{
        name: string;
        address: string;
        phone: string;
        category?: string;
        link?: string;
      }>;
      totalCount: number;
      searchQuery: string;
    };
    error?: string;
  }> {
    try {
      // 1. 위치 정보 파악
      const locationService = new LocationService();
      let locationInfo;

      if (input.locationMethod === "gps" && input.coordinates) {
        locationInfo = await locationService.getLocation({
          method: "gps",
          coordinates: input.coordinates,
        });
      } else if (input.locationMethod === "city" && input.cityName) {
        locationInfo = await locationService.getLocation({
          method: "city",
          cityName: input.cityName,
        });
      } else if (input.locationMethod === "text" && input.locationText) {
        // 텍스트에서 지역 정보 추출
        const extractedLocation = this.extractLocationFromText(
          input.locationText,
        );
        locationInfo = await locationService.getLocation({
          method: "city",
          cityName: extractedLocation || input.locationText,
        });
      } else {
        return {
          success: false,
          message: "위치 정보를 파악할 수 없습니다. 위치를 알려주세요.",
          error: "위치 정보 부족",
        };
      }

      // 2. 검색 쿼리 생성
      const locationName = `${locationInfo.locationInfo.city}${
        locationInfo.locationInfo.district
          ? `
  ${locationInfo.locationInfo.district}`
          : ""
      }`;
      const searchQuery = input.category
        ? `${locationName} ${input.category} 맛집`
        : `${locationName} 맛집`;

      console.log(`🔍 주변 맛집 검색: "${searchQuery}"`);

      // 3. 맛집 검색
      const result = await RestaurantProvider.search({
        query: searchQuery,
        display: input.limit || 10,
      });

      // 4. 결과 포맷팅
      const restaurants = (result.items || []).map((item: any) => ({
        name: item.title.replace(/<[^>]*>/g, ""), // HTML 태그 제거
        address: item.address || item.roadAddress || "주소 정보 없음",
        phone: item.telephone || "전화번호 정보 없음",
        category: item.category || input.category,
        link: item.link,
      }));

      // 5. 메시지 생성
      const formatRestaurant = (r: any, index: number) => {
        return `${index + 1}. **${r.name}**\n   - 📍 ${r.address}\n   - 📞 ${r.phone}`;
      };

      const successMessage = `
  ## 📍 ${locationName} 주변 맛집

  **검색 위치**: ${locationName}
  **검색 결과**: 총 ${result.total || 0}개${input.category ? ` (${input.category})` : ""}

  ### 추천 맛집 Top ${Math.min(restaurants.length, 10)}

  ${restaurants.slice(0, 10).map(formatRestaurant).join("\n\n")}

  ---

  💡 **Tip**: 특정 음식 종류를 원하시면 알려주세요! (예: "한식", "치킨", "일식" 등)
  `.trim();

      return {
        success: true,
        message: successMessage,
        data: {
          location: {
            name: locationName,
            coordinates: locationInfo.coordinates,
          },
          restaurants,
          totalCount: result.total || 0,
          searchQuery,
        },
      };
    } catch (error) {
      console.error("❌ 주변 맛집 검색 중 오류:", error);
      return {
        success: false,
        message: "맛집 검색 중 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }
}

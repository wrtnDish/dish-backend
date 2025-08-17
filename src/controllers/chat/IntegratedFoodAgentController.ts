import { 
  IFoodRecommendationRequest, 
  IFoodRecommendationResponse, 
  FullnessLevel 
} from "../../api/structures/food/IFoodRecommendation";
import { ILatLng } from "../../api/structures/weather/IWeatherForecast";
import { IFoodEvaluationRequest } from "../../api/structures/food/IFoodCategory";
import { FoodService } from "../../services/FoodService";
import { FoodEvaluationService } from "../../services/FoodEvaluationService";
import { WeatherService } from "../../services/WeatherService";
import { WeatherAnalysisService } from "../../services/WeatherAnalysisService";
import { FoodScoringService } from "../../services/FoodScoringService";

/**
 * 통합 음식 추천 AI 에이전트 컨트롤러
 * 
 * @description
 * 날씨 기반 음식 평가와 포만감 기반 추천을 통합한 AI 에이전트용 컨트롤러입니다.
 * 
 * **통합 추천 플로우:**
 * 1. 사용자: "뭐 먹을까?"
 * 2. AI: askForLocationAndFullness() - 위치와 포만감 질문
 * 3. 사용자: 위치 정보와 포만감 레벨 응답
 * 4. AI: getIntegratedFoodRecommendation() - 날씨 + 포만감 통합 추천
 * 
 * **추천 과정:**
 * - 위치 → 날씨 조회 → 날씨 적합 음식 카테고리 분석
 * - 포만감 → 식사량 및 시간대 분석
 * - 두 결과를 종합하여 최종 추천
 */
export class IntegratedFoodAgentController {  
  private readonly foodService: FoodService;
  private readonly foodEvaluationService: FoodEvaluationService;
  private readonly weatherService: WeatherService;
  
  constructor() {
    // 서비스 인스턴스들을 직접 생성 (의존성 주입 대신)
    this.weatherService = new WeatherService();
    this.foodService = new FoodService();
    
    const weatherAnalysisService = new WeatherAnalysisService();
    const foodScoringService = new FoodScoringService();
    
    this.foodEvaluationService = new FoodEvaluationService(
      this.weatherService,
      weatherAnalysisService,
      foodScoringService
    );
  }

  /**
   * 포만감 정도만 질문하기 - 음식 추천 시작점
   * 
   * @description
   * 사용자가 음식 추천을 요청할 때 반드시 이 함수를 먼저 호출하세요.
   * 다른 함수들은 절대 먼저 호출하지 마세요.
   * 이 함수로 포만감을 질문한 후, 사용자 응답을 받으면 getIntegratedFoodRecommendation을 호출하세요.
   * 
   * @returns 포만감 질문 정보
   */
  public askForFullnessOnly(): {
    question: string;
    fullnessOptions: Array<{
      level: FullnessLevel;
      description: string;
      emoji: string;
    }>;
    instruction: string;
  } {
    return {
      question: "음식을 추천해드리기 위해 현재 포만감 정도를 알려주세요!",
      fullnessOptions: [
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
      instruction: "1부터 3까지의 숫자로 답해주세요. (3: 매우 배고픔, 2: 보통, 1: 배부름)"
    };
  }

  /**
   * 위치와 포만감 정보 질문하기 (특별한 경우에만 사용)
   * 
   * @description
   * 위치 정보가 정말 필요한 특별한 상황에서만 사용하세요.
   * 일반적인 음식 추천에는 askForFullnessOnly를 사용하는 것이 좋습니다.
   * 
   * @returns 위치와 포만감 질문 정보
   */
  public askForLocationAndFullness(): {
    question: string;
    locationInstruction: string;
    fullnessOptions: {
      level: FullnessLevel;
      description: string;
      emoji: string;
    }[];
    instruction: string;
  } {
    return {
      question: "맞춤 음식을 추천해드리기 위해 현재 위치와 포만감 정도를 알려주세요!",
      locationInstruction: "현재 계신 지역명을 말씀해주세요 (예: 서울, 부산, 강남구 등)",
      fullnessOptions: [
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
      instruction: "위치와 포만감 레벨(1-3)을 함께 알려주세요. 예: '서울, 3' 또는 '강남, 2'"
    };
  }

  /**
   * 통합 음식 추천 (날씨 + 포만감) - 두 번째 단계
   * 
   * @description
   * askForFullnessOnly로 포만감을 질문한 후, 사용자가 포만감 레벨을 응답했을 때만 호출하세요.
   * 사용자의 포만감 상태를 고려하여 현재 위치의 날씨를 기반으로 한 종합적인 음식 추천을 제공합니다.
   * 위치 정보는 자동으로 감지됩니다.
   * 
   * @param request - 통합 추천 요청 정보
   * @returns 날씨와 포만감을 모두 고려한 음식 추천
   */
  public async getIntegratedFoodRecommendation(request: {
    /**
     * 포만감 레벨 (1-3)
     */
    fullness: FullnessLevel;
    
    /**
     * 위치 정보 (선택사항, 없으면 기본 위치 사용)
     */
    location?: ILatLng;
    
    /**
     * 추가 선호도 (선택사항)
     */
    preferences?: string;
  }): Promise<{
    weatherAnalysis: any;
    fullnessAnalysis: any;
    weatherBasedCategories: any[];
    integratedRecommendation: string;
    finalSuggestion: string;
    metadata: {
      weatherSuccess: boolean;
      recommendationTime: string;
      location: ILatLng;
      fullnessLevel: FullnessLevel;
    };
  }> {
    const startTime = new Date();
    
    // 기본 위치 설정 (대전)
    const defaultLocation: ILatLng = { lat: 36.3518, lng: 127.3005 };
    const location = request.location || defaultLocation;

    try {
      // 1. 날씨 기반 음식 평가 수행
      const weatherEvaluation = await this.foodEvaluationService.evaluateFoodByWeather({
        location: location
      });

      // 2. 포만감 기반 분석 수행
      const fullnessAnalysis = this.foodService.analyzeHungerLevel(request.fullness);

      // 3. 통합 추천 메시지 생성
      const integratedRecommendation = this.generateIntegratedRecommendation(
        weatherEvaluation,
        fullnessAnalysis,
        request.preferences
      );

      // 4. 최종 제안 생성
      const finalSuggestion = this.generateFinalSuggestion(
        weatherEvaluation.topCategories,
        fullnessAnalysis,
        weatherEvaluation.weather
      );

      return {
        weatherAnalysis: {
          conditions: weatherEvaluation.weather,
          summary: `현재 날씨는 ${weatherEvaluation.weather.temperature === 'hot' ? '더운' : weatherEvaluation.weather.temperature === 'cold' ? '추운' : '온화한'} 날씨이고, 습도는 ${weatherEvaluation.weather.humidity === 'high' ? '높은' : weatherEvaluation.weather.humidity === 'low' ? '낮은' : '보통'} 상태입니다.`
        },
        fullnessAnalysis: {
          status: fullnessAnalysis.status,
          recommendedPortion: fullnessAnalysis.recommendedPortion,
          advice: fullnessAnalysis.advice
        },
        weatherBasedCategories: weatherEvaluation.topCategories,
        integratedRecommendation,
        finalSuggestion,
        metadata: {
          weatherSuccess: weatherEvaluation.metadata.weatherDataSuccess,
          recommendationTime: startTime.toISOString(),
          location: location,
          fullnessLevel: request.fullness
        }
      };

    } catch (error) {
      // 날씨 조회 실패 시 포만감만으로 추천
      return this.getFallbackRecommendation(request, startTime);
    }
  }

  /**
   * 포만감만으로 추천 (날씨 조회 실패 시)
   */
  private async getFallbackRecommendation(request: any, startTime: Date) {
    const fullnessAnalysis = this.foodService.analyzeHungerLevel(request.fullness);
    const timeBasedRecommendation = this.foodService.getTimeBasedMealRecommendation(new Date().getHours());

    return {
      weatherAnalysis: {
        conditions: null,
        summary: "날씨 정보를 가져올 수 없어 포만감과 시간을 기준으로 추천드립니다."
      },
      fullnessAnalysis,
      weatherBasedCategories: [],
      integratedRecommendation: `${fullnessAnalysis.advice} ${timeBasedRecommendation.recommendation}`,
      finalSuggestion: `현재 ${timeBasedRecommendation.mealType} 시간이고 ${fullnessAnalysis.status}. ${timeBasedRecommendation.appropriateFoods.join(', ')} 등을 고려해보세요.`,
      metadata: {
        weatherSuccess: false,
        recommendationTime: startTime.toISOString(),
        location: request.location,
        fullnessLevel: request.fullness
      }
    };
  }

  /**
   * 통합 추천 메시지 생성 - 수정 필요
   */
  private generateIntegratedRecommendation(
    weatherEvaluation: any,
    fullnessAnalysis: any,
    preferences?: string
  ): string {
    const weatherCategories = weatherEvaluation.topCategories.map((cat: any) => cat.nameKo);
    const currentHour = new Date().getHours();
    const timeBasedRecommendation = this.foodService.getTimeBasedMealRecommendation(currentHour);

    let message = `현재 날씨에 맞는 음식은 ${weatherCategories.join(', ')} 등이 좋습니다. `;
    
    if (fullnessAnalysis.recommendedPortion === 'minimal') {
      message += `배부르신 상태이니 지금은 드시지 않거나 가벼운 간식 정도만 드시는 것이 좋겠습니다.`;
    } else if (fullnessAnalysis.recommendedPortion === 'light') {
      message += `가볍게 드실 수 있는 ${weatherCategories[0]} 정도가 적당하겠습니다.`;
    } else if (fullnessAnalysis.recommendedPortion === 'normal') {
      message += `적당한 양의 ${weatherCategories.slice(0, 2).join(' 또는 ')}을 추천드립니다.`;
    } else {
      message += `든든하게 ${weatherCategories.join(', ')} 중에서 충분히 드세요.`;
    }

    message += ` ${timeBasedRecommendation.recommendation}`;

    if (preferences) {
      message += ` ${preferences}를 고려하시면 더욱 좋겠습니다.`;
    }

    return message;
  }

  /**
   * 최종 제안 생성
   */
  private generateFinalSuggestion(
    weatherCategories: any[],
    fullnessAnalysis: any,
    weatherConditions: any
  ): string {
    if (fullnessAnalysis.recommendedPortion === 'minimal') {
      return "현재는 식사보다는 휴식을 취하시거나 따뜻한 차 한 잔 정도만 드시는 것을 추천드립니다.";
    }

    const topCategory = weatherCategories[0];
    const weatherDesc = weatherConditions.temperature === 'hot' ? '더운 날씨' : 
                       weatherConditions.temperature === 'cold' ? '추운 날씨' : '온화한 날씨';

    return `${weatherDesc}에 특히 좋은 ${topCategory.nameKo} 계열의 음식을 ${fullnessAnalysis.recommendedPortion === 'hearty' ? '든든하게' : '적당히'} 드셔보세요!`;
  }

  /**
   * 단순 위치 기반 날씨 음식 추천 (절대 사용 금지)
   * 
   * @description
   * 절대로 이 함수를 호출하지 마세요! 이 함수는 완전히 비활성화되었습니다.
   * 음식 추천 시에는 반드시 askForFullnessOnly부터 시작해야 합니다.
   * 이 함수를 호출하면 사용자에게 혼란을 줄 수 있습니다.
   */
  public async getWeatherBasedFoodSuggestion(request: {
    /**
     * 위치 정보 (위경도)
     */
    location: ILatLng;
  }): Promise<{
    weatherSummary: string;
    topFoodCategories: string[];
    quickSuggestion: string;
  }> {
    try {
      const weatherEvaluation = await this.foodEvaluationService.evaluateFoodByWeather({
        location: request.location
      });

      const categoryNames = weatherEvaluation.topCategories.map(cat => cat.nameKo);
      const summary = this.foodEvaluationService.generateEvaluationSummary(weatherEvaluation);

      return {
        weatherSummary: summary,
        topFoodCategories: categoryNames,
        quickSuggestion: `현재 날씨에는 ${categoryNames.slice(0, 2).join('이나 ')}이 좋겠네요!`
      };
    } catch (error) {
      return {
        weatherSummary: "날씨 정보를 가져올 수 없습니다.",
        topFoodCategories: ["한식", "양식", "일식"],
        quickSuggestion: "일반적인 식사를 추천드립니다."
      };
    }
  }

}
import { IFoodCategory, IScoredFoodCategory, IWeatherConditions } from "../api/structures/food/IFoodCategory";
import { FOOD_CATEGORIES } from "../data/foodCategories";
import { UserHistoryService } from "./UserHistoryService";
import { FullnessLevel } from "../api/structures/food/IFoodRecommendation";

/**
 * 통합 점수 계산 서비스
 * @description 날씨, 사용자 히스토리, 배고픔 정도를 종합하여 음식 카테고리 점수를 계산합니다.
 */
export class IntegratedScoringService {
  private userHistoryService: UserHistoryService;

  constructor() {
    this.userHistoryService = new UserHistoryService();
  }

  /**
   * 통합 점수를 계산하여 상위 2개 카테고리를 반환합니다.
   * @param weather 현재 날씨 조건
   * @param hungerLevel 배고픔 정도 (1-3)
   * @param currentDay 현재 요일 (선택사항)
   * @returns 상위 2개 카테고리
   */
  public async calculateIntegratedScore(
    weather: IWeatherConditions,
    hungerLevel: FullnessLevel,
    currentDay?: string
  ): Promise<IScoredFoodCategory[]> {
    try {
      // 1. 사용자 히스토리 기반 선호도 점수 가져오기
      const dayPreferenceMap = await this.userHistoryService.analyzeDayPreference(currentDay);
      
      // 2. 모든 카테고리에 대해 통합 점수 계산
      const scoredCategories = FOOD_CATEGORIES.map(category => {
        const integratedScore = this.calculateCategoryScore(
          category,
          weather,
          hungerLevel,
          dayPreferenceMap
        );

        return {
          ...category,
          score: integratedScore.totalScore,
          rank: 0, // 나중에 설정
          reason: integratedScore.reason
        } as IScoredFoodCategory;
      });

      // 3. 점수 순으로 정렬하고 순위 부여
      const sortedCategories = scoredCategories
        .sort((a, b) => b.score - a.score)
        .map((category, index) => ({
          ...category,
          rank: index + 1
        }));

      // 4. 상위 2개 카테고리 반환
      const topTwoCategories = sortedCategories.slice(0, 2);

      console.log("\n=== 통합 점수 계산 결과 (상위 5개) ===");
      sortedCategories.slice(0, 5).forEach(category => {
        console.log(`${category.rank}. ${category.nameKo}: ${category.score.toFixed(2)}점 - ${category.reason}`);
      });

      return topTwoCategories;
    } catch (error) {
      console.error("통합 점수 계산 중 오류 발생:", error);
      
      // 오류 발생 시 기본 카테고리 반환
      return this.getDefaultCategories();
    }
  }

  /**
   * 개별 카테고리의 통합 점수를 계산합니다.
   * @param category 음식 카테고리
   * @param weather 날씨 조건
   * @param hungerLevel 배고픔 정도
   * @param dayPreferenceMap 요일별 선호도 맵
   * @returns 총 점수와 근거
   */
  private calculateCategoryScore(
    category: IFoodCategory,
    weather: IWeatherConditions,
    hungerLevel: FullnessLevel,
    dayPreferenceMap: Map<string, number>
  ): { totalScore: number; reason: string } {
    let totalScore = 0;
    const reasons: string[] = [];

    // 1. 날씨 기반 점수 (0-40점)
    const weatherScore = this.calculateWeatherScore(category, weather);
    totalScore += weatherScore.score;
    if (weatherScore.score > 0) {
      reasons.push(weatherScore.reason);
    }

    // 2. 사용자 히스토리 기반 점수 (0-30점)
    const historyScore = this.calculateHistoryScore(category, dayPreferenceMap);
    totalScore += historyScore.score;
    if (historyScore.score > 0) {
      reasons.push(historyScore.reason);
    }

    // 3. 배고픔 정도 기반 점수 (0-20점)
    const hungerScore = this.calculateHungerScore(category, hungerLevel);
    totalScore += hungerScore.score;
    if (hungerScore.score > 0) {
      reasons.push(hungerScore.reason);
    }

    // 4. 기본 점수 (10점) - 모든 카테고리에 공통 적용
    totalScore += 10;

    const reason = reasons.length > 0 ? reasons.join(", ") : "기본 점수";

    return {
      totalScore: Math.round(totalScore * 100) / 100, // 소수점 2자리로 반올림
      reason
    };
  }

  /**
   * 날씨 기반 점수를 계산합니다.
   * @param category 음식 카테고리
   * @param weather 날씨 조건
   * @returns 점수와 근거
   */
  private calculateWeatherScore(
    category: IFoodCategory,
    weather: IWeatherConditions
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 온도 기반 점수 (0-25점)
    const tempScore = this.getTemperatureScore(category.serveTemp, weather.temperature);
    score += tempScore.score;
    if (tempScore.score > 0) {
      reasons.push(tempScore.reason);
    }

    // 습도 기반 점수 (0-15점)
    const humidityScore = this.getHumidityScore(category, weather.humidity);
    score += humidityScore.score;
    if (humidityScore.score > 0) {
      reasons.push(humidityScore.reason);
    }

    return {
      score,
      reason: reasons.join(", ")
    };
  }

  /**
   * 온도 기반 점수를 계산합니다.
   */
  private getTemperatureScore(
    serveTemp: string,
    weatherTemp: string
  ): { score: number; reason: string } {
    if (weatherTemp === "hot") {
      // 더운 날씨: 차가운 음식 선호
      if (serveTemp.includes("cold")) {
        return { score: 25, reason: "더운 날씨에 시원한 음식" };
      } else if (serveTemp.includes("warm & cold")) {
        return { score: 20, reason: "더운 날씨에 시원하게 드실 수 있는 음식" };
      }
    } else if (weatherTemp === "cold") {
      // 추운 날씨: 뜨거운 음식 선호
      if (serveTemp === "hot") {
        return { score: 25, reason: "추운 날씨에 따뜻한 음식" };
      } else if (serveTemp === "warm") {
        return { score: 20, reason: "추운 날씨에 따뜻한 음식" };
      }
    } else {
      // 온화한 날씨: 모든 온도 적당
      if (serveTemp === "warm") {
        return { score: 15, reason: "온화한 날씨에 적당한 온도" };
      } else if (serveTemp.includes("warm & cold")) {
        return { score: 12, reason: "온화한 날씨에 다양하게 즐길 수 있는 음식" };
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * 습도 기반 점수를 계산합니다.
   */
  private getHumidityScore(
    category: IFoodCategory,
    humidity: string
  ): { score: number; reason: string } {
    if (humidity === "high") {
      // 높은 습도: 가벼운 음식, 시원한 음식 선호
      if (category.nameKo.includes("샐러드") || category.nameKo.includes("회") || 
          category.nameKo.includes("디저트")) {
        return { score: 15, reason: "습한 날씨에 가벼운 음식" };
      }
    } else if (humidity === "low") {
      // 낮은 습도: 국물 있는 음식 선호
      if (category.nameKo.includes("찜/탕") || category.nameKo.includes("죽") ||
          category.nameKo.includes("커피/차")) {
        return { score: 15, reason: "건조한 날씨에 수분 보충 음식" };
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * 사용자 히스토리 기반 점수를 계산합니다.
   * @param category 음식 카테고리
   * @param dayPreferenceMap 요일별 선호도 맵
   * @returns 점수와 근거
   */
  private calculateHistoryScore(
    category: IFoodCategory,
    dayPreferenceMap: Map<string, number>
  ): { score: number; reason: string } {
    const preferenceScore = dayPreferenceMap.get(category.nameKo) || 0;
    
    if (preferenceScore > 0) {
      // 선호도 점수를 30점 만점으로 변환
      const score = (preferenceScore / 10) * 30;
      return {
        score,
        reason: `이 요일에 자주 드시는 음식 (선호도: ${preferenceScore.toFixed(1)})`
      };
    }

    return { score: 0, reason: "" };
  }

  /**
   * 배고픔 정도 기반 점수를 계산합니다.
   * @param category 음식 카테고리
   * @param hungerLevel 배고픔 정도
   * @returns 점수와 근거
   */
  private calculateHungerScore(
    category: IFoodCategory,
    hungerLevel: FullnessLevel
  ): { score: number; reason: string } {
    if (hungerLevel === 3) {
      // 매우 배고픔: 든든한 음식 선호
      if (this.isHeartyFood(category)) {
        return { score: 20, reason: "배고픈 상태에 든든한 음식" };
      }
    } else if (hungerLevel === 2) {
      // 보통: 적당한 음식 선호
      if (this.isModerateFood(category)) {
        return { score: 15, reason: "적당한 배고픔에 맞는 음식" };
      }
    } else if (hungerLevel === 1) {
      // 배부름: 가벼운 음식 선호
      if (this.isLightFood(category)) {
        return { score: 20, reason: "배부른 상태에 가벼운 음식" };
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * 든든한 음식인지 판단합니다.
   */
  private isHeartyFood(category: IFoodCategory): boolean {
    const heartyFoods = ["한식", "찜/탕", "구이", "중식", "돈까스", "치킨", "버거"];
    return heartyFoods.includes(category.nameKo);
  }

  /**
   * 적당한 음식인지 판단합니다.
   */
  private isModerateFood(category: IFoodCategory): boolean {
    const moderateFoods = ["피자", "양식", "일식", "분식", "샌드위치", "도시락", "아시안"];
    return moderateFoods.includes(category.nameKo);
  }

  /**
   * 가벼운 음식인지 판단합니다.
   */
  private isLightFood(category: IFoodCategory): boolean {
    const lightFoods = ["샐러드", "디저트", "커피/차", "간식", "죽"];
    return lightFoods.includes(category.nameKo);
  }

  /**
   * 오류 발생 시 기본 카테고리를 반환합니다.
   */
  private getDefaultCategories(): IScoredFoodCategory[] {
    return [
      {
        ...FOOD_CATEGORIES[4], // 한식
        score: 50,
        rank: 1,
        reason: "기본 추천"
      },
      {
        ...FOOD_CATEGORIES[5], // 치킨
        score: 45,
        rank: 2,
        reason: "기본 추천"
      }
    ];
  }
}

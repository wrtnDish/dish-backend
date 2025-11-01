import { IFoodCategory, IScoredFoodCategory, IWeatherConditions } from "../api/structures/food/IFoodCategory";
import { FullnessLevel } from "../api/structures/food/IFoodRecommendation";
import { FOOD_CATEGORIES } from "../data/foodCategories";
import { UserHistoryService } from "./UserHistoryService";


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
    currentDay?: string,
  ): Promise<IScoredFoodCategory[]> {
    try {
      // 1. 사용자 히스토리 기반 선호도 점수 가져오기
      const dayPreferenceMap =
        await this.userHistoryService.analyzeDayPreference(currentDay);

      // 2. 모든 카테고리에 대해 통합 점수 계산
      const scoredCategories = FOOD_CATEGORIES.map((category) => {
        const integratedScore = this.calculateCategoryScore(
          category,
          weather,
          hungerLevel,
          dayPreferenceMap,
        );

        return {
          ...category,
          score: integratedScore.totalScore,
          rank: 0, // 나중에 설정
          reason: integratedScore.reason,
        } as IScoredFoodCategory;
      });

      // 3. 점수 순으로 정렬하고 순위 부여
      const sortedCategories = scoredCategories
        .sort((a, b) => b.score - a.score)
        .map((category, index) => ({
          ...category,
          rank: index + 1,
        }));

      // 4. 상위 2개 카테고리 반환
      const topTwoCategories = sortedCategories.slice(0, 2);

      console.log("\n=== 통합 점수 계산 결과 (상위 5개) ===");
      sortedCategories.slice(0, 5).forEach((category) => {
        console.log(
          `${category.rank}. ${category.nameKo}: ${category.score.toFixed(2)}점 - ${category.reason}`,
        );
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
    dayPreferenceMap: Map<string, number>,
  ): { totalScore: number; reason: string } {
    let totalScore = 0;
    const reasons: string[] = [];

    // 1. 사용자 히스토리 기반 점수 (0-50점) - 가장 높은 가중치
    const historyScore = this.calculateHistoryScore(category, dayPreferenceMap);
    totalScore += historyScore.score;
    if (historyScore.score > 0) {
      reasons.push(historyScore.reason);
    }

    // 2. 배고픔 정도 기반 점수 (0-30점) - 두 번째 우선순위로 상향
    const hungerScore = this.calculateHungerScore(category, hungerLevel);
    totalScore += hungerScore.score;
    if (hungerScore.score > 0) {
      reasons.push(hungerScore.reason);
    }

    // 배고픔 페널티: 배부를 때 헤비한 음식에 큰 감점
    if (hungerLevel === 1 && this.isHeartyFood(category)) {
      totalScore -= 25; // 큰 페널티 부여
      reasons.push("배부른 상태에 부담스러운 음식");
    }

    // 3. 날씨 기반 점수 (0-25점) - 세 번째 우선순위
    const weatherScore = this.calculateWeatherScore(category, weather);
    totalScore += weatherScore.score;
    if (weatherScore.score > 0) {
      reasons.push(weatherScore.reason);
    }

    // 4. 기본 점수 (10점) - 모든 카테고리에 공통 적용
    totalScore += 10;

    // 최소 점수는 0점으로 제한
    totalScore = Math.max(0, totalScore);

    const reason = reasons.length > 0 ? reasons.join(", ") : "기본 점수";

    return {
      totalScore: Math.round(totalScore * 100) / 100, // 소수점 2자리로 반올림
      reason,
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
    weather: IWeatherConditions,
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 온도 기반 점수 (0-20점) - 찜/탕은 추운 날씨에 최대 20점
    const tempScore = this.getTemperatureScore(
      category.serveTemp,
      weather.temperature,
      category,
    );
    score += tempScore.score;
    if (tempScore.score > 0) {
      reasons.push(tempScore.reason);
    }

    // 습도 기반 점수 (0-10점) - 가중치 감소
    const humidityScore = this.getHumidityScore(category, weather.humidity);
    score += humidityScore.score;
    if (humidityScore.score > 0) {
      reasons.push(humidityScore.reason);
    }

    return {
      score,
      reason: reasons.join(", "),
    };
  }

  /**
   * 온도 기반 점수를 계산합니다.
   */
  private getTemperatureScore(
    serveTemp: string,
    weatherTemp: string,
    category: IFoodCategory,
  ): { score: number; reason: string } {
    if (weatherTemp === "hot") {
      // 더운 날씨: 차가운 음식 선호
      if (serveTemp.includes("cold")) {
        return { score: 15, reason: "더운 날씨에 시원한 음식" }; // 25점 → 15점
      } else if (serveTemp.includes("warm & cold")) {
        return { score: 12, reason: "더운 날씨에 시원하게 드실 수 있는 음식" }; // 20점 → 12점
      }
    } else if (weatherTemp === "cold") {
      // 추운 날씨: 뜨거운 음식 선호
      if (serveTemp === "hot") {
        // 찜/탕 카테고리에 추가 가산점
        if (category.nameKo === "찜/탕") {
          return { score: 17, reason: "추운 날씨에 뜨끈한 국물 음식" }; // 찜/탕 특별 가산점
        }
        if (category.nameKo === "한식") {
          return { score: 16, reason: "추운 날씨에 뜨끈한 국물 음식" }; // 찜/탕 특별 가산점
        }
        return { score: 15, reason: "추운 날씨에 따뜻한 음식" }; // 25점 → 15점
      } else if (serveTemp === "warm") {
        return { score: 12, reason: "추운 날씨에 따뜻한 음식" }; // 20점 → 12점
      }
    } else {
      // 온화한 날씨: 모든 온도 적당
      if (serveTemp === "warm") {
        return { score: 9, reason: "온화한 날씨에 적당한 온도" }; // 15점 → 9점
      } else if (serveTemp.includes("warm & cold")) {
        return { score: 7, reason: "온화한 날씨에 다양하게 즐길 수 있는 음식" }; // 12점 → 7점
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * 습도 기반 점수를 계산합니다.
   */
  private getHumidityScore(
    category: IFoodCategory,
    humidity: string,
  ): { score: number; reason: string } {
    if (humidity === "high") {
      // 높은 습도: 가벼운 음식, 시원한 음식 선호
      if (
        category.nameKo.includes("샐러드") ||
        category.nameKo.includes("회") ||
        category.nameKo.includes("디저트")
      ) {
        return { score: 10, reason: "습한 날씨에 가벼운 음식" }; // 15점 → 10점
      }
    } else if (humidity === "low") {
      // 낮은 습도: 국물 있는 음식 선호
      if (
        category.nameKo.includes("찜/탕") ||
        category.nameKo.includes("죽") ||
        category.nameKo.includes("커피/차")
      ) {
        return { score: 10, reason: "건조한 날씨에 수분 보충 음식" }; // 15점 → 10점
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
    dayPreferenceMap: Map<string, number>,
  ): { score: number; reason: string } {
    const preferenceScore = dayPreferenceMap.get(category.nameKo) || 0;

    if (preferenceScore > 0) {
      // 선호도 점수를 50점 만점으로 변환 (가중치 대폭 증가)
      const score = (preferenceScore / 10) * 50;
      return {
        score,
        reason: `이 요일에 자주 드시는 음식 (선호도: ${preferenceScore.toFixed(1)})`,
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
    hungerLevel: FullnessLevel,
  ): { score: number; reason: string } {
    if (hungerLevel === 3) {
      // 매우 배고픔: 든든한 음식 선호
      if (this.isHeartyFood(category)) {
        return { score: 30, reason: "배고픈 상태에 든든한 음식" }; // 가중치 대폭 상향
      }
      if (this.isModerateFood(category)) {
        return { score: 15, reason: "배고픈 상태에 적당한 음식" };
      }
      // 가벼운 음식은 점수 없음 (배고플 때 부적합)
    } else if (hungerLevel === 2) {
      // 보통: 적당한 음식 선호
      if (this.isModerateFood(category)) {
        return { score: 25, reason: "적당한 배고픔에 맞는 음식" }; // 가중치 상향
      }
      if (this.isHeartyFood(category)) {
        return { score: 15, reason: "든든하게 드실 수 있는 음식" };
      }
      if (this.isLightFood(category)) {
        return { score: 10, reason: "가볍게 드실 수 있는 음식" };
      }
    } else if (hungerLevel === 1) {
      // 배부름: 가벼운 음식 선호
      if (this.isLightFood(category)) {
        return { score: 30, reason: "배부른 상태에 가벼운 음식" }; // 가중치 대폭 상향
      }
      if (this.isModerateFood(category)) {
        return { score: 10, reason: "가볍게 드실 수 있는 음식" };
      }
      // 헤비한 음식은 점수 없음 + 페널티는 calculateCategoryScore에서 적용
    }

    return { score: 0, reason: "" };
  }

  /**
   * 든든한 음식인지 판단합니다.
   */
  private isHeartyFood(category: IFoodCategory): boolean {
    const heartyFoods = [
      "한식",
      "찜/탕",
      "구이",
      "중식",
      "돈까스",
      "치킨",
      "버거",
    ];
    return heartyFoods.includes(category.nameKo);
  }

  /**
   * 적당한 음식인지 판단합니다.
   */
  private isModerateFood(category: IFoodCategory): boolean {
    const moderateFoods = [
      "피자",
      "양식",
      "일식",
      "분식",
      "샌드위치",
      "도시락",
      "아시안",
    ];
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
        reason: "기본 추천",
      },
      {
        ...FOOD_CATEGORIES[5], // 치킨
        score: 45,
        rank: 2,
        reason: "기본 추천",
      },
    ];
  }

  /**
   * 오늘 요일의 음식 선택 통계를 조회합니다.
   *
   * @description
   * 사용자가 오늘 요일에 과거에 선택했던 음식 카테고리의 통계를 보여줍니다.
   * 추천 받기 전에 자신의 선택 패턴을 확인할 수 있습니다.
   *
   * @example
   * 사용자: "오늘 월요일에 내가 주로 뭐 먹었어?"
   * 사용자: "내 선택 통계 보여줘"
   */
  public async getTodayFoodStatistics(): Promise<{
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
      const stats = await userHistoryService.getDaySelectionStats();

      if (stats.totalSelections === 0) {
        return {
          success: true,
          message: `아직 ${stats.dayKo}에 선택하신 음식 기록이 없습니다. 추천을 받고 실제로 드신 음식을 알려주시면 통계가 쌓여요!`,
          data: stats
        };
      }

      // Markdown 포맷으로 통계 메시지 생성
      const medalEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const statsLines = stats.topSelections.map((item, index) =>
        `${medalEmojis[index]} **${item.category}** - ${item.count}번 (${item.percentage}%)`
      ).join('\n');

      const message = `
  ## ${stats.dayKo} 음식 선택 통계

  지금까지 **${stats.dayKo}**에 총 **${stats.totalSelections}번** 음식을 선택하셨네요!

  ### 선택 Top ${stats.topSelections.length}
  ${statsLines}

  이 정보를 참고해서 새로운 추천을 받아보세요! 
  `.trim();

      return {
        success: true,
        message,
        data: stats
      };

    } catch (error) {
      console.error("통계 조회 중 오류:", error);
      return {
        success: false,
        message: "통계를 불러오는 중 오류가 발생했습니다."
      };
    }
  }
}

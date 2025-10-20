import { Injectable } from "@nestjs/common";



import { IFoodCategory, IScoredFoodCategory, IWeatherConditions, ServeTemperature, WeatherHumidity } from "../api/structures/food/IFoodCategory";
import { FOOD_CATEGORIES } from "../data/foodCategories";


/**
 * 습도-제공온도 점수 매트릭스 타입
 * @description 가이드라인에 따른 습도와 제공온도 조합별 점수
 */
type HumidityServeTemperatureMatrix = {
  [K in WeatherHumidity]: {
    [T in Exclude<ServeTemperature, "warm & cold">]: number;
  };
};

/**
 * 음식 점수 계산 서비스
 * @description 날씨 조건에 따른 음식 카테고리별 점수를 계산하는 서비스
 */
@Injectable()
export class FoodScoringService {
  
  /**
   * 습도-제공온도 점수 매트릭스
   * @description 가이드라인 v3.0에 정의된 점수 체계
   * 
   * 습도 / 제공온도 | cold | warm | hot
   * ---------------|------|------|----
   * high           |  3   |  2   |  1
   * moderate       |  2   |  3   |  2  
   * low            |  1   |  2   |  3
   */
  private readonly HUMIDITY_SERVE_TEMP_MATRIX: HumidityServeTemperatureMatrix = {
    "high": { "cold": 3, "warm": 2, "hot": 1 },
    "moderate": { "cold": 2, "warm": 3, "hot": 2 },
    "low": { "cold": 1, "warm": 2, "hot": 3 }
  };

  /**
   * 날씨 조건에 따른 모든 음식 카테고리 점수 계산
   * @param weatherConditions 현재 날씨 조건
   * @returns 점수가 계산된 음식 카테고리 목록 (점수 내림차순, ID 오름차순 정렬)
   */
  public calculateAllFoodScores(weatherConditions: IWeatherConditions): IScoredFoodCategory[] {
    
    const scoredCategories = FOOD_CATEGORIES.map((category, index) => {
      const score = this.calculateCategoryScore(category, weatherConditions);
      const reason = this.generateScoreReason(category, weatherConditions, score);
      
      return {
        ...category,
        score,
        rank: 0, // 정렬 후 할당
        reason
      };
    });

    // 정렬: 1차 - totalScore 내림차순, 2차 - ID 오름차순 (가이드라인 기준)
    const sortedCategories = scoredCategories.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // 점수 내림차순
      }
      return a.id - b.id; // ID 오름차순 (동점 처리)
    });

    // 순위 할당
    return sortedCategories.map((category, index) => ({
      ...category,
      rank: index + 1
    }));
  }

  /**
   * 특정 음식 카테고리의 점수 계산
   * @param category 음식 카테고리
   * @param weatherConditions 날씨 조건
   * @returns 계산된 점수
   */
  private calculateCategoryScore(category: IFoodCategory, weatherConditions: IWeatherConditions): number {
    return this.calculateHumidityServeTemperatureScore(category.serveTemp, weatherConditions.humidity);
  }

  /**
   * 습도-제공온도 매트릭스 기반 점수 계산
   * @param serveTemp 음식 제공 온도
   * @param humidity 현재 습도 분류
   * @returns 매트릭스 기반 점수
   */
  private calculateHumidityServeTemperatureScore(serveTemp: ServeTemperature, humidity: WeatherHumidity): number {
    
    // 복합 온도 처리: "warm & cold"인 경우 두 점수 중 더 높은 것 선택
    if (serveTemp === "warm & cold") {
      const coldScore = this.HUMIDITY_SERVE_TEMP_MATRIX[humidity]["cold"];
      const warmScore = this.HUMIDITY_SERVE_TEMP_MATRIX[humidity]["warm"];
      return Math.max(coldScore, warmScore);
    }

    // 단일 온도인 경우 해당 점수 반환
    return this.HUMIDITY_SERVE_TEMP_MATRIX[humidity][serveTemp as Exclude<ServeTemperature, "warm & cold">];
  }

  /**
   * 점수 산출 근거 텍스트 생성
   * @param category 음식 카테고리
   * @param weatherConditions 날씨 조건
   * @param score 계산된 점수
   * @returns 점수 산출 근거 설명
   */
  private generateScoreReason(category: IFoodCategory, weatherConditions: IWeatherConditions, score: number): string {
    const humidityDesc = this.getHumidityDescription(weatherConditions.humidity);
    const serveTempDesc = this.getServeTempDescription(category.serveTemp);
    
    if (category.serveTemp === "warm & cold") {
      const coldScore = this.HUMIDITY_SERVE_TEMP_MATRIX[weatherConditions.humidity]["cold"];
      const warmScore = this.HUMIDITY_SERVE_TEMP_MATRIX[weatherConditions.humidity]["warm"];
      const selectedTemp = coldScore > warmScore ? "차가운" : "따뜻한";
      return `${selectedTemp} 음식 + ${humidityDesc}`;
    }

    return `${serveTempDesc} + ${humidityDesc}`;
  }

  /**
   * 상위 N개 추천 카테고리 선택
   * @param scoredCategories 점수가 계산된 카테고리 목록
   * @param topN 선택할 상위 개수 (기본값: 3)
   * @returns 상위 N개 카테고리
   */
  public selectTopCategories(scoredCategories: IScoredFoodCategory[], topN: number = 3): IScoredFoodCategory[] {
    return scoredCategories.slice(0, Math.min(topN, scoredCategories.length));
  }

  /**
   * 습도 분류에 대한 한국어 설명
   */
  private getHumidityDescription(humidity: WeatherHumidity): string {
    switch (humidity) {
      case "high":
        return "높은 습도";
      case "moderate":
        return "보통 습도";
      case "low":
        return "낮은 습도";
      default:
        return "알 수 없는 습도";
    }
  }

  /**
   * 제공 온도에 대한 한국어 설명
   */
  private getServeTempDescription(serveTemp: ServeTemperature): string {
    switch (serveTemp) {
      case "hot":
        return "뜨거운 음식";
      case "warm":
        return "따뜻한 음식";
      case "cold":
        return "차가운 음식";
      case "warm & cold":
        return "따뜻하거나 차가운 음식";
      default:
        return "알 수 없는 온도의 음식";
    }
  }

  /**
   * 점수 계산 통계 정보 생성
   * @param scoredCategories 점수가 계산된 카테고리 목록
   * @returns 점수 계산 통계
   */
  public generateScoringStatistics(scoredCategories: IScoredFoodCategory[]): {
    totalCategories: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    scoreDistribution: { [score: number]: number };
  } {
    const scores = scoredCategories.map(c => c.score);
    const totalCategories = scoredCategories.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalCategories;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 점수별 카테고리 개수 분포
    const scoreDistribution: { [score: number]: number } = {};
    scores.forEach(score => {
      scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
    });

    return {
      totalCategories,
      averageScore: Math.round(averageScore * 100) / 100, // 소수점 2자리
      maxScore,
      minScore,
      scoreDistribution
    };
  }
}
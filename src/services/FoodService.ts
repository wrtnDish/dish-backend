import { Injectable } from "@nestjs/common";
import { 
  IFoodRecommendationRequest, 
  IFoodRecommendationResponse, 
  FullnessLevel 
} from "../api/structures/food/IFoodRecommendation";

/**
 * 음식 추천 서비스
 * 
 * @description
 * 사용자의 포만감 상태를 분석하고 적절한 음식을 추천하는 비즈니스 로직을 담당하는 서비스입니다.
 * 
 * 주요 기능:
 * - 포만감 레벨 분석 및 해석
 * - 시간대별 적절한 식사 추천
 * - 사용자 선호도 고려한 맞춤 추천
 * - 건강한 식습관 조언 제공
 * 
 * @example
 * ```typescript
 * const foodService = new FoodService();
 * const recommendation = await foodService.recommendFood({
 *   fullness: 3,
 *   preferences: "한식 좋아해"
 * });
 * ```
 */
@Injectable()
export class FoodService {

  /**
   * 포만감 기반 음식 추천
   * 
   * @description
   * 사용자의 현재 포만감 상태와 기타 선호도를 종합하여 적절한 음식을 추천합니다.
   * 
   * @param request - 음식 추천 요청 정보
   * @returns 포만감 상태에 따른 음식 추천 및 조언
   */
  public async recommendFood(request: IFoodRecommendationRequest): Promise<IFoodRecommendationResponse> {
    const currentTime = new Date();
    const hour = currentTime.getHours();

    // 포만감 레벨 분석
    const fullnessAnalysis = this.analyzeFullness(request.fullness);
    
    // 권장 식사량 결정
    const recommendedPortion = this.getRecommendedPortion(request.fullness);
    
    // 추천 메시지 생성
    const message = this.generateRecommendationMessage(
      request.fullness, 
      hour, 
      request.preferences
    );

    return {
      message,
      fullnessAnalysis,
      recommendedPortion,
      metadata: {
        success: true,
        timestamp: currentTime.toISOString(),
        fullnessLevel: request.fullness,
      },
    };
  }

  /**
   * 포만감 상태 분석
   * 
   * @description
   * 사용자의 포만감 수준을 받아서 현재 상태를 분석하고 일반적인 조언을 제공합니다.
   * 
   * @param fullness - 포만감 레벨 (1-3)
   * @returns 포만감 분석 결과
   */
  public analyzeHungerLevel(fullness: FullnessLevel): {
    status: string;
    recommendedPortion: "minimal" | "light" | "normal" | "hearty";
    advice: string;
  } {
    const analysis = this.analyzeFullness(fullness);
    const portion = this.getRecommendedPortion(fullness);
    const advice = this.getGeneralAdvice(fullness);

    return {
      status: analysis,
      recommendedPortion: portion,
      advice,
    };
  }

  /**
   * 현재 시간에 적합한 식사 유형 추천
   *
   * @description
   * 현재 시간대를 분석하여 적절한 식사나 간식을 추천합니다.
   *
   * @param hour - 현재 시간 (0-23)
   * @returns 시간대별 추천 식사 유형
   */
  public getTimeBasedMealRecommendation(hour: number): {
    mealType: string;
    recommendation: string;
    appropriateFoods: string[];
  } {
    if (hour >= 6 && hour < 10) {
      return {
        mealType: "아침식사",
        recommendation: "하루를 시작하는 든든한 아침 식사를 추천드립니다",
        appropriateFoods: ["밥류", "시리얼", "토스트", "계란 요리", "과일"]
      };
    } else if (hour >= 10 && hour < 12) {
      return {
        mealType: "브런치",
        recommendation: "아침과 점심을 겸한 브런치가 좋겠습니다",
        appropriateFoods: ["브런치 세트", "샐러드", "샌드위치", "베이글", "스무디"]
      };
    } else if (hour >= 12 && hour < 15) {
      return {
        mealType: "점심식사",
        recommendation: "오후 활동을 위한 충분한 점심 식사를 하세요",
        appropriateFoods: ["한식", "중식", "일식", "양식", "도시락"]
      };
    } else if (hour >= 15 && hour < 18) {
      return {
        mealType: "간식시간",
        recommendation: "가벼운 간식으로 소소한 배고픔을 달래보세요",
        appropriateFoods: ["커피", "차", "과자", "과일", "견과류"]
      };
    } else if (hour >= 18 && hour < 22) {
      return {
        mealType: "저녁식사",
        recommendation: "하루를 마무리하는 맛있는 저녁 식사 시간입니다",
        appropriateFoods: ["가정식", "외식", "찌개류", "구이류", "면류"]
      };
    } else {
      return {
        mealType: "야식",
        recommendation: "늦은 시간이니 가벼운 음식을 추천드립니다",
        appropriateFoods: ["죽", "우유", "바나나", "요거트", "따뜻한 차"]
      };
    }
  }

  // ======== 내부 유틸리티 메서드들 ========

  /**
   * 포만감 상태 분석
   */
  private analyzeFullness(fullness: FullnessLevel): string {
    if (fullness === 3) {
      return "매우 배고픈 상태입니다";
    } else if (fullness === 2) {
      return "보통 상태입니다";
    } else {
      return "배부른 상태입니다";
    }
  }

  /**
   * 권장 식사량 결정
   */
  private getRecommendedPortion(fullness: FullnessLevel): "minimal" | "light" | "normal" | "hearty" {
    if (fullness === 3) {
      return "hearty";
    } else if (fullness === 2) {
      return "normal";
    } else {
      return "minimal";
    }
  }

  /**
   * 추천 메시지 생성
   */
  private generateRecommendationMessage(
    fullness: FullnessLevel, 
    hour: number, 
    preferences?: string
  ): string {
    const timeAdvice = this.getTimeBasedAdvice(hour);
    const fullnessAdvice = this.getFullnessBasedAdvice(fullness);
    const preferenceNote = preferences ? ` ${preferences}를 고려하여,` : "";

    if (fullness === 3) {
      return `${fullnessAdvice}${preferenceNote} ${timeAdvice} 든든한 식사를 하시는 것을 추천드립니다. 영양가 있는 음식으로 충분히 드세요.`;
    } else if (fullness === 2) {
      return `${fullnessAdvice}${preferenceNote} ${timeAdvice} 적당한 식사를 하시면 좋겠습니다. 균형 잡힌 음식을 추천드립니다.`;
    } else {
      return `${fullnessAdvice} 지금은 드시지 않는 것이 좋겠습니다. 조금 더 시간이 지난 후에 간식 정도만 드세요.`;
    }
  }

  /**
   * 시간대별 조언
   */
  private getTimeBasedAdvice(hour: number): string {
    if (hour >= 6 && hour < 10) {
      return "아침 시간이니";
    } else if (hour >= 10 && hour < 12) {
      return "브런치 시간이니";
    } else if (hour >= 12 && hour < 15) {
      return "점심 시간이니";
    } else if (hour >= 15 && hour < 18) {
      return "간식 시간이니";
    } else if (hour >= 18 && hour < 22) {
      return "저녁 시간이니";
    } else {
      return "늦은 시간이니";
    }
  }

  /**
   * 포만감 기반 조언
   */
  private getFullnessBasedAdvice(fullness: FullnessLevel): string {
    if (fullness === 3) {
      return "많이 배고프시군요!";
    } else if (fullness === 2) {
      return "적당히 배고프시네요.";
    } else {
      return "배부르신 상태입니다.";
    }
  }

  /**
   * 일반적인 조언
   */
  private getGeneralAdvice(fullness: FullnessLevel): string {
    if (fullness === 3) {
      return "든든한 식사를 하시는 것이 좋겠습니다. 영양가 있는 음식을 충분히 드세요.";
    } else if (fullness === 2) {
      return "적당한 식사량으로 드시면 됩니다. 균형 잡힌 식사를 권장합니다.";
    } else {
      return "지금은 먹지 않는 것이 좋겠습니다. 조금 더 시간이 지난 후에 간식 정도만 드세요.";
    }
  }

}

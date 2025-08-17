import { Controller, Post, Body } from "@nestjs/common";
import core, { TypedRoute } from "@nestia/core";
import { IFoodRecommendationRequest, IFoodRecommendationResponse, FullnessLevel } from "../../api/structures/food/IFoodRecommendation";
import { FoodService } from "../../services/FoodService";

/**
 * 음식 추천 HTTP API 컨트롤러
 * 
 * @description
 * 클라이언트에서 HTTP 요청을 통해 음식 추천 서비스를 이용할 수 있도록 하는 컨트롤러입니다.
 * 포만감 기반 음식 추천, 시간대별 식사 추천 등의 기능을 REST API로 제공합니다.
 * 
 * @tag Food
 * @summary 음식 추천 API
 */
@Controller("food")
export class FoodController {
  private readonly foodService: FoodService;

  constructor() {
    this.foodService = new FoodService();
  }

  /**
   * 포만감 기반 음식 추천 API
   * 
   * @description
   * 사용자의 현재 포만감 상태를 받아서 적절한 음식을 추천하는 HTTP API입니다.
   * 클라이언트에서 POST 요청으로 포만감 레벨과 선호도를 전송하면
   * 맞춤형 음식 추천 결과를 반환합니다.
   * 
   * @param request - 음식 추천 요청 정보
   * @returns 포만감 상태에 따른 음식 추천 및 조언
   * 
   * @example
   * ```typescript
   * // HTTP POST /food/recommend
   * const response = await fetch('/food/recommend', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     fullness: 3,
   *     preferences: "한식 좋아해"
   *   })
   * });
   * const recommendation = await response.json();
   * ```
   * 
   * @summary 포만감 기반 음식 추천
   * @tag Food
   */
  @TypedRoute.Post("recommend")
  public async recommendFood(
    @core.TypedBody() request: IFoodRecommendationRequest
  ): Promise<IFoodRecommendationResponse> {
    return await this.foodService.recommendFood(request);
  }

  /**
   * 포만감 상태 분석 API
   * 
   * @description
   * 사용자의 포만감 수준을 받아서 현재 상태를 분석하고 일반적인 조언을 제공하는 API입니다.
   * 음식 추천보다는 단순히 배고픔 상태만 확인하고 싶을 때 사용합니다.
   * 
   * @param params - 분석 요청 파라미터
   * @returns 포만감 분석 결과
   * 
   * @summary 포만감 상태 분석
   * @tag Food
   */
  @TypedRoute.Post("analyze")
  public analyzeHungerLevel(@core.TypedBody() params: {
    /**
     * 포만감 레벨 (1-3)
     * @description 1: 매우 배부름, 3: 매우 배고픔
     */
    fullness: FullnessLevel;
  }): {
    /**
     * 현재 상태 설명
     */
    status: string;

    /**
     * 권장 식사량
     */
    recommendedPortion: "minimal" | "light" | "normal" | "hearty";

    /**
     * 일반적인 조언
     */
    advice: string;
  } {
    return this.foodService.analyzeHungerLevel(params.fullness);
  }

}
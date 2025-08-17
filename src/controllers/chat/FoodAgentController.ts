import { 
  IFoodRecommendationRequest, 
  IFoodRecommendationResponse, 
  FullnessLevel 
} from "../../api/structures/food/IFoodRecommendation";
import { FoodService } from "../../services/FoodService";

/**
 * AI 에이전트가 사용할 수 있는 음식 추천 기능 컨트롤러
 * 
 * @description
 * 이 클래스는 Agentica AI 에이전트가 LLM Function Calling을 통해
 * 음식 추천 관련 기능을 사용할 수 있도록 제공하는 컨트롤러입니다.
 * 
 * AI 모델이 사용자에게 포만감을 질문하고, 그 응답에 따라 적절한 음식을 추천합니다.
 * 
 * **포만감 레벨:**
 * - 3: 매우 배고픔
 * - 2: 보통
 * - 1: 배부름
 * 
 * **사용 플로우:**
 * 1. 사용자: "식당 추천해줘"
 * 2. AI: askForFullness() 호출하여 포만감 질문
 * 3. 사용자: 포만감 응답 (1-3)
 * 4. AI: recommendFoodByFullness() 호출하여 추천 제공
 * 
 * @example
 * ```typescript
 * // 사용자: "식당 추천해줘"
 * const question = await askForFullness();
 * // AI가 사용자에게 포만감을 물어봄
 * 
 * // 사용자: "3" (매우 배고픔)
 * const recommendation = await recommendFoodByFullness({
 *   fullness: 3
 * });
 * ```
 */
export class FoodAgentController {
  /**
   * 음식 추천 서비스 인스턴스
   * @description FoodService를 통해 실제 음식 추천 비즈니스 로직 처리
   */
  private readonly foodService: FoodService;

  constructor() {
    this.foodService = new FoodService();
  }

  /**
   * 포만감 정도 질문하기
   * 
   * @description
   * 사용자가 "식당 추천해줘", "뭐 먹을까?" 등의 질문을 했을 때
   * AI가 포만감을 물어보기 위해 사용하는 함수입니다.
   * 
   * 이 함수는 포만감 레벨을 질문하는 메시지와 선택지를 반환합니다.
   * 
   * @returns 포만감 질문 메시지와 선택지
   * 
   * @example
   * ```typescript
   * // 사용자: "식당 추천해줘"
   * const question = await askForFullness();
   * // AI가 반환받은 메시지로 사용자에게 포만감을 질문
   * ```
   */
  public askForFullness(): {
    /**
     * 질문 메시지
     */
    question: string;

    /**
     * 포만감 선택지
     */
    options: {
      level: FullnessLevel;
      description: string;
      emoji: string;
    }[];

    /**
     * 안내 메시지
     */
    instruction: string;
  } {
    return {
      question: "음식을 추천해드리기 전에 현재 포만감 정도를 알려주세요!",
      options: [
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
   * 포만감 기반 음식 추천
   * 
   * @description
   * 사용자의 포만감 상태(1-3)를 받아서 적절한 음식을 추천합니다.
   * askForFullness()로 포만감을 질문한 후, 사용자의 응답을 받아 이 함수를 호출합니다.
   * 
   * @param request - 음식 추천 요청 정보
   * @param request.fullness - 포만감 레벨 (3: 매우 배고픔, 2: 보통, 1: 배부름)
   * @param request.preferences - 추가 선호도나 요구사항 (선택사항)
   * 
   * @returns 포만감 상태에 따른 음식 추천 및 조언
   * 
   * @example
   * ```typescript
   * // 매우 배고픈 상태 (3)
   * const result = await recommendFoodByFullness({
   *   fullness: 3,
   *   preferences: "한식 좋아해"
   * });
   * // result.message: "든든한 한식을 추천드립니다..."
   * 
   * // 배부른 상태 (1)
   * const result = await recommendFoodByFullness({
   *   fullness: 1
   * });
   * // result.message: "지금은 드시지 않는 것이 좋겠습니다..."
   * ```
   */
  public async recommendFoodByFullness(request: {
    /**
     * 포만감 레벨 (1-3)
     * @description 3: 매우 배고픔, 2: 보통, 1: 배부름
     */
    fullness: FullnessLevel;

    /**
     * 추가 선호도 (선택사항)
     * @description 음식 취향, 제약사항 등
     */
    preferences?: string;
  }): Promise<IFoodRecommendationResponse> {
    
    const requestData: IFoodRecommendationRequest = {
      fullness: request.fullness,
      preferences: request.preferences,
    };

    return await this.foodService.recommendFood(requestData);
  }


}

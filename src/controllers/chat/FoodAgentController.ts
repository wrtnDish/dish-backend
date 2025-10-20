import { FullnessLevel, IFoodRecommendationRequest, IFoodRecommendationResponse } from "../../api/structures/food/IFoodRecommendation";
import { FoodService } from "../../services/FoodService";
import { MessageAnalyzer } from "../../utils/MessageAnalyzer";


/**
 * 기본 음식 추천 컨트롤러 (비활성화됨)
 * 
 * @deprecated 이 컨트롤러는 더 이상 사용하지 않습니다.
 * IntegratedFoodAgentController의 askForFoodRecommendation()을 사용하세요.
 * 
 * @description
 * ⚠️ 이 컨트롤러는 중복 응답 문제로 인해 비활성화되었습니다.
 * 모든 음식 추천 기능은 IntegratedFoodAgentController로 통합되었습니다.
 * 
 * **주요 기능:**
 * - 사용자 메시지 분석 (음식 추천/맛집 검색 의도 파악)
 * - 포만감 정보 누락 시 자동 질문 트리거
 * - 포만감 기반 맞춤형 음식 추천
 * 
 * **포만감 레벨:**
 * - 3: 매우 배고픔
 * - 2: 보통
 * - 1: 배부름
 * 
 * **사용 플로우 (자동 포만감 질문):**
 * 1. 사용자: "음식 추천해줘" (포만감 정보 없음)
 * 2. AI: analyzeUserMessage()로 메시지 분석
 * 3. AI: shouldAskForFullness가 true이면 askForFullness() 호출
 * 4. 사용자: 포만감 응답 (1-3)
 * 5. AI: recommendFoodByFullness() 호출하여 추천 제공
 *
 * **사용 플로우 (포만감 정보 포함):**
 * 1. 사용자: "배고파서 음식 추천해줘" (포만감 정보 포함)
 * 2. AI: analyzeUserMessage()로 메시지 분석
 * 3. AI: 포만감 추출 후 바로 recommendFoodByFullness() 호출
 *
 * @example
 * ```typescript
 * // 포만감 정보 없는 경우
 * const analysis = analyzeUserMessage({ userMessage: "식당 추천해줘" });
 * if (analysis.shouldAskForFullness) {
 *   const question = askForFullness();
 *   // AI가 사용자에게 포만감을 물어봄
 * }
 *
 * // 포만감 정보 있는 경우
 * const analysis = analyzeUserMessage({ userMessage: "배고파서 뭐 먹을까" });
 * if (analysis.hasFullnessInfo) {
 *   const recommendation = await recommendFoodByFullness({
 *     fullness: 3  // 메시지에서 추출한 포만감
 *   });
 * }
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
   * 사용자 메시지 분석 및 포만감 질문 필요성 판단
   *
   * @description
   * 사용자의 메시지를 분석하여 음식 추천이나 맛집 검색 의도를 파악하고,
   * 포만감 정보가 없는 경우 포만감 질문이 필요한지 판단합니다.
   *
   * @param request - 분석 요청 정보
   * @param request.userMessage - 분석할 사용자 메시지
   * @returns 메시지 분석 결과 및 포만감 질문 필요성
   *
   * @example
   * ```typescript
   * // 사용자: "음식 추천해줘"
   * const analysis = analyzeUserMessage({ userMessage: "음식 추천해줘" });
   * // analysis.shouldAskForFullness === true
   * ```
   */
  /**
   * @deprecated 이 메소드는 더 이상 사용하지 않습니다. IntegratedFoodAgentController.askForFoodRecommendation()을 사용하세요.
   * @hidden
   */
  private analyzeUserMessage(request: {
    /**
     * 분석할 사용자 메시지
     */
    userMessage: string;
  }): {
    /**
     * 음식 추천 의도 감지 여부
     */
    isFoodRecommendation: boolean;

    /**
     * 맛집 검색 의도 감지 여부
     */
    isRestaurantSearch: boolean;

    /**
     * 포만감 정보 포함 여부
     */
    hasFullnessInfo: boolean;

    /**
     * 포만감 질문 필요 여부
     */
    shouldAskForFullness: boolean;

    /**
     * 분석 이유
     */
    analysisReason: string;

    /**
     * 다음 액션 권장사항
     */
    recommendedAction: string;
  } {
    const analysis = MessageAnalyzer.analyzeMessage(request.userMessage);

    let recommendedAction = "";

    if (analysis.shouldAskForFullness) {
      recommendedAction = "askForFullness() 함수를 호출하여 포만감을 질문하세요.";
    } else if (analysis.hasFullnessInfo) {
      recommendedAction = "메시지에서 포만감 정보를 추출하여 recommendFoodByFullness()를 호출하세요.";
    } else {
      recommendedAction = "음식/맛집 관련 질문이 아니므로 일반적인 응답을 제공하세요.";
    }

    return {
      ...analysis,
      recommendedAction
    };
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
   */
  /**
   * @deprecated 이 메소드는 더 이상 사용하지 않습니다. IntegratedFoodAgentController.askForFoodRecommendation()을 사용하세요.
   * @hidden
   */
  private askForFullness(): {
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
  /**
   * @deprecated 이 메소드는 더 이상 사용하지 않습니다. IntegratedFoodAgentController.getSmartFoodRecommendation()을 사용하세요.
   * @hidden
   */
  private async recommendFoodByFullness(request: {
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

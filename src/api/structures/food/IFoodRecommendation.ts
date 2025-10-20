import { tags } from "typia";


/**
 * 포만감 레벨
 * @description 사용자의 현재 포만감 정도를 나타내는 1-3 점수
 */
export type FullnessLevel = number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>;

/**
 * 음식 추천 요청 정보
 * @description 사용자의 포만감 상태를 기반으로 한 음식 추천 요청
 */
export interface IFoodRecommendationRequest {
  /**
   * 포만감 레벨 (1-3)
   * @description 3: 매우 배고픔, 2: 보통, 1: 배부름
   */
  fullness: FullnessLevel;

  /**
   * 추가 요구사항 (선택사항)
   * @description 특별한 선호도나 제약사항
   */
  preferences?: string;
}

/**
 * 음식 추천 응답 정보
 * @description AI의 음식 추천 결과
 */
export interface IFoodRecommendationResponse {
  /**
   * 추천 메시지
   * @description 포만감 상태에 따른 음식 추천 내용
   */
  message: string;

  /**
   * 포만감 분석
   * @description 현재 포만감 상태에 대한 분석
   */
  fullnessAnalysis: string;

  /**
   * 권장 식사량
   * @description 현재 상태에 적합한 식사량
   */
  recommendedPortion: "minimal" | "light" | "normal" | "hearty";

  /**
   * 메타데이터
   */
  metadata: {
    success: boolean;
    timestamp: string & tags.Format<"date-time">;
    fullnessLevel: FullnessLevel;
  };
}
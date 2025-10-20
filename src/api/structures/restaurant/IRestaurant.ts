import { tags } from "typia";


/**
 * Restaurant search API - SIMPLIFIED
 */
export namespace IRestaurant {
  /**
   * Restaurant search request
   */
  export interface IRequest {
    /**
     * 음식점 검색 쿼리 - 간단하게 물어보세요!
     * 
     * 예시:
     * - "서울 맛집"
     * - "강남 맛집 알려줘"
     * - "대전 카페"
     * - "맛집 추천해줘"
     *
     * 네이버 API 결과를 그대로 반환합니다.
     */
    query: string & tags.MinLength<1>;

    /**
     * 결과 개수 (기본값: 5)
     */
    display?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<20>;
  }
}
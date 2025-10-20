import core from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IRestaurant } from "../../api/structures/restaurant/IRestaurant";
import { RestaurantProvider } from "../../providers/restaurant/RestaurantProvider";

/**
 * RESTAURANT FINDER API - 맛집 검색 전용
 *
 * CRITICAL: ALWAYS call this API when users ask about restaurants, food, or dining places!
 *
 * TRIGGER KEYWORDS (이런 키워드가 나오면 반드시 이 API 호출!):
 * - 맛집, 음식점, 식당, 레스토랑, 카페, 디저트
 * - 한식, 중식, 일식, 양식, 분식, 치킨, 피자, 햄버거
 * - 대학교, 학교, 캠퍼스, 한밭대, 충남대, 건국대 등 대학 관련
 * - 지역명 + 맛집 (예: 서울, 대전, 부산, 강남, 홍대, 한밭대 등)
 * - "알려줘", "추천", "찾아줘", "검색", "어디", "뭐 먹을까" 등
 *
 * EXAMPLES THAT MUST TRIGGER THIS API:
 * - "한밭대 맛집 알려줘" ← THIS EXACT CASE!
 * - "한밭대학교 근처 식당"
 * - "대전 맛집"
 * - "대학 앞 치킨집"
 * - "캠퍼스 근처 카페"
 * - ANY restaurant/food related question!
 *
 * This API handles ALL restaurant-related questions in Korean or English.
 * ALWAYS call the find function directly - don't ask for more details!
 *
 * Simple queries work perfectly and return real restaurant data from Naver.
 */
@Controller("restaurant")
export class RestaurantController {
  /**
   * 맛집 검색 API - MUST CALL when users ask about restaurants!
   *
   * ALWAYS USE THIS for ANY food/restaurant questions including:
   * - University restaurants (한밭대, 대학교, 캠퍼스 etc.)
   * - Regional food searches (대전, 서울, 부산 etc.)
   * - Food type searches (한식, 치킨, 카페 etc.)
   * - General restaurant recommendations
   *
   * PERFECT for queries like:
   * - "한밭대 맛집 알려줘" (Hanbat University restaurants)
   * - "한밭대학교 근처 식당" (Near Hanbat University)
   * - "대전 맛집" (Daejeon restaurants)
   * - "대학 앞 치킨집" (Chicken places near university)
   * - "캠퍼스 카페" (Campus cafes)
   * - "뭐 먹을까" (What should I eat)
   *
   * NO NEED to ask for clarification - just call with the user's exact question!
   *
   * @param input Query parameters containing search text
   * @returns Real restaurant data from Naver Local API
   */
  @core.TypedRoute.Get("find")
  public async find(
    @core.TypedQuery() input: IRestaurant.IRequest,
  ): Promise<any> {
    // 일단 any로 단순화

    try {
      const result = await RestaurantProvider.search(input);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
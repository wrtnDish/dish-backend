import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import axios from "axios";

import { IRestaurant } from "../../api/structures/restaurant/IRestaurant";
import { MyGlobal } from "../../MyGlobal";

/**
 * Restaurant search provider using Naver Local Search API
 */
export namespace RestaurantProvider {
  /**
   * Search restaurants
   * 
   * @param input Search request parameters
   * @returns Formatted restaurant search results
   */
  export async function search(
    input: IRestaurant.IRequest,
  ): Promise<any> {  // 일단 any로 간단하게
    
    try {
      // 네이버 API 직접 호출
      const naverResponse = await callNaverLocalAPI(input);
      
      // 네이버 API 결과 그대로 반환
      return naverResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Call Naver Local Search API directly
   * 
   * @param input Search parameters
   * @returns Naver API raw response
   */
  async function callNaverLocalAPI(input: IRestaurant.IRequest): Promise<any> {
    // API 키 확인
    const clientId = MyGlobal.env.NAVER_CLIENT_ID;
    const clientSecret = MyGlobal.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException("Naver API keys not configured");
    }

    try {
      const response = await axios.get("https://openapi.naver.com/v1/search/local.json", {
        params: {
          query: input.query,
          display: input.display ?? 5,
          sort: "comment"
        },
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        timeout: 10000, // 10초 타임아웃
      });

      return response.data;  // axios는 자동으로 JSON 파싱!
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new InternalServerErrorException(`Naver API failed: ${error.response.status}`);
        } else if (error.request) {
          throw new InternalServerErrorException("Network error: No response from Naver API");
        }
      }
      throw new InternalServerErrorException("Unknown error occurred");
    }
  }

  // 포맷팅 함수들 제거 - 일단 네이버 API 결과 그대로 반환
} 
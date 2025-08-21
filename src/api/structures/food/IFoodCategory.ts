import { tags } from "typia";

/**
 * 음식 제공 온도 타입
 * @description 음식이 제공되는 온도 형태
 */
export type ServeTemperature = "hot" | "warm" | "cold" | "warm & cold";

/**
 * 날씨 온도 분류
 * @description 기온에 따른 날씨 분류
 */
export type WeatherTemperature = "hot" | "moderate" | "cold";

/**
 * 날씨 습도 분류  
 * @description 습도에 따른 날씨 분류
 */
export type WeatherHumidity = "high" | "moderate" | "low";

/**
 * 음식 카테고리 정보
 * @description 날씨 기반 음식 추천을 위한 카테고리 데이터
 */
export interface IFoodCategory {
  /**
   * 카테고리 고유 ID
   * @description 음식 카테고리를 구분하는 고유 식별자
   */
  id: number & tags.Type<"uint32">;

  /**
   * 카테고리 영문명
   * @description 음식 카테고리의 영문 이름
   */
  name: string;

  /**
   * 카테고리 한글명
   * @description 음식 카테고리의 한글 이름
   */
  nameKo: string;

  /**
   * 음식 제공 온도
   * @description 해당 음식이 주로 제공되는 온도 형태
   */
  serveTemp: ServeTemperature;

  /**
   * 카테고리 설명
   * @description 음식 카테고리에 대한 간단한 설명
   */
  description?: string;
}

/**
 * 날씨 조건 정보
 * @description 음식 추천을 위한 현재 날씨 조건
 */
export interface IWeatherConditions {
  /**
   * 온도 분류
   * @description 현재 기온에 따른 분류 (hot: 28°C↑, moderate: 18-27°C, cold: 17°C↓)
   */
  temperature: WeatherTemperature;

  /**
   * 습도 분류
   * @description 현재 습도에 따른 분류 (high: 70%↑, moderate: 40-69%, low: 39%↓)
   */
  humidity: WeatherHumidity;

  /**
   * 실제 기온 값
   * @description 섭씨 온도 (°C)
   */
  actualTemperature: number | null;

  /**
   * 실제 습도 값  
   * @description 상대습도 (%)
   */
  actualHumidity: number | null;
}

/**
 * 음식 카테고리 점수 정보
 * @description 날씨 조건에 따른 음식 카테고리 평가 점수
 */
export interface IScoredFoodCategory extends IFoodCategory {
  /**
   * 최종 점수
   * @description 날씨 조건을 반영한 최종 추천 점수
   */
  score: number;

  /**
   * 순위
   * @description 점수 기준 순위 (1부터 시작)
   */
  rank: number;

  /**
   * 점수 산출 근거
   * @description 해당 점수가 산출된 이유
   */
  reason: string;
}

/**
 * 음식 평가 요청 정보
 * @description 날씨 기반 음식 평가를 위한 요청 데이터
 */
export interface IFoodEvaluationRequest {
  /**
   * 위치 정보
   * @description 날씨 조회를 위한 위경도 좌표
   */
  location: {
    /**
     * 위도
     * @description 북위 기준, 대한민국 범위: 33.0 ~ 38.9
     */
    lat: number & tags.Minimum<33.0> & tags.Maximum<38.9>;

    /**
     * 경도
     * @description 동경 기준, 대한민국 범위: 124.0 ~ 132.0
     */
    lng: number & tags.Minimum<124.0> & tags.Maximum<132.0>;
  };
}

/**
 * 음식 평가 응답 정보
 * @description 날씨 기반 음식 평가 결과
 */
export interface IFoodEvaluationResponse {
  /**
   * 요청한 위치 정보
   */
  location: {
    lat: number;
    lng: number;
  };

  /**
   * 현재 날씨 조건
   */
  weather: IWeatherConditions;

  /**
   * 상위 추천 카테고리 목록
   * @description 점수 순으로 정렬된 상위 3개 카테고리
   */
  topCategories: IScoredFoodCategory[];

  /**
   * 평가 메타데이터
   */
  metadata: {
    /**
     * 평가 수행 시각
     */
    evaluatedAt: string & tags.Format<"date-time">;

    /**
     * 평가된 전체 카테고리 수
     */
    totalCategoriesEvaluated: number & tags.Type<"uint32">;

    /**
     * 날씨 데이터 조회 성공 여부
     */
    weatherDataSuccess: boolean;
  };
}
import { Controller } from "@nestjs/common";
import { TypedBody, TypedRoute } from "@nestia/core";
import { IFoodEvaluationRequest, IFoodEvaluationResponse, IFoodCategory } from "../../api/structures/food/IFoodCategory";
import { ILatLng } from "../../api/structures/weather/IWeatherForecast";
import { FoodEvaluationService } from "../../services/FoodEvaluationService";
import { FOOD_CATEGORIES } from "../../data/foodCategories";

/**
 * 음식 평가 컨트롤러
 * @description 날씨 기반 음식 추천 및 평가 API를 제공하는 컨트롤러
 */
@Controller("food")
export class FoodEvaluationController {
  
  constructor(private readonly foodEvaluationService: FoodEvaluationService) {}

  /**
   * 날씨 기반 음식 평가
   * 
   * @description
   * 사용자의 위치 정보를 받아 현재 날씨를 조회하고, 
   * 날씨 조건에 따라 적합한 음식 카테고리를 평가하여 상위 3개를 추천합니다.
   * 
   * **평가 기준:**
   * - 온도 분류: 더운 날씨(28°C↑), 온화한 날씨(18-27°C), 추운 날씨(17°C↓)
   * - 습도 분류: 높은 습도(70%↑), 보통 습도(40-69%), 낮은 습도(39%↓)
   * - 습도-제공온도 매트릭스를 활용한 점수 계산
   * 
   * **점수 매트릭스:**
   * ```
   * 습도 \ 제공온도 | 차가운 | 따뜻한 | 뜨거운
   * --------------|-------|-------|-------
   * 높은 습도      |   3   |   2   |   1
   * 보통 습도      |   2   |   3   |   2
   * 낮은 습도      |   1   |   2   |   3
   * ```
   * 
   * **정렬 기준:**
   * 1차: 점수 내림차순, 2차: 카테고리 ID 오름차순
   * 
   * @summary 날씨 기반 음식 평가
   * @tag Food
   * 
   * @param request - 평가 요청 정보
   * @param request.location - 위경도 좌표
   * @param request.location.lat - 위도 (33.0~38.9, 필수)
   * @param request.location.lng - 경도 (124.0~132.0, 필수)
   * 
   * @returns 날씨 기반 음식 평가 결과
   * @returns returns.location - 요청한 위치 정보
   * @returns returns.weather - 분석된 날씨 조건
   * @returns returns.topCategories - 상위 3개 추천 카테고리
   * @returns returns.metadata - 평가 메타데이터
   * 
   * @throws {400} 좌표가 대한민국 영역을 벗어난 경우
   * @throws {500} 날씨 조회 실패 등 내부 서버 오류
   * 
   * @example
   * ```typescript
   * // 서울 시청 기준 음식 추천
   * const response = await fetch('/food/evaluate', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     location: {
   *       lat: 37.5663,
   *       lng: 126.9779
   *     }
   *   })
   * });
   * 
   * const result = await response.json();
   * console.log(result.weather); // 현재 날씨 조건
   * console.log(result.topCategories); // 상위 3개 추천 음식
   * ```
   * 
   * @example
   * ```typescript
   * // 부산 기준 음식 추천
   * const result = await evaluateFood({
   *   location: { lat: 35.1796, lng: 129.0756 }
   * });
   * 
   * result.topCategories.forEach(category => {
   *   console.log(`${category.rank}위: ${category.nameKo} (점수: ${category.score})`);
   *   console.log(`이유: ${category.reason}`);
   * });
   * ```
   */
  @TypedRoute.Post("evaluate")
  public async evaluateFood(@TypedBody() request: IFoodEvaluationRequest): Promise<IFoodEvaluationResponse> {
    return await this.foodEvaluationService.evaluateFoodByWeather(request);
  }

  /**
   * 음식 카테고리 목록 조회
   * 
   * @description
   * 시스템에서 지원하는 모든 음식 카테고리 정보를 조회합니다.
   * 각 카테고리는 고유 ID, 이름, 제공 온도 등의 정보를 포함합니다.
   * 
   * **포함 정보:**
   * - 카테고리 ID 및 이름 (영문/한글)
   * - 제공 온도 (hot/warm/cold/warm & cold)
   * - 카테고리 설명
   * 
   * @summary 음식 카테고리 목록 조회
   * @tag Food
   * 
   * @returns 전체 음식 카테고리 목록
   * 
   * @example
   * ```typescript
   * // 모든 음식 카테고리 조회
   * const categories = await fetch('/food/categories').then(r => r.json());
   * 
   * categories.forEach(category => {
   *   console.log(`${category.id}: ${category.nameKo} (${category.name})`);
   *   console.log(`제공온도: ${category.serveTemp}`);
   * });
   * ```
   */
  @TypedRoute.Get("categories")
  public async getFoodCategories(): Promise<IFoodCategory[]> {
    return FOOD_CATEGORIES;
  }

  /**
   * 특정 위치의 날씨 조건 조회
   * 
   * @description
   * 음식 평가 없이 특정 위치의 날씨 조건만 조회합니다.
   * 날씨 데이터를 음식 추천용으로 분류한 결과를 반환합니다.
   * 
   * **조회 정보:**
   * - 온도 분류 (hot/moderate/cold)
   * - 습도 분류 (high/moderate/low)
   * - 실제 기온 및 습도 값
   * 
   * @summary 위치별 날씨 조건 조회
   * @tag Food
   * 
   * @param location - 위경도 좌표
   * @param location.lat - 위도 (33.0~38.9, 필수)
   * @param location.lng - 경도 (124.0~132.0, 필수)
   * 
   * @returns 음식 추천용 날씨 조건
   * 
   * @throws {400} 좌표가 대한민국 영역을 벗어난 경우
   * @throws {500} 날씨 조회 실패
   * 
   * @example
   * ```typescript
   * // 제주도 날씨 조건 조회
   * const weather = await fetch('/food/weather-conditions', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     lat: 33.4996,
   *     lng: 126.5312
   *   })
   * }).then(r => r.json());
   * 
   * console.log(`온도 분류: ${weather.temperature}`);
   * console.log(`습도 분류: ${weather.humidity}`);
   * console.log(`실제 기온: ${weather.actualTemperature}°C`);
   * ```
   */
  @TypedRoute.Post("weather-conditions")
  public async getWeatherConditions(@TypedBody() location: ILatLng) {
    return await this.foodEvaluationService.getWeatherConditionsForLocation(location);
  }

  /**
   * 음식 평가 결과 요약
   * 
   * @description
   * 음식 평가 결과를 사용자 친화적인 텍스트로 요약합니다.
   * 현재 날씨 정보와 추천 음식을 포함한 한 줄 요약을 제공합니다.
   * 
   * @summary 음식 평가 결과 요약
   * @tag Food
   * 
   * @param request - 평가 요청 정보 (evaluate API와 동일)
   * 
   * @returns 평가 결과 요약 텍스트
   * 
   * @example
   * ```typescript
   * // 평가 결과 요약 조회
   * const summary = await fetch('/food/evaluate-summary', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     location: { lat: 37.5663, lng: 126.9779 }
   *   })
   * }).then(r => r.json());
   * 
   * console.log(summary);
   * // 예: "현재 날씨(더운 날씨, 높은 습도) - 32°C, 습도 78%에 추천하는 음식: 냉면, 샐러드, 빙수/아이스크림"
   * ```
   */
  @TypedRoute.Post("evaluate-summary")
  public async getEvaluationSummary(@TypedBody() request: IFoodEvaluationRequest): Promise<{ summary: string }> {
    const evaluationResult = await this.foodEvaluationService.evaluateFoodByWeather(request);
    const summary = this.foodEvaluationService.generateEvaluationSummary(evaluationResult);
    
    return { summary };
  }
}
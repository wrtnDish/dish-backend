import { Injectable } from "@nestjs/common";
import { IFoodEvaluationRequest, IFoodEvaluationResponse } from "../api/structures/food/IFoodCategory";
import { ILatLng } from "../api/structures/weather/IWeatherForecast";
import { WeatherService } from "./WeatherService";
import { WeatherAnalysisService } from "./WeatherAnalysisService";
import { FoodScoringService } from "./FoodScoringService";

/**
 * 음식 평가 서비스
 * @description 날씨 기반 음식 추천을 위한 통합 평가 서비스
 */
@Injectable()
export class FoodEvaluationService {
  
  constructor(
    private readonly weatherService: WeatherService,
    private readonly weatherAnalysisService: WeatherAnalysisService,
    private readonly foodScoringService: FoodScoringService
  ) {}

  /**
   * 위치 기반 음식 평가 수행
   * @param request 음식 평가 요청 정보
   * @returns 날씨 기반 음식 평가 결과
   * 
   * @description
   * 1. 위치 정보로 현재 날씨 조회
   * 2. 날씨 데이터를 음식 추천용 조건으로 분석
   * 3. 모든 음식 카테고리에 대한 점수 계산
   * 4. 상위 3개 카테고리 선정 및 반환
   */
  public async evaluateFoodByWeather(request: IFoodEvaluationRequest): Promise<IFoodEvaluationResponse> {
    const evaluationStartTime = new Date();

    try {
      // 1. 현재 날씨 데이터 조회
      const weatherData = await this.weatherService.getCurrentWeather(request.location);
      
      // 2. 날씨 조건 분석
      const weatherConditions = this.weatherAnalysisService.analyzeWeatherForFoodRecommendation(weatherData);
      
      // 3. 모든 음식 카테고리 점수 계산
      const allScoredCategories = this.foodScoringService.calculateAllFoodScores(weatherConditions);
      
      // 4. 상위 3개 카테고리 선택
      const topCategories = this.foodScoringService.selectTopCategories(allScoredCategories, 3);

      return {
        location: request.location,
        weather: weatherConditions,
        topCategories,
        metadata: {
          evaluatedAt: evaluationStartTime.toISOString(),
          totalCategoriesEvaluated: allScoredCategories.length,
          weatherDataSuccess: weatherData.metadata.success
        }
      };

    } catch (error) {
      // 날씨 조회 실패 시 기본값으로 평가 수행
      return this.evaluateWithDefaultWeather(request, evaluationStartTime, error);
    }
  }

  /**
   * 날씨 조회 실패 시 기본값으로 평가 수행
   * @param request 원본 요청
   * @param evaluationStartTime 평가 시작 시간
   * @param error 발생한 에러
   * @returns 기본 날씨 조건으로 계산된 평가 결과
   */
  private evaluateWithDefaultWeather(
    request: IFoodEvaluationRequest, 
    evaluationStartTime: Date,
    error: any
  ): IFoodEvaluationResponse {
    
    // 기본 날씨 조건 (온화하고 보통 습도)
    const defaultWeatherConditions = {
      temperature: "moderate" as const,
      humidity: "moderate" as const,
      actualTemperature: null,
      actualHumidity: null
    };

    // 기본 조건으로 점수 계산
    const allScoredCategories = this.foodScoringService.calculateAllFoodScores(defaultWeatherConditions);
    const topCategories = this.foodScoringService.selectTopCategories(allScoredCategories, 3);

    return {
      location: request.location,
      weather: defaultWeatherConditions,
      topCategories,
      metadata: {
        evaluatedAt: evaluationStartTime.toISOString(),
        totalCategoriesEvaluated: allScoredCategories.length,
        weatherDataSuccess: false
      }
    };
  }

  /**
   * 특정 위치의 날씨 조건만 조회
   * @param location 위경도 좌표
   * @returns 음식 추천용 날씨 조건
   */
  public async getWeatherConditionsForLocation(location: ILatLng) {
    try {
      const weatherData = await this.weatherService.getCurrentWeather(location);
      return this.weatherAnalysisService.analyzeWeatherForFoodRecommendation(weatherData);
    } catch (error) {
      throw new Error(`날씨 조건 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 특정 날씨 조건에 대한 음식 점수만 계산
   * @param weatherConditions 날씨 조건
   * @param topN 반환할 상위 카테고리 개수 (기본값: 3)
   * @returns 점수 순으로 정렬된 상위 카테고리 목록
   */
  public calculateFoodScoresForWeather(weatherConditions: any, topN: number = 3) {
    const allScoredCategories = this.foodScoringService.calculateAllFoodScores(weatherConditions);
    return this.foodScoringService.selectTopCategories(allScoredCategories, topN);
  }

  /**
   * 평가 결과에 대한 요약 정보 생성
   * @param evaluationResult 평가 결과
   * @returns 사용자 친화적인 요약 텍스트
   */
  public generateEvaluationSummary(evaluationResult: IFoodEvaluationResponse): string {
    const { weather, topCategories } = evaluationResult;
    
    const weatherSummary = this.weatherAnalysisService.generateWeatherSummary(weather);
    const topFoodNames = topCategories.map(c => c.nameKo).join(", ");
    
    const tempInfo = weather.actualTemperature ? `${weather.actualTemperature}°C` : "";
    const humidityInfo = weather.actualHumidity ? `습도 ${weather.actualHumidity}%` : "";
    const actualWeatherInfo = [tempInfo, humidityInfo].filter(Boolean).join(", ");
    
    let summary = `현재 날씨(${weatherSummary})`;
    if (actualWeatherInfo) {
      summary += ` - ${actualWeatherInfo}`;
    }
    summary += `에 추천하는 음식: ${topFoodNames}`;
    
    return summary;
  }
}
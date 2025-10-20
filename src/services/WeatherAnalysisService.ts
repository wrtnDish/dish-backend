import { Injectable } from "@nestjs/common";

import {
  IWeatherConditions,
  WeatherHumidity,
  WeatherTemperature,
} from "../api/structures/food/IFoodCategory";
import { ISimpleWeatherResponse } from "../api/structures/weather/IWeatherForecast";

/**
 * 날씨 분석 서비스
 * @description 날씨 데이터를 음식 추천을 위한 조건으로 분류하는 서비스
 */
@Injectable()
export class WeatherAnalysisService {
  /**
   * 기온을 카테고리로 분류
   * @param temperature 섭씨 온도 (°C)
   * @returns 온도 분류 결과
   *
   * @description
   * - hot: 28°C 이상 (더운 날씨)
   * - moderate: 18°C 이상 ~ 27°C 이하 (온화한 날씨)
   * - cold: 17°C 이하 (추운 날씨)
   */
  public classifyTemperature(temperature: number | null): WeatherTemperature {
    if (temperature === null) return "moderate";

    if (temperature >= 28) return "hot";
    if (temperature >= 18) return "moderate";
    return "cold";
  }

  /**
   * 습도를 카테고리로 분류
   * @param humidity 상대습도 (%)
   * @returns 습도 분류 결과
   *
   * @description
   * - high: 70% 이상 (높은 습도)
   * - moderate: 40% 이상 ~ 69% 이하 (보통 습도)
   * - low: 39% 이하 (낮은 습도)
   */
  public classifyHumidity(humidity: number | null): WeatherHumidity {
    if (humidity === null) return "moderate";

    if (humidity >= 70) return "high";
    if (humidity >= 40) return "moderate";
    return "low";
  }

  /**
   * 날씨 데이터를 음식 추천용 조건으로 변환
   * @param weatherData 간단한 날씨 응답 데이터
   * @returns 음식 추천을 위한 날씨 조건
   */
  public analyzeWeatherForFoodRecommendation(
    weatherData: ISimpleWeatherResponse,
  ): IWeatherConditions {
    const temperature = this.classifyTemperature(
      weatherData.current.temperature,
    );
    const humidity = this.classifyHumidity(weatherData.current.humidity);

    return {
      temperature,
      humidity,
      actualTemperature: weatherData.current.temperature,
      actualHumidity: weatherData.current.humidity,
    };
  }

  /**
   * 온도 분류에 대한 설명 텍스트 반환
   * @param temperature 온도 분류
   * @returns 사용자 친화적인 온도 설명
   */
  public getTemperatureDescription(temperature: WeatherTemperature): string {
    switch (temperature) {
      case "hot":
        return "더운 날씨 (28°C 이상)";
      case "moderate":
        return "온화한 날씨 (18-27°C)";
      case "cold":
        return "추운 날씨 (17°C 이하)";
      default:
        return "알 수 없는 온도";
    }
  }

  /**
   * 습도 분류에 대한 설명 텍스트 반환
   * @param humidity 습도 분류
   * @returns 사용자 친화적인 습도 설명
   */
  public getHumidityDescription(humidity: WeatherHumidity): string {
    switch (humidity) {
      case "high":
        return "높은 습도 (70% 이상)";
      case "moderate":
        return "보통 습도 (40-69%)";
      case "low":
        return "낮은 습도 (39% 이하)";
      default:
        return "알 수 없는 습도";
    }
  }

  /**
   * 날씨 조건에 대한 종합 설명 생성
   * @param conditions 날씨 조건
   * @returns 날씨 조건에 대한 종합 설명
   */
  public generateWeatherSummary(conditions: IWeatherConditions): string {
    const tempDesc = this.getTemperatureDescription(conditions.temperature);
    const humidityDesc = this.getHumidityDescription(conditions.humidity);

    return `${tempDesc}, ${humidityDesc}`;
  }
}
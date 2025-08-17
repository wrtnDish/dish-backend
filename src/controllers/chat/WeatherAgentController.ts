import { 
  ILatLng, 
  IWeatherForecastRequest, 
  IWeatherForecastResponse 
} from "../../api/structures/weather/IWeatherForecast";
import { WeatherService } from "../../services/WeatherService";
import { convertLatLngToGrid, convertGridToLatLng } from "../../utils/CoordinateUtil";

/**
 * AI 에이전트가 사용할 수 있는 날씨 기능 컨트롤러
 * 
 * @description
 * 이 클래스는 Agentica AI 에이전트가 LLM Function Calling을 통해
 * 날씨 관련 기능을 사용할 수 있도록 제공하는 컨트롤러입니다.
 * 
 * AI 모델이 사용자의 자연어 요청을 분석하여 적절한 함수를 호출하고,
 * 실시간 날씨 정보를 제공할 수 있습니다.
 * 
 * 지원하는 기능:
 * - 위경도 기반 날씨 조회
 * - 지역명을 통한 날씨 조회 (좌표 변환 포함)
 * - 좌표 변환 기능
 * - 날씨 정보 해석 및 설명
 * 
 * @example
 * ```typescript
 * // AI 모델이 이런 식으로 함수를 호출할 수 있습니다:
 * 
 * // 사용자: "서울 날씨 알려줘"
 * const weather = await getWeatherByLocation({
 *   location: "서울시청",
 *   latitude: 37.5663,
 *   longitude: 126.9779
 * });
 * 
 * // 사용자: "부산 비올까?"
 * const weather = await getWeatherByCoordinates({
 *   lat: 35.1796,
 *   lng: 129.0756
 * });
 * ```
 */
export class WeatherAgentController {
  /**
   * 날씨 서비스 인스턴스
   * @description WeatherService를 통해 실제 기상청 API와 통신
   */
  private readonly weatherService: WeatherService;

  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * 위경도 좌표로 날씨 정보 조회
   * 
   * @description
   * 정확한 위도/경도 좌표를 사용하여 해당 지역의 상세한 날씨 정보를 조회합니다.
   * AI 모델이 사용자가 제공한 좌표나 알고 있는 지역의 좌표를 이용할 때 사용합니다.
   * 
   * @param coordinates - 조회할 위치의 위경도 좌표
   * @param coordinates.lat - 위도 (33.0~38.9 범위의 대한민국 영역)
   * @param coordinates.lng - 경도 (124.0~132.0 범위의 대한민국 영역)
   * 
   * @returns 해당 지역의 상세 날씨 예보 정보
   * @returns returns.hourlyForecasts - 향후 6시간의 시간별 날씨 정보
   * @returns returns.location - 요청한 좌표 정보
   * @returns returns.gridCoordinates - 기상청 격자 좌표
   * 
   * @example
   * ```typescript
   * // 서울시청 좌표로 날씨 조회
   * const weather = await getWeatherByCoordinates({
   *   lat: 37.5663,
   *   lng: 126.9779
   * });
   * 
   * console.log(`현재 기온: ${weather.hourlyForecasts[0].temperature}°C`);
   * console.log(`날씨: ${weather.hourlyForecasts[0].sky.description}`);
   * ```
   */
  public async getWeatherByCoordinates(coordinates: {
    /**
     * 위도 (북위 기준)
     * @description 대한민국 영역: 33.0~38.9도
     */
    lat: number;
    
    /**
     * 경도 (동경 기준)  
     * @description 대한민국 영역: 124.0~132.0도
     */
    lng: number;
  }): Promise<IWeatherForecastResponse> {
    const request: IWeatherForecastRequest = {
      location: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
    };
    
    return await this.weatherService.getWeatherForecast(request);
  }

  /**
   * 지역명과 좌표로 날씨 정보 조회
   * 
   * @description
   * 사용자가 지역명과 함께 좌표를 제공했을 때 사용하는 함수입니다.
   * AI 모델이 지역명을 인식하고 해당하는 좌표로 날씨를 조회할 때 활용됩니다.
   * 
   * @param params - 지역 정보 및 좌표
   * @param params.location - 지역명 (예: "서울시청", "부산역", "제주공항")
   * @param params.latitude - 해당 지역의 위도
   * @param params.longitude - 해당 지역의 경도
   * @param params.details - 추가 상세 정보 (선택사항)
   * 
   * @returns 해당 지역의 날씨 예보 정보와 지역 정보
   * 
   * @example
   * ```typescript
   * // 지역명과 함께 날씨 조회
   * const weather = await getWeatherByLocation({
   *   location: "서울시청",
   *   latitude: 37.5663,
   *   longitude: 126.9779,
   *   details: "서울특별시 중구 세종대로 110"
   * });
   * ```
   */
  public async getWeatherByLocation(params: {
    /**
     * 지역명
     * @description 사용자 친화적인 지역 이름
     */
    location: string;
    
    /**
     * 위도
     * @description 해당 지역의 정확한 위도 좌표
     */
    latitude: number;
    
    /**
     * 경도
     * @description 해당 지역의 정확한 경도 좌표
     */
    longitude: number;
    
    /**
     * 추가 정보 (선택사항)
     * @description 주소, 설명 등 부가적인 지역 정보
     */
    details?: string;
  }): Promise<IWeatherForecastResponse & { locationInfo: typeof params }> {
    const weatherData = await this.getWeatherByCoordinates({
      lat: params.latitude,
      lng: params.longitude,
    });
    
    return {
      ...weatherData,
      locationInfo: params,
    };
  }

  /**
   * 간단한 날씨 요약 조회
   * 
   * @description
   * 사용자가 간단한 날씨 정보만 원할 때 사용하는 함수입니다.
   * 전체 상세 정보 대신 핵심 날씨 정보만 추출하여 제공합니다.
   * 
   * @param coordinates - 조회할 위치의 좌표
   * @returns 간단한 날씨 요약 정보
   * 
   * @example
   * ```typescript
   * // 간단한 날씨 정보만 조회
   * const summary = await getSimpleWeatherSummary({
   *   lat: 37.5663,
   *   lng: 126.9779
   * });
   * 
   * console.log(summary.current); // "맑음, 8°C"
   * ```
   */
  public async getSimpleWeatherSummary(coordinates: {
    lat: number;
    lng: number;
  }): Promise<{
    /**
     * 현재 날씨 한 줄 요약
     * @example "맑음, 8°C, 습도 65%"
     */
    current: string;
    
    /**
     * 기온 정보
     */
    temperature: {
      current: number | null;
      unit: "°C";
    };
    
    /**
     * 하늘 상태
     */
    sky: {
      condition: string | null;
      description: string | null;
    };
    
    /**
     * 강수 정보
     */
    precipitation: {
      status: string | null;
      amount: number | null;
    };
    
    /**
     * 조회 위치
     */
    location: {
      lat: number;
      lng: number;
    };
  }> {
    const fullWeather = await this.getWeatherByCoordinates(coordinates);
    const current = fullWeather.hourlyForecasts[0];
    
    if (!current) {
      throw new Error("현재 날씨 정보를 찾을 수 없습니다.");
    }
    
    // 현재 날씨 한 줄 요약 생성
    const parts: string[] = [];
    
    if (current.sky.description) {
      parts.push(current.sky.description);
    }
    
    if (current.temperature !== null) {
      parts.push(`${current.temperature}°C`);
    }
    
    if (current.humidity !== null) {
      parts.push(`습도 ${current.humidity}%`);
    }
    
    const currentSummary = parts.join(", ");
    
    return {
      current: currentSummary,
      temperature: {
        current: current.temperature,
        unit: "°C",
      },
      sky: {
        condition: current.sky.description,
        description: current.sky.description,
      },
      precipitation: {
        status: current.precipitationType.description,
        amount: current.precipitation.amount,
      },
      location: coordinates,
    };
  }

  /**
   * 위경도를 격자 좌표로 변환
   * 
   * @description
   * 위경도 좌표를 기상청에서 사용하는 격자 좌표로 변환합니다.
   * AI 모델이 사용자가 제공한 위경도를 기상청 API용 좌표로 변환할 때 사용합니다.
   * 
   * @param coordinates - 변환할 위경도 좌표
   * @returns 격자 좌표 (x, y)
   * 
   * @example
   * ```typescript
   * const grid = convertLatLngToGrid({
   *   lat: 37.5663,
   *   lng: 126.9779
   * });
   * // result: { x: 60, y: 127 }
   * ```
   */
  public convertLatLngToGrid(coordinates: {
    /**
     * 위도
     */
    lat: number;
    /**
     * 경도  
     */
    lng: number;
  }): {
    /**
     * X축 격자 좌표
     */
    x: number;
    /**
     * Y축 격자 좌표
     */
    y: number;
  } {
    const grid = convertLatLngToGrid({
      lat: coordinates.lat,
      lng: coordinates.lng,
    });
    return { x: grid.x, y: grid.y };
  }

  /**
   * 격자 좌표를 위경도로 변환
   * 
   * @description
   * 기상청 격자 좌표를 일반적인 위경도 좌표로 역변환합니다.
   * AI 모델이 격자 좌표를 설명하거나 위치를 파악할 때 사용합니다.
   * 
   * @param grid - 변환할 격자 좌표
   * @returns 위경도 좌표 (lat, lng)
   * 
   * @example
   * ```typescript
   * const coordinates = convertGridToLatLng({
   *   x: 60,
   *   y: 127
   * });
   * // result: { lat: 37.5663, lng: 126.9779 }
   * ```
   */
  public convertGridToLatLng(grid: {
    /**
     * X축 격자 좌표
     */
    x: number;
    /**
     * Y축 격자 좌표
     */
    y: number;
  }): {
    /**
     * 위도
     */
    lat: number;
    /**
     * 경도
     */
    lng: number;
  } {
    const latlng = convertGridToLatLng({
      x: grid.x,
      y: grid.y,
    });
    return { lat: latlng.lat, lng: latlng.lng };
  }

  /**
   * 날씨 데이터 해석 및 조언 제공
   * 
   * @description
   * 조회된 날씨 데이터를 분석하여 사용자에게 유용한 조언이나 해석을 제공합니다.
   * AI 모델이 단순한 데이터 제공을 넘어 상황에 맞는 조언을 할 때 사용합니다.
   * 
   * @param coordinates - 분석할 지역의 좌표
   * @returns 날씨 분석 및 조언
   * 
   * @example
   * ```typescript
   * const analysis = await analyzeWeatherConditions({
   *   lat: 37.5663,
   *   lng: 126.9779
   * });
   * 
   * console.log(analysis.advice); // "외출하기 좋은 날씨입니다. 가벼운 외투를 준비하세요."
   * ```
   */
  public async analyzeWeatherConditions(coordinates: {
    lat: number;
    lng: number;
  }): Promise<{
    /**
     * 날씨 상황 분석
     */
    analysis: string;
    
    /**
     * 사용자 조언
     */
    advice: string;
    
    /**
     * 위험 요소 (있는 경우)
     */
    warnings: string[];
    
    /**
     * 활동 추천
     */
    recommendations: string[];
  }> {
    const weather = await this.getWeatherByCoordinates(coordinates);
    const current = weather.hourlyForecasts[0];
    
    if (!current) {
      throw new Error("날씨 데이터를 분석할 수 없습니다.");
    }
    
    const analysis: string[] = [];
    const advice: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 기온 분석
    if (current.temperature !== null) {
      if (current.temperature < 0) {
        analysis.push("매우 추운 날씨입니다");
        advice.push("두꺼운 겨울옷과 방한용품을 착용하세요");
        warnings.push("빙판길 주의");
      } else if (current.temperature < 10) {
        analysis.push("쌀쌀한 날씨입니다");
        advice.push("따뜻한 외투를 준비하세요");
      } else if (current.temperature < 20) {
        analysis.push("선선한 날씨입니다");
        advice.push("가벼운 외투가 적당합니다");
        recommendations.push("산책하기 좋은 날씨");
      } else if (current.temperature < 30) {
        analysis.push("따뜻한 날씨입니다");
        advice.push("가벼운 옷차림이 좋습니다");
        recommendations.push("야외 활동하기 좋은 날씨");
      } else {
        analysis.push("매우 더운 날씨입니다");
        advice.push("시원한 옷차림과 충분한 수분 섭취를 하세요");
        warnings.push("열사병 주의");
        recommendations.push("실내 활동 권장");
      }
    }
    
    // 강수 분석
    if (current.precipitationType.code !== null && current.precipitationType.code > 0) {
      const precipType = current.precipitationType.description;
      analysis.push(`${precipType} 예상`);
      
      if (precipType?.includes("비")) {
        advice.push("우산을 준비하세요");
        warnings.push("미끄러운 길면 주의");
      } else if (precipType?.includes("눈")) {
        advice.push("미끄럼 방지 신발을 착용하세요");
        warnings.push("눈길 및 빙판길 주의");
      }
    }
    
    // 바람 분석
    if (current.wind.speed !== null) {
      if (current.wind.speed > 10) {
        analysis.push("강한 바람이 불고 있습니다");
        warnings.push("강풍 주의");
        advice.push("야외 활동 시 주의하세요");
      } else if (current.wind.speed > 5) {
        analysis.push("적당한 바람이 불고 있습니다");
      }
    }
    
    // 습도 분석
    if (current.humidity !== null) {
      if (current.humidity > 80) {
        analysis.push("습도가 높습니다");
        advice.push("끈적거림을 느낄 수 있습니다");
      } else if (current.humidity < 30) {
        analysis.push("습도가 낮습니다");
        advice.push("건조하니 수분 보충을 하세요");
      }
    }
    
    return {
      analysis: analysis.join(", "),
      advice: advice.join(". "),
      warnings,
      recommendations,
    };
  }
}
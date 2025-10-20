import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";



import { IGrid, ILatLng, ISimpleWeatherResponse, IWeatherForecastRequest, IWeatherForecastResponse } from "../../api/structures/weather/IWeatherForecast";
import { WeatherService } from "../../services/WeatherService";
import { convertGridToLatLng, convertLatLngToGrid } from "../../utils/CoordinateUtil";


/**
 * 기상청 날씨 예보 API 컨트롤러
 * 
 * @description
 * 기상청 초단기예보 조회 서비스를 RESTful API 형태로 제공하는 컨트롤러입니다.
 * 
 * 제공 기능:
 * - 위경도 기반 날씨 예보 조회
 * - 격자 좌표 기반 날씨 예보 조회  
 * - 좌표 변환 기능
 * - 서비스 상태 확인
 * 
 * API 특징:
 * - Nestia를 활용한 타입 안전 API
 * - 자동 Swagger 문서 생성
 * - 런타임 타입 검증
 * - 상세한 에러 처리
 * 
 * 기상청 API 제한사항:
 * - 매시 30분 발표, 45분 이후 조회 가능
 * - 6시간 이내 예보만 제공
 * - 대한민국 영역만 지원
 * 
 * @tag Weather
 * @summary 기상청 날씨 예보 API
 */
@Controller("weather")
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * 위경도 기반 날씨 예보 조회
   * 
   * @description
   * 위도와 경도 좌표를 입력받아 해당 지역의 초단기 기상예보 정보를 조회합니다.
   * 
   * **처리 과정:**
   * 1. 입력받은 위경도를 기상청 격자 좌표로 자동 변환
   * 2. 현재 시각 기준으로 조회 가능한 최신 발표시각 계산
   * 3. 기상청 API 호출하여 원본 데이터 수집
   * 4. 사용자 친화적 형태로 데이터 파싱 및 구조화
   * 5. 시간별 상세 기상 정보 제공
   * 
   * **응답 데이터 구성:**
   * - 요청 위치 정보 및 변환된 격자 좌표
   * - 예보 발표 기준 일시
   * - 향후 6시간의 시간별 상세 기상 정보
   * - API 호출 메타데이터
   * 
   * **주의사항:**
   * - 대한민국 영역만 지원 (위도: 33.0~38.9, 경도: 124.0~132.0)
   * - 매시 45분 이후에만 해당 시간 발표분 조회 가능
   * - 북한 및 국외 지역은 지원하지 않음
   * 
   * @summary 위경도로 날씨 예보 조회
   * @tag Weather
   * 
   * @param request - 날씨 조회 요청 정보
   * @param request.location - 조회할 위치의 위경도 좌표
   * @param request.location.lat - 위도 (33.0~38.9, 필수)
   * @param request.location.lng - 경도 (124.0~132.0, 필수)
   * @param request.baseDate - 발표일자 (YYYYMMDD, 선택사항)
   * @param request.baseTime - 발표시각 (HHMM, 선택사항)
   * @param request.numOfRows - 조회할 데이터 개수 (1~1000, 선택사항, 기본값: 60)
   * 
   * @returns 파싱된 날씨 예보 정보
   * @returns returns.location - 요청한 위경도 좌표
   * @returns returns.gridCoordinates - 변환된 격자 좌표 (nx, ny)
   * @returns returns.baseInfo - 예보 발표 기준 정보
   * @returns returns.hourlyForecasts - 시간별 상세 기상 정보 배열
   * @returns returns.metadata - API 처리 결과 메타데이터
   * 
   * @throws {400} 잘못된 요청 파라미터 (좌표 범위 초과, 잘못된 날짜/시간 형식 등)
   * @throws {500} 기상청 API 호출 실패, 데이터 파싱 오류 등 내부 서버 오류
   * @throws {503} 기상청 서비스 일시 중단 또는 과부하
   * 
   * @example
   * ```typescript
   * // 서울시청 위치의 날씨 정보 조회
   * const response = await fetch('/weather/forecast', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     location: { lat: 37.5663, lng: 126.9779 }
   *   })
   * });
   * 
   * const weather = await response.json();
   * console.log(`현재 기온: ${weather.hourlyForecasts[0].temperature}°C`);
   * console.log(`하늘상태: ${weather.hourlyForecasts[0].sky.description}`);
   * ```
   * 
   * @example
   * ```typescript
   * // 특정 발표시각의 예보 조회
   * const response = await fetch('/weather/forecast', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     location: { lat: 35.1796, lng: 129.0756 }, // 부산
   *     baseDate: "20231215",
   *     baseTime: "1430",
   *     numOfRows: 30
   *   })
   * });
   * ```
   */
  @TypedRoute.Post("forecast")
  public async getWeatherForecast(
    @TypedBody() request: IWeatherForecastRequest,
  ): Promise<IWeatherForecastResponse> {
    return await this.weatherService.getWeatherForecast(request);
  }

  /**
   * 격자 좌표 기반 날씨 예보 조회
   * 
   * @description
   * 기상청 격자 좌표(nx, ny)를 직접 입력받아 해당 지역의 날씨 예보를 조회합니다.
   * 이미 격자 좌표를 알고 있는 경우 좌표 변환 과정을 생략할 수 있어 더 빠른 응답을 얻을 수 있습니다.
   * 
   * **사용 시나리오:**
   * - 기상청 공식 격자 좌표표를 참조하여 정확한 좌표를 사용하는 경우
   * - 반복적인 조회를 위해 미리 격자 좌표를 저장해둔 경우
   * - 좌표 변환 과정을 생략하여 응답 속도를 최적화하려는 경우
   * 
   * **격자 좌표 범위:**
   * - X 좌표: 1~149 (서쪽에서 동쪽으로)
   * - Y 좌표: 1~253 (남쪽에서 북쪽으로)
   * 
   * **참고 자료:**
   * - 기상청에서 제공하는 행정구역별 격자 좌표 Excel 파일 참조
   * - Lambert Conformal Conic Projection 기반 좌표계 사용
   * 
   * @summary 격자 좌표로 날씨 예보 조회
   * @tag Weather
   * 
   * @param params - 격자 좌표 및 조회 옵션
   * @param params.x - X축 격자 좌표 (1~149, 필수)
   * @param params.y - Y축 격자 좌표 (1~253, 필수)
   * @param params.baseDate - 발표일자 (YYYYMMDD, 선택사항)
   * @param params.baseTime - 발표시각 (HHMM, 선택사항)
   * @param params.numOfRows - 조회할 데이터 개수 (1~1000, 선택사항)
   * 
   * @returns 파싱된 날씨 예보 정보 (위경도는 추정값 포함)
   * 
   * @throws {400} 잘못된 격자 좌표 (범위 초과)
   * @throws {500} 기상청 API 호출 실패 등 내부 서버 오류
   * 
   * @example
   * ```typescript
   * // 서울(격자 60, 127)의 날씨 정보 조회
   * const response = await fetch('/weather/forecast-by-grid', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     x: 60,
   *     y: 127,
   *     numOfRows: 60
   *   })
   * });
   * ```
   */
  @TypedRoute.Post("forecast-by-grid")
  public async getWeatherForecastByGrid(
    @TypedBody() 
    params: IGrid & {
      baseDate?: string;
      baseTime?: string;
      numOfRows?: number;
    },
  ): Promise<IWeatherForecastResponse> {
    const { x, y, baseDate, baseTime, numOfRows } = params;
    const gridCoordinates: IGrid = { x, y };
    const options = { baseDate, baseTime, numOfRows };
    
    return await this.weatherService.getWeatherForecastByGrid(gridCoordinates, options);
  }

  /**
   * 위경도 좌표를 격자 좌표로 변환
   * 
   * @description
   * 위도와 경도를 기상청에서 사용하는 Lambert Conformal Conic Projection 격자 좌표로 변환합니다.
   * 이 변환된 좌표는 기상청 API 호출 시 nx, ny 파라미터로 사용됩니다.
   * 
   * **변환 원리:**
   * - Lambert Conformal Conic Projection (람베르트 정각원추도법) 사용
   * - 지구의 곡면을 평면으로 투영하여 격자 좌표계 구성
   * - 대한민국 지역에 최적화된 투영 파라미터 사용
   * 
   * **활용 사례:**
   * - 날씨 API 호출 전 좌표 미리 변환하여 저장
   * - 지도 서비스와 기상 서비스 간 좌표 연동
   * - 대량의 지점에 대한 격자 좌표 일괄 변환
   * 
   * **정확도:**
   * - 변환 후 역변환 시 오차 ±0.001도 이내
   * - 기상청 공식 변환 알고리즘과 동일한 결과
   * 
   * @summary 위경도를 격자좌표로 변환
   * @tag Weather
   * 
   * @param location - 변환할 위경도 좌표
   * @param location.lat - 위도 (33.0~38.9도, 필수)
   * @param location.lng - 경도 (124.0~132.0도, 필수)
   * 
   * @returns 변환된 격자 좌표 정보
   * @returns returns.x - X축 격자 좌표 (1~149)
   * @returns returns.y - Y축 격자 좌표 (1~253)
   * 
   * @throws {400} 좌표가 대한민국 영역을 벗어난 경우
   * @throws {500} 좌표 변환 계산 오류
   * 
   * @example
   * ```typescript
   * // 여러 지역의 격자 좌표 일괄 변환
   * const locations = [
   *   { name: "서울시청", lat: 37.5663, lng: 126.9779 },
   *   { name: "부산시청", lat: 35.1796, lng: 129.0756 },
   *   { name: "제주공항", lat: 33.5067, lng: 126.4919 }
   * ];
   * 
   * for (const loc of locations) {
   *   const response = await fetch('/weather/convert-to-grid', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ lat: loc.lat, lng: loc.lng })
   *   });
   *   const grid = await response.json();
   *   console.log(`${loc.name}: (${grid.x}, ${grid.y})`);
   * }
   * ```
   */
  @TypedRoute.Post("convert-to-grid")
  public convertToGrid(@TypedBody() location: ILatLng): IGrid {
    return convertLatLngToGrid(location);
  }

  /**
   * 격자 좌표를 위경도 좌표로 변환
   * 
   * @description
   * 기상청 격자 좌표(nx, ny)를 WGS84 좌표계의 위도/경도로 역변환합니다.
   * 격자 좌표 기반 데이터를 지도에 표시하거나 다른 좌표계와 연동할 때 사용합니다.
   * 
   * **사용 목적:**
   * - 기상청 격자 데이터를 지도 위에 시각화
   * - GPS 좌표계와 기상 격자 좌표계 간 상호 변환
   * - 격자 좌표 기반 데이터베이스의 지리적 위치 확인
   * 
   * **변환 특성:**
   * - 격자의 중심점 좌표로 변환
   * - 실제 격자 영역은 약 5km × 5km 크기
   * - 역변환 후 재변환 시 원본 격자 좌표 복원 가능
   * 
   * @summary 격자좌표를 위경도로 변환
   * @tag Weather
   * 
   * @param grid - 변환할 격자 좌표
   * @param grid.x - X축 격자 좌표 (1~149, 필수)
   * @param grid.y - Y축 격자 좌표 (1~253, 필수)
   * 
   * @returns 변환된 위경도 좌표
   * @returns returns.lat - 위도 (도 단위)
   * @returns returns.lng - 경도 (도 단위)
   * 
   * @throws {400} 격자 좌표가 유효 범위를 벗어난 경우
   * @throws {500} 좌표 변환 계산 오류
   * 
   * @example
   * ```typescript
   * // 주요 도시의 격자 좌표를 위경도로 변환
   * const grids = [
   *   { name: "서울", x: 60, y: 127 },
   *   { name: "부산", x: 98, y: 76 },
   *   { name: "제주", x: 52, y: 38 }
   * ];
   * 
   * for (const grid of grids) {
   *   const response = await fetch('/weather/convert-to-latlng', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ x: grid.x, y: grid.y })
   *   });
   *   const coords = await response.json();
   *   console.log(`${grid.name}: (${coords.lat}, ${coords.lng})`);
   * }
   * ```
   */
  @TypedRoute.Post("convert-to-latlng")
  public convertToLatLng(@TypedBody() grid: IGrid): ILatLng {
    return convertGridToLatLng(grid);
  }

  /**
   * 간단한 현재 날씨 정보 조회
   * 
   * @description
   * 프론트엔드에서 사용하기 쉽도록 정제된 현재 날씨 정보만 반환합니다.
   * 전체 6시간 예보 데이터 대신 현재 시간(가장 가까운 예보 시간)의 데이터만 추출하여
   * 생활에 필요한 핵심 정보 위주로 가공해서 제공합니다.
   * 
   * **특징:**
   * - 현재 시간 기준 1시간 데이터만 반환
   * - 체감 온도, 옷차림 조언, 우산 필요 여부 등 실생활 정보 포함
   * - 외출 적합도 점수 (1-5점) 제공
   * - 간결한 날씨 요약 메시지
   * - 빠른 응답 속도 (최소한의 데이터만 요청)
   * 
   * **응답 데이터:**
   * - 현재 기온, 체감온도, 하늘상태
   * - 강수 정보 (형태, 양, 상태)
   * - 바람 정보 (속도, 방향, 설명)
   * - 생활 조언 (외출 적합도, 우산 필요성, 옷차림)
   * - 종합 날씨 요약
   * 
   * @summary 간단한 현재 날씨 조회
   * @tag Weather
   * 
   * @param location - 조회할 위치의 위경도 좌표
   * @param location.lat - 위도 (33.0~38.9, 필수)
   * @param location.lng - 경도 (124.0~132.0, 필수)
   * 
   * @returns 정제된 현재 날씨 정보
   * @returns returns.current - 현재 날씨 상세 정보
   * @returns returns.advice - 생활 지수 및 조언
   * @returns returns.metadata - 조회 결과 메타데이터
   * 
   * @throws {400} 좌표가 대한민국 영역을 벗어난 경우
   * @throws {500} 기상청 API 호출 실패 등 내부 서버 오류
   * 
   * @example
   * ```typescript
   * // 현재 날씨 간단 조회
   * const response = await fetch('/weather/current', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     lat: 37.5663,
   *     lng: 126.9779
   *   })
   * });
   * 
   * const weather = await response.json();
   * console.log(weather.current.summary); // "흐리고 비, 27°C"
   * console.log(weather.advice.message); // "우산을 준비하세요"
   * console.log(weather.advice.clothing); // "가벼운 긴팔 + 우산"
   * ```
   * 
   * @example
   * ```typescript
   * // 외출 적합도 확인
   * const weather = await getCurrentWeather({ lat: 35.1796, lng: 129.0756 });
   * 
   * if (weather.advice.outdoorActivity >= 4) {
   *   console.log('외출하기 좋은 날씨입니다!');
   * } else if (weather.advice.umbrella) {
   *   console.log('우산을 챙기세요.');
   * }
   * ```
   */
  @TypedRoute.Post("current")
  public async getCurrentWeather(@TypedBody() location: ILatLng): Promise<ISimpleWeatherResponse> {
    return await this.weatherService.getCurrentWeather(location);
  }

  /**
   * 날씨 서비스 상태 확인
   * 
   * @description
   * 기상청 API 연결 상태와 날씨 서비스의 전반적인 가용성을 확인합니다.
   * 시스템 모니터링, 헬스체크, 장애 진단 등의 용도로 활용할 수 있습니다.
   * 
   * **검사 항목:**
   * - 기상청 API 서버 연결 상태
   * - API 인증키 유효성
   * - 응답 데이터 파싱 정상 여부
   * - 좌표 변환 기능 정상 여부
   * 
   * **테스트 방식:**
   * - 서울시청 좌표로 실제 API 호출 수행
   * - 최소한의 데이터만 요청하여 부하 최소화
   * - 전체 파이프라인 정상 작동 확인
   * 
   * **응답 상태:**
   * - `AVAILABLE`: 모든 기능이 정상 작동
   * - `UNAVAILABLE`: API 오류 또는 서비스 중단
   * 
   * @summary 날씨 서비스 상태 확인
   * @tag Weather
   * 
   * @returns 서비스 상태 정보
   * @returns returns.isHealthy - 서비스 정상 여부 (boolean)
   * @returns returns.apiStatus - API 상태 ("AVAILABLE" | "UNAVAILABLE")
   * @returns returns.message - 상태 상세 메시지
   * @returns returns.timestamp - 확인 시각 (ISO 8601)
   * 
   * @example
   * ```typescript
   * // 정기적인 서비스 상태 모니터링
   * setInterval(async () => {
   *   const response = await fetch('/weather/health');
   *   const status = await response.json();
   *   
   *   if (!status.isHealthy) {
   *     console.error(`날씨 서비스 장애: ${status.message}`);
   *     // 알림 발송 또는 복구 작업 수행
   *   }
   * }, 60000); // 1분마다 확인
   * ```
   * 
   * @example
   * ```typescript
   * // 애플리케이션 시작 시 서비스 상태 확인
   * async function checkServicesOnStartup() {
   *   const healthCheck = await fetch('/weather/health');
   *   const status = await healthCheck.json();
   *   
   *   if (status.isHealthy) {
   *     console.log('✅ 날씨 서비스 준비 완료');
   *   } else {
   *     console.warn('⚠️ 날씨 서비스 사용 불가:', status.message);
   *   }
   * }
   * ```
   */
  @TypedRoute.Get("health")
  public async checkServiceHealth(): Promise<{
    isHealthy: boolean;
    apiStatus: "AVAILABLE" | "UNAVAILABLE";
    message: string;
    timestamp: string;
  }> {
    const result = await this.weatherService.checkServiceHealth();
    return {
      ...result,
      apiStatus: result.apiStatus as "AVAILABLE" | "UNAVAILABLE"
    };
  }
}
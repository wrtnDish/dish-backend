import { Injectable } from "@nestjs/common";



import { MyGlobal } from "../MyGlobal";
import { IGrid, IHourlyWeather, ILatLng, ISimpleWeatherResponse, IWeatherForecastRawItem, IWeatherForecastRequest, IWeatherForecastResponse, PrecipitationType, SkyCondition, WeatherCategory } from "../api/structures/weather/IWeatherForecast";
import { convertLatLngToGrid } from "../utils/CoordinateUtil";
import { WeatherErrorUtil } from "../utils/WeatherErrorUtil";


/**
 * 기상청 날씨 예보 서비스
 * 
 * @description
 * 기상청 초단기예보 조회 API를 활용하여 실시간 날씨 정보를 제공하는 서비스입니다.
 * 
 * 주요 기능:
 * - 위경도 좌표를 이용한 기상 정보 조회
 * - 기상청 격자 좌표 자동 변환
 * - 원본 기상 데이터의 사용자 친화적 파싱
 * - 에러 처리 및 데이터 검증
 * 
 * API 제한사항:
 * - 매시 30분에 예보 생성, 45분 이후 조회 가능
 * - 예보시점부터 6시간 이내의 데이터만 제공
 * - 대한민국 영역만 지원 (북한 및 국외 제외)
 */
@Injectable()
export class WeatherService {
  /**
   * 기상청 API 기본 설정
   * @description 기상청 단기예보 조회서비스 2.0 버전 사용
   */
  private readonly API_CONFIG = {
    BASE_URL: "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0",
    ENDPOINT: "getUltraSrtFcst",
    DATA_TYPE: "JSON",
    DEFAULT_NUM_OF_ROWS: 60, // 10개 카테고리 × 6시간 = 60개
  } as const;

  /**
   * 기상 데이터 카테고리별 설명 매핑
   * @description 기상청 카테고리 코드를 사용자 친화적인 설명으로 변환
   */
  private readonly CATEGORY_DESCRIPTIONS: Record<WeatherCategory, string> = {
    T1H: "기온",
    RN1: "1시간 강수량", 
    SKY: "하늘상태",
    UUU: "동서바람성분",
    VVV: "남북바람성분", 
    REH: "습도",
    PTY: "강수형태",
    LGT: "낙뢰",
    VEC: "풍향",
    WSD: "풍속",
  };

  /**
   * 하늘상태 코드 설명 매핑
   * @description SKY 카테고리의 코드값을 문자열로 변환
   */
  private readonly SKY_CONDITIONS: Record<SkyCondition, string> = {
    1: "맑음",
    3: "구름많음", 
    4: "흐림",
  };

  /**
   * 강수형태 코드 설명 매핑
   * @description PTY 카테고리의 코드값을 문자열로 변환
   */
  private readonly PRECIPITATION_TYPES: Record<PrecipitationType, string> = {
    0: "없음",
    1: "비",
    2: "비/눈",
    3: "눈", 
    5: "빗방울",
    6: "빗방울눈날림",
    7: "눈날림",
  };

  /**
   * 기상청 API 에러 코드 매핑
   * @description 기상청에서 정의한 에러 코드와 메시지
   */
  private readonly ERROR_CODES: Record<string, string> = {
    "00": "정상",
    "01": "어플리케이션 에러",
    "02": "데이터베이스 에러", 
    "03": "데이터없음 에러",
    "04": "HTTP 에러",
    "05": "서비스 연결실패 에러",
    "10": "잘못된 요청 파라메터 에러",
    "11": "필수요청 파라메터가 없음",
    "12": "해당 오픈API서비스가 없거나 폐기됨",
    "20": "서비스 접근거부",
    "22": "서비스 요청제한횟수 초과에러",
    "30": "등록되지 않은 서비스키",
    "31": "기한만료된 서비스키",
    "32": "등록되지 않은 IP",
    "33": "서명되지 않은 호출",
    "99": "기타에러",
  };

  /**
   * 현재 사용 가능한 발표시각 계산
   * 
   * @description
   * 기상청 초단기예보는 매시 30분에 생성되며, 45분 이후부터 조회가 가능합니다.
   * 이 함수는 현재 시각을 기준으로 조회 가능한 가장 최근의 발표시각을 계산합니다.
   * 
   * 예시:
   * - 현재 시각이 14:50인 경우 → 14:30 발표분 조회 가능
   * - 현재 시각이 14:40인 경우 → 13:30 발표분 조회 (14:30분은 아직 불가)
   * 
   * @returns 조회 가능한 발표 일시 정보
   */
  private getCurrentBaseDateTime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 현재 시각이 45분 이전이면 이전 시간의 30분 발표분을 사용
    let targetHour = currentHour;
    if (currentMinute < 45) {
      targetHour = currentHour - 1;
      if (targetHour < 0) {
        targetHour = 23;
        now.setDate(now.getDate() - 1); // 전날로 변경
      }
    }

    // 발표일자 (YYYYMMDD 형식)
    const baseDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    
    // 발표시각 (HHMM 형식, 항상 30분)
    const baseTime = targetHour.toString().padStart(2, "0") + "30";

    return { baseDate, baseTime };
  }

  /**
   * 기상청 API 호출을 위한 URL 생성
   * 
   * @description
   * 입력받은 파라미터들을 이용하여 기상청 API 호출 URL을 생성합니다.
   * 모든 필수 파라미터와 선택적 파라미터를 포함합니다.
   * 
   * @param params - API 호출 파라미터들
   * @returns 완성된 API 호출 URL
   */
  private buildApiUrl(params: {
    authKey: string;
    nx: number;
    ny: number;
    baseDate: string;
    baseTime: string;
    numOfRows: number;
  }): string {
    const { BASE_URL, ENDPOINT, DATA_TYPE } = this.API_CONFIG;
    const queryParams = new URLSearchParams({
      authKey: params.authKey,
      numOfRows: params.numOfRows.toString(),
      pageNo: "1",
      dataType: DATA_TYPE,
      base_date: params.baseDate,
      base_time: params.baseTime,
      nx: params.nx.toString(),
      ny: params.ny.toString(),
    });

    return `${BASE_URL}/${ENDPOINT}?${queryParams.toString()}`;
  }

  /**
   * 기상청 API 응답 데이터 검증
   * 
   * @description
   * 기상청 API로부터 받은 응답이 정상적인 구조를 가지고 있는지 검증합니다.
   * 에러 응답인 경우 적절한 에러를 발생시킵니다.
   * 
   * @param response - 기상청 API 응답 객체
   * @throws {Error} API 응답이 비정상이거나 에러인 경우
   */
  private validateApiResponse(response: any): void {
    // 응답 구조 검증
    if (!response?.response) {
      throw new Error("기상청 API 응답 형식이 올바르지 않습니다.");
    }

    const { header, body } = response.response;

    // 헤더 정보 검증 및 에러 처리
    if (!header || !header.resultCode) {
      throw new Error("기상청 API 응답 헤더가 누락되었습니다.");
    }

    const resultCode = header.resultCode;
    if (resultCode !== "00") {
      const errorMessage = this.ERROR_CODES[resultCode] || "알 수 없는 에러";
      throw new Error(`기상청 API 에러 [${resultCode}]: ${errorMessage}`);
    }

    // 데이터 존재 여부 검증
    if (!body || !body.items || !body.items.item) {
      throw new Error("기상청에서 해당 지역의 예보 데이터를 찾을 수 없습니다.");
    }

    // 데이터가 배열이 아닌 경우 (단일 객체) 배열로 변환
    if (!Array.isArray(body.items.item)) {
      body.items.item = [body.items.item];
    }
  }

  /**
   * 원본 기상 데이터를 시간별로 그룹화
   * 
   * @description
   * 기상청에서 받은 카테고리별 데이터를 예보 시간을 기준으로 그룹화합니다.
   * 각 시간대별로 모든 기상 요소들을 하나의 객체로 통합합니다.
   * 
   * @param rawItems - 기상청 원본 예보 데이터 배열
   * @returns 시간별로 그룹화된 기상 데이터 맵
   */
  private groupByForecastTime(rawItems: IWeatherForecastRawItem[]): Map<string, Map<WeatherCategory, string>> {
    const groupedData = new Map<string, Map<WeatherCategory, string>>();

    for (const item of rawItems) {
      const timeKey = `${item.fcstDate}_${item.fcstTime}`;
      
      if (!groupedData.has(timeKey)) {
        groupedData.set(timeKey, new Map<WeatherCategory, string>());
      }
      
      const categoryData = groupedData.get(timeKey)!;
      categoryData.set(item.category, item.fcstValue);
    }

    return groupedData;
  }

  /**
   * 강수량 문자열을 숫자값으로 파싱
   * 
   * @description
   * 기상청의 강수량 데이터는 문자열 형태로 제공되며, 다양한 형식을 가집니다:
   * - "1mm 미만": 소량의 강수
   * - "5.5mm": 정확한 수치
   * - "30.0~50.0mm": 범위값
   * - "50.0mm 이상": 대량 강수
   * 
   * @param precipitationStr - 강수량 문자열
   * @returns 파싱된 강수량 값 또는 null
   */
  private parsePrecipitation(precipitationStr: string): { value: string; amount: number | null } {
    if (!precipitationStr || precipitationStr === "-" || precipitationStr === "0") {
      return { value: "강수없음", amount: 0 };
    }

    if (precipitationStr === "1mm 미만") {
      return { value: precipitationStr, amount: 0.5 }; // 대표값으로 0.5mm 사용
    }

    if (precipitationStr.includes("mm 이상")) {
      const match = precipitationStr.match(/(\d+\.?\d*)mm 이상/);
      if (match) {
        return { value: precipitationStr, amount: parseFloat(match[1]) };
      }
    }

    if (precipitationStr.includes("~")) {
      const match = precipitationStr.match(/(\d+\.?\d*)~(\d+\.?\d*)mm/);
      if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        return { value: precipitationStr, amount: (min + max) / 2 }; // 중간값 사용
      }
    }

    // 일반적인 수치 (예: "5.5mm")
    const match = precipitationStr.match(/(\d+\.?\d*)mm?/);
    if (match) {
      return { value: precipitationStr, amount: parseFloat(match[1]) };
    }

    return { value: precipitationStr, amount: null };
  }

  /**
   * 그룹화된 데이터를 시간별 기상 정보로 변환
   * 
   * @description
   * 카테고리별로 분리된 기상 데이터를 사용자 친화적인 시간별 기상 정보로 변환합니다.
   * 각 카테고리의 값을 적절한 타입과 형식으로 파싱하여 구조화합니다.
   * 
   * @param groupedData - 시간별로 그룹화된 원본 기상 데이터
   * @returns 파싱된 시간별 기상 정보 배열
   */
  private convertToHourlyWeather(groupedData: Map<string, Map<WeatherCategory, string>>): IHourlyWeather[] {
    const hourlyForecasts: IHourlyWeather[] = [];

    for (const [timeKey, categoryData] of groupedData) {
      const [dateStr, timeStr] = timeKey.split("_");
      
      // 날짜/시간 문자열을 ISO 형식으로 변환
      const year = parseInt(dateStr.substr(0, 4));
      const month = parseInt(dateStr.substr(4, 2)) - 1; // JavaScript Date는 월이 0부터 시작
      const day = parseInt(dateStr.substr(6, 2));
      const hour = parseInt(timeStr.substr(0, 2));
      const minute = parseInt(timeStr.substr(2, 2));
      
      const forecastDateTime = new Date(year, month, day, hour, minute);

      // 각 카테고리 데이터 파싱
      const temperature = categoryData.has("T1H") ? parseFloat(categoryData.get("T1H")!) : null;
      const humidity = categoryData.has("REH") ? parseFloat(categoryData.get("REH")!) : null;
      const lightning = categoryData.has("LGT") ? parseFloat(categoryData.get("LGT")!) : null;

      // 강수량 정보 파싱
      const precipitationData = categoryData.has("RN1") 
        ? this.parsePrecipitation(categoryData.get("RN1")!)
        : { value: null, amount: null };

      // 하늘상태 파싱
      const skyCode = categoryData.has("SKY") ? parseInt(categoryData.get("SKY")!) as SkyCondition : null;
      const skyDescription = skyCode ? this.SKY_CONDITIONS[skyCode] : null;

      // 강수형태 파싱
      const ptyCode = categoryData.has("PTY") ? parseInt(categoryData.get("PTY")!) as PrecipitationType : null;
      const ptyDescription = ptyCode !== null ? this.PRECIPITATION_TYPES[ptyCode] : null;

      // 바람 정보 파싱
      const windDirection = categoryData.has("VEC") ? parseFloat(categoryData.get("VEC")!) : null;
      const windSpeed = categoryData.has("WSD") ? parseFloat(categoryData.get("WSD")!) : null;
      const uComponent = categoryData.has("UUU") ? parseFloat(categoryData.get("UUU")!) : null;
      const vComponent = categoryData.has("VVV") ? parseFloat(categoryData.get("VVV")!) : null;

      const hourlyWeather: IHourlyWeather = {
        forecastDateTime: forecastDateTime.toISOString(),
        temperature,
        precipitation: precipitationData,
        sky: {
          code: skyCode,
          description: skyDescription,
        },
        precipitationType: {
          code: ptyCode,
          description: ptyDescription,
        },
        humidity,
        wind: {
          direction: windDirection,
          speed: windSpeed,
          uComponent,
          vComponent,
        },
        lightning,
      };

      hourlyForecasts.push(hourlyWeather);
    }

    // 시간순으로 정렬
    return hourlyForecasts.sort((a, b) => 
      new Date(a.forecastDateTime).getTime() - new Date(b.forecastDateTime).getTime()
    );
  }

  /**
   * 기상 예보 정보 조회
   * 
   * @description
   * 위경도 좌표를 기반으로 기상청 초단기예보 정보를 조회합니다.
   * 
   * 처리 과정:
   * 1. 위경도를 기상청 격자 좌표로 변환
   * 2. 현재 사용 가능한 발표시각 계산 (요청에 없는 경우)
   * 3. 기상청 API 호출
   * 4. 응답 데이터 검증 및 파싱
   * 5. 사용자 친화적 형태로 데이터 변환
   * 
   * @param request - 기상 정보 조회 요청 데이터
   * @returns 파싱된 기상 예보 정보
   * 
   * @throws {Error} 좌표 변환 실패, API 호출 실패, 데이터 파싱 실패 등
   * 
   * @example
   * ```typescript
   * const weatherService = new WeatherService();
   * 
   * // 서울시청 위치의 기상 정보 조회
   * const forecast = await weatherService.getWeatherForecast({
   *   location: { lat: 37.5663, lng: 126.9779 }
   * });
   * 
   * console.log(forecast.hourlyForecasts[0].temperature); // 현재 기온
   * ```
   */
  public async getWeatherForecast(request: IWeatherForecastRequest): Promise<IWeatherForecastResponse> {
    const startTime = new Date();

    try {
      // 1. API 키 검증
      const apiKey = MyGlobal.env.WEATHER_API_KEY;
      if (!apiKey || apiKey === "your_weather_api_key") {
        WeatherErrorUtil.handleConfigurationError("api_key", {
          message: "WEATHER_API_KEY 환경변수가 설정되지 않았거나 기본값입니다."
        });
      }

      // 2. 위경도를 격자 좌표로 변환
      let gridCoordinates: IGrid;
      try {
        gridCoordinates = convertLatLngToGrid(request.location);
      } catch (error) {
        WeatherErrorUtil.handleCoordinateError(
          error as Error,
          {
            coordinates: { lat: request.location.lat, lng: request.location.lng },
            operation: "latLngToGrid"
          }
        );
      }

      // 3. 발표 일시 설정 (요청에 없으면 현재 기준 계산)
      const baseDateTime = request.baseDate && request.baseTime 
        ? { baseDate: request.baseDate, baseTime: request.baseTime }
        : this.getCurrentBaseDateTime();

      // 4. API 호출 URL 생성
      const apiUrl = this.buildApiUrl({
        authKey: apiKey,
        nx: gridCoordinates.x,
        ny: gridCoordinates.y,
        baseDate: baseDateTime.baseDate,
        baseTime: baseDateTime.baseTime,
        numOfRows: request.numOfRows || this.API_CONFIG.DEFAULT_NUM_OF_ROWS,
      });

      // 5. 기상청 API 호출
      let response: Response;
      let jsonData: any;
      
      try {
        response = await fetch(apiUrl, {
          timeout: 10000, // 10초 타임아웃
        } as any);
        
        if (!response.ok) {
          WeatherErrorUtil.handleNetworkError(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
            apiUrl
          );
        }

        jsonData = await response.json();
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          WeatherErrorUtil.handleNetworkError(error as Error, apiUrl);
        } else {
          WeatherErrorUtil.handleDataParsingError(
            error as Error,
            { dataType: "json", stage: "fetch" }
          );
        }
      }

      // 6. 응답 데이터 검증
      try {
        this.validateApiResponse(jsonData);
      } catch (error) {
        const errorMessage = (error as Error).message;
        
        // 기상청 API 에러 코드 추출
        const codeMatch = errorMessage.match(/\[(\d{2})\]/);
        if (codeMatch) {
          WeatherErrorUtil.handleWeatherApiError(
            codeMatch[1],
            errorMessage,
            {
              url: apiUrl,
              parameters: { gridCoordinates, baseDateTime },
              timestamp: startTime.toISOString()
            }
          );
        } else {
          WeatherErrorUtil.handleDataParsingError(
            error as Error,
            { dataType: "forecast", stage: "validate" }
          );
        }
      }

      // 7. 원본 데이터 추출 및 파싱
      let rawItems: IWeatherForecastRawItem[];
      let hourlyForecasts: IHourlyWeather[];

      try {
        rawItems = jsonData.response.body.items.item;
        const groupedData = this.groupByForecastTime(rawItems);
        hourlyForecasts = this.convertToHourlyWeather(groupedData);
      } catch (error) {
        WeatherErrorUtil.handleDataParsingError(
          error as Error,
          { dataType: "forecast", stage: "transform" }
        );
      }

      // 8. 응답 데이터 구성
      const forecastResponse: IWeatherForecastResponse = {
        location: request.location,
        gridCoordinates,
        baseInfo: {
          baseDate: baseDateTime.baseDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
          baseTime: baseDateTime.baseTime.replace(/(\d{2})(\d{2})/, "$1:$2"),
        },
        hourlyForecasts,
        metadata: {
          success: true,
          requestTime: startTime.toISOString(),
          totalItems: rawItems.length,
          message: `${hourlyForecasts.length}시간의 예보 데이터를 성공적으로 조회했습니다.`,
        },
      };

      return forecastResponse;

    } catch (error) {
      // 이미 처리된 HttpException은 그대로 전파
      if (error instanceof Error && error.name === "HttpException") {
        throw error;
      }
      
      // 기타 예상치 못한 에러 처리
      WeatherErrorUtil.handleGenericError(
        error as Error,
        {
          operation: "getWeatherForecast",
          input: request,
          stage: "unknown"
        }
      );
    }
  }

  /**
   * 특정 격자 좌표의 기상 정보 조회 (격자 좌표 직접 입력)
   * 
   * @description
   * 이미 알고 있는 격자 좌표를 직접 사용하여 기상 정보를 조회합니다.
   * 좌표 변환 과정을 생략하므로 약간 더 빠른 응답을 얻을 수 있습니다.
   * 
   * @param gridCoordinates - 기상청 격자 좌표
   * @param options - 추가 옵션 (발표일시, 조회 개수 등)
   * @returns 파싱된 기상 예보 정보
   */
  public async getWeatherForecastByGrid(
    gridCoordinates: IGrid,
    options: {
      baseDate?: string;
      baseTime?: string;
      numOfRows?: number;
    } = {}
  ): Promise<IWeatherForecastResponse> {
    // 격자 좌표를 대략적인 위경도로 역변환 (응답용)
    // 실제 좌표 변환은 하지 않고 격자 기준 추정 위치 사용
    const estimatedLocation: ILatLng = {
      lat: 37.5 + (gridCoordinates.y - 127) * 0.05, // 대략적인 추정
      lng: 126.0 + (gridCoordinates.x - 60) * 0.05,
    };

    return this.getWeatherForecast({
      location: estimatedLocation,
      baseDate: options.baseDate,
      baseTime: options.baseTime,
      numOfRows: options.numOfRows,
    });
  }

  /**
   * 간단한 현재 날씨 정보 조회
   * 
   * @description
   * 프론트엔드에서 사용하기 쉽도록 정제된 현재 날씨 정보만 반환합니다.
   * 전체 6시간 데이터 대신 현재 시간(가장 가까운 예보 시간)의 데이터만 추출하여
   * 생활에 필요한 정보 위주로 가공해서 제공합니다.
   * 
   * @param location - 조회할 위치의 위경도 좌표
   * @returns 정제된 현재 날씨 정보
   * 
   * @example
   * ```typescript
   * const weather = await getCurrentWeather({
   *   lat: 37.5663,
   *   lng: 126.9779
   * });
   * 
   * console.log(weather.current.summary); // "흐리고 비, 27°C"
   * console.log(weather.advice.message); // "우산을 준비하세요"
   * ```
   */
  public async getCurrentWeather(location: ILatLng): Promise<ISimpleWeatherResponse> {
    const startTime = new Date();

    try {
      // 전체 예보 데이터 조회 (기본값 60개 = 10개 카테고리 × 6시간)
      // 기상청 초단기예보는 10개 카테고리를 제공하므로, 모든 카테고리를 받으려면 최소 60개 필요
      const fullForecast = await this.getWeatherForecast({
        location,
        numOfRows: 60, // 기본값 사용 (10개 카테고리 × 6시간 = 60개)
      });

      // 가장 가까운 현재 시간의 데이터 추출 (첫 번째 데이터)
      const currentHour = fullForecast.hourlyForecasts[0];

      if (!currentHour) {
        throw new Error("현재 날씨 데이터를 찾을 수 없습니다.");
      }

      // 체감 온도 설명 생성
      const getTemperatureFeeling = (temp: number | null): string => {
        if (temp === null) return "정보 없음";
        if (temp < 0) return "매우 추움";
        if (temp < 10) return "추움";
        if (temp < 20) return "쌀쌀함";
        if (temp < 25) return "적당함";
        if (temp < 30) return "따뜻함";
        return "더움";
      };

      // 바람 설명 생성
      const getWindDescription = (speed: number | null): string => {
        if (speed === null) return "정보 없음";
        if (speed < 2) return "바람 없음";
        if (speed < 6) return "약한 바람";
        if (speed < 10) return "보통 바람";
        return "강한 바람";
      };

      // 옷차림 조언 생성
      const getClothingAdvice = (temp: number | null, precipitation: boolean): string => {
        if (temp === null) return "날씨를 확인 후 결정하세요";
        
        let advice = "";
        if (temp < 5) advice = "두꺼운 겨울옷";
        else if (temp < 10) advice = "코트나 패딩";
        else if (temp < 15) advice = "자켓이나 가디건";
        else if (temp < 20) advice = "긴팔 또는 얇은 겉옷";
        else if (temp < 25) advice = "긴팔 또는 반팔";
        else if (temp < 30) advice = "반팔";
        else advice = "시원한 옷";

        if (precipitation) advice += " + 우산";
        
        return advice;
      };

      // 외출 적합도 계산 (1-5점)
      const getOutdoorActivity = (
        temp: number | null,
        precipitation: number | null,
        windSpeed: number | null
      ): number => {
        let score = 5;
        
        // 온도에 따른 점수 조정
        if (temp !== null) {
          if (temp < 0 || temp > 35) score -= 2;
          else if (temp < 5 || temp > 30) score -= 1;
        }
        
        // 강수에 따른 점수 조정
        if (precipitation !== null && precipitation > 0) {
          if (precipitation > 10) score -= 2;
          else score -= 1;
        }
        
        // 바람에 따른 점수 조정
        if (windSpeed !== null && windSpeed > 10) score -= 1;
        
        return Math.max(1, Math.min(5, score));
      };

      // 우산 필요 여부 판단
      const needsUmbrella = currentHour.precipitationType.code !== null && 
                           currentHour.precipitationType.code > 0 &&
                           currentHour.precipitation.amount !== null &&
                           currentHour.precipitation.amount > 0;

      // 전체 요약 메시지 생성
      const createSummary = (): string => {
        const parts: string[] = [];
        
        if (currentHour.sky.description) {
          parts.push(currentHour.sky.description);
        }
        
        if (currentHour.precipitationType.description && 
            currentHour.precipitationType.code !== 0) {
          parts.push(currentHour.precipitationType.description);
        }
        
        if (currentHour.temperature !== null) {
          parts.push(`${currentHour.temperature}°C`);
        }
        
        return parts.join(", ") || "날씨 정보 확인 중";
      };

      // 종합 조언 메시지 생성
      const createAdviceMessage = (): string => {
        const messages: string[] = [];
        
        if (needsUmbrella) {
          messages.push("우산을 준비하세요");
        }
        
        const outdoorScore = getOutdoorActivity(
          currentHour.temperature,
          currentHour.precipitation.amount,
          currentHour.wind.speed
        );
        
        if (outdoorScore >= 4) {
          messages.push("외출하기 좋은 날씨입니다");
        } else if (outdoorScore <= 2) {
          messages.push("외출 시 주의가 필요합니다");
        }
        
        if (currentHour.temperature !== null) {
          if (currentHour.temperature < 5) {
            messages.push("추위에 주의하세요");
          } else if (currentHour.temperature > 30) {
            messages.push("더위에 주의하세요");
          }
        }
        
        return messages.join(". ") || "현재 날씨를 확인하세요";
      };

      const simpleResponse: ISimpleWeatherResponse = {
        location,
        current: {
          temperature: currentHour.temperature,
          temperatureFeeling: getTemperatureFeeling(currentHour.temperature),
          sky: {
            code: currentHour.sky.code,
            description: currentHour.sky.description,
          },
          precipitation: {
            type: currentHour.precipitationType.description,
            amount: currentHour.precipitation.amount,
            status: currentHour.precipitation.value,
          },
          humidity: currentHour.humidity,
          wind: {
            speed: currentHour.wind.speed,
            direction: currentHour.wind.direction,
            description: getWindDescription(currentHour.wind.speed),
          },
          summary: createSummary(),
        },
        advice: {
          outdoorActivity: getOutdoorActivity(
            currentHour.temperature,
            currentHour.precipitation.amount,
            currentHour.wind.speed
          ),
          umbrella: needsUmbrella,
          clothing: getClothingAdvice(currentHour.temperature, needsUmbrella),
          message: createAdviceMessage(),
        },
        metadata: {
          success: true,
          requestTime: startTime.toISOString(),
          forecastTime: `${fullForecast.baseInfo.baseDate} ${fullForecast.baseInfo.baseTime}`,
          source: "기상청",
        },
      };

      return simpleResponse;

    } catch (error) {
      // 에러 발생 시에도 기본 구조 반환
      throw error; // WeatherErrorUtil에서 처리하도록 전파
    }
  }

  /**
   * 서비스 상태 확인
   * 
   * @description
   * 기상청 API 연결 상태와 서비스 가용성을 확인합니다.
   * 헬스체크 용도로 사용할 수 있습니다.
   * 
   * @returns 서비스 상태 정보
   */
  public async checkServiceHealth(): Promise<{
    isHealthy: boolean;
    apiStatus: string;
    message: string;
    timestamp: string;
  }> {
    try {
      // 서울시청 좌표로 간단한 조회 테스트
      const testLocation: ILatLng = { lat: 37.5663, lng: 126.9779 };
      
      await this.getCurrentWeather(testLocation); // 간단한 현재 날씨로 테스트

      return {
        isHealthy: true,
        apiStatus: "AVAILABLE",
        message: "기상청 API 서비스가 정상적으로 작동중입니다.",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        isHealthy: false,
        apiStatus: "UNAVAILABLE",
        message: `기상청 API 서비스에 문제가 있습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
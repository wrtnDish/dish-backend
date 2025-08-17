import { tags } from "typia";

/**
 * 위경도 좌표 정보
 * @description 위도와 경도를 나타내는 인터페이스
 */
export interface ILatLng {
  /**
   * 위도 (Latitude)
   * @description 북위 기준, 대한민국 범위: 33.0 ~ 38.9
   */
  lat: number & tags.Minimum<33.0> & tags.Maximum<38.9>;

  /**
   * 경도 (Longitude) 
   * @description 동경 기준, 대한민국 범위: 124.0 ~ 132.0
   */
  lng: number & tags.Minimum<124.0> & tags.Maximum<132.0>;
}

/**
 * 기상청 격자 좌표 정보
 * @description Lambert Conformal Conic Projection으로 변환된 격자 좌표
 */
export interface IGrid {
  /**
   * X축 격자 좌표
   * @description 기상청 예보 격자의 X 좌표 (1~149)
   */
  x: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<149>;

  /**
   * Y축 격자 좌표  
   * @description 기상청 예보 격자의 Y 좌표 (1~253)
   */
  y: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<253>;
}

/**
 * 기상청 초단기예보 요청 정보
 * @description 기상청 API 호출을 위한 요청 파라미터
 */
export interface IWeatherForecastRequest {
  /**
   * 위경도 좌표
   * @description 예보를 조회할 지점의 위경도 정보
   */
  location: ILatLng;

  /**
   * 발표일자 (선택사항)
   * @description 예보 발표일자, 미입력시 오늘 날짜 사용 (YYYYMMDD 형식)
   */
  baseDate?: string & tags.Pattern<"^\\d{8}$">;

  /**
   * 발표시각 (선택사항)
   * @description 예보 발표시각, 미입력시 현재 가능한 최신 시각 사용 (HHMM 형식)
   */
  baseTime?: string & tags.Pattern<"^\\d{4}$">;

  /**
   * 조회할 데이터 개수 (선택사항)
   * @description 페이징 처리를 위한 결과 개수 (기본값: 60, 최대: 1000)
   */
  numOfRows?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>;
}

/**
 * 기상 예보 데이터 카테고리
 * @description 기상청에서 제공하는 각종 기상 요소들
 */
export type WeatherCategory = 
  | "T1H"  // 기온(℃)
  | "RN1"  // 1시간 강수량(범주)
  | "SKY"  // 하늘상태(코드값)
  | "UUU"  // 동서바람성분(m/s)
  | "VVV"  // 남북바람성분(m/s)
  | "REH"  // 습도(%)
  | "PTY"  // 강수형태(코드값)
  | "LGT"  // 낙뢰(kA)
  | "VEC"  // 풍향(deg)
  | "WSD"; // 풍속(m/s)

/**
 * 하늘 상태 코드
 * @description SKY 카테고리의 코드값 정의
 */
export type SkyCondition = 1 | 3 | 4; // 맑음(1), 구름많음(3), 흐림(4)

/**
 * 강수 형태 코드
 * @description PTY 카테고리의 코드값 정의
 */
export type PrecipitationType = 0 | 1 | 2 | 3 | 5 | 6 | 7; 
// 없음(0), 비(1), 비/눈(2), 눈(3), 빗방울(5), 빗방울눈날림(6), 눈날림(7)

/**
 * 기상청 원본 예보 데이터 항목
 * @description 기상청 API로부터 받은 원본 예보 데이터 구조
 */
export interface IWeatherForecastRawItem {
  /**
   * 발표일자
   * @description 예보가 발표된 날짜 (YYYYMMDD)
   */
  baseDate: string & tags.Pattern<"^\\d{8}$">;

  /**
   * 발표시각
   * @description 예보가 발표된 시각 (HHMM)
   */
  baseTime: string & tags.Pattern<"^\\d{4}$">;

  /**
   * 자료구분코드
   * @description 기상 요소를 구분하는 카테고리 코드
   */
  category: WeatherCategory;

  /**
   * 예측일자
   * @description 예보 대상 날짜 (YYYYMMDD)
   */
  fcstDate: string & tags.Pattern<"^\\d{8}$">;

  /**
   * 예측시간
   * @description 예보 대상 시각 (HHMM)
   */
  fcstTime: string & tags.Pattern<"^\\d{4}$">;

  /**
   * 예보값
   * @description 해당 카테고리의 예측값 (문자열 형태)
   */
  fcstValue: string;

  /**
   * 예보지점 X 좌표
   * @description 격자 좌표계의 X값
   */
  nx: number & tags.Type<"uint32">;

  /**
   * 예보지점 Y 좌표
   * @description 격자 좌표계의 Y값
   */
  ny: number & tags.Type<"uint32">;
}

/**
 * 파싱된 시간별 기상 정보
 * @description 특정 시간대의 모든 기상 요소를 포함한 통합 정보
 */
export interface IHourlyWeather {
  /**
   * 예보 대상 일시
   * @description ISO 8601 형식의 예보 시각 (YYYY-MM-DDTHH:mm:ss)
   */
  forecastDateTime: string & tags.Format<"date-time">;

  /**
   * 기온 (℃)
   * @description 섭씨 온도, 소수점 1자리까지 표현
   */
  temperature: number | null;

  /**
   * 1시간 강수량 정보
   * @description 강수량 범주 또는 실제 강수량 값
   */
  precipitation: {
    /**
     * 강수량 값
     * @description 실제 강수량 (mm 단위) 또는 범주형 문자열
     */
    value: string | null;
    
    /**
     * 강수량 (숫자)
     * @description 수치형 강수량, 범주형인 경우 null
     */
    amount: number | null;
  };

  /**
   * 하늘 상태
   * @description 맑음, 구름많음, 흐림 등의 하늘 상태
   */
  sky: {
    /**
     * 하늘상태 코드
     * @description 1(맑음), 3(구름많음), 4(흐림)
     */
    code: SkyCondition | null;
    
    /**
     * 하늘상태 설명
     * @description 사용자 친화적인 하늘 상태 설명
     */
    description: string | null;
  };

  /**
   * 강수 형태
   * @description 비, 눈, 빗방울 등의 강수 형태 정보
   */
  precipitationType: {
    /**
     * 강수형태 코드
     * @description 0~7 사이의 강수 형태 코드값
     */
    code: PrecipitationType | null;
    
    /**
     * 강수형태 설명
     * @description 사용자 친화적인 강수 형태 설명
     */
    description: string | null;
  };

  /**
   * 습도 (%)
   * @description 상대습도 0~100%
   */
  humidity: number | null;

  /**
   * 바람 정보
   * @description 풍향, 풍속 및 바람 성분 정보
   */
  wind: {
    /**
     * 풍향 (도)
     * @description 바람이 불어오는 방향 (0~360도)
     */
    direction: number | null;
    
    /**
     * 풍속 (m/s)
     * @description 바람의 속도
     */
    speed: number | null;
    
    /**
     * 동서 바람 성분 (m/s)
     * @description U 성분, 동쪽이 양수
     */
    uComponent: number | null;
    
    /**
     * 남북 바람 성분 (m/s)
     * @description V 성분, 북쪽이 양수
     */
    vComponent: number | null;
  };

  /**
   * 낙뢰 정보 (kA)
   * @description 낙뢰 강도, 낙뢰가 없을 경우 null
   */
  lightning: number | null;
}

/**
 * 기상 예보 응답 정보
 * @description API 응답으로 반환되는 완전한 기상 예보 데이터
 */
export interface IWeatherForecastResponse {
  /**
   * 요청한 위치 정보
   * @description 예보 조회를 요청한 원본 위경도
   */
  location: ILatLng;

  /**
   * 변환된 격자 좌표
   * @description 기상청 격자 좌표계로 변환된 X, Y 좌표
   */
  gridCoordinates: IGrid;

  /**
   * 예보 기준 정보
   * @description 예보 발표 기준 일시
   */
  baseInfo: {
    /**
     * 발표 일자
     * @description 예보가 발표된 날짜 (YYYY-MM-DD)
     */
    baseDate: string & tags.Format<"date">;
    
    /**
     * 발표 시각
     * @description 예보가 발표된 시각 (HH:mm)
     */
    baseTime: string & tags.Pattern<"^\\d{2}:\\d{2}$">;
  };

  /**
   * 시간별 기상 정보 목록
   * @description 향후 6시간의 시간별 상세 기상 정보
   */
  hourlyForecasts: IHourlyWeather[];

  /**
   * 응답 메타데이터
   * @description API 호출 및 처리 관련 부가 정보
   */
  metadata: {
    /**
     * 조회 성공 여부
     * @description API 호출 및 데이터 파싱 성공 여부
     */
    success: boolean;
    
    /**
     * 조회 시각
     * @description API가 호출된 시각 (ISO 8601)
     */
    requestTime: string & tags.Format<"date-time">;
    
    /**
     * 처리된 데이터 개수
     * @description 실제로 파싱된 예보 데이터 항목 수
     */
    totalItems: number & tags.Type<"uint32">;
    
    /**
     * 메시지
     * @description 처리 결과 메시지 또는 경고사항
     */
    message?: string;
  };
}

/**
 * 간단한 현재 날씨 정보
 * @description 프론트엔드에서 사용하기 쉽도록 정제된 현재 날씨 데이터
 */
export interface ISimpleWeatherResponse {
  /**
   * 요청한 위치 정보
   */
  location: ILatLng;

  /**
   * 현재 날씨 정보
   */
  current: {
    /**
     * 현재 기온 (°C)
     */
    temperature: number | null;

    /**
     * 체감 온도 설명
     * @example "따뜻함", "쌀쌀함", "더움", "추움"
     */
    temperatureFeeling: string;

    /**
     * 하늘 상태
     */
    sky: {
      code: SkyCondition | null;
      description: string | null;
    };

    /**
     * 강수 정보
     */
    precipitation: {
      type: string | null;        // 강수 형태
      amount: number | null;      // 강수량 (mm)
      status: string | null;      // 강수 상태 설명
    };

    /**
     * 습도 (%)
     */
    humidity: number | null;

    /**
     * 바람 정보
     */
    wind: {
      speed: number | null;       // 풍속 (m/s)
      direction: number | null;   // 풍향 (도)
      description: string | null; // 바람 설명
    };

    /**
     * 전체 날씨 한줄 요약
     * @example "흐리고 비, 27°C"
     */
    summary: string;
  };

  /**
   * 생활 지수 및 조언
   */
  advice: {
    /**
     * 외출 적합도 (1-5점)
     * @description 1: 매우 나쁨, 5: 매우 좋음
     */
    outdoorActivity: number;

    /**
     * 우산 필요 여부
     */
    umbrella: boolean;

    /**
     * 옷차림 조언
     * @example "가벼운 긴팔", "두꺼운 외투", "반팔"
     */
    clothing: string;

    /**
     * 종합 조언 메시지
     * @example "외출하기에 좋지 않은 날씨입니다. 우산을 준비하세요."
     */
    message: string;
  };

  /**
   * 메타데이터
   */
  metadata: {
    /**
     * 조회 성공 여부
     */
    success: boolean;

    /**
     * 조회 시각
     */
    requestTime: string & tags.Format<"date-time">;

    /**
     * 예보 발표 시각
     */
    forecastTime: string;

    /**
     * 데이터 출처
     */
    source: "기상청";
  };
}

/**
 * 기상청 API 에러 정보
 * @description 기상청 API 호출 시 발생할 수 있는 에러 정보
 */
export interface IWeatherApiError {
  /**
   * 에러 코드
   * @description 기상청 API에서 정의한 에러 코드 (00~99)
   */
  code: string & tags.Pattern<"^\\d{2}$">;

  /**
   * 에러 메시지
   * @description 에러에 대한 상세 설명
   */
  message: string;

  /**
   * 에러 발생 시각
   * @description 에러가 발생한 시각 (ISO 8601)
   */
  timestamp: string & tags.Format<"date-time">;

  /**
   * 요청 정보
   * @description 에러가 발생한 요청의 정보
   */
  requestInfo?: {
    location: ILatLng;
    baseDate?: string;
    baseTime?: string;
  };
}
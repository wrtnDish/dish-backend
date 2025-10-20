/**
 * 위치 정보 관련 인터페이스
 * 
 * @description
 * 사용자의 현재 위치를 파악하고 처리하기 위한 타입 정의들입니다.
 * 다양한 위치 파악 방법(GPS, IP, 도시명 등)을 지원합니다.
 */

/**
 * 기본 위경도 좌표
 */
export interface ILatLng {
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
}

/**
 * 위치 정보 요청
 */
export interface ILocationRequest {
  /**
   * 위치 파악 방법
   */
  method: "gps" | "city" | "address";
  
  /**
   * GPS 좌표 (method가 "gps"인 경우)
   */
  coordinates?: ILatLng;
  
  /**
   * 도시명 (method가 "city"인 경우)
   * @example "서울", "부산", "대구", "인천"
   */
  cityName?: string;
  
  /**
   * 주소 (method가 "address"인 경우)
   * @example "서울특별시 강남구 역삼동"
   */
  address?: string;
  
}

/**
 * 위치 정보 응답
 */
export interface ILocationResponse {
  /**
   * 파악된 위치의 좌표
   */
  coordinates: ILatLng;
  
  /**
   * 위치 파악 방법
   */
  method: "gps" | "city" | "address";
  
  /**
   * 위치 정보
   */
  locationInfo: {
    /**
     * 도시명
     */
    city: string;
    
    /**
     * 구/군명
     */
    district?: string;
    
    /**
     * 상세 주소
     */
    address?: string;
    
    /**
     * 위치 정확도 (1-5, 5가 가장 정확)
     */
    accuracy: 1 | 2 | 3 | 4 | 5;
    
    /**
     * 위치 설명
     */
    description?: string;
  };
  
  /**
   * 메타데이터
   */
  metadata: {
    /**
     * 성공 여부
     */
    success: boolean;
    
    /**
     * 요청 시간
     */
    requestTime: string;
    
    /**
     * 응답 메시지
     */
    message: string;
    
    /**
     * 데이터 소스
     */
    source: string;
  };
}

/**
 * 현재 위치 기반 날씨 요청
 */
export interface ICurrentLocationWeatherRequest {
  /**
   * 위치 정보 요청
   */
  locationRequest: ILocationRequest;
  
  /**
   * 날씨 조회 옵션
   */
  weatherOptions?: {
    /**
     * 상세 정보 포함 여부
     */
    includeDetails?: boolean;
    
    /**
     * 6시간 예보 포함 여부
     */
    includeHourlyForecast?: boolean;
    
    /**
     * 날씨 분석 및 조언 포함 여부
     */
    includeAnalysis?: boolean;
  };
}

/**
 * 현재 위치 기반 날씨 응답
 */
export interface ICurrentLocationWeatherResponse {
  /**
   * 위치 정보
   */
  location: ILocationResponse;
  
  /**
   * 현재 날씨 요약
   */
  currentWeather: {
    /**
     * 한 줄 요약
     * @example "맑음, 23°C, 습도 60%"
     */
    summary: string;
    
    /**
     * 기온
     */
    temperature: number | null;
    
    /**
     * 하늘 상태
     */
    sky: string | null;
    
    /**
     * 강수 정보
     */
    precipitation: string | null;
    
    /**
     * 습도
     */
    humidity: number | null;
  };
  
  /**
   * 상세 날씨 정보 (옵션)
   */
  detailedWeather?: any;
  
  /**
   * 날씨 분석 및 조언 (옵션)
   */
  analysis?: {
    /**
     * 상황 분석
     */
    analysis: string;
    
    /**
     * 사용자 조언
     */
    advice: string;
    
    /**
     * 경고사항
     */
    warnings: string[];
    
    /**
     * 활동 추천
     */
    recommendations: string[];
  };
  
  /**
   * 메타데이터
   */
  metadata: {
    /**
     * 성공 여부
     */
    success: boolean;
    
    /**
     * 처리 시간
     */
    processingTime: string;
    
    /**
     * 메시지
     */
    message: string;
  };
}


/**
 * 도시 좌표 정보
 */
export interface ICityCoordinates {
  /**
   * 도시명
   */
  name: string;
  
  /**
   * 영문명
   */
  nameEn: string;
  
  /**
   * 좌표
   */
  coordinates: ILatLng;
  
  /**
   * 구/군 목록
   */
  districts?: Array<{
    name: string;
    coordinates: ILatLng;
  }>;
  
  /**
   * 인구수 (선택사항)
   */
  population?: number;
  
  /**
   * 지역 설명
   */
  description?: string;
}
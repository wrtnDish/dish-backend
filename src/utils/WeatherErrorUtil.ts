import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * 날씨 API 관련 에러 처리 유틸리티
 * 
 * @description
 * 기상청 API 연동 및 날씨 데이터 처리 과정에서 발생할 수 있는
 * 다양한 에러 상황을 적절한 HTTP 상태 코드와 메시지로 변환하는 유틸리티입니다.
 * 
 * 처리하는 에러 유형:
 * - 좌표 관련 에러 (범위 초과, 변환 실패 등)
 * - 기상청 API 에러 (인증, 파라미터, 서비스 상태 등)
 * - 데이터 파싱 에러 (응답 구조 오류, 값 변환 실패 등)
 * - 네트워크 에러 (연결 실패, 타임아웃 등)
 */
export class WeatherErrorUtil {
  /**
   * 기상청 API 에러 코드와 HTTP 상태 코드 매핑
   * @description 기상청에서 정의한 에러 코드를 적절한 HTTP 상태로 변환
   */
  private static readonly API_ERROR_STATUS_MAP: Record<string, HttpStatus> = {
    "00": HttpStatus.OK,                    // 정상
    "01": HttpStatus.INTERNAL_SERVER_ERROR, // 어플리케이션 에러
    "02": HttpStatus.INTERNAL_SERVER_ERROR, // 데이터베이스 에러
    "03": HttpStatus.NOT_FOUND,             // 데이터없음 에러
    "04": HttpStatus.BAD_GATEWAY,           // HTTP 에러
    "05": HttpStatus.SERVICE_UNAVAILABLE,   // 서비스 연결실패 에러
    "10": HttpStatus.BAD_REQUEST,           // 잘못된 요청 파라메터 에러
    "11": HttpStatus.BAD_REQUEST,           // 필수요청 파라메터가 없음
    "12": HttpStatus.NOT_FOUND,             // 해당 오픈API서비스가 없거나 폐기됨
    "20": HttpStatus.FORBIDDEN,             // 서비스 접근거부
    "22": HttpStatus.TOO_MANY_REQUESTS,     // 서비스 요청제한횟수 초과에러
    "30": HttpStatus.UNAUTHORIZED,          // 등록되지 않은 서비스키
    "31": HttpStatus.UNAUTHORIZED,          // 기한만료된 서비스키
    "32": HttpStatus.FORBIDDEN,             // 등록되지 않은 IP
    "33": HttpStatus.UNAUTHORIZED,          // 서명되지 않은 호출
    "99": HttpStatus.INTERNAL_SERVER_ERROR, // 기타에러
  };

  /**
   * 기상청 API 에러 코드별 상세 메시지
   * @description 사용자에게 제공할 친화적인 에러 메시지
   */
  private static readonly API_ERROR_MESSAGES: Record<string, string> = {
    "00": "정상적으로 처리되었습니다.",
    "01": "기상청 서버에서 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "02": "기상청 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "03": "요청하신 지역 또는 시간의 기상 데이터가 없습니다. 조회 조건을 확인해주세요.",
    "04": "기상청 서비스와의 통신 중 오류가 발생했습니다.",
    "05": "기상청 서비스에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.",
    "10": "요청 파라미터가 올바르지 않습니다. 입력 값을 확인해주세요.",
    "11": "필수 파라미터가 누락되었습니다. 요청 내용을 확인해주세요.",
    "12": "사용하려는 기상청 API 서비스가 중단되었거나 변경되었습니다.",
    "20": "기상청 API 서비스 이용이 제한되었습니다. 관리자에게 문의하세요.",
    "22": "API 호출 횟수가 일일 제한을 초과했습니다. 내일 다시 시도해주세요.",
    "30": "기상청 API 인증키가 등록되지 않았습니다. 서비스 설정을 확인해주세요.",
    "31": "기상청 API 인증키가 만료되었습니다. 관리자에게 문의하세요.",
    "32": "현재 IP에서는 기상청 API를 이용할 수 없습니다.",
    "33": "API 요청 서명이 올바르지 않습니다.",
    "99": "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요.",
  };

  /**
   * 좌표 관련 에러를 적절한 HTTP 예외로 변환
   * 
   * @description
   * 위경도 범위 초과, 격자 좌표 범위 초과, 좌표 변환 실패 등
   * 좌표 관련 문제를 처리합니다.
   * 
   * @param error - 발생한 에러 객체
   * @param context - 에러 발생 컨텍스트 (좌표값, 변환 방향 등)
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleCoordinateError(
    error: Error, 
    context?: { 
      coordinates?: { lat?: number; lng?: number; x?: number; y?: number };
      operation?: "latLngToGrid" | "gridToLatLng" | "validation";
    }
  ): never {
    const message = error.message;
    
    // 좌표 범위 초과 에러
    if (message.includes("대한민국 영역을 벗어났습니다") || 
        message.includes("유효 범위를 벗어났습니다")) {
      throw new HttpException(
        {
          error: "COORDINATE_OUT_OF_RANGE",
          message: "입력하신 좌표가 대한민국 영역을 벗어났습니다. 위도는 33.0~38.9, 경도는 124.0~132.0 범위 내에서 입력해주세요.",
          details: {
            providedCoordinates: context?.coordinates,
            supportedRange: {
              latitude: "33.0 ~ 38.9",
              longitude: "124.0 ~ 132.0",
              gridX: "1 ~ 149",
              gridY: "1 ~ 253"
            }
          }
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // 좌표 변환 계산 에러
    if (message.includes("변환") || message.includes("계산")) {
      throw new HttpException(
        {
          error: "COORDINATE_CONVERSION_FAILED",
          message: "좌표 변환 중 오류가 발생했습니다. 입력 좌표를 확인해주세요.",
          details: {
            operation: context?.operation,
            coordinates: context?.coordinates,
            originalError: message
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // 일반 좌표 관련 에러
    throw new HttpException(
      {
        error: "COORDINATE_ERROR",
        message: "좌표 처리 중 오류가 발생했습니다: " + message,
        details: context
      },
      HttpStatus.BAD_REQUEST
    );
  }

  /**
   * 기상청 API 에러를 적절한 HTTP 예외로 변환
   * 
   * @description
   * 기상청 API 응답의 에러 코드를 분석하여 적절한 HTTP 상태 코드와
   * 사용자 친화적인 메시지로 변환합니다.
   * 
   * @param errorCode - 기상청 API 에러 코드 (00~99)
   * @param originalMessage - 원본 에러 메시지
   * @param requestInfo - 요청 정보 (디버깅용)
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleWeatherApiError(
    errorCode: string,
    originalMessage?: string,
    requestInfo?: {
      url?: string;
      parameters?: Record<string, any>;
      timestamp?: string;
    }
  ): never {
    const httpStatus = this.API_ERROR_STATUS_MAP[errorCode] || HttpStatus.INTERNAL_SERVER_ERROR;
    const userMessage = this.API_ERROR_MESSAGES[errorCode] || "알 수 없는 기상청 API 오류가 발생했습니다.";

    throw new HttpException(
      {
        error: "WEATHER_API_ERROR",
        message: userMessage,
        details: {
          kmaErrorCode: errorCode,
          originalMessage,
          requestInfo,
          timestamp: new Date().toISOString()
        }
      },
      httpStatus
    );
  }

  /**
   * 네트워크 관련 에러를 적절한 HTTP 예외로 변환
   * 
   * @description
   * fetch 실패, 타임아웃, DNS 오류 등 네트워크 관련 문제를 처리합니다.
   * 
   * @param error - 발생한 네트워크 에러
   * @param requestUrl - 요청했던 URL
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleNetworkError(error: Error, requestUrl?: string): never {
    const message = error.message.toLowerCase();

    // 타임아웃 에러
    if (message.includes("timeout") || message.includes("timed out")) {
      throw new HttpException(
        {
          error: "NETWORK_TIMEOUT",
          message: "기상청 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
          details: {
            requestUrl,
            errorType: "timeout"
          }
        },
        HttpStatus.GATEWAY_TIMEOUT
      );
    }

    // DNS 해석 실패
    if (message.includes("getaddrinfo") || message.includes("dns")) {
      throw new HttpException(
        {
          error: "DNS_RESOLUTION_FAILED",
          message: "기상청 서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.",
          details: {
            requestUrl,
            errorType: "dns"
          }
        },
        HttpStatus.BAD_GATEWAY
      );
    }

    // 연결 거부
    if (message.includes("econnrefused") || message.includes("connection refused")) {
      throw new HttpException(
        {
          error: "CONNECTION_REFUSED",
          message: "기상청 서버가 연결을 거부했습니다. 서비스가 일시적으로 중단되었을 수 있습니다.",
          details: {
            requestUrl,
            errorType: "connection_refused"
          }
        },
        HttpStatus.BAD_GATEWAY
      );
    }

    // 일반 네트워크 에러
    throw new HttpException(
      {
        error: "NETWORK_ERROR",
        message: "기상청 API 호출 중 네트워크 오류가 발생했습니다: " + error.message,
        details: {
          requestUrl,
          originalError: error.message
        }
      },
      HttpStatus.BAD_GATEWAY
    );
  }

  /**
   * 데이터 파싱 에러를 적절한 HTTP 예외로 변환
   * 
   * @description
   * JSON 파싱 실패, 응답 구조 오류, 데이터 타입 불일치 등
   * 데이터 처리 관련 문제를 처리합니다.
   * 
   * @param error - 발생한 파싱 에러
   * @param context - 파싱 시도했던 데이터 정보
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleDataParsingError(
    error: Error,
    context?: {
      dataType?: "json" | "xml" | "forecast" | "coordinates";
      stage?: "fetch" | "parse" | "validate" | "transform";
      sampleData?: any;
    }
  ): never {
    const message = error.message;

    // JSON 파싱 에러
    if (message.includes("JSON") || message.includes("parse")) {
      throw new HttpException(
        {
          error: "DATA_PARSING_FAILED",
          message: "기상청에서 받은 데이터 형식이 올바르지 않습니다. 서비스에 문제가 있을 수 있습니다.",
          details: {
            stage: context?.stage || "parse",
            dataType: context?.dataType || "unknown",
            originalError: message
          }
        },
        HttpStatus.BAD_GATEWAY
      );
    }

    // 타입 검증 에러 (typia)
    if (message.includes("typia") || message.includes("Expected")) {
      throw new HttpException(
        {
          error: "DATA_VALIDATION_FAILED",
          message: "기상청 데이터가 예상된 형식과 다릅니다. 서비스 업데이트가 필요할 수 있습니다.",
          details: {
            stage: "validation",
            validationError: message,
            context
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // 일반 데이터 처리 에러
    throw new HttpException(
      {
        error: "DATA_PROCESSING_ERROR",
        message: "날씨 데이터 처리 중 오류가 발생했습니다: " + message,
        details: context
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * 환경 설정 관련 에러를 적절한 HTTP 예외로 변환
   * 
   * @description
   * API 키 누락, 잘못된 환경 변수 등 설정 문제를 처리합니다.
   * 
   * @param configType - 설정 유형 (api_key, environment 등)
   * @param details - 설정 관련 상세 정보
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleConfigurationError(
    configType: "api_key" | "environment" | "validation",
    details?: Record<string, any>
  ): never {
    let message: string;
    let error: string;

    switch (configType) {
      case "api_key":
        error = "API_KEY_MISSING";
        message = "기상청 API 인증키가 설정되지 않았습니다. 관리자에게 문의하세요.";
        break;
      case "environment":
        error = "ENVIRONMENT_ERROR";
        message = "서버 환경 설정에 문제가 있습니다. 관리자에게 문의하세요.";
        break;
      case "validation":
        error = "CONFIGURATION_VALIDATION_FAILED";
        message = "서버 설정 검증에 실패했습니다. 관리자에게 문의하세요.";
        break;
      default:
        error = "CONFIGURATION_ERROR";
        message = "서버 설정 오류가 발생했습니다.";
    }

    throw new HttpException(
      {
        error,
        message,
        details: {
          configType,
          ...details,
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * 일반적인 에러를 분석하여 적절한 HTTP 예외로 변환
   * 
   * @description
   * 에러 메시지와 타입을 분석하여 가장 적절한 변환 방법을 선택합니다.
   * 다른 특화된 핸들러로 처리할 수 없는 에러들을 처리합니다.
   * 
   * @param error - 발생한 에러 객체
   * @param context - 에러 발생 컨텍스트
   * @throws {HttpException} 적절한 HTTP 상태 코드와 메시지를 포함한 예외
   */
  public static handleGenericError(
    error: Error,
    context?: {
      operation?: string;
      input?: any;
      stage?: string;
    }
  ): never {
    const message = error.message;

    // 이미 HttpException인 경우 그대로 전파
    if (error instanceof HttpException) {
      throw error;
    }

    // 좌표 관련 에러인지 확인
    if (message.includes("좌표") || message.includes("coordinate") || 
        message.includes("lat") || message.includes("lng") ||
        message.includes("x") || message.includes("y")) {
      return this.handleCoordinateError(error, {
        operation: "validation"
      });
    }

    // 네트워크 관련 에러인지 확인
    if (message.includes("fetch") || message.includes("network") ||
        message.includes("connection") || message.includes("timeout")) {
      return this.handleNetworkError(error);
    }

    // 파싱 관련 에러인지 확인
    if (message.includes("parse") || message.includes("JSON") ||
        message.includes("format") || message.includes("typia")) {
      return this.handleDataParsingError(error, { stage: context?.stage as any });
    }

    // 기타 모든 에러
    throw new HttpException(
      {
        error: "UNKNOWN_ERROR",
        message: "날씨 서비스 처리 중 예상치 못한 오류가 발생했습니다.",
        details: {
          originalError: message,
          context,
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
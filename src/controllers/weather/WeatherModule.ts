import { Module } from "@nestjs/common";

import { WeatherService } from "../../services/WeatherService";
import { WeatherController } from "./WeatherController";

/**
 * 날씨 예보 기능 모듈
 *
 * @description
 * 기상청 초단기예보 조회 기능을 제공하는 NestJS 모듈입니다.
 * WeatherController와 WeatherService를 포함하여 완전한 날씨 API 기능을 제공합니다.
 *
 * 제공 기능:
 * - RESTful 날씨 API 엔드포인트
 * - 위경도 ↔ 격자좌표 변환 서비스
 * - 기상청 API 연동 및 데이터 파싱
 * - 서비스 상태 모니터링
 *
 * 의존성:
 * - 기상청 API 인증키 (환경변수: WEATHER_API_KEY)
 * - HTTP 클라이언트 (fetch API)
 * - 수학 연산 라이브러리 (좌표 변환용)
 *
 * @module WeatherModule
 */
@Module({
  /**
   * 이 모듈에서 제공하는 컨트롤러 목록
   * @description 날씨 관련 API 엔드포인트를 제공하는 컨트롤러
   */
  controllers: [WeatherController],

  /**
   * 이 모듈에서 제공하는 서비스 목록
   * @description 날씨 데이터 처리 및 기상청 API 연동을 담당하는 서비스
   */
  providers: [WeatherService],

  /**
   * 다른 모듈에서 사용할 수 있도록 내보낼 서비스 목록
   * @description WeatherService를 다른 모듈에서도 사용할 수 있도록 설정
   */
  exports: [WeatherService],
})
export class WeatherModule {}
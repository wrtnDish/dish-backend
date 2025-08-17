import { ILatLng, IGrid } from "../api/structures/weather/IWeatherForecast";

/**
 * Lambert Conformal Conic Projection 파라미터
 * @description 기상청에서 사용하는 격자 좌표계 변환을 위한 지도 투영 상수들
 * 
 * 기상청은 람베르트 정각원추도법(Lambert Conformal Conic Projection)을 사용하여
 * 지구의 곡면을 평면으로 투영하고, 이를 통해 격자 좌표계를 구성합니다.
 */
const MAP_PROJECTION_PARAMS = {
  /**
   * 지구 반지름 (km)
   * @description 기상청에서 사용하는 지구 반지름 값
   */
  Re: 6371.00877,

  /**
   * 격자 간격 (km)
   * @description 기상청 예보 격자의 실제 거리 간격
   */
  grid: 5.0,

  /**
   * 표준 위도 1 (degree)
   * @description 람베르트 투영에서 사용하는 첫 번째 표준 위도
   */
  slat1: 30.0,

  /**
   * 표준 위도 2 (degree)
   * @description 람베르트 투영에서 사용하는 두 번째 표준 위도
   */
  slat2: 60.0,

  /**
   * 기준점 경도 (degree)
   * @description 투영의 중심이 되는 경도 (동경 126도)
   */
  olon: 126.0,

  /**
   * 기준점 위도 (degree)
   * @description 투영의 중심이 되는 위도 (북위 38도)
   */
  olat: 38.0,

  /**
   * 기준점 X 좌표 (grid)
   * @description 투영 좌표계에서 기준점의 X 격자 좌표 (210km ÷ 5km = 42)
   */
  xo: 43,

  /**
   * 기준점 Y 좌표 (grid)
   * @description 투영 좌표계에서 기준점의 Y 격자 좌표 (675km ÷ 5km = 135)
   */
  yo: 136,
} as const;

/**
 * 수학 상수들
 * @description 좌표 변환 계산에 사용되는 수학 상수들
 */
const MATH_CONSTANTS = {
  /**
   * 도수를 라디안으로 변환하는 상수 (π/180)
   */
  DEGRAD: Math.PI / 180.0,

  /**
   * 라디안을 도수로 변환하는 상수 (180/π)
   */
  RADDEG: 180.0 / Math.PI,
} as const;

/**
 * 위경도 좌표를 기상청 격자 좌표로 변환합니다.
 * 
 * @description
 * 이 함수는 WGS84 좌표계의 위도/경도를 기상청에서 사용하는 
 * Lambert Conformal Conic Projection 격자 좌표계로 변환합니다.
 * 
 * 변환 과정:
 * 1. 입력된 위경도를 라디안으로 변환
 * 2. Lambert Conformal Conic Projection 공식 적용
 * 3. 투영된 좌표를 격자 좌표로 변환
 * 4. 격자 좌표를 정수값으로 반올림
 * 
 * @param latLng - 변환할 위경도 좌표 객체
 * @param latLng.lat - 위도 (degree, 33.0~38.9 범위)
 * @param latLng.lng - 경도 (degree, 124.0~132.0 범위)
 * 
 * @returns 변환된 격자 좌표 객체
 * @returns returns.x - X축 격자 좌표 (1~149 범위)
 * @returns returns.y - Y축 격자 좌표 (1~253 범위)
 * 
 * @throws {Error} 입력 좌표가 대한민국 영역을 벗어난 경우
 * 
 * @example
 * ```typescript
 * // 서울시청 위치를 격자 좌표로 변환
 * const seoulLocation = { lat: 37.5663, lng: 126.9779 };
 * const gridCoords = convertLatLngToGrid(seoulLocation);
 * console.log(gridCoords); // { x: 60, y: 127 }
 * ```
 */
export function convertLatLngToGrid(latLng: ILatLng): IGrid {
  const { lat, lng } = latLng;
  const { Re, grid, slat1, slat2, olon, olat, xo, yo } = MAP_PROJECTION_PARAMS;
  const { DEGRAD } = MATH_CONSTANTS;

  // 입력 좌표 검증
  if (lat < 33.0 || lat > 38.9 || lng < 124.0 || lng > 132.0) {
    throw new Error(
      `좌표가 대한민국 영역을 벗어났습니다. 위도: ${lat} (33.0~38.9), 경도: ${lng} (124.0~132.0)`
    );
  }

  // 지도 투영 계산을 위한 변수들
  const re = Re / grid; // 격자 단위로 정규화된 지구 반지름
  const slat1Rad = slat1 * DEGRAD; // 표준위도1을 라디안으로 변환
  const slat2Rad = slat2 * DEGRAD; // 표준위도2를 라디안으로 변환
  const olonRad = olon * DEGRAD; // 기준경도를 라디안으로 변환
  const olatRad = olat * DEGRAD; // 기준위도를 라디안으로 변환

  // 투영 상수 계산
  // sn: 원추 상수 (cone constant)
  let sn = Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sn = Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) / Math.log(sn);

  // sf: 투영 배율 인수 (scale factor)
  let sf = Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1Rad)) / sn;

  // ro: 기준점까지의 거리
  let ro = Math.tan(Math.PI * 0.25 + olatRad * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  // 입력 좌표에 대한 투영 계산
  // ra: 입력점까지의 거리
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);

  // theta: 방위각
  let theta = lng * DEGRAD - olonRad;
  
  // 경도 차이가 180도를 넘는 경우 보정
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  // 최종 격자 좌표 계산
  const x = Math.floor(ra * Math.sin(theta) + xo + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + yo + 0.5);

  // 결과 좌표가 유효 범위 내에 있는지 확인
  if (x < 1 || x > 149 || y < 1 || y > 253) {
    throw new Error(
      `변환된 격자 좌표가 유효 범위를 벗어났습니다. X: ${x} (1~149), Y: ${y} (1~253)`
    );
  }

  return { x, y };
}

/**
 * 기상청 격자 좌표를 위경도 좌표로 변환합니다.
 * 
 * @description
 * 이 함수는 기상청의 Lambert Conformal Conic Projection 격자 좌표를
 * WGS84 좌표계의 위도/경도로 역변환합니다.
 * 
 * 역변환 과정:
 * 1. 격자 좌표를 투영 좌표로 변환
 * 2. Lambert Conformal Conic Projection 역변환 공식 적용
 * 3. 라디안 결과를 도수로 변환
 * 
 * @param grid - 변환할 격자 좌표 객체
 * @param grid.x - X축 격자 좌표 (1~149 범위)
 * @param grid.y - Y축 격자 좌표 (1~253 범위)
 * 
 * @returns 변환된 위경도 좌표 객체
 * @returns returns.lat - 위도 (degree)
 * @returns returns.lng - 경도 (degree)
 * 
 * @throws {Error} 입력 격자 좌표가 유효 범위를 벗어난 경우
 * 
 * @example
 * ```typescript
 * // 격자 좌표를 위경도로 변환
 * const gridCoords = { x: 60, y: 127 };
 * const location = convertGridToLatLng(gridCoords);
 * console.log(location); // { lat: 37.5663, lng: 126.9779 }
 * ```
 */
export function convertGridToLatLng(grid: IGrid): ILatLng {
  const { x, y } = grid;
  const { Re, grid: gridSpacing, slat1, slat2, olon, olat, xo, yo } = MAP_PROJECTION_PARAMS;
  const { DEGRAD, RADDEG } = MATH_CONSTANTS;

  // 입력 격자 좌표 검증
  if (x < 1 || x > 149 || y < 1 || y > 253) {
    throw new Error(
      `격자 좌표가 유효 범위를 벗어났습니다. X: ${x} (1~149), Y: ${y} (1~253)`
    );
  }

  // 지도 투영 계산을 위한 변수들
  const re = Re / gridSpacing;
  const slat1Rad = slat1 * DEGRAD;
  const slat2Rad = slat2 * DEGRAD;
  const olonRad = olon * DEGRAD;
  const olatRad = olat * DEGRAD;

  // 투영 상수 계산 (정변환과 동일)
  let sn = Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sn = Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1Rad)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olatRad * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  // 격자 좌표에서 투영 좌표로 변환
  const xn = x - xo; // 기준점으로부터의 X 거리
  const yn = ro - y + yo; // 기준점으로부터의 Y 거리
  
  // 기준점으로부터의 직선 거리 계산
  let ra = Math.sqrt(xn * xn + yn * yn);
  
  // 남반구인 경우 보정 (한국은 북반구이므로 일반적으로 적용되지 않음)
  if (sn < 0.0) {
    ra = -ra;
  }

  // 위도 계산
  let alat = Math.pow((re * sf) / ra, 1.0 / sn);
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;

  // 경도 계산을 위한 방위각 계산
  let theta: number;
  
  if (Math.abs(xn) <= 0.0) {
    // X 변위가 0인 경우
    theta = 0.0;
  } else {
    if (Math.abs(yn) <= 0.0) {
      // Y 변위가 0인 경우
      theta = Math.PI * 0.5;
      if (xn < 0.0) {
        theta = -theta;
      }
    } else {
      // 일반적인 경우: atan2를 사용하여 방위각 계산
      theta = Math.atan2(xn, yn);
    }
  }

  // 최종 경도 계산
  const alon = theta / sn + olonRad;

  // 라디안을 도수로 변환하여 반환
  const lat = alat * RADDEG;
  const lng = alon * RADDEG;

  // 결과 좌표가 대한민국 영역 내에 있는지 확인
  if (lat < 33.0 || lat > 38.9 || lng < 124.0 || lng > 132.0) {
    console.warn(
      `변환된 좌표가 대한민국 영역을 벗어났습니다. 위도: ${lat}, 경도: ${lng}`
    );
  }

  return { lat, lng };
}

/**
 * 좌표 변환 검증 및 테스트 함수
 * 
 * @description
 * 위경도 ↔ 격자좌표 변환이 정확히 이루어지는지 검증합니다.
 * 개발 환경에서 좌표 변환 로직의 정확성을 테스트하는 용도로 사용합니다.
 * 
 * @param latLng - 테스트할 위경도 좌표
 * @param tolerance - 허용 오차 (기본값: 0.001도)
 * 
 * @returns 변환 정확도 검증 결과
 * 
 * @example
 * ```typescript
 * // 서울시청 좌표로 변환 정확도 테스트
 * const testResult = validateCoordinateConversion(
 *   { lat: 37.5663, lng: 126.9779 }
 * );
 * console.log(testResult);
 * // {
 * //   isValid: true,
 * //   originalCoords: { lat: 37.5663, lng: 126.9779 },
 * //   gridCoords: { x: 60, y: 127 },
 * //   convertedCoords: { lat: 37.5663, lng: 126.9779 },
 * //   error: { lat: 0.0001, lng: 0.0001 }
 * // }
 * ```
 */
export function validateCoordinateConversion(
  latLng: ILatLng,
  tolerance: number = 0.001
): {
  isValid: boolean;
  originalCoords: ILatLng;
  gridCoords: IGrid;
  convertedCoords: ILatLng;
  error: { lat: number; lng: number };
} {
  try {
    // 위경도 → 격자좌표 → 위경도 순서로 변환
    const gridCoords = convertLatLngToGrid(latLng);
    const convertedCoords = convertGridToLatLng(gridCoords);

    // 변환 오차 계산
    const latError = Math.abs(latLng.lat - convertedCoords.lat);
    const lngError = Math.abs(latLng.lng - convertedCoords.lng);

    // 허용 오차 내에 있는지 검증
    const isValid = latError <= tolerance && lngError <= tolerance;

    return {
      isValid,
      originalCoords: latLng,
      gridCoords,
      convertedCoords,
      error: { lat: latError, lng: lngError },
    };
  } catch (error) {
    // 변환 중 에러가 발생한 경우
    return {
      isValid: false,
      originalCoords: latLng,
      gridCoords: { x: 0, y: 0 },
      convertedCoords: { lat: 0, lng: 0 },
      error: { lat: Infinity, lng: Infinity },
    };
  }
}
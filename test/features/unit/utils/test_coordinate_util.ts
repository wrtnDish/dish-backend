import {
  IGrid,
  ILatLng,
} from "../../../../src/api/structures/weather/IWeatherForecast";
import {
  convertGridToLatLng,
  convertLatLngToGrid,
  validateCoordinateConversion,
} from "../../../../src/utils/CoordinateUtil";

/**
 * CoordinateUtil 단위 테스트
 * @description 위경도 ↔ 격자좌표 변환 로직 검증
 */
export default async function test_coordinate_util(): Promise<void> {
  console.log("=== CoordinateUtil 단위 테스트 시작 ===\n");

  // 테스트 1: 서울시청 좌표 변환
  console.log("테스트 1: 서울시청 위경도 → 격자좌표");
  const seoulLocation: ILatLng = { lat: 37.5663, lng: 126.9779 };
  const seoulGrid = convertLatLngToGrid(seoulLocation);

  if (seoulGrid.x !== 60 || seoulGrid.y !== 127) {
    throw new Error(
      `서울시청 격자좌표 오류: expected {x: 60, y: 127}, got {x: ${seoulGrid.x}, y: ${seoulGrid.y}}`,
    );
  }
  console.log(
    `✓ 서울시청: (${seoulLocation.lat}, ${seoulLocation.lng}) → (${seoulGrid.x}, ${seoulGrid.y})\n`,
  );

  // 테스트 2: 부산 좌표 변환
  console.log("테스트 2: 부산 위경도 → 격자좌표");
  const busanLocation: ILatLng = { lat: 35.1796, lng: 129.0756 };
  const busanGrid = convertLatLngToGrid(busanLocation);

  if (!busanGrid.x || !busanGrid.y) {
    throw new Error("부산 격자좌표 변환 실패");
  }
  console.log(
    `✓ 부산: (${busanLocation.lat}, ${busanLocation.lng}) → (${busanGrid.x}, ${busanGrid.y})\n`,
  );

  // 테스트 3: 격자좌표 → 위경도 역변환
  console.log("테스트 3: 격자좌표 → 위경도 역변환");
  const gridCoords: IGrid = { x: 60, y: 127 };
  const reversedLocation = convertGridToLatLng(gridCoords);

  const latDiff = Math.abs(reversedLocation.lat - seoulLocation.lat);
  const lngDiff = Math.abs(reversedLocation.lng - seoulLocation.lng);

  // Lambert Conformal Conic 투영은 완벽하게 가역적이지 않으므로 0.03도(~3.3km) 오차 허용
  if (latDiff > 0.03 || lngDiff > 0.03) {
    throw new Error(`역변환 오차 초과: lat=${latDiff}, lng=${lngDiff}`);
  }
  console.log(
    `✓ 역변환: (${gridCoords.x}, ${gridCoords.y}) → (${reversedLocation.lat.toFixed(4)}, ${reversedLocation.lng.toFixed(4)}) (오차: lat=${latDiff.toFixed(4)}, lng=${lngDiff.toFixed(4)})\n`,
  );

  // 테스트 4: 변환 정확도 검증
  console.log("테스트 4: 변환 정확도 검증 (tolerance: 0.03)");
  const validationResult = validateCoordinateConversion(seoulLocation, 0.03);

  if (!validationResult.isValid) {
    throw new Error(
      `변환 정확도 검증 실패: lat error=${validationResult.error.lat}, lng error=${validationResult.error.lng}`,
    );
  }
  console.log(
    `✓ 변환 정확도: lat error=${validationResult.error.lat.toFixed(6)}, lng error=${validationResult.error.lng.toFixed(6)}\n`,
  );

  // 테스트 5: 경계값 테스트 - 유효한 범위
  console.log("테스트 5: 경계값 테스트 (유효 범위)");
  const validBoundary: ILatLng = { lat: 33.5, lng: 125.0 };
  const boundaryGrid = convertLatLngToGrid(validBoundary);

  if (!boundaryGrid.x || !boundaryGrid.y) {
    throw new Error("경계값 변환 실패");
  }
  console.log(
    `✓ 경계값: (${validBoundary.lat}, ${validBoundary.lng}) → (${boundaryGrid.x}, ${boundaryGrid.y})\n`,
  );

  // 테스트 6: 잘못된 좌표 에러 처리
  console.log("테스트 6: 잘못된 좌표 에러 처리");
  const invalidLocation: ILatLng = { lat: 50.0, lng: 140.0 }; // 한국 범위 벗어남

  try {
    convertLatLngToGrid(invalidLocation);
    throw new Error("범위 벗어난 좌표에 대해 에러가 발생하지 않음");
  } catch (error: any) {
    if (error.message.includes("대한민국 영역을 벗어났습니다")) {
      console.log(`✓ 예상된 에러 발생: ${error.message}\n`);
    } else {
      throw error;
    }
  }

  // 테스트 7: 격자좌표 경계값 테스트
  console.log("테스트 7: 격자좌표 경계값 테스트");
  const invalidGrid: IGrid = { x: 200, y: 300 }; // 유효 범위 벗어남

  try {
    convertGridToLatLng(invalidGrid);
    throw new Error("잘못된 격자좌표에 대해 에러가 발생하지 않음");
  } catch (error: any) {
    if (error.message.includes("격자 좌표가 유효 범위를 벗어났습니다")) {
      console.log(`✓ 예상된 에러 발생: ${error.message}\n`);
    } else {
      throw error;
    }
  }

  // 테스트 8: 다양한 지역 좌표 변환 테스트
  console.log("테스트 8: 주요 도시 좌표 변환 테스트");
  const cities = [
    { name: "대전", lat: 36.3504, lng: 127.3845 },
    { name: "광주", lat: 35.1595, lng: 126.8526 },
    { name: "대구", lat: 35.8714, lng: 128.6014 },
    { name: "인천", lat: 37.4563, lng: 126.7052 },
  ];

  for (const city of cities) {
    const location: ILatLng = { lat: city.lat, lng: city.lng };
    const grid = convertLatLngToGrid(location);
    const reversed = convertGridToLatLng(grid);

    const error = {
      lat: Math.abs(location.lat - reversed.lat),
      lng: Math.abs(location.lng - reversed.lng),
    };

    // Lambert Conformal Conic 투영은 완벽하게 가역적이지 않으므로 0.03도(~3.3km) 오차 허용
    // 날씨 격자의 해상도(5km)를 고려하면 충분히 수용 가능한 오차
    if (error.lat > 0.03 || error.lng > 0.03) {
      throw new Error(`${city.name} 변환 오차 초과`);
    }

    console.log(
      `  ${city.name}: (${location.lat}, ${location.lng}) → (${grid.x}, ${grid.y}) → (${reversed.lat.toFixed(4)}, ${reversed.lng.toFixed(4)}) [오차: ${error.lat.toFixed(4)}, ${error.lng.toFixed(4)}]`,
    );
  }
  console.log(`✓ 모든 도시 변환 성공 (tolerance: 0.03 = ~3.3km)\n`);

  console.log("=== ✅ CoordinateUtil 모든 테스트 통과 ===");
}

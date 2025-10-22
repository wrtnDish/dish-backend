import { Injectable } from "@nestjs/common";



import { ILatLng, ILocationRequest, ILocationResponse } from "../api/structures/location/ILocation";
import { findCityByName, findDistrictByName, findNearestCity } from "../data/cityCoordinates";


/**
 * 위치 정보 서비스
 * 
 * @description
 * 다양한 방법으로 사용자의 위치를 파악하고 처리하는 서비스입니다.
 * GPS 좌표, 도시명, 주소 등을 통해 위치를 결정할 수 있습니다.
 * 
 * 지원하는 위치 파악 방법:
 * - GPS: 정확한 위경도 좌표 사용
 * - City: 도시명을 통한 위치 검색
 * - Address: 주소를 통한 위치 검색 (향후 지오코딩 API 연동 예정)
 * 
 * @example
 * ```typescript
 * const locationService = new LocationService();
 * 
 * // GPS 좌표로 위치 확인
 * const location = await locationService.getLocation({
 *   method: "gps",
 *   coordinates: { lat: 37.5663, lng: 126.9779 }
 * });
 * 
 * // 도시명으로 위치 확인
 * const location2 = await locationService.getLocation({
 *   method: "city",
 *   cityName: "서울"
 * });
 * ```
 */
@Injectable()
export class LocationService {

  /**
   * 위치 정보 조회
   * 
   * @description
   * 요청된 방법에 따라 사용자의 위치를 파악하고 표준화된 위치 정보를 반환합니다.
   * 
   * @param request - 위치 정보 요청
   * @returns 표준화된 위치 정보
   */
  public async getLocation(request: ILocationRequest): Promise<ILocationResponse> {
    const startTime = new Date();

    try {
      switch (request.method) {
        case "gps":
          return await this.getLocationByGps(request.coordinates!);
        
        case "city":
          return await this.getLocationByCity(request.cityName!);
        
        case "address":
          return await this.getLocationByAddress(request.address!);
        
        default:
          throw new Error(`지원하지 않는 위치 파악 방법입니다: ${request.method}`);
      }
    } catch (error) {
      // 에러 발생 시 기본 서울 좌표 반환
      return {
        coordinates: { lat: 37.5663, lng: 126.9779 },
        method: request.method,
        locationInfo: {
          city: "서울",
          district: "중구",
          address: "서울특별시 중구 세종대로 110",
          accuracy: 1,
          description: "위치 확인 실패로 기본 위치(서울시청) 사용"
        },
        metadata: {
          success: false,
          requestTime: startTime.toISOString(),
          message: `위치 확인에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
          source: "fallback"
        }
      };
    }
  }

  /**
   * GPS 좌표를 통한 위치 확인
   * 
   * @description
   * 정확한 GPS 좌표를 사용하여 해당 위치의 도시 정보를 파악합니다.
   * 가장 정확한 방법이며, 좌표 유효성을 검증한 후 가장 가까운 도시를 찾습니다.
   * 
   * @param coordinates - GPS 좌표
   * @returns 위치 정보
   */
  private async getLocationByGps(coordinates: ILatLng): Promise<ILocationResponse> {
    // 좌표 유효성 검증
    if (!this.isValidKoreanCoordinates(coordinates)) {
      throw new Error("유효하지 않은 좌표입니다. 대한민국 영역 내의 좌표를 입력해주세요.");
    }

    // 가장 가까운 도시 찾기
    const nearestCity = findNearestCity(coordinates);
    
    return {
      coordinates,
      method: "gps",
      locationInfo: {
        city: nearestCity.name,
        district: nearestCity.districts ? 
          this.findNearestDistrict(coordinates, nearestCity.districts)?.name : undefined,
        address: `${nearestCity.name} 인근`,
        accuracy: 5, // GPS는 가장 정확
        description: `GPS 좌표 기반 위치 (${nearestCity.description})`
      },
      metadata: {
        success: true,
        requestTime: new Date().toISOString(),
        message: "GPS 좌표를 통해 위치를 성공적으로 확인했습니다.",
        source: "gps"
      }
    };
  }

  /**
   * 도시명을 통한 위치 확인
   *
   * @description
   * 사용자가 입력한 도시명을 검색하여 해당 도시의 대표 좌표를 반환합니다.
   * 구/군명까지 포함하여 검색할 수 있습니다.
   *
   * **복합 지역명 처리:**
   * - "서울 성수", "대전 한밭대" 같은 형태를 파싱하여 처리
   * - 정확한 매칭이 없으면 원본 텍스트를 그대로 사용 (success = false)
   *
   * @param cityName - 도시명 또는 구/군명 또는 "도시명 + 지역명"
   * @returns 위치 정보
   */
  private async getLocationByCity(cityName: string): Promise<ILocationResponse> {
    if (!cityName || cityName.trim().length === 0) {
      throw new Error("도시명이 입력되지 않았습니다.");
    }

    // 복합 지역명 처리 (예: "서울 성수", "대전 한밭대")
    if (cityName.includes(' ')) {
      const parts = cityName.split(' ').map(p => p.trim()).filter(p => p.length > 0);

      if (parts.length >= 2) {
        const cityPart = parts[0]; // 도시명
        const districtPart = parts.slice(1).join(' '); // 나머지 지역명

        console.log(`📍 복합 지역명 파싱: 도시="${cityPart}", 지역="${districtPart}"`);

        // 1. 도시 찾기
        const city = findCityByName(cityPart);

        if (city) {
          // 2. 해당 도시의 구/군에서 지역 검색
          if (city.districts) {
            const district = city.districts.find(d =>
              d.name.toLowerCase().includes(districtPart.toLowerCase()) ||
              districtPart.toLowerCase().includes(d.name.toLowerCase())
            );

            if (district) {
              console.log(`✅ 정확한 구/군 매칭: ${city.name} ${district.name}`);
              return {
                coordinates: district.coordinates,
                method: "city",
                locationInfo: {
                  city: city.name,
                  district: district.name,
                  address: `${city.name} ${district.name}`,
                  accuracy: 4,
                  description: `복합 지역명 검색 결과`
                },
                metadata: {
                  success: true,
                  requestTime: new Date().toISOString(),
                  message: `'${cityName}'에 대한 위치를 찾았습니다.`,
                  source: "city_database"
                }
              };
            }
          }

          // 3. 구/군 매칭 실패 - 원본 텍스트 사용 권장
          console.log(`⚠️ "${districtPart}"에 해당하는 구/군을 찾지 못함 - 원본 텍스트 사용 권장`);
          throw new Error(`'${cityName}'의 구체적 지역을 찾을 수 없습니다. 원본 텍스트를 사용하세요.`);
        }
      }
    }

    // 단일 지역명 처리 (기존 로직)

    // 먼저 구/군명으로 검색
    const districtResult = findDistrictByName(cityName);
    if (districtResult) {
      return {
        coordinates: districtResult.district.coordinates,
        method: "city",
        locationInfo: {
          city: districtResult.city.name,
          district: districtResult.district.name,
          address: `${districtResult.city.name} ${districtResult.district.name}`,
          accuracy: 4,
          description: `구/군명 검색 결과`
        },
        metadata: {
          success: true,
          requestTime: new Date().toISOString(),
          message: `'${cityName}'에 대한 위치를 찾았습니다.`,
          source: "city_database"
        }
      };
    }

    // 도시명으로 검색
    const city = findCityByName(cityName);
    if (!city) {
      throw new Error(`'${cityName}'에 해당하는 도시를 찾을 수 없습니다.`);
    }

    return {
      coordinates: city.coordinates,
      method: "city",
      locationInfo: {
        city: city.name,
        address: `${city.name}`,
        accuracy: 3,
        description: city.description || `도시명 검색 결과`
      },
      metadata: {
        success: true,
        requestTime: new Date().toISOString(),
        message: `'${cityName}'에 대한 위치를 찾았습니다.`,
        source: "city_database"
      }
    };
  }


  /**
   * 주소를 통한 위치 확인
   * 
   * @description
   * 주소 문자열을 분석하여 위치를 확인합니다.
   * 현재는 간단한 키워드 분석으로 구현되어 있으며, 향후 지오코딩 API 연동 예정입니다.
   * 
   * @param address - 주소 문자열
   * @returns 위치 정보
   */
  private async getLocationByAddress(address: string): Promise<ILocationResponse> {
    if (!address || address.trim().length === 0) {
      throw new Error("주소가 입력되지 않았습니다.");
    }

    // 주소에서 도시명/구명 추출
    const extractedCityName = this.extractCityFromAddress(address);
    if (extractedCityName) {
      // 추출된 도시명으로 검색
      const cityResult = await this.getLocationByCity(extractedCityName);
      return {
        ...cityResult,
        method: "address",
        locationInfo: {
          ...cityResult.locationInfo,
          address: address,
          accuracy: 2, // 주소 기반은 정확도가 낮음
          description: "주소 분석을 통한 위치 추정"
        },
        metadata: {
          ...cityResult.metadata,
          message: `주소 '${address}'에서 '${extractedCityName}'를 추출하여 위치를 찾았습니다.`,
          source: "address_parsing"
        }
      };
    }

    throw new Error(`주소 '${address}'에서 위치를 파악할 수 없습니다.`);
  }

  // ========== 내부 유틸리티 메서드들 ==========

  /**
   * 대한민국 영역 내 좌표 유효성 검증
   */
  private isValidKoreanCoordinates(coordinates: ILatLng): boolean {
    return (
      coordinates.lat >= 33.0 && coordinates.lat <= 38.9 &&
      coordinates.lng >= 124.0 && coordinates.lng <= 132.0
    );
  }

  /**
   * 가장 가까운 구/군 찾기
   */
  private findNearestDistrict(
    coordinates: ILatLng, 
    districts: Array<{name: string; coordinates: ILatLng}>
  ): {name: string; coordinates: ILatLng} | undefined {
    if (!districts || districts.length === 0) return undefined;
    
    let nearest = districts[0];
    let minDistance = this.calculateDistance(coordinates, nearest.coordinates);
    
    for (const district of districts) {
      const distance = this.calculateDistance(coordinates, district.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = district;
      }
    }
    
    return nearest;
  }

  /**
   * 두 좌표 간의 거리 계산 (km)
   */
  private calculateDistance(
    coord1: ILatLng,
    coord2: ILatLng
  ): number {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }


  /**
   * 주소에서 도시명/구명 추출
   */
  private extractCityFromAddress(address: string): string | null {
    const normalizedAddress = address.trim();
    
    // 광역시/특별시/특별자치시 패턴
    const cityPatterns = [
      /서울특별시|서울시|서울/,
      /부산광역시|부산시|부산/,
      /대구광역시|대구시|대구/,
      /인천광역시|인천시|인천/,
      /광주광역시|광주시|광주/,
      /대전광역시|대전시|대전/,
      /울산광역시|울산시|울산/,
      /세종특별자치시|세종시|세종/,
      /수원시|수원/,
      /성남시|성남/,
      /고양시|고양/,
      /용인시|용인/,
      /청주시|청주/,
      /천안시|천안/,
      /전주시|전주/,
      /안산시|안산/,
      /안양시|안양/,
      /포항시|포항/,
      /창원시|창원/,
      /제주시|제주/,
      /서귀포시|서귀포/
    ];

    for (const pattern of cityPatterns) {
      const match = normalizedAddress.match(pattern);
      if (match) {
        let cityName = match[0];
        // "시" 제거
        cityName = cityName.replace(/(특별시|광역시|특별자치시|시)$/, "");
        return cityName;
      }
    }

    // 구/군 패턴 검색
    const districtPattern = /([가-힣]+구|[가-힣]+군)/;
    const districtMatch = normalizedAddress.match(districtPattern);
    if (districtMatch) {
      return districtMatch[1];
    }

    return null;
  }
}
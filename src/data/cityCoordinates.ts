import { ICityCoordinates } from "../api/structures/location/ILocation";


/**
 * 대한민국 주요 도시 좌표 데이터베이스
 * 
 * @description
 * 사용자가 도시명으로 위치를 요청할 때 사용하는 좌표 데이터입니다.
 * 주요 도시와 구/군별 대표 좌표를 포함합니다.
 */
export const CITY_COORDINATES: ICityCoordinates[] = [
  {
    name: "서울",
    nameEn: "Seoul",
    coordinates: { lat: 37.5663, lng: 126.9779 }, // 서울시청
    population: 9720846,
    description: "대한민국의 수도",
    districts: [
      { name: "강남구", coordinates: { lat: 37.5172, lng: 127.0473 } },
      { name: "강동구", coordinates: { lat: 37.5301, lng: 127.1238 } },
      { name: "강북구", coordinates: { lat: 37.6396, lng: 127.0256 } },
      { name: "강서구", coordinates: { lat: 37.5509, lng: 126.8495 } },
      { name: "관악구", coordinates: { lat: 37.4784, lng: 126.9516 } },
      { name: "광진구", coordinates: { lat: 37.5385, lng: 127.0823 } },
      { name: "구로구", coordinates: { lat: 37.4955, lng: 126.8876 } },
      { name: "금천구", coordinates: { lat: 37.4570, lng: 126.8955 } },
      { name: "노원구", coordinates: { lat: 37.6542, lng: 127.0568 } },
      { name: "도봉구", coordinates: { lat: 37.6688, lng: 127.0471 } },
      { name: "동대문구", coordinates: { lat: 37.5744, lng: 127.0396 } },
      { name: "동작구", coordinates: { lat: 37.5124, lng: 126.9393 } },
      { name: "마포구", coordinates: { lat: 37.5660, lng: 126.9015 } },
      { name: "서대문구", coordinates: { lat: 37.5791, lng: 126.9368 } },
      { name: "서초구", coordinates: { lat: 37.4836, lng: 127.0327 } },
      { name: "성동구", coordinates: { lat: 37.5635, lng: 127.0369 } },
      { name: "성북구", coordinates: { lat: 37.5894, lng: 127.0167 } },
      { name: "송파구", coordinates: { lat: 37.5145, lng: 127.1059 } },
      { name: "양천구", coordinates: { lat: 37.5168, lng: 126.8665 } },
      { name: "영등포구", coordinates: { lat: 37.5264, lng: 126.8962 } },
      { name: "용산구", coordinates: { lat: 37.5326, lng: 126.9900 } },
      { name: "은평구", coordinates: { lat: 37.6176, lng: 126.9227 } },
      { name: "종로구", coordinates: { lat: 37.5735, lng: 126.9788 } },
      { name: "중구", coordinates: { lat: 37.5663, lng: 126.9779 } },
      { name: "중랑구", coordinates: { lat: 37.6063, lng: 127.0925 } }
    ]
  },
  {
    name: "부산",
    nameEn: "Busan",
    coordinates: { lat: 35.1796, lng: 129.0756 }, // 부산시청
    population: 3413841,
    description: "대한민국의 제2의 도시, 최대 항구도시",
    districts: [
      { name: "중구", coordinates: { lat: 35.1041, lng: 129.0325 } },
      { name: "서구", coordinates: { lat: 35.0971, lng: 129.0239 } },
      { name: "동구", coordinates: { lat: 35.1294, lng: 129.0455 } },
      { name: "영도구", coordinates: { lat: 35.0916, lng: 129.0678 } },
      { name: "부산진구", coordinates: { lat: 35.1626, lng: 129.0533 } },
      { name: "동래구", coordinates: { lat: 35.2046, lng: 129.0837 } },
      { name: "남구", coordinates: { lat: 35.1366, lng: 129.0845 } },
      { name: "북구", coordinates: { lat: 35.1951, lng: 128.9895 } },
      { name: "해운대구", coordinates: { lat: 35.1631, lng: 129.1640 } },
      { name: "사하구", coordinates: { lat: 35.1045, lng: 128.9744 } },
      { name: "금정구", coordinates: { lat: 35.2425, lng: 129.0920 } },
      { name: "강서구", coordinates: { lat: 35.2126, lng: 128.9802 } },
      { name: "연제구", coordinates: { lat: 35.1763, lng: 129.0780 } },
      { name: "수영구", coordinates: { lat: 35.1453, lng: 129.1136 } },
      { name: "사상구", coordinates: { lat: 35.1547, lng: 128.9906 } },
      { name: "기장군", coordinates: { lat: 35.2441, lng: 129.2233 } }
    ]
  },
  {
    name: "대구",
    nameEn: "Daegu",
    coordinates: { lat: 35.8714, lng: 128.6014 }, // 대구시청
    population: 2410700,
    description: "대한민국의 제4의 도시",
    districts: [
      { name: "중구", coordinates: { lat: 35.8685, lng: 128.6060 } },
      { name: "동구", coordinates: { lat: 35.8888, lng: 128.6359 } },
      { name: "서구", coordinates: { lat: 35.8719, lng: 128.5592 } },
      { name: "남구", coordinates: { lat: 35.8463, lng: 128.5974 } },
      { name: "북구", coordinates: { lat: 35.8858, lng: 128.5828 } },
      { name: "수성구", coordinates: { lat: 35.8581, lng: 128.6306 } },
      { name: "달서구", coordinates: { lat: 35.8329, lng: 128.5354 } },
      { name: "달성군", coordinates: { lat: 35.7749, lng: 128.4311 } }
    ]
  },
  {
    name: "인천",
    nameEn: "Incheon",
    coordinates: { lat: 37.4563, lng: 126.7052 }, // 인천시청
    population: 2954955,
    description: "대한민국의 제3의 도시, 국제공항 소재지",
    districts: [
      { name: "중구", coordinates: { lat: 37.4738, lng: 126.6214 } },
      { name: "동구", coordinates: { lat: 37.4740, lng: 126.6432 } },
      { name: "미추홀구", coordinates: { lat: 37.4635, lng: 126.6505 } },
      { name: "연수구", coordinates: { lat: 37.4106, lng: 126.6783 } },
      { name: "남동구", coordinates: { lat: 37.4470, lng: 126.7311 } },
      { name: "부평구", coordinates: { lat: 37.5073, lng: 126.7218 } },
      { name: "계양구", coordinates: { lat: 37.5379, lng: 126.7379 } },
      { name: "서구", coordinates: { lat: 37.5458, lng: 126.6757 } },
      { name: "강화군", coordinates: { lat: 37.7473, lng: 126.4877 } },
      { name: "옹진군", coordinates: { lat: 37.4464, lng: 126.6370 } }
    ]
  },
  {
    name: "광주",
    nameEn: "Gwangju",
    coordinates: { lat: 35.1595, lng: 126.8526 }, // 광주시청
    population: 1441970,
    description: "호남권의 중심도시",
    districts: [
      { name: "동구", coordinates: { lat: 35.1466, lng: 126.9232 } },
      { name: "서구", coordinates: { lat: 35.1520, lng: 126.8895 } },
      { name: "남구", coordinates: { lat: 35.1327, lng: 126.9022 } },
      { name: "북구", coordinates: { lat: 35.1742, lng: 126.9116 } },
      { name: "광산구", coordinates: { lat: 35.1958, lng: 126.7934 } }
    ]
  },
  {
    name: "대전",
    nameEn: "Daejeon",
    coordinates: { lat: 36.3504, lng: 127.3845 }, // 대전시청
    population: 1471040,
    description: "대한민국의 과학기술 중심도시",
    districts: [
      { name: "동구", coordinates: { lat: 36.3114, lng: 127.4548 } },
      { name: "중구", coordinates: { lat: 36.3255, lng: 127.4214 } },
      { name: "서구", coordinates: { lat: 36.3558, lng: 127.3834 } },
      { name: "유성구", coordinates: { lat: 36.3625, lng: 127.3564 } },
      { name: "대덕구", coordinates: { lat: 36.3465, lng: 127.4148 } }
    ]
  },
  {
    name: "울산",
    nameEn: "Ulsan",
    coordinates: { lat: 35.5384, lng: 129.3114 }, // 울산시청
    population: 1124459,
    description: "대한민국의 산업도시",
    districts: [
      { name: "중구", coordinates: { lat: 35.5692, lng: 129.3367 } },
      { name: "남구", coordinates: { lat: 35.5440, lng: 129.3300 } },
      { name: "동구", coordinates: { lat: 35.5049, lng: 129.4167 } },
      { name: "북구", coordinates: { lat: 35.5827, lng: 129.3619 } },
      { name: "울주군", coordinates: { lat: 35.5225, lng: 129.2428 } }
    ]
  },
  {
    name: "세종",
    nameEn: "Sejong",
    coordinates: { lat: 36.4800, lng: 127.2890 }, // 세종시청
    population: 384510,
    description: "대한민국의 행정수도"
  },
  {
    name: "수원",
    nameEn: "Suwon",
    coordinates: { lat: 37.2636, lng: 127.0286 }, // 수원시청
    population: 1194313,
    description: "경기도의 도청 소재지"
  },
  {
    name: "성남",
    nameEn: "Seongnam",
    coordinates: { lat: 37.4201, lng: 127.1262 }, // 성남시청
    population: 915343,
    description: "경기도 성남시"
  },
  {
    name: "고양",
    nameEn: "Goyang",
    coordinates: { lat: 37.6564, lng: 126.8347 }, // 고양시청
    population: 1077430,
    description: "경기도 고양시"
  },
  {
    name: "용인",
    nameEn: "Yongin",
    coordinates: { lat: 37.2411, lng: 127.1776 }, // 용인시청
    population: 1083687,
    description: "경기도 용인시"
  },
  {
    name: "청주",
    nameEn: "Cheongju",
    coordinates: { lat: 36.6424, lng: 127.4890 }, // 청주시청
    population: 852294,
    description: "충청북도의 도청 소재지"
  },
  {
    name: "천안",
    nameEn: "Cheonan",
    coordinates: { lat: 36.8151, lng: 127.1139 }, // 천안시청
    population: 658682,
    description: "충청남도 천안시"
  },
  {
    name: "전주",
    nameEn: "Jeonju",
    coordinates: { lat: 35.8242, lng: 127.1480 }, // 전주시청
    population: 658172,
    description: "전라북도의 도청 소재지"
  },
  {
    name: "안산",
    nameEn: "Ansan",
    coordinates: { lat: 37.3236, lng: 126.8219 }, // 안산시청
    population: 648806,
    description: "경기도 안산시"
  },
  {
    name: "안양",
    nameEn: "Anyang",
    coordinates: { lat: 37.3943, lng: 126.9568 }, // 안양시청
    population: 563062,
    description: "경기도 안양시"
  },
  {
    name: "포항",
    nameEn: "Pohang",
    coordinates: { lat: 36.0190, lng: 129.3435 }, // 포항시청
    population: 507358,
    description: "경상북도 포항시"
  },
  {
    name: "창원",
    nameEn: "Changwon",
    coordinates: { lat: 35.2281, lng: 128.6811 }, // 창원시청
    population: 1025702,
    description: "경상남도의 도청 소재지"
  },
  {
    name: "제주",
    nameEn: "Jeju",
    coordinates: { lat: 33.4996, lng: 126.5312 }, // 제주시청
    population: 486906,
    description: "제주특별자치도의 중심도시"
  },
  {
    name: "서귀포",
    nameEn: "Seogwipo",
    coordinates: { lat: 33.2541, lng: 126.5601 }, // 서귀포시청
    population: 184847,
    description: "제주특별자치도 서귀포시"
  }
];

/**
 * 도시명으로 좌표 찾기
 * 
 * @description
 * 사용자가 입력한 도시명을 기반으로 해당하는 좌표를 찾습니다.
 * 정확한 일치뿐만 아니라 유사한 이름도 검색합니다.
 * 
 * @param cityName - 검색할 도시명
 * @returns 찾은 도시 정보 또는 null
 */
export function findCityByName(cityName: string): ICityCoordinates | null {
  const normalizedInput = cityName.trim().toLowerCase();
  
  // 정확한 이름 매칭 (한글)
  let found = CITY_COORDINATES.find(city => 
    city.name.toLowerCase() === normalizedInput ||
    city.nameEn.toLowerCase() === normalizedInput
  );
  
  if (found) return found;
  
  // 부분 매칭 (포함 관계)
  found = CITY_COORDINATES.find(city => 
    city.name.toLowerCase().includes(normalizedInput) ||
    city.nameEn.toLowerCase().includes(normalizedInput) ||
    normalizedInput.includes(city.name.toLowerCase()) ||
    normalizedInput.includes(city.nameEn.toLowerCase())
  );
  
  return found || null;
}

/**
 * 구/군명으로 좌표 찾기
 * 
 * @description
 * 특정 구/군의 좌표를 찾습니다.
 * 예: "강남구", "해운대구" 등
 * 
 * @param districtName - 검색할 구/군명
 * @returns 찾은 구/군 정보 또는 null
 */
export function findDistrictByName(districtName: string): { city: ICityCoordinates; district: any } | null {
  const normalizedInput = districtName.trim().toLowerCase();
  
  for (const city of CITY_COORDINATES) {
    if (!city.districts) continue;
    
    const district = city.districts.find(d => 
      d.name.toLowerCase() === normalizedInput ||
      d.name.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(d.name.toLowerCase())
    );
    
    if (district) {
      return { city, district };
    }
  }
  
  return null;
}

/**
 * 가장 가까운 도시 찾기
 * 
 * @description
 * 주어진 좌표에서 가장 가까운 도시를 찾습니다.
 * 
 * @param coordinates - 기준 좌표
 * @returns 가장 가까운 도시 정보
 */
export function findNearestCity(coordinates: { lat: number; lng: number }): ICityCoordinates {
  let nearestCity = CITY_COORDINATES[0];
  let minDistance = calculateDistance(coordinates, nearestCity.coordinates);
  
  for (const city of CITY_COORDINATES) {
    const distance = calculateDistance(coordinates, city.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }
  
  return nearestCity;
}

/**
 * 두 좌표 간의 거리 계산 (km)
 * 
 * @description
 * Haversine 공식을 사용하여 두 좌표 간의 거리를 계산합니다.
 * 
 * @param coord1 - 첫 번째 좌표
 * @param coord2 - 두 번째 좌표
 * @returns 거리 (km)
 */
function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
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
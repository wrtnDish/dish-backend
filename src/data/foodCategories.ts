import { IFoodCategory } from "../api/structures/food/IFoodCategory";

/**
 * 음식 카테고리 마스터 데이터
 * @description 날씨 기반 음식 추천을 위한 기본 카테고리 정보
 */
export const FOOD_CATEGORIES: IFoodCategory[] = [
  {
    id: 1,
    name: "pizza",
    nameKo: "피자",
    serveTemp: "hot",
    description: "치즈와 토핑이 올라간 이탈리아 음식"
  },
  {
    id: 2,
    name: "chicken",
    nameKo: "치킨",
    serveTemp: "hot",
    description: "튀기거나 구운 닭요리"
  },
  {
    id: 3,
    name: "hamburger",
    nameKo: "햄버거",
    serveTemp: "warm",
    description: "패티와 야채가 든 샌드위치"
  },
  {
    id: 4,
    name: "chinese",
    nameKo: "중식",
    serveTemp: "hot",
    description: "중국식 요리"
  },
  {
    id: 5,
    name: "korean",
    nameKo: "한식",
    serveTemp: "hot",
    description: "한국 전통 요리"
  },
  {
    id: 6,
    name: "japanese",
    nameKo: "일식",
    serveTemp: "warm & cold",
    description: "일본식 요리"
  },
  {
    id: 7,
    name: "salad",
    nameKo: "샐러드",
    serveTemp: "cold",
    description: "신선한 야채와 드레싱"
  },
  {
    id: 8,
    name: "soup",
    nameKo: "국물요리",
    serveTemp: "hot",
    description: "뜨거운 국물 요리"
  },
  {
    id: 9,
    name: "bbq",
    nameKo: "구이",
    serveTemp: "hot",
    description: "고기나 해산물 구이"
  },
  {
    id: 10,
    name: "pasta",
    nameKo: "파스타",
    serveTemp: "warm",
    description: "이탈리아 면 요리"
  },
  {
    id: 11,
    name: "seafood",
    nameKo: "회/해물",
    serveTemp: "cold",
    description: "신선한 해산물 요리"
  },
  {
    id: 12,
    name: "dessert",
    nameKo: "디저트",
    serveTemp: "cold",
    description: "달콤한 후식"
  },
  {
    id: 13,
    name: "cold_noodles",
    nameKo: "냉면",
    serveTemp: "cold",
    description: "차가운 육수의 면 요리"
  },
  {
    id: 14,
    name: "coffee_tea",
    nameKo: "커피/차",
    serveTemp: "warm & cold",
    description: "따뜻하거나 차가운 음료"
  },
  {
    id: 15,
    name: "ice_cream",
    nameKo: "빙수/아이스크림",
    serveTemp: "cold",
    description: "차가운 디저트"
  },
  {
    id: 16,
    name: "hot_pot",
    nameKo: "전골/찌개",
    serveTemp: "hot",
    description: "끓이는 뜨거운 요리"
  },
  {
    id: 17,
    name: "fried_food",
    nameKo: "튀김요리",
    serveTemp: "hot",
    description: "기름에 튀긴 요리"
  },
  {
    id: 18,
    name: "sandwich",
    nameKo: "샌드위치",
    serveTemp: "warm",
    description: "빵 사이에 재료를 넣은 요리"
  },
  {
    id: 19,
    name: "smoothie",
    nameKo: "스무디",
    serveTemp: "cold",
    description: "과일과 얼음을 갈아 만든 음료"
  },
  {
    id: 20,
    name: "mexican",
    nameKo: "멕시칸",
    serveTemp: "warm",
    description: "멕시코식 요리"
  }
];

/**
 * ID로 음식 카테고리 조회
 * @param id 카테고리 ID
 * @returns 해당 카테고리 정보 또는 null
 */
export function getFoodCategoryById(id: number): IFoodCategory | null {
  return FOOD_CATEGORIES.find(category => category.id === id) || null;
}

/**
 * 이름으로 음식 카테고리 조회
 * @param name 카테고리 영문명
 * @returns 해당 카테고리 정보 또는 null
 */
export function getFoodCategoryByName(name: string): IFoodCategory | null {
  return FOOD_CATEGORIES.find(category => category.name === name) || null;
}

/**
 * 제공 온도로 음식 카테고리 필터링
 * @param serveTemp 제공 온도
 * @returns 해당 제공 온도의 카테고리 목록
 */
export function getFoodCategoriesByServeTemp(serveTemp: string): IFoodCategory[] {
  return FOOD_CATEGORIES.filter(category => 
    category.serveTemp === serveTemp || 
    category.serveTemp.includes(serveTemp)
  );
}
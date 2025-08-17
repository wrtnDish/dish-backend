import { IFoodCategory } from "../api/structures/food/IFoodCategory";

/**
 * 음식 카테고리 마스터 데이터
 * @description 날씨 기반 음식 추천을 위한 기본 카테고리 정보
 * 요구사항에 따른 22개 음식 카테고리
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
    name: "salad",
    nameKo: "샐러드",
    serveTemp: "cold",
    description: "신선한 야채와 드레싱"
  },
  {
    id: 3,
    name: "dessert",
    nameKo: "디저트",
    serveTemp: "cold",
    description: "달콤한 후식"
  },
  {
    id: 4,
    name: "western_food",
    nameKo: "양식",
    serveTemp: "warm",
    description: "서양식 요리"
  },
  {
    id: 5,
    name: "korean_food",
    nameKo: "한식",
    serveTemp: "hot",
    description: "한국 전통 요리"
  },
  {
    id: 6,
    name: "chicken",
    nameKo: "치킨",
    serveTemp: "hot",
    description: "튀기거나 구운 닭요리"
  },
  {
    id: 7,
    name: "snack_food",
    nameKo: "분식",
    serveTemp: "hot",
    description: "떡볶이, 순대, 튀김 등 분식류"
  },
  {
    id: 8,
    name: "pork_cutlet",
    nameKo: "돈까스",
    serveTemp: "hot",
    description: "튀긴 돼지고기 커틀릿"
  },
  {
    id: 9,
    name: "pigs_trotters_boiled_pork",
    nameKo: "족발/보쌈",
    serveTemp: "warm",
    description: "족발과 보쌈 요리"
  },
  {
    id: 10,
    name: "braised_stew",
    nameKo: "찜/탕",
    serveTemp: "hot",
    description: "끓이거나 찐 요리"
  },
  {
    id: 11,
    name: "grilled",
    nameKo: "구이",
    serveTemp: "hot",
    description: "고기나 해산물 구이"
  },
  {
    id: 12,
    name: "chinese_food",
    nameKo: "중식",
    serveTemp: "hot",
    description: "중국식 요리"
  },
  {
    id: 13,
    name: "japanese_food",
    nameKo: "일식",
    serveTemp: "warm & cold",
    description: "일본식 요리"
  },
  {
    id: 14,
    name: "sashimi_seafood",
    nameKo: "회/해물",
    serveTemp: "cold",
    description: "신선한 해산물 요리"
  },
  {
    id: 15,
    name: "coffee_tea",
    nameKo: "커피/차",
    serveTemp: "warm & cold",
    description: "따뜻하거나 차가운 음료"
  },
  {
    id: 16,
    name: "snacks",
    nameKo: "간식",
    serveTemp: "warm & cold",
    description: "가벼운 간식류"
  },
  {
    id: 17,
    name: "asian",
    nameKo: "아시안",
    serveTemp: "hot",
    description: "아시아 요리 전반"
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
    name: "burger",
    nameKo: "버거",
    serveTemp: "warm",
    description: "햄버거류"
  },
  {
    id: 20,
    name: "mexican",
    nameKo: "멕시칸",
    serveTemp: "warm",
    description: "멕시코식 요리"
  },
  {
    id: 21,
    name: "lunch_box",
    nameKo: "도시락",
    serveTemp: "warm",
    description: "포장된 식사"
  },
  {
    id: 22,
    name: "porridge",
    nameKo: "죽",
    serveTemp: "hot",
    description: "곡물을 끓인 부드러운 요리"
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
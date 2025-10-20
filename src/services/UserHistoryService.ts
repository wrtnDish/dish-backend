import * as fs from "fs";
import * as path from "path";

import { FOOD_CATEGORIES } from "../data/foodCategories";

/**
 * 사용자 히스토리 분석 서비스
 * @description 요일별 사용자 음식 선호도를 분석하여 점수를 계산합니다.
 */
export class UserHistoryService {
  private historyFilePath: string;

  constructor() {
    // user_history.json 파일 경로 설정
    this.historyFilePath = path.join(
      process.cwd(),
      "src/utils/history/user_history.json",
    );
  }

  /**
   * 현재 요일을 기준으로 사용자 선호도 점수를 계산합니다.
   * @param currentDay 현재 요일 (예: "Monday", "Tuesday", ...)
   * @returns 카테고리별 선호도 점수 맵
   */
  public async analyzeDayPreference(
    currentDay?: string,
  ): Promise<Map<string, number>> {
    try {
      // 현재 요일 결정 (파라미터가 없으면 오늘 요일 사용)
      const today = currentDay || this.getCurrentDay();

      // 사용자 히스토리 데이터 로드
      const historyData = this.loadUserHistory();

      // 요일별 음식 선호도 분석
      const dayPreferenceMap = this.calculateDayPreference(historyData, today);

      return dayPreferenceMap;
    } catch (error) {
      console.error("사용자 히스토리 분석 중 오류 발생:", error);
      // 오류 발생 시 빈 맵 반환
      return new Map<string, number>();
    }
  }

  /**
   * 사용자 히스토리 파일을 로드합니다.
   */
  private loadUserHistory(): any[] {
    try {
      if (!fs.existsSync(this.historyFilePath)) {
        console.warn("user_history.json 파일이 존재하지 않습니다.");
        return [];
      }

      const fileContent = fs.readFileSync(this.historyFilePath, "utf-8");
      const historyData = JSON.parse(fileContent);

      if (!Array.isArray(historyData)) {
        console.warn("히스토리 데이터 형식이 올바르지 않습니다.");
        return [];
      }

      return historyData;
    } catch (error) {
      console.error("히스토리 파일 로드 실패:", error);
      return [];
    }
  }

  /**
   * 현재 요일을 영어로 반환합니다.
   */
  private getCurrentDay(): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = new Date();
    return days[today.getDay()];
  }

  /**
   * 요일별 음식 선호도를 계산합니다.
   * @param historyData 사용자 히스토리 데이터
   * @param targetDay 대상 요일
   * @returns 카테고리별 선호도 점수 맵
   */
  private calculateDayPreference(
    historyData: any[],
    targetDay: string,
  ): Map<string, number> {
    const preferenceMap = new Map<string, number>();

    // 해당 요일의 데이터만 필터링
    const dayData = historyData.filter((item) => item.day === targetDay);

    if (dayData.length === 0) {
      console.log(`${targetDay}에 대한 히스토리 데이터가 없습니다.`);
      return preferenceMap;
    }

    // 요일별 음식 키워드 빈도 계산
    const foodKeywordCount = new Map<string, number>();

    dayData.forEach((item) => {
      try {
        // chat 필드가 JSON 문자열인 경우 파싱
        let message = "";
        if (typeof item.chat === "string") {
          const chatData = JSON.parse(item.chat);
          message = chatData.message || "";
        } else {
          message = item.chat?.message || "";
        }

        // 메시지에서 음식 카테고리 키워드 추출
        this.extractFoodKeywords(message, foodKeywordCount);
      } catch (error) {
        console.warn("메시지 파싱 실패:", item, error);
      }
    });

    // 키워드 빈도를 점수로 변환
    this.convertKeywordCountToScore(foodKeywordCount, preferenceMap);

    return preferenceMap;
  }

  /**
   * 메시지에서 음식 카테고리 키워드를 추출합니다.
   * @param message 사용자 메시지
   * @param keywordCount 키워드 카운트 맵
   */
  private extractFoodKeywords(
    message: string,
    keywordCount: Map<string, number>,
  ): void {
    const lowerMessage = message.toLowerCase();

    // 각 음식 카테고리별로 키워드 매칭
    FOOD_CATEGORIES.forEach((category) => {
      const keywords = this.getCategoryKeywords(category.nameKo, category.name);

      keywords.forEach((keyword) => {
        if (
          lowerMessage.includes(keyword.toLowerCase()) ||
          message.includes(keyword)
        ) {
          const currentCount = keywordCount.get(category.nameKo) || 0;
          keywordCount.set(category.nameKo, currentCount + 1);
        }
      });
    });
  }

  /**
   * 음식 카테고리별 검색 키워드를 반환합니다.
   * @param nameKo 한글명
   * @param nameEn 영문명
   * @returns 검색 키워드 배열
   */
  private getCategoryKeywords(nameKo: string, nameEn: string): string[] {
    // 기본 키워드
    const keywords = [nameKo, nameEn];

    // 카테고리별 추가 키워드
    const additionalKeywords: { [key: string]: string[] } = {
      피자: [
        "pizza",
        "피자",
        "도우",
        "치즈",
        "토핑",
        "페퍼로니",
        "오븐",
        "피자헛",
      ],
      샐러드: [
        "salad",
        "샐러드",
        "야채",
        "드레싱",
        "채소",
        "건강식",
        "그린",
        "올리브",
      ],
      디저트: [
        "dessert",
        "디저트",
        "후식",
        "달콤",
        "케이크",
        "초콜릿",
        "마카롱",
        "푸딩",
      ],
      양식: [
        "western",
        "양식",
        "스테이크",
        "파스타",
        "리조또",
        "그라탱",
        "오븐",
        "크림",
      ],
      한식: [
        "korean",
        "한식",
        "김치",
        "밥",
        "국",
        "찌개",
        "불고기",
        "된장",
        "비빔",
      ],
      치킨: [
        "chicken",
        "치킨",
        "닭",
        "튀김",
        "양념",
        "프라이드",
        "핫윙",
        "순살",
        "치밥",
      ],
      분식: [
        "snack",
        "분식",
        "떡볶이",
        "순대",
        "튀김",
        "김밥",
        "라면",
        "오뎅",
        "분식집",
      ],
      돈까스: [
        "cutlet",
        "돈까스",
        "까스",
        "등심",
        "안심",
        "소스",
        "튀김",
        "정식",
      ],
      "족발/보쌈": [
        "족발",
        "보쌈",
        "수육",
        "쌈",
        "마늘",
        "새우젓",
        "보쌈김치",
        "무말랭이",
      ],
      "찜/탕": [
        "찜",
        "탕",
        "국물",
        "끓",
        "매운탕",
        "아구찜",
        "갈비찜",
        "해장",
        "전골",
      ],
      구이: [
        "grilled",
        "구이",
        "고기",
        "바베큐",
        "석쇠",
        "숯불",
        "삼겹살",
        "불판",
      ],
      중식: [
        "chinese",
        "중식",
        "중국",
        "짜장",
        "짬뽕",
        "탕수육",
        "마라",
        "볶음밥",
        "딤섬",
      ],
      일식: [
        "japanese",
        "일식",
        "일본",
        "초밥",
        "라멘",
        "돈부리",
        "우동",
        "덮밥",
        "튀김",
      ],
      "회/해물": [
        "sashimi",
        "회",
        "해물",
        "생선",
        "조개",
        "초장",
        "광어",
        "연어",
        "물회",
      ],
      "커피/차": [
        "coffee",
        "tea",
        "커피",
        "차",
        "음료",
        "카페인",
        "라떼",
        "아메리카노",
        "녹차",
      ],
      간식: [
        "snacks",
        "간식",
        "과자",
        "쿠키",
        "비스킷",
        "젤리",
        "초코",
        "핫도그",
      ],
      아시안: [
        "asian",
        "아시안",
        "동남아",
        "베트남",
        "태국",
        "쌀국수",
        "나시고랭",
        "팟타이",
      ],
      샌드위치: [
        "sandwich",
        "샌드위치",
        "햄",
        "치즈",
        "베이컨",
        "토스트",
        "샐러드",
      ],
      버거: [
        "burger",
        "버거",
        "햄버거",
        "패티",
        "불고기버거",
        "치즈버거",
        "세트",
      ],
      멕시칸: [
        "mexican",
        "멕시칸",
        "타코",
        "브리또",
        "살사",
        "퀘사디아",
        "나쵸",
      ],
      도시락: [
        "lunch box",
        "도시락",
        "박스",
        "반찬",
        "정식",
        "김밥",
        "계란말이",
      ],
      죽: [
        "porridge",
        "죽",
        "미음",
        "전복죽",
        "야채죽",
        "단호박죽",
        "소화",
        "건강식",
      ],
    };

    if (additionalKeywords[nameKo]) {
      keywords.push(...additionalKeywords[nameKo]);
    }

    return keywords;
  }

  /**
   * 키워드 빈도를 선호도 점수로 변환합니다.
   * @param keywordCount 키워드 카운트 맵
   * @param preferenceMap 선호도 점수 맵
   */
  private convertKeywordCountToScore(
    keywordCount: Map<string, number>,
    preferenceMap: Map<string, number>,
  ): void {
    // 최대 빈도수를 구해서 정규화에 사용
    const maxCount = Math.max(...Array.from(keywordCount.values()), 1);

    keywordCount.forEach((count, categoryName) => {
      // 빈도수를 0-10점 사이의 점수로 변환
      const score = (count / maxCount) * 10;
      preferenceMap.set(categoryName, score);
    });

    console.log(
      `요일별 선호도 점수 계산 완료: ${preferenceMap.size}개 카테고리`,
    );
  }

  /**
   * 디버깅용: 선호도 점수를 콘솔에 출력합니다.
   * @param preferenceMap 선호도 점수 맵
   * @param day 요일
   */
  public printPreferenceScore(
    preferenceMap: Map<string, number>,
    day: string,
  ): void {
    console.log(`\n=== ${day} 요일 음식 선호도 점수 ===`);

    // 점수 순으로 정렬하여 출력
    const sortedEntries = Array.from(preferenceMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    sortedEntries.forEach(([category, score]) => {
      console.log(`${category}: ${score.toFixed(2)}점`);
    });

    if (sortedEntries.length === 0) {
      console.log("해당 요일에 대한 선호도 데이터가 없습니다.");
    }
  }

  /**
   * 사용자가 실제로 선택한 음식을 user_history.json에 저장합니다.
   *
   * @param selection 사용자 선택 정보
   */
  public async saveUserSelection(selection: {
    selectedFood: string; // "치킨", "한식", "교촌치킨" 등
    category?: string; // 카테고리 (있으면)
    restaurantName?: string; // 식당 이름 (있으면)
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    const today = this.getCurrentDay();
    const timestamp = Date.now();

    // 메시지 구성
    let message = `실제 선택: ${selection.selectedFood}`;
    if (selection.restaurantName) {
      message += ` - ${selection.restaurantName}`;
    }
    if (selection.category) {
      message += ` (카테고리: ${selection.category})`;
    }

    // 새로운 히스토리 엔트리 생성
    const historyEntry = {
      day: today,
      chat: JSON.stringify({
        message,
        selectedFood: selection.selectedFood,
        category: selection.category,
        restaurantName: selection.restaurantName,
        location: selection.location,
        timestamp: timestamp,
        type: "user_selection", // 일반 질문과 구분하기 위한 타입
      }),
    };

    // 기존 히스토리 로드 후 추가
    const currentHistory = this.loadUserHistory();
    currentHistory.push(historyEntry);

    // 파일에 저장
    fs.writeFileSync(
      this.historyFilePath,
      JSON.stringify(currentHistory, null, 2),
      "utf-8",
    );

    console.log(
      `✅ 사용자 선택 저장 완료: ${selection.selectedFood}${selection.restaurantName ? ` - ${selection.restaurantName}` : ''} (${today})`,
    );
  }

  /**
   * 특정 요일의 실제 선택 통계를 조회합니다.
   *
   * @param targetDay 대상 요일 (예: "Monday")
   * @returns 카테고리별 선택 횟수 및 자주 방문한 음식점 (상위 5개)
   */
  public async getDaySelectionStats(targetDay?: string): Promise<{
    day: string;
    dayKo: string;
    totalSelections: number;
    topSelections: Array<{
      category: string;
      count: number;
      percentage: number;
      restaurants: Array<{
        name: string;
        count: number;
      }>;
    }>;
  }> {
    try {
      const today = targetDay || this.getCurrentDay();
      const historyData = this.loadUserHistory();

      // 해당 요일의 "user_selection" 타입만 필터링
      const daySelections = historyData.filter(item => {
        if (item.day !== today) return false;

        try {
          const chatData = typeof item.chat === "string" ? JSON.parse(item.chat) : item.chat;
          return chatData.type === "user_selection";
        } catch {
          return false;
        }
      });

      if (daySelections.length === 0) {
        return {
          day: today,
          dayKo: this.getKoreanDay(today),
          totalSelections: 0,
          topSelections: []
        };
      }

      // 카테고리별 카운트 및 음식점 정보 저장
      const categoryData = new Map<string, {
        count: number;
        restaurants: Map<string, number>;
      }>();

      daySelections.forEach(item => {
        try {
          const chatData = typeof item.chat === "string" ? JSON.parse(item.chat) : item.chat;
          const category = chatData.category || chatData.selectedFood || "기타";
          const restaurantName = chatData.restaurantName;

          // 카테고리 데이터 초기화
          if (!categoryData.has(category)) {
            categoryData.set(category, {
              count: 0,
              restaurants: new Map()
            });
          }

          const data = categoryData.get(category)!;
          data.count += 1;

          // 음식점 이름이 있으면 카운트
          if (restaurantName) {
            data.restaurants.set(
              restaurantName,
              (data.restaurants.get(restaurantName) || 0) + 1
            );
          }
        } catch (error) {
          console.warn("선택 데이터 파싱 실패:", error);
        }
      });

      const totalCount = daySelections.length;

      // 상위 5개 카테고리 정렬 및 음식점 정보 포함
      const topSelections = Array.from(categoryData.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          percentage: Math.round((data.count / totalCount) * 100),
          restaurants: Array.from(data.restaurants.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3) // 상위 3개 음식점만
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      console.log(`${today} 선택 통계: 총 ${totalCount}번, 상위 ${topSelections.length}개 카테고리`);

      return {
        day: today,
        dayKo: this.getKoreanDay(today),
        totalSelections: totalCount,
        topSelections
      };

    } catch (error) {
      console.error("선택 통계 조회 중 오류:", error);
      const today = targetDay || this.getCurrentDay();
      return {
        day: today,
        dayKo: this.getKoreanDay(today),
        totalSelections: 0,
        topSelections: []
      };
    }
  }

  /**
   * 영어 요일을 한글로 변환합니다.
   */
  private getKoreanDay(englishDay: string): string {
    const dayMap: { [key: string]: string } = {
      "Sunday": "일요일",
      "Monday": "월요일",
      "Tuesday": "화요일",
      "Wednesday": "수요일",
      "Thursday": "목요일",
      "Friday": "금요일",
      "Saturday": "토요일"
    };
    return dayMap[englishDay] || englishDay;
  }
}

/**
 * 메시지 분석 유틸리티
 * 
 * @description
 * 사용자의 채팅 메시지를 분석하여 음식 추천, 맛집 검색 등의 의도를 파악하는 유틸리티입니다.
 * 포만감 정보가 없는 경우를 감지하여 자동으로 포만감을 물어보도록 돕습니다.
 */
export class MessageAnalyzer {
  
  /**
   * 음식 추천 관련 키워드들
   * @description 사용자가 음식 추천을 요청할 때 사용하는 키워드들
   */
  private static readonly FOOD_RECOMMENDATION_KEYWORDS = [
    // 직접적인 음식 추천 요청
    "음식 추천", "뭐 먹을까", "뭐 먹지", "먹을 거", "먹을것", "먹을게", 
    "식사 추천", "메뉴 추천", "요리 추천", "음식 고르", "메뉴 고르",
    
    // 식사 관련 표현
    "밥 먹", "식사", "저녁", "점심", "아침", "야식", "간식",
    "배고", "허기", "출출", "시장"
  ];

  /**
   * 맛집/레스토랑 관련 키워드들
   * @description 사용자가 맛집이나 레스토랑 정보를 요청할 때 사용하는 키워드들
   */
  private static readonly RESTAURANT_KEYWORDS = [
    // 맛집 관련
    "맛집", "맛있는 집", "맛있는 곳", "유명한 집", "인기 맛집",
    
    // 레스토랑 관련
    "레스토랑", "식당", "음식점"
  ];

  /**
   * 포만감 관련 키워드들
   * @description 사용자가 이미 포만감 상태를 언급했는지 확인하는 키워드들
   */
  private static readonly FULLNESS_KEYWORDS = [
    // 배고픔 상태
    "배고", "허기", "출출", "굶주", "시장", "빈속",
    
    // 배부름 상태  
    "배불", "배부", "포만", "가득", "든든", "배가 불러",
    
    // 보통 상태
    "조금 배고", "살짝 배고", "약간 배고", "적당히", "보통"
  ];

  /**
   * 메시지에서 음식 추천 의도를 감지합니다.
   * 
   * @param message - 분석할 사용자 메시지
   * @returns 음식 추천 의도가 감지되면 true
   */
  public static detectFoodRecommendationIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // 음식 관련 키워드가 포함되어 있고, 추천/요청 의미가 있는지 확인
    const hasFoodKeyword = this.FOOD_RECOMMENDATION_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    const hasRequestIntent = [
      "추천", "알려줘", "말해줘", "도와줘", "골라줘", "정해줘", "뭐", "어떤"
    ].some(keyword => lowerMessage.includes(keyword));
    
    return hasFoodKeyword && hasRequestIntent;
  }

  /**
   * 메시지에서 맛집/레스토랑 검색 의도를 감지합니다.
   * 
   * @param message - 분석할 사용자 메시지
   * @returns 맛집 검색 의도가 감지되면 true
   */
  public static detectRestaurantSearchIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // 맛집/레스토랑 키워드가 포함되어 있고, 검색/요청 의미가 있는지 확인
    const hasRestaurantKeyword = this.RESTAURANT_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    const hasSearchIntent = [
      "추천", "알려줘", "찾아줘", "검색", "소개", "어디", "근처", "주변"
    ].some(keyword => lowerMessage.includes(keyword));
    
    return hasRestaurantKeyword && hasSearchIntent;
  }

  /**
   * 메시지에서 포만감 정보가 포함되어 있는지 확인합니다.
   * 
   * @param message - 분석할 사용자 메시지
   * @returns 포만감 정보가 포함되어 있으면 true
   */
  public static hasFullnessInfo(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    return this.FULLNESS_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  /**
   * 음식/맛집 관련 질문이면서 포만감 정보가 없는지 확인합니다.
   * 
   * @param message - 분석할 사용자 메시지
   * @returns 포만감을 물어봐야 하는 상황이면 true
   */
  public static shouldAskForFullness(message: string): boolean {
    const isFoodRelated = this.detectFoodRecommendationIntent(message) || 
                         this.detectRestaurantSearchIntent(message);
    const hasFullness = this.hasFullnessInfo(message);
    
    // 음식/맛집 관련 질문이면서 포만감 정보가 없는 경우
    return isFoodRelated && !hasFullness;
  }

  /**
   * 메시지 의도를 종합적으로 분석합니다.
   * 
   * @param message - 분석할 사용자 메시지
   * @returns 메시지 분석 결과
   */
  public static analyzeMessage(message: string): {
    isFoodRecommendation: boolean;
    isRestaurantSearch: boolean;
    hasFullnessInfo: boolean;
    shouldAskForFullness: boolean;
    analysisReason: string;
  } {
    const isFoodRecommendation = this.detectFoodRecommendationIntent(message);
    const isRestaurantSearch = this.detectRestaurantSearchIntent(message);
    const hasFullnessInfo = this.hasFullnessInfo(message);
    const shouldAskForFullness = this.shouldAskForFullness(message);

    let analysisReason = "";
    
    if (shouldAskForFullness) {
      if (isFoodRecommendation) {
        analysisReason = "음식 추천 요청이 감지되었지만 포만감 정보가 없어 질문이 필요합니다.";
      } else if (isRestaurantSearch) {
        analysisReason = "맛집 검색 요청이 감지되었지만 포만감 정보가 없어 질문이 필요합니다.";
      }
    } else if (hasFullnessInfo) {
      analysisReason = "포만감 정보가 포함되어 있어 바로 추천이 가능합니다.";
    } else {
      analysisReason = "음식/맛집 관련 질문이 아니므로 포만감 질문이 불필요합니다.";
    }

    return {
      isFoodRecommendation,
      isRestaurantSearch,
      hasFullnessInfo,
      shouldAskForFullness,
      analysisReason
    };
  }
}

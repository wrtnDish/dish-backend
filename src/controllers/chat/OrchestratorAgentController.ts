import { FullnessLevel } from "../../api/structures/food/IFoodRecommendation";
import { ILatLng } from "../../api/structures/weather/IWeatherForecast";
import { IntegratedFoodAgentController } from "./IntegratedFoodAgentController";
import { WeatherAgentController } from "./WeatherAgentController";

/**
 * 대화 상태 인터페이스
 */
interface ConversationState {
  /**
   * 사용자가 통계를 이미 조회했는지 여부
   */
  hasSeenStatistics?: boolean;

  /**
   * 마지막 대화 주제
   */
  lastTopic?: 'weather' | 'food' | 'statistics' | 'restaurant' | 'system' | null;

  /**
   * 현재 진행 중인 플로우
   */
  currentFlow?: 'food_recommendation' | 'restaurant_search' | null;

  /**
   * 마지막으로 조회한 요일 (통계용)
   */
  lastQueriedDay?: string;

  /**
   * 사용자가 마지막으로 입력한 배고픔 정도
   */
  lastHungerLevel?: FullnessLevel;

  /**
   * 사용자의 현재 위치 (GPS)
   */
  currentLocation?: ILatLng;

  /**
   * 대화 시작 시간
   */
  sessionStartTime?: Date;

  /**
   * 카테고리 확인이 필요한 식당 이름
   * (GPT가 모르는 식당일 때 임시 저장)
   */
  pendingRestaurant?: string;
}

/**
 * 의도 분석 결과
 */
interface IntentAnalysis {
  /**
   * 의도 카테고리
   */
  category: 'weather' | 'food_recommendation' | 'statistics' | 'restaurant_search' |
            'food_selection' | 'system_info' | 'continue_flow' | 'unknown';

  /**
   * 신뢰도 (0-1)
   */
  confidence: number;

  /**
   * 추출된 엔티티 (위치, 음식 종류 등)
   */
  entities?: {
    location?: string;
    hungerLevel?: FullnessLevel;
    dayOfWeek?: string;
    foodCategory?: string;
    restaurantName?: string;
  };
}

/**
 * 스마트 오케스트레이터 에이전트 컨트롤러
 *
 * @description
 * 사용자 의도를 분석하고 적절한 서비스로 라우팅하는 중앙 컨트롤러입니다.
 * 대화 컨텍스트를 관리하여 중복 정보 제공을 방지하고, 자연스러운 대화 흐름을 제공합니다.
 *
 * **주요 기능:**
 * 1. 의도 분석: 사용자 메시지에서 의도를 파악
 * 2. 상태 관리: 대화 컨텍스트를 세션별로 관리
 * 3. 라우팅: 적절한 서비스로 요청 전달
 * 4. 흐름 제어: 대화 흐름을 자연스럽게 관리
 *
 * **해결하는 문제:**
 * - 다중 함수 호출로 인한 응답 중복
 * - 컨텍스트 무시로 인한 불필요한 정보 반복
 * - "너 뭐할 수 있어?" 같은 메타 질문 미처리
 */
export class OrchestratorAgentController {
  private readonly weatherAgent: WeatherAgentController;
  private readonly foodAgent: IntegratedFoodAgentController;

  /**
   * 세션별 대화 상태 저장소
   * Key: sessionId (기본값: 'default')
   */
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor() {
    this.weatherAgent = new WeatherAgentController();
    this.foodAgent = new IntegratedFoodAgentController();
  }

  /**
   * 메인 라우팅 함수 - 모든 사용자 메시지의 진입점
   *
   * @description
   * 사용자 메시지를 분석하여 의도를 파악하고, 대화 컨텍스트를 고려하여
   * 적절한 서비스로 라우팅합니다.
   *
   * **중요 지침 (AI Assistant에게):**
   * 1. **단일 호출 원칙**: 사용자의 한 질문에는 이 함수를 정확히 한 번만 호출하세요.
   * 2. **컨텍스트 존중**: 이전 대화 내용을 고려하여 중복 정보를 제공하지 마세요.
   * 3. **의도 파악**: 사용자의 진짜 의도를 파악하여 적절한 서비스를 선택하세요.
   *    - "날씨 어때?" → 날씨 조회
   *    - "음식 추천해줘" → 음식 추천 플로우 시작
   *    - "주변 맛집" → 맛집 검색
   *    - "너 뭐할 수 있어?" → 시스템 기능 설명
   * 4. **플로우 유지**: 사용자가 대화 중간에 배고픔 정도나 위치를 입력하면, 현재 플로우를 계속 진행하세요.
   * 5. **자연스러운 응답**: 함수 결과를 그대로 출력하지 말고, 친절하고 자연스럽게 재구성하세요.
   * 6. **에러 처리**: 함수 결과에 success: false가 있으면, 사용자에게 도움이 되는 대안을 제시하세요.
   *
   * @param input 사용자 입력 정보
   * @returns 처리 결과
   */
  public async handleUserMessage(input: {
    /**
     * 사용자 메시지 (JSON 형식 또는 일반 텍스트)
     *
     * JSON 형식 예시: {"message": "음식 추천해줘", "location": {"lat": 36.35, "lng": 127.30}}
     * 일반 텍스트 예시: "음식 추천해줘"
     */
    userMessage: string;

    /**
     * 세션 ID (선택사항, 기본값: 'default')
     * 여러 사용자를 구분하기 위해 사용
     */
    sessionId?: string;

    /**
     * 사용자의 현재 GPS 좌표 (선택사항)
     */
    currentLocation?: ILatLng;
  }): Promise<any> {
    const sessionId = input.sessionId || 'default';

    // JSON 형식인 경우 파싱하여 메시지와 위치 정보 분리
    let actualMessage = input.userMessage;
    let locationFromJson: ILatLng | undefined = input.currentLocation;

    try {
      const parsed = JSON.parse(input.userMessage);
      if (parsed.message) {
        actualMessage = parsed.message;
        console.log("📩 JSON 메시지 파싱 성공");
      }
      if (parsed.location) {
        locationFromJson = parsed.location;
        console.log(`📍 GPS 좌표 수신: (${locationFromJson?.lat}, ${locationFromJson?.lng})`);
      }
    } catch {
      // JSON이 아니면 그대로 사용
      console.log("📩 일반 텍스트 메시지");
    }

    // 파싱된 메시지와 위치 정보로 input 업데이트
    input.userMessage = actualMessage;
    input.currentLocation = locationFromJson;

    // 현재 세션 상태 가져오기
    let state = this.conversationStates.get(sessionId);
    if (!state) {
      state = {
        sessionStartTime: new Date(),
        lastTopic: null,
        currentFlow: null
      };
      this.conversationStates.set(sessionId, state);
    }

    // GPS 좌표 업데이트
    if (input.currentLocation) {
      state.currentLocation = input.currentLocation;
    }

    // 특별 케이스: 식당 카테고리 대기 중
    if (state.pendingRestaurant) {
      console.log(`📋 식당 카테고리 대기 중: "${state.pendingRestaurant}"`);

      // 사용자 입력을 카테고리로 파싱
      const category = this.extractFoodCategory(input.userMessage);

      if (category) {
        // 카테고리 저장
        const result = await this.foodAgent.confirmUserSelection({
          selectedFood: category,
          category: category,
          restaurantName: state.pendingRestaurant
        });

        // 상태 초기화
        state.pendingRestaurant = undefined;
        this.conversationStates.set(sessionId, state);

        return result;
      } else {
        return {
          success: false,
          message: `죄송합니다. 음식 종류를 파악하지 못했습니다.\n\n"${state.pendingRestaurant}"은(는) 어떤 종류의 음식점인가요?\n예: "한식", "일식", "버거" 등`
        };
      }
    }

    // 의도 분석
    const intent = this.analyzeIntent(input.userMessage, state);
    console.log(`🎯 의도 분석: ${intent.category} (신뢰도: ${intent.confidence})`);

    // 상태 기반 라우팅
    try {
      let result: any;

      switch (intent.category) {
        case 'weather':
          result = await this.handleWeather(input.userMessage, intent.entities, state);
          state.lastTopic = 'weather';
          break;

        case 'food_recommendation':
          result = await this.handleFoodRecommendation(input.userMessage, intent.entities, state);
          state.lastTopic = 'food';
          state.currentFlow = 'food_recommendation';
          break;

        case 'statistics':
          result = await this.handleStatistics(intent.entities, state);
          state.lastTopic = 'statistics';
          state.hasSeenStatistics = true;
          if (intent.entities?.dayOfWeek) {
            state.lastQueriedDay = intent.entities.dayOfWeek;
          }
          break;

        case 'restaurant_search':
          result = await this.handleRestaurantSearch(input.userMessage, intent.entities, state);
          state.lastTopic = 'restaurant';
          state.currentFlow = 'restaurant_search';
          break;

        case 'food_selection':
          result = await this.handleFoodSelection(intent.entities, input.userMessage, state);
          state.currentFlow = null; // 플로우 완료
          break;

        case 'system_info':
          result = await this.getSystemCapabilities();
          state.lastTopic = 'system';
          break;

        case 'continue_flow':
          result = await this.handleContinueFlow(input.userMessage, state);
          break;

        case 'unknown':
        default:
          result = {
            success: false,
            message: "죄송합니다. 무엇을 도와드릴까요? '뭐할 수 있어?'라고 물어보시면 제 기능을 설명해드릴게요!",
            suggestion: "날씨 조회, 음식 추천, 맛집 검색 등을 요청해보세요."
          };
          break;
      }

      // 상태 저장
      this.conversationStates.set(sessionId, state);

      return result;

    } catch (error) {
      console.error(`❌ 메시지 처리 중 오류 (의도: ${intent.category}):`, error);
      return {
        success: false,
        message: "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      };
    }
  }

  /**
   * 사용자 의도 분석
   */
  private analyzeIntent(message: string, state: ConversationState): IntentAnalysis {
    const lowerMsg = message.toLowerCase().trim();
    const entities: IntentAnalysis['entities'] = {};

    // 1. 음식 선택 기록 (과거형 + 미래형) - 최우선 체크!
    // "오늘 나 교촌치킨 갔어", "마초쉐프 다녀왔어", "쉐이크쉑 갈거야", "내일 피자 먹을 예정" 등
    const hasFoodSelectionKeyword =
      // 과거형 (이미 먹음/방문함)
      lowerMsg.includes('먹었') || lowerMsg.includes('먹음') ||
      lowerMsg.includes('골랐') || lowerMsg.includes('선택했') ||
      lowerMsg.includes('갔어') || lowerMsg.includes('갔음') || lowerMsg.includes('갔다') ||
      lowerMsg.includes('다녀왔') || lowerMsg.includes('다녀옴') || lowerMsg.includes('다녀왔다') ||
      lowerMsg.includes('방문했') || lowerMsg.includes('방문함') ||
      lowerMsg.includes('먹고왔') || lowerMsg.includes('먹고옴') ||
      lowerMsg.includes('시켰어') || lowerMsg.includes('시켰음') || lowerMsg.includes('시킴') ||
      lowerMsg.includes('주문했') || lowerMsg.includes('주문함') ||
      lowerMsg.includes('배달시켰') || lowerMsg.includes('배달시킴') ||
      // 미래형 (먹을 예정/갈 예정)
      lowerMsg.includes('갈거야') || lowerMsg.includes('갈꺼야') || lowerMsg.includes('갈 거야') || lowerMsg.includes('갈 꺼야') ||
      lowerMsg.includes('갈게') || lowerMsg.includes('갈래') ||
      lowerMsg.includes('가볼게') || lowerMsg.includes('가볼래') || lowerMsg.includes('가볼까') ||
      lowerMsg.includes('갈 예정') || lowerMsg.includes('갈예정') ||
      lowerMsg.includes('가려고') || lowerMsg.includes('가기로') ||
      lowerMsg.includes('먹을 거야') || lowerMsg.includes('먹을거야') || lowerMsg.includes('먹을꺼야') || lowerMsg.includes('먹을 꺼야') ||
      lowerMsg.includes('먹을게') || lowerMsg.includes('먹을래') ||
      lowerMsg.includes('먹어볼게') || lowerMsg.includes('먹어볼래') || lowerMsg.includes('먹어볼까') ||
      lowerMsg.includes('먹을 예정') || lowerMsg.includes('먹을예정') ||
      lowerMsg.includes('먹으려고') || lowerMsg.includes('먹기로') ||
      lowerMsg.includes('다녀올게') || lowerMsg.includes('다녀올래') || lowerMsg.includes('다녀올까') ||
      lowerMsg.includes('먹고올게') || lowerMsg.includes('먹고올래') ||
      lowerMsg.includes('시킬거야') || lowerMsg.includes('시킬꺼야') || lowerMsg.includes('시킬게') ||
      lowerMsg.includes('주문할거야') || lowerMsg.includes('주문할꺼야') || lowerMsg.includes('주문할게') ||
      lowerMsg.includes('정했어') || lowerMsg.includes('정함') || lowerMsg.includes('결정했어') || lowerMsg.includes('결정함');

    if (hasFoodSelectionKeyword && !lowerMsg.includes('뭐') && !lowerMsg.includes('통계')) {
      entities.foodCategory = this.extractFoodCategory(message);
      entities.restaurantName = this.extractRestaurantName(message);
      return {
        category: 'food_selection',
        confidence: 0.95,  // 신뢰도 높임
        entities
      };
    }

    // 2. 진행 중인 플로우가 있는지 확인
    if (state.currentFlow === 'food_recommendation') {
      // 배고픔 정도 숫자 또는 위치 정보가 있으면 플로우 계속
      if (/\b[1-3]\b/.test(message) || this.containsLocationKeyword(lowerMsg)) {
        return {
          category: 'continue_flow',
          confidence: 0.95,
          entities: this.extractFoodEntities(message)
        };
      }
    }

    // 3. 날씨 관련
    if (lowerMsg.includes('날씨') || lowerMsg.includes('기온') || lowerMsg.includes('온도') ||
        lowerMsg.includes('습도') || lowerMsg.includes('weather')) {
      entities.location = this.extractLocation(message);
      return {
        category: 'weather',
        confidence: 0.9,
        entities
      };
    }

    // 4. 통계 조회
    if (lowerMsg.includes('통계') || lowerMsg.includes('선택') || lowerMsg.includes('먹었') ||
        (lowerMsg.includes('뭐') && lowerMsg.includes('먹')) && (lowerMsg.includes('요일') || lowerMsg.includes('일'))) {
      entities.dayOfWeek = this.extractDayOfWeek(message);
      return {
        category: 'statistics',
        confidence: 0.85,
        entities
      };
    }

    // 5. 맛집/음식점 검색 우선 체크 (음식 추천보다 먼저)
    const hasRestaurantKeyword =
      lowerMsg.includes('맛집') || lowerMsg.includes('식당') || lowerMsg.includes('음식점') ||
      lowerMsg.includes('카페') || lowerMsg.includes('술집') || lowerMsg.includes('bar') ||
      lowerMsg.includes('레스토랑') || lowerMsg.includes('음식') ||
      // 음식점 종류 키워드
      lowerMsg.includes('치킨') || lowerMsg.includes('피자') || lowerMsg.includes('햄버거') ||
      lowerMsg.includes('한식') || lowerMsg.includes('중식') || lowerMsg.includes('일식') ||
      lowerMsg.includes('양식') || lowerMsg.includes('분식') || lowerMsg.includes('회') ||
      lowerMsg.includes('고기') || lowerMsg.includes('삼겹살') || lowerMsg.includes('갈비') ||
      lowerMsg.includes('곱창') || lowerMsg.includes('족발') || lowerMsg.includes('보쌈') ||
      lowerMsg.includes('파스타') || lowerMsg.includes('스테이크') || lowerMsg.includes('초밥') ||
      lowerMsg.includes('라면') || lowerMsg.includes('국밥') || lowerMsg.includes('찌개') ||
      lowerMsg.includes('떡볶이') || lowerMsg.includes('김밥') || lowerMsg.includes('돈까스');

    const hasSearchIntent =
      lowerMsg.includes('알려줘') || lowerMsg.includes('알려주') ||
      lowerMsg.includes('찾아줘') || lowerMsg.includes('찾아주') ||
      lowerMsg.includes('검색') || lowerMsg.includes('어디') ||
      lowerMsg.includes('주변') || lowerMsg.includes('근처') ||
      lowerMsg.includes('있어');

    // 음식점 키워드 + 검색 의도가 있고, "추천"이 없으면 맛집 검색
    if (hasRestaurantKeyword && hasSearchIntent && !lowerMsg.includes('추천')) {
      entities.location = this.extractLocation(message);
      entities.foodCategory = this.extractFoodCategory(message);

      return {
        category: 'restaurant_search',
        confidence: 0.92,
        entities
      };
    }

    // 6. 음식 추천 (배고픔 기반)
    if (lowerMsg.includes('추천') || lowerMsg.includes('뭐 먹') || lowerMsg.includes('먹을까') ||
        lowerMsg.includes('음식')) {

      // 배고픔 정도가 있으면 바로 추천으로
      const hungerMatch = message.match(/\b([1-3])\b/);
      if (hungerMatch) {
        entities.hungerLevel = parseInt(hungerMatch[1]) as FullnessLevel;
      }
      entities.location = this.extractLocation(message);

      return {
        category: 'food_recommendation',
        confidence: 0.9,
        entities
      };
    }

    // 7. 시스템 정보 (메타 질문)
    if (lowerMsg.includes('뭐할') || lowerMsg.includes('무슨') || lowerMsg.includes('기능') ||
        lowerMsg.includes('할 수') || lowerMsg.includes('도와') || lowerMsg.includes('help')) {
      return {
        category: 'system_info',
        confidence: 0.95,
        entities
      };
    }

    // 8. 알 수 없음
    return {
      category: 'unknown',
      confidence: 0,
      entities
    };
  }

  /**
   * 날씨 관련 처리
   */
  private async handleWeather(
    message: string,
    entities: IntentAnalysis['entities'] = {},
    state: ConversationState
  ): Promise<any> {
    console.log("🌤️ 날씨 관련 처리 시작");

    // 특정 위치가 있으면 그 위치의 날씨
    if (entities.location) {
      return await this.weatherAgent.getMyLocationWeather({
        location: entities.location,
        includeDetails: true
      });
    }

    // 현재 위치 날씨
    if (state.currentLocation) {
      return await this.weatherAgent.getWeatherByCoordinates(state.currentLocation);
    }

    // 기본: 빠른 날씨 조회
    return await this.weatherAgent.getQuickCurrentWeather({
      locationMethod: "gps",
      locationData: state.currentLocation
    });
  }

  /**
   * 음식 추천 플로우 처리 (컨텍스트 인식)
   */
  private async handleFoodRecommendation(
    message: string,
    entities: IntentAnalysis['entities'] = {},
    state: ConversationState
  ): Promise<any> {
    console.log("🍽️ 음식 추천 플로우 시작");

    // 케이스 1: 배고픔 + 위치 모두 있음 → 바로 추천
    if (entities.hungerLevel && (entities.location || state.currentLocation)) {
      console.log("✅ 배고픔 + 위치 모두 있음 → 바로 추천");
      return await this.foodAgent.getCategoryRecommendation({
        hungerLevel: entities.hungerLevel,
        location: state.currentLocation,
        locationName: entities.location
      });
    }

    // 케이스 2: 배고픔만 있음 → 위치 자동 사용
    if (entities.hungerLevel) {
      console.log("📍 배고픔만 있음 → 현재 위치 자동 사용");
      return await this.foodAgent.recommendFoodWithHungerOnly({
        hungerLevel: entities.hungerLevel,
        currentCoordinates: state.currentLocation
      });
    }

    // 케이스 3: 정보 부족 → 질문 (컨텍스트 고려)
    console.log("❓ 정보 부족 → 질문 단계");

    // 이미 통계를 본 경우 → 통계 생략
    if (state.hasSeenStatistics && state.lastTopic === 'statistics') {
      console.log("📊 이미 통계를 봤으므로 통계 생략");
      return {
        question: "배고픔 정도(1-3)와 현재 위치를 알려주세요!",
        hungerLevels: [
          { level: 3, description: "매우 배고픔", emoji: "😋" },
          { level: 2, description: "보통", emoji: "🤔" },
          { level: 1, description: "배부름", emoji: "😊" }
        ],
        locationGuide: "📍 현재 계신 지역명을 말씀해주세요 (예: 서울, 대전, 강남구 등)",
        examples: ["배고픔 3", "3, 대전", "배고픔은 2이고 위치는 서울"],
        note: "이미 통계를 확인하셨으므로 바로 추천 단계로 진행합니다."
      };
    }

    // 처음이면 통계 포함
    console.log("🆕 처음 요청 → 통계 포함 질문");
    return await this.foodAgent.askForFoodRecommendation();
  }

  /**
   * 통계 조회 처리
   */
  private async handleStatistics(
    entities: IntentAnalysis['entities'] = {},
    state: ConversationState
  ): Promise<any> {
    console.log("📊 통계 조회 시작");

    return await this.foodAgent.getTodayFoodStatistics({
      dayOfWeek: entities.dayOfWeek
    });
  }

  /**
   * 맛집 검색 처리 (배고픔 정도 불필요)
   */
  private async handleRestaurantSearch(
    message: string,
    entities: IntentAnalysis['entities'] = {},
    state: ConversationState
  ): Promise<any> {
    console.log("🔍 맛집 검색 시작");

    // 사용자 메시지에서 검색 쿼리 생성
    const searchQuery = this.buildRestaurantSearchQuery(message);
    console.log(`🔍 검색 쿼리: "${searchQuery}"`);

    // 직접 RestaurantProvider 호출
    const RestaurantProvider = require('../../providers/restaurant/RestaurantProvider').RestaurantProvider;

    try {
      const result = await RestaurantProvider.search({
        query: searchQuery,
        display: 10
      });

      if (result && result.items && result.items.length > 0) {
        // 성공 응답 포맷팅
        const formattedRestaurants = result.items.map((item: any, index: number) => {
          const cleanTitle = item.title.replace(/<[^>]*>/g, ''); // HTML 태그 제거
          const cleanCategory = item.category.replace(/<[^>]*>/g, '');

          return `${index + 1}. **${cleanTitle}**
   📍 ${item.roadAddress || item.address}
   📞 ${item.telephone || '전화번호 없음'}
   🏷️ ${cleanCategory}
   ${item.link ? `🔗 [상세보기](${item.link})` : ''}`;
        }).join('\n\n');

        const totalCount = result.total || result.items.length;

        return {
          success: true,
          message: `"${searchQuery}" 검색 결과 (총 ${totalCount}개 중 ${result.items.length}개):\n\n${formattedRestaurants}`,
          data: {
            searchQuery,
            totalCount,
            restaurants: result.items,
            displayCount: result.items.length
          }
        };
      } else {
        return {
          success: false,
          message: `"${searchQuery}"에 대한 검색 결과가 없습니다.\n\n다른 지역이나 음식 종류로 다시 검색해보세요.`,
          data: {
            searchQuery,
            totalCount: 0
          }
        };
      }
    } catch (error) {
      console.error('❌ 맛집 검색 오류:', error);
      return {
        success: false,
        message: '맛집 검색 중 오류가 발생했습니다. 다시 시도해주세요.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 음식 선택 기록 처리 (GPT 기반 전체 메시지 분석)
   */
  private async handleFoodSelection(
    entities: IntentAnalysis['entities'] = {},
    originalMessage?: string,
    state?: ConversationState
  ): Promise<any> {
    console.log("✅ 음식 선택 기록 시작");

    // 식당 이름이 있으면 GPT로 전체 메시지 분석
    if (entities.restaurantName || originalMessage) {
      const messageToAnalyze = originalMessage || entities.restaurantName || "";
      console.log(`🏪 전체 메시지 분석: "${messageToAnalyze}"`);
      const result = await this.foodAgent.recordVisitedRestaurant({
        restaurantOrFood: entities.restaurantName || "",
        originalMessage: messageToAnalyze
      });

      // needsConfirmation이 true면 state에 식당 이름 저장
      if (result.needsConfirmation && state && result.restaurantName) {
        state.pendingRestaurant = result.restaurantName;
        console.log(`📋 식당 대기 상태 저장: "${result.restaurantName}"`);
      }

      return result;
    }

    // 음식 카테고리만 있으면 기존 방식
    if (entities.foodCategory) {
      console.log(`🍽️ 음식 카테고리 감지: "${entities.foodCategory}"`);
      return await this.foodAgent.confirmUserSelection({
        selectedFood: entities.foodCategory,
        category: entities.foodCategory
      });
    }

    // 둘 다 없으면 안내 메시지
    return {
      success: false,
      message: "어떤 음식이나 식당을 다녀오셨는지 알려주세요.\n\n예시:\n- '교촌치킨 갔어'\n- '한식 먹었어'\n- '신전떡볶이 다녀왔어'\n- '쉐이크쉑 갈거야'"
    };
  }

  /**
   * 플로우 계속 진행 (배고픔/위치 입력)
   */
  private async handleContinueFlow(
    message: string,
    state: ConversationState
  ): Promise<any> {
    console.log("⏩ 플로우 계속 진행");

    if (state.currentFlow === 'food_recommendation') {
      // 음식 추천 플로우 계속
      const entities = this.extractFoodEntities(message);

      return await this.foodAgent.recommendFoodFromInput({
        userMessage: message,
        currentCoordinates: state.currentLocation
      });
    }

    // 알 수 없는 플로우
    return {
      success: false,
      message: "죄송합니다. 이전 대화를 이해하지 못했습니다. 다시 시도해주세요."
    };
  }

  /**
   * 시스템 기능 설명
   *
   * @description
   * "너 뭐할 수 있어?", "무슨 기능 있어?" 등의 메타 질문에 답변합니다.
   */
  public async getSystemCapabilities(): Promise<{
    success: boolean;
    message: string;
    capabilities: Array<{
      category: string;
      description: string;
      features: string[];
      examples: string[];
    }>;
  }> {
    console.log("ℹ️ 시스템 기능 설명");

    const capabilities = [
      {
        category: "🌤️ 날씨 조회",
        description: "현재 위치 또는 특정 지역의 날씨 정보를 제공합니다.",
        features: [
          "실시간 날씨 조회",
          "지역별 날씨 검색",
          "날씨 분석 및 조언",
          "기온, 습도, 체감온도 정보"
        ],
        examples: [
          "날씨 어때?",
          "서울 날씨 알려줘",
          "지금 기온은?"
        ]
      },
      {
        category: "🍽️ 음식 추천",
        description: "날씨, 요일, 배고픔 정도를 고려한 맞춤 음식 카테고리를 추천합니다.",
        features: [
          "날씨 기반 음식 추천",
          "요일별 선호도 분석",
          "배고픔 정도에 따른 맞춤 추천",
          "상위 2개 카테고리 + 맛집 정보 제공"
        ],
        examples: [
          "음식 추천해줘",
          "뭐 먹을까?",
          "배고픔 3, 대전"
        ]
      },
      {
        category: "📊 사용자 통계",
        description: "요일별 음식 선택 패턴을 분석하여 보여줍니다.",
        features: [
          "요일별 선택 통계",
          "자주 방문한 음식점 분석",
          "선호 카테고리 순위"
        ],
        examples: [
          "내 통계 보여줘",
          "월요일에 뭐 먹었어?",
          "선택 통계 알려줘"
        ]
      },
      {
        category: "🔍 맛집 검색",
        description: "주변 또는 특정 지역의 맛집을 검색합니다.",
        features: [
          "지역별 맛집 검색",
          "카테고리별 필터링",
          "주소, 전화번호 정보 제공"
        ],
        examples: [
          "주변 맛집 알려줘",
          "강남 한식집 어디야?",
          "대전 한밭대 근처 카페"
        ]
      },
      {
        category: "💾 학습 기능",
        description: "실제로 선택한 음식을 기록하여 추천 정확도를 높입니다.",
        features: [
          "음식 선택 기록",
          "요일별 선호도 학습",
          "개인화된 추천"
        ],
        examples: [
          "한식 먹었어",
          "치킨 골랐어",
          "교촌치킨 대전점에서 먹었어"
        ]
      }
    ];

    const formattedMessage = `
# 🤖 제가 할 수 있는 일들

안녕하세요! 저는 날씨와 음식 추천을 도와드리는 AI 어시스턴트입니다.

${capabilities.map(cap => `
## ${cap.category}
${cap.description}

**주요 기능:**
${cap.features.map(f => `- ${f}`).join('\n')}

**사용 예시:**
${cap.examples.map(e => `- "${e}"`).join('\n')}
`).join('\n')}

---

💡 **Tip**: 자연스럽게 말씀해주세요! 제가 의도를 파악해서 적절한 서비스를 제공해드릴게요.
`.trim();

    return {
      success: true,
      message: formattedMessage,
      capabilities
    };
  }

  /**
   * 대화 초기화 (디버깅/테스트용)
   *
   * @description
   * 특정 세션의 대화 상태를 초기화합니다.
   */
  public async resetConversation(input: {
    sessionId?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const sessionId = input.sessionId || 'default';
    this.conversationStates.delete(sessionId);

    console.log(`🔄 세션 ${sessionId} 초기화 완료`);

    return {
      success: true,
      message: "대화가 초기화되었습니다. 새로운 대화를 시작해보세요!"
    };
  }

  // ========== 유틸리티 메서드 ==========

  /**
   * 메시지에서 위치 정보 추출
   */
  private extractLocation(message: string): string | undefined {
    const locationKeywords = [
      '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
      '강남', '홍대', '신촌', '명동', '강남구', '서초구', '송파구',
      '한밭대', '충남대', '카이스트'
    ];

    for (const keyword of locationKeywords) {
      if (message.includes(keyword)) {
        return keyword;
      }
    }

    return undefined;
  }

  /**
   * 메시지에서 요일 추출
   */
  private extractDayOfWeek(message: string): string | undefined {
    const dayMap: { [key: string]: string } = {
      '일요일': 'Sunday', '월요일': 'Monday', '화요일': 'Tuesday',
      '수요일': 'Wednesday', '목요일': 'Thursday', '금요일': 'Friday', '토요일': 'Saturday',
      '일': 'Sunday', '월': 'Monday', '화': 'Tuesday',
      '수': 'Wednesday', '목': 'Thursday', '금': 'Friday', '토': 'Saturday'
    };

    for (const [kor, eng] of Object.entries(dayMap)) {
      if (message.includes(kor)) {
        return eng;
      }
    }

    return undefined;
  }

  /**
   * 메시지에서 음식 카테고리 추출
   */
  private extractFoodCategory(message: string): string | undefined {
    const categories = [
      // 기본 카테고리
      '한식', '중식', '일식', '양식', '분식',
      // 음식 종류
      '치킨', '피자', '햄버거', '샐러드', '디저트', '돈까스',
      '족발', '보쌈', '찜', '탕', '구이', '회', '스시', '초밥',
      '파스타', '스테이크', '타코', '멕시칸', '카레',
      '라면', '국밥', '찌개', '떡볶이', '김밥',
      '삼겹살', '갈비', '곱창', '막창',
      // 장소 유형
      '카페', '술집', '주점', '포차', '호프', 'bar', 'BAR',
      '베이커리', '빵집', '제과점',
      '뷔페', '부페',
    ];

    for (const category of categories) {
      if (message.toLowerCase().includes(category.toLowerCase())) {
        return category;
      }
    }

    return undefined;
  }

  /**
   * 메시지에서 음식점 이름 추출 (개선된 휴리스틱)
   */
  private extractRestaurantName(message: string): string | undefined {
    // 1. 브랜드 키워드 기반 추출
    const restaurantPattern = /([가-힣a-zA-Z0-9\s]+(?:치킨|떡볶이|식당|점|집|반점|횟집|회관|카페|버거|피자|찜닭|갈비|삼겹살|국밥|냉면|칼국수|돈까스|라면|쌀국수|포차|술집|BAR|bar))/i;
    const match = message.match(restaurantPattern);

    if (match) {
      return match[1].trim();
    }

    // 2. 유명 프랜차이즈 브랜드 직접 매칭
    const franchises = [
      '맥도날드', '버거킹', '롯데리아', 'KFC', '맘스터치', '파파존스',
      '교촌', '굽네', 'bhc', 'BBQ',
      '아웃백', '빕스', '애슐리', '계절밥상',
      '본죽', '죽이야기',
      '미스터피자', '도미노피자', '파파존스',
      '스타벅스', '투썸', '이디야', '커피빈', '탐앤탐스', '할리스',
      '맛찬들', '원조할매집', '백종원'
    ];

    for (const franchise of franchises) {
      if (message.includes(franchise)) {
        return franchise;
      }
    }

    // 3. 못 찾으면 undefined 반환
    return undefined;
  }

  /**
   * 메시지에 위치 키워드가 포함되어 있는지 확인
   */
  private containsLocationKeyword(message: string): boolean {
    const locationKeywords = ['서울', '부산', '대전', '대구', '인천', '광주', '강남', '홍대', '위치', '지역'];
    return locationKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * 사용자 메시지를 맛집 검색 쿼리로 변환
   *
   * @description
   * "서울 강남 맛집 알려줘" → "서울 강남 맛집"
   * "대전 유성구 한식 찾아줘" → "대전 유성구 한식"
   *
   * 요청 키워드만 제거하고 위치와 음식 종류는 모두 보존합니다.
   */
  private buildRestaurantSearchQuery(message: string): string {
    // 1. 불필요한 요청 키워드 제거
    const removePatterns = [
      /\s*알려줘$/,
      /\s*알려주세요$/,
      /\s*알려주$/,
      /\s*찾아줘$/,
      /\s*찾아주세요$/,
      /\s*찾아주$/,
      /\s*검색해줘$/,
      /\s*검색해주세요$/,
      /\s*검색$/,
      /\s*어디야\??$/,
      /\s*어디\??$/,
      /\s*있어\??$/,
      /\s*좀\s*/g,
      /\s*해줘$/,
      /\s*해주세요$/,
    ];

    let query = message.trim();
    for (const pattern of removePatterns) {
      query = query.replace(pattern, '');
    }

    // 2. "맛집", "식당", "음식점" 키워드가 없으면 "맛집" 추가
    const hasRestaurantKeyword =
      query.includes('맛집') ||
      query.includes('식당') ||
      query.includes('음식점') ||
      query.includes('카페') ||
      query.includes('레스토랑');

    if (!hasRestaurantKeyword) {
      query = `${query} 맛집`;
    }

    return query.trim();
  }

  /**
   * 음식 추천용 엔티티 추출 (배고픔 + 위치)
   */
  private extractFoodEntities(message: string): IntentAnalysis['entities'] {
    const entities: IntentAnalysis['entities'] = {};

    // 배고픔 레벨
    const hungerMatch = message.match(/\b([1-3])\b/);
    if (hungerMatch) {
      entities.hungerLevel = parseInt(hungerMatch[1]) as FullnessLevel;
    }

    // 위치
    entities.location = this.extractLocation(message);

    return entities;
  }
}

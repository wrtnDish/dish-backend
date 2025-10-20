import { Agentica } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import { WebSocketRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { HttpLlm, OpenApi } from "@samchon/openapi";
import OpenAI from "openai";
import { WebSocketAcceptor } from "tgrid";
import typia from "typia";

import { MyConfiguration } from "../../MyConfiguration";
import { MyGlobal } from "../../MyGlobal";
import { QuestionLogUtil } from "../../utils/QuestionLogUtil";
import { IntegratedFoodAgentController } from "./IntegratedFoodAgentController";
import { WeatherAgentController } from "./WeatherAgentController";


/**
 * AI 채팅 컨트롤러 with 통합 날씨-음식 추천 시스템
 *
 * @description
 * 사용자와 AI 모델 간의 실시간 채팅을 제공하는 WebSocket 기반 컨트롤러입니다.
 * OpenAI GPT-4o-mini 모델과 Agentica 프레임워크를 사용하여 구현되었으며,
 * 다음 세 가지 주요 기능이 Function Calling을 통해 통합되어 있습니다.
 *
 * **주요 기능:**
 * 1. **날씨 정보 조회** (WeatherService)
 *    - 위치 기반 실시간 날씨 조회
 *    - 좌표 변환 및 지역별 날씨 검색
 *    - 상황에 맞는 날씨 조언 제공
 *
 * 2. **포만감 기반 음식 추천** (FoodRecommendationService)
 *    - 포만감 레벨(1-3) 기반 추천
 *    - 시간대별 적절한 식사 제안
 *    - 개인 선호도 고려
 *
 * 3. **통합 날씨-음식 추천** (IntegratedFoodRecommendationService) ⭐
 *    - 날씨 조건 분석 → 적합한 음식 카테고리 도출
 *    - 포만감 상태 → 식사량 조절
 *    - 두 결과를 종합한 맞춤형 최종 추천
 *
 * **사용 예시:**
 * - "뭐 먹을까?" → 통합 추천 시스템 활성화
 * - "날씨 어때?" → 날씨 정보만 조회
 * - "배고파" → 포만감 기반 추천만 제공
 *
 * **연결 방법:**
 * ```javascript
 * const ws = new WebSocket('ws://localhost:37001/chat');
 * ```
 *
 * @tag Chat
 * @summary AI 채팅 서비스 with 통합 날씨-음식 추천
 */
@Controller("chat")
export class MyChatController {
  @WebSocketRoute()
  public async start(
    @WebSocketRoute.Acceptor()
    acceptor: WebSocketAcceptor<
      undefined,
      IAgenticaRpcService<"chatgpt">,
      IAgenticaRpcListener
    >,
  ): Promise<void> {
    // 날씨 기능을 제공하는 컨트롤러 인스턴스 생성
    const weatherController = new WeatherAgentController();

    // 통합 음식 추천 기능을 제공하는 컨트롤러 인스턴스 생성
    const integratedFoodController = new IntegratedFoodAgentController();

    // Typia를 사용하여 각 컨트롤러의 LLM Application 스키마 생성
    const weatherApplication = typia.llm.application<
      WeatherAgentController,
      "chatgpt"
    >();

    const integratedFoodApplication = typia.llm.application<
      IntegratedFoodAgentController,
      "chatgpt"
    >();

    // Agentica AI 에이전트 생성 및 날씨, 음식 추천 기능 통합
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({
          apiKey: MyGlobal.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        }),
        model: "gpt-4o-mini",
      },
      // AI 모델이 사용할 수 있는 함수들을 등록
      controllers: [
        {
          protocol: "class",
          name: "WeatherService",
          application: weatherApplication,
          execute: weatherController, // WeatherAgentController 인스턴스를 실행자로 설정
        },
        {
          protocol: "class",
          name: "FoodRecommendationService",
          application: integratedFoodApplication,
          execute: integratedFoodController, // 통합 음식 추천 (날씨 + 포만감 + 히스토리)
        },
        {
          protocol: "http",
          name: "restaurant", // CALL THIS when users ask about restaurants/food in Korea
          application: HttpLlm.application({
            model: "chatgpt",
            document: OpenApi.convert(
              await fetch(
                `http://localhost:${MyConfiguration.API_PORT()}/editor/swagger.json`,
              ).then((r) => r.json()),
            ),
          }),
          connection: {
            host: `http://localhost:${MyConfiguration.API_PORT()}`,
          },
        },
      ],
      config: {
        locale: "ko-KR",
        timezone: "Asia/Seoul",
      },
    });

    // 원래 conversate 메서드를 감싸서 질문 로깅 기능 및 위치 정보 확인
    const originalConversate = agent.conversate.bind(agent);
    agent.conversate = async (message: string) => {
      try {
        // 사용자 질문을 JSON 파일에 저장
        await QuestionLogUtil.saveQuestion(message);
      } catch (error) {
        console.error("질문 저장 중 오류 발생:", error);
      }

      // 메시지에서 실제 사용자 텍스트와 위치 정보 추출
      let userMessage = message;
      let locationInfo = null;

      try {
        const parsed = JSON.parse(message);
        if (parsed.message) {
          userMessage = parsed.message;
        }

        // 위치 정보 추출
        if (parsed.location) {
          locationInfo = parsed.location;
        }
      } catch {
        // JSON이 아닌 경우 그대로 사용
      }

      // 사용자에게는 원본 메시지만 전송 (내부 로직 절대 노출 금지)
      return await originalConversate(userMessage);
    };

    // RPC 서비스 생성 및 연결
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });

    await acceptor.accept(service);
  }
}

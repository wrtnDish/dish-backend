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
import { WeatherAgentController } from "./WeatherAgentController";
import { FoodAgentController } from "./FoodAgentController";

/**
 * AI 채팅 컨트롤러 with Weather API 및 Food Recommendation 통합
 *
 * @description
 * 사용자와 AI 모델 간의 실시간 채팅을 제공하는 WebSocket 기반 컨트롤러입니다.
 * OpenAI GPT-4o-mini 모델과 Agentica 프레임워크를 사용하여 구현되었으며,
 * 날씨 정보 조회 기능과 음식 추천 기능이 Function Calling을 통해 통합되어 있습니다.
 *
 * **주요 기능:**
 * - 실시간 AI 채팅 (WebSocket 기반)
 * - 날씨 정보 조회 (Function Calling)
 * - 음식 추천 (포만감 기반)
 * - 좌표 변환 및 지역별 날씨 검색
 * - 상황에 맞는 날씨 조언 제공
 * - 포만감 상태 분석 및 음식 조언
 *
 * **연결 방법:**
 * ```javascript
 * const ws = new WebSocket('ws://localhost:37001/chat');
 * ```
 *
 * @tag Chat
 * @summary AI 채팅 서비스 with Weather API & Food Recommendation
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

    // 음식 추천 기능을 제공하는 컨트롤러 인스턴스 생성
    const foodController = new FoodAgentController();

    // Typia를 사용하여 각 컨트롤러의 LLM Application 스키마 생성
    const weatherApplication = typia.llm.application<
      WeatherAgentController,
      "chatgpt"
    >();

    const foodApplication = typia.llm.application<
      FoodAgentController,
      "chatgpt"
    >();
    
    // Agentica AI 에이전트 생성 및 날씨, 음식 추천 기능 통합
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({
          apiKey: MyGlobal.env.OPENAI_API_KEY,
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
          application: foodApplication,
          execute: foodController, // FoodAgentController 인스턴스를 실행자로 설정
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

    // 원래 conversate 메서드를 감싸서 질문 로깅 기능 추가
    const originalConversate = agent.conversate.bind(agent);
    agent.conversate = async (message: string) => {
      try {
        // 사용자 질문을 JSON 파일에 저장
        await QuestionLogUtil.saveQuestion(message);
      } catch (error) {
        console.error("질문 저장 중 오류 발생:", error);
      }

      // 원래 conversate 메서드 실행
      return await originalConversate(message);
    };

    // RPC 서비스 생성 및 연결
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });

    await acceptor.accept(service);
  }
}

import { Agentica } from "@agentica/core";
import { AgenticaRpcService, IAgenticaRpcListener, IAgenticaRpcService } from "@agentica/rpc";
import { WebSocketRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import OpenAI from "openai";
import { WebSocketAcceptor } from "tgrid";
import typia from "typia";

import { MyGlobal } from "../../MyGlobal";
import { QuestionLogUtil } from "../../utils/QuestionLogUtil";
import { OrchestratorAgentController } from "./OrchestratorAgentController";


/**
 * AI 채팅 컨트롤러 with 스마트 오케스트레이터
 *
 * @description
 * 사용자와 AI 모델 간의 실시간 채팅을 제공하는 WebSocket 기반 컨트롤러입니다.
 * OpenAI GPT-4o-mini 모델과 Agentica 프레임워크를 사용하여 구현되었으며,
 * **스마트 오케스트레이터 패턴**을 통해 의도를 분석하고 적절한 서비스로 라우팅합니다.
 *
 * **주요 개선사항:**
 * 1. **단일 진입점**: 21개 함수 → 1개 오케스트레이터로 단순화
 * 2. **의도 분석**: 사용자 메시지를 분석하여 적절한 서비스 자동 선택
 * 3. **컨텍스트 관리**: 대화 상태를 추적하여 중복 정보 제공 방지
 * 4. **메타 질문 처리**: "너 뭐할 수 있어?" 같은 시스템 질문 지원
 *
 * **제공 기능:**
 * 1. **날씨 조회** - 실시간 날씨, 지역별 날씨, 날씨 분석
 * 2. **음식 추천** - 날씨+요일+배고픔 기반 맞춤 추천
 * 3. **맛집 검색** - 주변 또는 특정 지역 맛집 검색
 * 4. **사용자 통계** - 요일별 음식 선택 패턴 분석
 * 5. **학습 기능** - 실제 선택 기록으로 추천 정확도 향상
 *
 * **사용 예시:**
 * - "날씨 어때?" → 날씨 조회
 * - "음식 추천해줘" → 통합 추천
 * - "주변 맛집" → 맛집 검색
 * - "너 뭐할 수 있어?" → 시스템 기능 설명
 *
 * **연결 방법:**
 * ```javascript
 * const ws = new WebSocket('ws://localhost:37001/chat');
 * ```
 *
 * @tag Chat
 * @summary AI 채팅 서비스 with 스마트 오케스트레이터
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
    // 스마트 오케스트레이터 컨트롤러 인스턴스 생성
    const orchestratorController = new OrchestratorAgentController();

    // Typia를 사용하여 오케스트레이터의 LLM Application 스키마 생성
    const orchestratorApplication = typia.llm.application<
      OrchestratorAgentController,
      "chatgpt"
    >();

    // Agentica AI 에이전트 생성 with 스마트 오케스트레이터
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({
          apiKey: MyGlobal.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        }),
        model: "gpt-4o-mini",
      },
      // 단일 오케스트레이터만 등록 (21개 함수 → 1개 컨트롤러)
      controllers: [
        {
          protocol: "class",
          name: "SmartAssistant",
          application: orchestratorApplication,
          execute: orchestratorController,
        },
      ],
      config: {
        locale: "ko-KR",
        timezone: "Asia/Seoul",
      },
    });

    // 원래 conversate 메서드를 감싸서 질문 로깅
    const originalConversate = agent.conversate.bind(agent);
    agent.conversate = async (message: string) => {
      try {
        // 사용자 질문을 JSON 파일에 저장
        await QuestionLogUtil.saveQuestion(message);
      } catch (error) {
        console.error("질문 저장 중 오류 발생:", error);
      }

      // Orchestrator가 JSON 파싱 및 위치 정보 처리를 담당하므로
      // 여기서는 원본 메시지를 그대로 전달
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

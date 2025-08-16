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
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({
          apiKey: MyGlobal.env.OPENAI_API_KEY,
          baseURL: "https://openrouter.ai/api/v1"
        }),
        model: "gpt-4o-mini",
      },
      controllers: [
      ],
    });

    // 원래 conversate 메서드를 감싸서 질문 로깅 기능 추가
    const originalConversate = agent.conversate.bind(agent);
    agent.conversate = async (message: string) => {
      try {
        // 사용자 질문을 JSON 파일에 저장
        await QuestionLogUtil.saveQuestion(message);
      } catch (error) {
        console.error('질문 저장 중 오류 발생:', error);
      }

      // 원래 conversate 메서드 실행
      return await originalConversate(message);
    };

    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });
    await acceptor.accept(service);
  }
}

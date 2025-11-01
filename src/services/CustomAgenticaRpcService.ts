import { Agentica, IAgenticaController } from "@agentica/core";
import { IAgenticaRpcListener, IAgenticaRpcService } from "@agentica/rpc";
import { ILlmSchema } from "@samchon/openapi";

/**
 * 확장된 RPC 리스너: 스트리밍 청크 이벤트 추가
 */
export interface IExtendedAgenticaRpcListener extends IAgenticaRpcListener {
  /**
   * Assistant 메시지의 스트리밍 청크
   * @param chunk 텍스트 청크
   */
  assistantMessageChunk?: (chunk: string) => Promise<void>;
}

/**
 * 스트리밍을 지원하는 커스텀 Agentica RPC 서비스
 *
 * @description
 * 기본 AgenticaRpcService는 메시지가 완전히 생성된 후에만 전송하지만,
 * 이 서비스는 OpenAI의 스트리밍 청크를 실시간으로 클라이언트에 전달합니다.
 */
export class CustomAgenticaRpcService<Model extends ILlmSchema.Model>
  implements IAgenticaRpcService<Model>
{
  constructor(
    private readonly props: {
      agent: Agentica<Model>;
      listener: IExtendedAgenticaRpcListener;
    },
  ) {
    const { agent, listener } = props;

    // 사용자 메시지 이벤트
    agent.on("userMessage", async (event) => {
      listener.userMessage?.(event.toJSON()).catch(() => {});
    });

    // Response 이벤트 - OpenAI raw stream에서 직접 스트리밍
    let isStreaming = false;
    agent.on("response", async (evt) => {
      if (!listener.assistantMessageChunk) {
        return;
      }

      isStreaming = true;

      try {
        for await (const openaiChunk of evt.stream) {
          const delta = openaiChunk.choices[0]?.delta?.content;

          if (delta !== null && delta !== undefined && delta !== "") {
            await listener.assistantMessageChunk(delta);
          }
        }
      } catch (error) {
        console.error("스트리밍 오류:", error);
      } finally {
        isStreaming = false;
      }
    });

    // Assistant 메시지 이벤트 - 최종 완성된 메시지
    agent.on("assistantMessage", async (evt) => {
      // 스트리밍이 진행 중이면 완료될 때까지 대기
      while (isStreaming) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      listener.assistantMessage(evt.toJSON()).catch(() => {});
    });

    // Describe 이벤트 - function calling 결과 설명
    agent.on("describe", async (evt) => {
      // 스트리밍이 진행 중이면 완료될 때까지 대기
      while (isStreaming) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      listener.describe(evt.toJSON()).catch(() => {});
    });

    // 선택적 리스너들
    agent.on("initialize", async (evt) => {
      listener.initialize?.(evt.toJSON()).catch(() => {});
    });

    agent.on("select", async (evt) => {
      listener.select?.(evt.toJSON()).catch(() => {});
    });

    agent.on("cancel", async (evt) => {
      listener.cancel?.(evt.toJSON()).catch(() => {});
    });

    agent.on("call", async (evt) => {
      const args = await listener.call?.(evt.toJSON());
      if (args != null) {
        evt.arguments = args;
      }
    });

    agent.on("execute", async (evt) => {
      listener.execute?.(evt.toJSON()).catch(() => {});
    });
  }

  async conversate(
    content: string | Parameters<typeof Agentica.prototype.conversate>[0],
  ): Promise<void> {
    await this.props.agent.conversate(content);
  }

  async getControllers(): Promise<IAgenticaController<Model>[]> {
    // readonly 배열을 mutable 배열로 변환
    return [...this.props.agent.getControllers()];
  }
}

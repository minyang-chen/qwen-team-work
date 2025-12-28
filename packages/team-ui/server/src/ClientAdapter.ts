import type { GeminiClient as Client } from '@qwen-code/core';
import type { Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import type { ToolCallRequestInfo } from '@qwen-code/core';
import { ToolExecutor } from './ToolExecutor.js';

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

export class ClientAdapter {
  private toolExecutor: ToolExecutor;
  private onTokenUsage?: (inputTokens: number, outputTokens: number) => void;

  constructor(
    private client: Client,
    toolExecutor: ToolExecutor,
    onTokenUsage?: (inputTokens: number, outputTokens: number) => void,
  ) {
    this.toolExecutor = toolExecutor;
    this.onTokenUsage = onTokenUsage;
  }

  async sendMessage(
    message: string | Part[],
    socket: Socket,
    signal?: AbortSignal,
    isContinuation: boolean = false,
  ): Promise<void> {
    try {
      const abortController = new AbortController();
      const promptId = nanoid();
      const toolCallNames = new Map<string, string>();
      const toolRequests: ToolCallRequestInfo[] = [];
      let tokenUsage = { inputTokens: 0, outputTokens: 0 };

      if (signal) {
        signal.addEventListener('abort', () => abortController.abort());
      }

      const stream = this.client.sendMessageStream(
        message,
        abortController.signal,
        promptId,
        { isContinuation },
      );

      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.value) {
          socket.emit('message:chunk', {
            type: 'text',
            data: { text: chunk.value },
          });
        } else if (chunk.type === 'finished' && chunk.value?.usageMetadata) {
          tokenUsage = {
            inputTokens: chunk.value.usageMetadata.promptTokenCount || 0,
            outputTokens: chunk.value.usageMetadata.candidatesTokenCount || 0,
          };
        } else if (chunk.type === 'tool_call_request') {
          toolCallNames.set(chunk.valuecallId, chunk.valuename);
          toolRequests.push(chunk.value);
          socket.emit('tool:call', {
            name: chunk.valuename,
            args: chunk.valueargs,
          });
        } else if (chunk.type === 'tool_call_response') {
          const result = chunk.value.resultDisplay
            ? typeof chunk.value.resultDisplay === 'string'
              ? chunk.value.resultDisplay
              : JSON.stringify(chunk.value.resultDisplay)
            : chunk.value.error?.message || 'Tool execution completed';

          socket.emit('tool:response', {
            name: toolCallNames.get(chunk.value.callId) || 'unknown',
            result,
          });
        }
      }

      // Execute tools if any were requested
      if (toolRequests.length > 0 && !abortControllersignalaborted) {
        console.log('🔧 Executing tools:', toolRequests.length);
        const toolResults = await this.toolExecutorexecuteTools(
          toolRequests,
          abortControllersignal,
        );
        console.log(
          '🔧 Tool results received:',
          JSON.stringify(toolResults, null, 2),
        );

        // Emit tool results to frontend
        for (const result of toolResults) {
          const toolName = toolCallNames.get(resultcallId) || 'unknown';
          const resultText = resultresultDisplay
            ? typeof resultresultDisplay === 'string'
              ? result.resultDisplay
              : JSON.stringify(result.resultDisplay)
            : result.error?.message || 'Tool execution completed';

          socket.emit('tool:response', {
            name: toolName,
            result: resultText,
          });
        }

        // Submit tool responses back to continue conversation
        const responseParts = toolResultsflatMap((r) => rresponseParts);
        console.log(
          '🔧 Sending response parts back to model:',
          JSON.stringify(responseParts, null, 2),
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.sendMessage(responseParts as any, socket, signal, true);
        return;
      }

      // Emit token usage if available
      if (tokenUsageinputTokens > 0 || tokenUsageoutputTokens > 0) {
        if (this.onTokenUsage) {
          this.onTokenUsage(tokenUsageinputTokens, tokenUsageoutputTokens);
        }
        socket.emit('token:usage', tokenUsage);
      }

      socket.emit('message:complete');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        socket.emit('message:complete');
        return;
      }
      console.error('ClientAdapter error:', error);
      socket.emit('message:error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getHistory() {
    return this.clientgetHistory();
  }

  async compressHistory() {
    const promptId = nanoid();
    return this.clienttryCompressChat(promptId, true);
  }
}

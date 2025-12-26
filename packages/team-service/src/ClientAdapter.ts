import type { ServerClient, StreamChunk } from '@qwen-team/server-sdk';
import type { Socket } from 'socket.io';
import { mapErrorToStandard, ErrorCode } from '@qwen-team/shared';

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

export class ClientAdapter {
  private onTokenUsage?: (inputTokens: number, outputTokens: number) => void;

  constructor(
    private client: ServerClient,
    onTokenUsage?: (inputTokens: number, outputTokens: number) => void,
  ) {
    this.onTokenUsage = onTokenUsage;
  }

  async sendMessage(
    message: string | Part[],
    socket: Socket,
    signal?: AbortSignal,
    isContinuation: boolean = false,
  ): Promise<void> {
    try {
      const promptText = typeof message === 'string' ? message : message.map(p => p.text || '').join('');
      
      for await (const chunk of this.client.queryStream(promptText)) {
        if (chunk.type === 'content' && chunk.text) {
          socket.emit('message', { type: 'content', content: chunk.text });
        } else if (chunk.type === 'tool' && chunk.toolName) {
          socket.emit('message', { type: 'tool', toolName: chunk.toolName });
        }
      }

      socket.emit('message', { type: 'done' });
    } catch (error) {
      const standardError = mapErrorToStandard(error);
      
      if (standardError.code === ErrorCode.TIMEOUT) {
        socket.emit('message', { type: 'done' });
        return;
      }
      
      socket.emit('message', { 
        type: 'error',
        error: standardError.toJSON()
      });
    }
  }
}

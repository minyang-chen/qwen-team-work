import type { ServerConfig, QueryResult, StreamChunk } from '@qwen-team/server-sdk';
import { StandardError, ErrorCode, mapErrorToStandard } from '@qwen-team/shared';

export interface AcpMessage {
  id: string;
  type: string;
  payload: {
    content: string;
    sessionId: string;
    streaming?: boolean;
    model?: string;
    temperature?: number;
  };
  timestamp: number;
}

export interface AcpResponse {
  id: string;
  success: boolean;
  data?: {
    content: string;
    usage?: { input: number; output: number; total: number };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export class ProtocolTranslator {
  acpToSdk(message: AcpMessage): { prompt: string; config: Partial<ServerConfig> } {
    // Handle different message structures - actual messages use 'data' field
    const messageData = (message as any).data || message.payload;
    const content = messageData?.message || messageData?.content;
    
    if (!content) {
      throw new Error(`No content found in message. Data: ${JSON.stringify(messageData)}`);
    }
    
    return {
      prompt: content,
      config: {
        sessionId: messageData.sessionId,
        model: messageData.model,
      },
    };
  }

  sdkToAcp(result: QueryResult, messageId: string): AcpResponse {
    return {
      id: messageId,
      success: true,
      data: {
        content: result.text,
        usage: result.usage,
      },
      timestamp: Date.now(),
    };
  }

  streamChunkToAcp(chunk: StreamChunk): { type: string; content?: string; toolName?: string } {
    if (chunk.type === 'content') {
      return { type: 'content', content: chunk.text };
    } else if (chunk.type === 'tool') {
      return { type: 'tool', toolName: chunk.toolName };
    }
    return { type: 'finished' };
  }

  errorToAcp(error: unknown, messageId: string): AcpResponse {
    const standardError = mapErrorToStandard(error);
    return {
      id: messageId,
      success: false,
      error: standardError.toJSON(),
      timestamp: Date.now(),
    };
  }
}

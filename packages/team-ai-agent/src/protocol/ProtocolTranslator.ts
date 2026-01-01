import type { EnhancedServerConfig, EnhancedQueryResult, EnhancedStreamChunk } from '@qwen-team/server-sdk';
import { StandardError, ErrorCode, mapErrorToStandard } from '@qwen-team/shared';

export interface AcpMessage {
  id: string;
  type: string;
  data?: any;
}

export interface AcpResponse {
  id: string;
  success: boolean;
  timestamp: number;
  type: string;
  content?: string;
  toolName?: string;
}

export class ProtocolTranslator {
  acpToSdk(message: AcpMessage): { prompt: string; config?: EnhancedServerConfig } {
    return {
      prompt: message.data?.message || message.data?.prompt || '',
      config: message.data?.config
    };
  }

  sdkToAcp(result: EnhancedQueryResult, messageId: string): AcpResponse {
    return {
      id: messageId,
      success: true,
      timestamp: Date.now(),
      type: 'response',
      content: result.text
    };
  }

  streamToAcp(chunk: EnhancedStreamChunk, messageId: string): AcpResponse {
    return {
      id: messageId,
      success: true,
      timestamp: Date.now(),
      type: chunk.type,
      content: chunk.type === 'content' ? chunk.text : undefined,
      toolName: chunk.type === 'tool' ? chunk.toolName : undefined
    };
  }

  streamChunkToAcp(chunk: EnhancedStreamChunk, messageId: string): AcpResponse {
    return this.streamToAcp(chunk, messageId);
  }

  errorToAcp(error: Error, messageId: string): AcpResponse {
    return {
      id: messageId,
      success: false,
      timestamp: Date.now(),
      type: 'error',
      content: error.message
    };
  }
}

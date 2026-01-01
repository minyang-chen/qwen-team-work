import { ServerClient, EnhancedServerConfig, EnhancedQueryResult } from '@qwen-team/server-sdk';
import { Config } from '@qwen-team/server-sdk';
import { AdvancedSessionManager } from '../session/AdvancedSessionManager.js';

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

export class EnhancedChatHandler {
  private sessionManager: AdvancedSessionManager;
  private serverClient: ServerClient;

  constructor(config: EnhancedServerConfig) {
    this.sessionManager = new AdvancedSessionManager();
    this.serverClient = new ServerClient(config);
  }

  async initialize(): Promise<void> {
    await this.serverClient.initialize();
  }

  async handleMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      const result = await this.serverClient.query(message.data.prompt || '');
      
      return {
        id: message.id,
        success: true,
        timestamp: Date.now(),
        type: 'response',
        content: result.text
      };
    } catch (error) {
      return {
        id: message.id,
        success: false,
        timestamp: Date.now(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async *handleStreamingMessage(message: AcpMessage): AsyncGenerator<AcpResponse, void, unknown> {
    try {
      const stream = this.serverClient.queryStream(message.data.prompt || '');
      
      for await (const chunk of stream) {
        yield {
          id: message.id,
          success: true,
          timestamp: Date.now(),
          type: chunk.type,
          content: chunk.type === 'content' ? chunk.text : undefined,
          toolName: chunk.type === 'tool' ? chunk.toolName : undefined
        };
      }
    } catch (error) {
      yield {
        id: message.id,
        success: false,
        timestamp: Date.now(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanup(): Promise<void> {
    await this.serverClient.cleanup();
  }
}

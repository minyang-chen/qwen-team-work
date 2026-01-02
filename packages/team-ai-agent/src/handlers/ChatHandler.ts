import { ServerClient, EnhancedServerConfig } from '../server/index.js';
import { ProtocolTranslator, AcpMessage, AcpResponse } from '../protocol/ProtocolTranslator.js';

export class ChatHandler {
  private client: ServerClient;
  private translator: ProtocolTranslator;

  constructor(config: EnhancedServerConfig) {
    this.client = new ServerClient(config);
    this.translator = new ProtocolTranslator();
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  async handleMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { prompt } = this.translator.acpToSdk(message);
      const result = await this.client.query(prompt);
      return this.translator.sdkToAcp(result, message.id);
    } catch (error) {
      return this.translator.errorToAcp(
        error instanceof Error ? error : new Error('Unknown error'),
        message.id
      );
    }
  }

  async *handleStreamingMessage(message: AcpMessage): AsyncGenerator<AcpResponse> {
    try {
      const { prompt } = this.translator.acpToSdk(message);
      const stream = this.client.queryStream(prompt);
      
      for await (const chunk of stream) {
        yield this.translator.streamChunkToAcp(chunk, message.id);
      }
    } catch (error) {
      yield this.translator.errorToAcp(
        error instanceof Error ? error : new Error('Unknown error'),
        message.id
      );
    }
  }

  async cleanup(): Promise<void> {
    await this.client.cleanup();
  }
}

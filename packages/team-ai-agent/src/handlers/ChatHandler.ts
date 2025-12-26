import { ServerClient } from '@qwen-team/server-sdk';
import { ProtocolTranslator, AcpMessage, AcpResponse } from '../protocol/ProtocolTranslator.js';
import { mapErrorToStandard } from '@qwen-team/shared';

export class ChatHandler {
  private translator = new ProtocolTranslator();

  constructor(private client: ServerClient) {}

  async handleChatMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { prompt } = this.translator.acpToSdk(message);
      const result = await this.client.query(prompt);
      return this.translator.sdkToAcp(result, message.id);
    } catch (error) {
      return this.translator.errorToAcp(error, message.id);
    }
  }

  async handleStreamingChat(message: AcpMessage, onChunk: (data: any) => void): Promise<AcpResponse> {
    try {
      const { prompt } = this.translator.acpToSdk(message);
      
      for await (const chunk of this.client.queryStream(prompt)) {
        onChunk(this.translator.streamChunkToAcp(chunk));
      }
      
      return {
        id: message.id,
        success: true,
        data: { content: 'Stream complete' },
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.translator.errorToAcp(error, message.id);
    }
  }
}

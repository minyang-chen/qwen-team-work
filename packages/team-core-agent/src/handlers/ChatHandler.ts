import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { CoreAdapter } from '../adapters/CoreAdapter';
import { ResponseBuilder } from '../protocol/ResponseBuilder';
import { ErrorHandler } from '../protocol/ErrorHandler';
import { RetryHandler } from '../protocol/RetryHandler';

export class ChatHandler {
  private retryHandler = new RetryHandler();

  constructor(
    private coreAdapter: CoreAdapter,
    private responseBuilder: ResponseBuilder,
    private errorHandler: ErrorHandler
  ) {}

  async handleChatMessage(message: AcpMessage): Promise<AcpResponse> {
    console.log('ChatHandler: Processing message:', message.data.content);
    
    try {
      const response = await this.retryHandler.executeWithRetry(
        () => this.coreAdapter.processMessage(
          message.data.content,
          message.data.sessionId
        )
      );
      
      console.log('ChatHandler: Got response:', response);
      console.log('Response analysis - has <|end|>:', response.includes('<|end|>'));
      console.log('Content after <|end|>:', response.split('<|end|>')[1] || 'NONE');
      return this.responseBuilder.createSuccessResponse(message.id, { content: response });
    } catch (error) {
      console.error('ChatHandler: Error processing message:', error);
      return this.errorHandler.createErrorResponse(
        message.id,
        'CHAT_ERROR',
        'Failed to process chat message',
        error
      );
    }
  }

  async handleStreamingChat(message: AcpMessage, onChunk: (chunk: string) => void): Promise<AcpResponse> {
    console.log('ChatHandler: Processing streaming message:', message.data.content);
    
    try {
      await this.coreAdapter.processMessageStream(
        message.data.content,
        message.data.sessionId,
        (chunk: string) => {
          console.log('ChatHandler streaming chunk:', chunk.substring(0, 100) + '...');
          onChunk(chunk);
        }
      );
      
      return this.responseBuilder.createSuccessResponse(message.id, { content: 'Stream complete' });
    } catch (error) {
      console.error('ChatHandler streaming error:', error);
      return this.errorHandler.createErrorResponse(
        message.id,
        'STREAMING_ERROR',
        'Failed to process streaming message',
        error
      );
    }
  }
}

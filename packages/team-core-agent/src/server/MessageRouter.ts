import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { ChatHandler } from '../handlers/ChatHandler';
import { SessionHandler } from '../handlers/SessionHandler';
import { ToolHandler } from '../handlers/ToolHandler';
import { UserSessionManager } from '../session/UserSessionManager';
import { CoreAdapter } from '../adapters/CoreAdapter';
import { ResponseBuilder } from '../protocol/ResponseBuilder';
import { ErrorHandler } from '../protocol/ErrorHandler';

export class MessageRouter {
  private chatHandler: ChatHandler;
  private sessionHandler: SessionHandler;
  private toolHandler: ToolHandler;
  private responseBuilder: ResponseBuilder;
  private errorHandler: ErrorHandler;

  constructor(sessionManager: UserSessionManager) {
    // Create CoreAdapter with UserSessionManager
    const coreAdapter = new CoreAdapter(sessionManager);
    
    this.responseBuilder = new ResponseBuilder();
    this.errorHandler = new ErrorHandler();
    this.chatHandler = new ChatHandler(coreAdapter, this.responseBuilder, this.errorHandler);
    this.sessionHandler = new SessionHandler(sessionManager, this.responseBuilder, this.errorHandler);
    this.toolHandler = new ToolHandler(this.responseBuilder, this.errorHandler);
  }

  async routeMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      switch (message.type) {
        case 'chat':
          return await this.chatHandler.handleChatMessage(message);
        case 'session':
          return await this.sessionHandler.handleSessionMessage(message);
        case 'tool':
          return await this.toolHandler.handleToolExecution(message);
        case 'ping':
          return this.handlePing(message);
        default:
          return this.errorHandler.createErrorResponse(
            message.id,
            'UNKNOWN_MESSAGE_TYPE',
            `Unknown message type: ${message.type}`
          );
      }
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'ROUTING_ERROR',
        'Failed to route message',
        error
      );
    }
  }

  private handlePing(message: AcpMessage): AcpResponse {
    return this.responseBuilder.createSuccessResponse(message.id, { 
      pong: true, 
      timestamp: Date.now() 
    });
  }
}

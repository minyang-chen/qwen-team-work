import { AcpMessage, AcpResponse } from '@qwen-team/shared';
import { ServerClient } from '@qwen-team/server-sdk';
import { ChatHandler } from '../handlers/ChatHandler.js';
import { SessionHandler } from '../handlers/SessionHandler.js';
import { ToolHandler } from '../handlers/ToolHandler.js';
import { UserSessionManager } from '../session/UserSessionManager.js';
import { ResponseBuilder } from '../protocol/ResponseBuilder.js';
import { ErrorHandler } from '../protocol/ErrorHandler.js';
import { ProtocolTranslator } from '../protocol/ProtocolTranslator.js';
import * as config from '../config/env.js';

export class MessageRouter {
  private chatHandler?: ChatHandler;
  private sessionHandler: SessionHandler;
  private toolHandler: ToolHandler;
  private responseBuilder: ResponseBuilder;
  private errorHandler: ErrorHandler;
  private translator: ProtocolTranslator;

  constructor(sessionManager: UserSessionManager, serverClient: ServerClient | null) {
    this.responseBuilder = new ResponseBuilder();
    this.errorHandler = new ErrorHandler();
    this.translator = new ProtocolTranslator();
    this.sessionHandler = new SessionHandler(sessionManager, this.responseBuilder, this.errorHandler);
    this.toolHandler = new ToolHandler(this.responseBuilder, this.errorHandler, undefined);
    // ChatHandler will be created per-message with user's ServerClient
  }

  async routeMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      // Handle both old format (session.create) and new format (session with action)
      const messageType = message.type.includes('.') ? message.type.split('.')[0] : message.type;
      const action = message.type.includes('.') ? message.type.split('.')[1] : message.data?.action;
      
      // Normalize message format
      const normalizedMessage: AcpMessage = {
        ...message,
        type: messageType || message.type,
        data: {
          ...message.data,
          action: action || message.data?.action
        }
      };

      switch (normalizedMessage.type) {
        case 'chat':
          // Get user's ServerClient from session
          const userId = normalizedMessage.data?.userId;
          if (!userId) {
            return this.errorHandler.createErrorResponse(
              message.id,
              'MISSING_USER_ID',
              'User ID is required for chat messages'
            );
          }
          
          const sessionData = this.sessionHandler.getUserSession(userId);
          if (!sessionData?.client) {
            return this.errorHandler.createErrorResponse(
              message.id,
              'NO_SESSION',
              'No active session found for user'
            );
          }
          
          // Use user's ServerClient for chat
          const { prompt } = this.translator.acpToSdk(normalizedMessage);
          const result = await sessionData.client.query(prompt);
          return this.translator.sdkToAcp(result, message.id);
          
        case 'session':
          return await this.sessionHandler.handleSessionMessage(normalizedMessage);
        case 'tool':
        case 'tools':
          return await this.toolHandler.handleToolExecution(normalizedMessage);
        case 'ping':
          return this.handlePing(normalizedMessage);
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

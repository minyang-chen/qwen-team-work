import { AcpMessage, AcpResponse } from '@qwen-team/shared';
import { UserSessionManager } from '../session/UserSessionManager.js';
import { ResponseBuilder } from '../protocol/ResponseBuilder.js';
import { ErrorHandler } from '../protocol/ErrorHandler.js';

export class SessionHandler {
  constructor(
    private sessionManager: UserSessionManager,
    private responseBuilder: ResponseBuilder,
    private errorHandler: ErrorHandler
  ) {}

  async handleSessionMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      switch (message.data.action) {
        case 'create':
          return await this.createSession(message);
        case 'get':
          return await this.getSession(message);
        case 'delete':
          return await this.deleteSession(message);
        default:
          return this.errorHandler.createErrorResponse(
            message.id,
            'INVALID_ACTION',
            `Unknown session action: ${message.data.action}`
          );
      }
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'SESSION_ERROR',
        'Failed to handle session message',
        error
      );
    }
  }

  private async createSession(message: AcpMessage): Promise<AcpResponse> {
    const { sessionId, userId } = message.data;
    const session = this.sessionManager.createSession(sessionId, userId);
    return this.responseBuilder.createSuccessResponse(message.id, { session });
  }

  private async getSession(message: AcpMessage): Promise<AcpResponse> {
    const session = this.sessionManager.getUserSession(message.data.sessionId);
    if (!session) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'SESSION_NOT_FOUND',
        'Session not found'
      );
    }
    return this.responseBuilder.createSuccessResponse(message.id, { session });
  }

  private async deleteSession(message: AcpMessage): Promise<AcpResponse> {
    this.sessionManager.deleteSession(message.data.sessionId);
    return this.responseBuilder.createSuccessResponse(message.id, { deleted: true });
  }
}

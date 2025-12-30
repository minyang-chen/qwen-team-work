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
        case 'getStats':
          return await this.getSessionStats(message);
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
    const { userId, credentials, workingDirectory } = message.data;
    console.log(`[SessionHandler] Creating session for user ${userId} with workingDirectory: ${workingDirectory}`);
    
    const sessionId = await this.sessionManager.createSession(userId, credentials, workingDirectory);
    return this.responseBuilder.createSuccessResponse(message.id, { 
      session: { sessionId, userId } 
    });
  }

  private async getSession(message: AcpMessage): Promise<AcpResponse> {
    const session = this.sessionManager.getUserSession(message.data.userId);
    if (!session) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'SESSION_NOT_FOUND',
        'Session not found'
      );
    }
    return this.responseBuilder.createSuccessResponse(message.id, { 
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        createdAt: session.metadata.createdAt,
        lastActivity: session.metadata.lastActivity
      }
    });
  }

  private async deleteSession(message: AcpMessage): Promise<AcpResponse> {
    this.sessionManager.deleteSession(message.data.sessionId);
    return this.responseBuilder.createSuccessResponse(message.id, { deleted: true });
  }

  private async getSessionStats(message: AcpMessage): Promise<AcpResponse> {
    const { sessionId, userId } = message.data;
    
    // Try to find session by sessionId first, then by userId
    let session = sessionId ? this.sessionManager.getSessionById(sessionId) : null;
    if (!session && userId) {
      session = this.sessionManager.getUserSession(userId);
    }
    
    if (!session) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'SESSION_NOT_FOUND',
        'Session not found'
      );
    }

    return this.responseBuilder.createSuccessResponse(message.id, {
      stats: {
        sessionId: session.sessionId,
        userId: session.userId,
        messageCount: session.metadata.messageCount || 0,
        tokenUsage: session.tokenUsage,
        createdAt: session.metadata.createdAt,
        lastActivity: session.metadata.lastActivity
      }
    });
  }
}

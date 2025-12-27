// @ts-nocheck
import { AuthSession, Session } from '../models/UnifiedModels.js';
import mongoose from 'mongoose';
import { backendLogger } from '@qwen-team/shared';

const logger = backendLogger.child({ service: 'sessionService' });

// Session service for authentication and conversations
export const sessionService = {
  async createSession(userId: string, teamId?: string, workspacePath?: string) {
    const sessionId = `session_${userId}_${teamId || 'user'}_${Date.now()}`;
    
    // Create auth session (not conversation session)
    const authSession = new AuthSession({
      sessionId,
      userId,
      teamId,
      workspacePath,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    await authSession.save();
    return sessionId;
  },

  async createUserSession(userId: string, workspacePath: string) {
    return await this.createSession(userId, undefined, workspacePath);
  },

  async createTeamSession(userId: string, teamId: string, workspacePath: string) {
    return await this.createSession(userId, teamId, workspacePath);
  },

  async getSession(sessionId: string) {
    // This would retrieve session from ACP
    return { sessionId, active: true };
  },

  async validateSession(sessionId: string) {
    try {
      logger.info('Validating auth session', { sessionId, timestamp: new Date().toISOString() });
      
      // Check if mongoose is connected, reconnect if needed
      if (mongoose.connection.readyState !== 1) {
        logger.info('MongoDB disconnected, attempting reconnection');
        await mongoose.connect(config.MONGODB_URI);
      }
      
      const authSession = await AuthSession.findOne({ sessionId, status: 'active' });
      logger.info('Auth session query result', { 
        found: !!authSession, 
        userId: authSession?.userId?.toString() 
      });
      
      return authSession ? authSession.userId.toString() : null;
    } catch (error) {
      logger.error('Auth session validation error', { error: (error as Error).message });
      // Try to reconnect on connection errors
      if ((error as any).name === 'MongoNotConnectedError' || (error as any).name === 'MongoClientClosedError') {
        try {
          await mongoose.connect(config.MONGODB_URI);
          const authSession = await AuthSession.findOne({ sessionId, status: 'active' });
          return authSession ? authSession.userId.toString() : null;
        } catch (retryError) {
          logger.error('Auth session validation retry failed', { error: (retryError as Error).message });
        }
      }
      return null;
    }
  },

  async setActiveTeam(userId: string, teamId: string) {
    // Store active team for user
    return true;
  },

  async getActiveTeam(userId: string) {
    // Get active team for user
    return null;
  },

  async deleteSession(sessionId: string) {
    // This would delete session from ACP
    return true;
  }
};

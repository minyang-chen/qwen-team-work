import { UserSessionManager, SavedSessionData } from '../session/UserSessionManager';

interface MongoSessionService {
  saveSession(sessionData: any): Promise<void>;
  loadSession(sessionId: string): Promise<any>;
  addMessage(sessionId: string, message: any): Promise<void>;
  updateTokenUsage(sessionId: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export class SessionPersistenceManager {
  private mongoService: MongoSessionService | null = null;

  constructor(private sessionManager: UserSessionManager) {
    // Try to load MongoDB service if available
    try {
      const { MongoSessionService } = require('@qwen-team/backend/dist/services/mongoSessionService');
      this.mongoService = new MongoSessionService();
    } catch (error) {
      console.log('MongoDB service not available, using in-memory storage');
    }
  }

  async saveSession(sessionId: string, sessionName?: string, userId?: string): Promise<string> {
    try {
      if (!userId) {
        throw new Error('User ID is required for session persistence');
      }

      const session = this.sessionManager.getUserSession(userId);
      if (!session) {
        throw new Error('No active session to save');
      }

      // Save to MongoDB
      if (this.mongoService) {
        await this.mongoService.saveSession(session);
      }
      
      return `💾 **Session Saved:** \`${sessionName || sessionId}\`
Messages: ${session.conversationHistory.length}
Use \`/resume ${sessionId}\` to restore this session.`;
    } catch (error) {
      return `❌ **Error:** Failed to save session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async resumeSession(sessionId: string, userId?: string): Promise<string> {
    try {
      if (!userId) {
        throw new Error('User ID is required to resume session');
      }

      const savedSession = this.mongoService ? 
        await this.mongoService.loadSession(sessionId) :
        await this.sessionManager.loadSession(sessionId);
      if (!savedSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const currentSession = this.sessionManager.getUserSession(userId);
      if (currentSession) {
        currentSession.conversationHistory = savedSession.conversationHistory || [];
        currentSession.tokenUsage = {
          inputTokens: savedSession.tokenUsage?.input || 0,
          outputTokens: savedSession.tokenUsage?.output || 0,
          totalTokens: savedSession.tokenUsage?.total || 0
        };
      }
      
      return `🔄 **Session Resumed:** Messages restored: ${savedSession.conversationHistory?.length || 0}`;
    } catch (error) {
      return `❌ **Error:** Failed to resume session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
      
  async listSessions(userId?: string): Promise<string> {
    try {
      if (!userId) {
        throw new Error('User ID is required to list sessions');
      }

      const savedSessions = await this.sessionManager.listSavedSessions(userId);
      
      if (savedSessions.length === 0) {
        return `📋 **Saved Sessions**
No saved sessions found. Use \`/save [name]\` to save your current session.`;
      }

      const sessionList = savedSessions
        .map(session => `• **${session.name}** (\`${session.id}\`)
  Created: ${session.createdAt.toLocaleDateString()}
  Messages: ${session.metadata?.messageCount || 0}`)
        .join('\n\n');

      return `📋 **Saved Sessions**

${sessionList}

Use \`/resume <session-id>\` to restore a session.`;
    } catch (error) {
      return `❌ **Error:** Failed to list sessions - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async deleteSession(sessionId: string): Promise<string> {
    try {
      await this.sessionManager.deleteSession(sessionId);
      // Deleted session
      
      return `🗑️ **Session Deleted:** \`${sessionId}\`
Session and associated workspace files have been removed.`;
    } catch (error) {
      return `❌ **Error:** Failed to delete session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

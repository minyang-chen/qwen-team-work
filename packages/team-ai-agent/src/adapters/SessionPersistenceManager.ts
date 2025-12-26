import { UserSessionManager } from '../session/UserSessionManager.js';

export class SessionPersistenceManager {
  private savedSessions = new Map<string, any>();

  constructor(private sessionManager: UserSessionManager) {}

  async saveSession(sessionId: string, sessionName?: string, userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const session = this.sessionManager.getUserSession(userId);
    if (!session) {
      throw new Error('Session not found');
    }

    const savedData = {
      sessionId,
      name: sessionName || `Session ${Date.now()}`,
      userId,
      createdAt: new Date(),
      metadata: session.metadata,
      tokenUsage: session.tokenUsage
    };

    this.savedSessions.set(sessionId, savedData);
    await this.sessionManager.saveSession(sessionId, savedData);

    return `💾 Session saved: ${savedData.name}`;
  }

  async listSessions(userId?: string): Promise<string> {
    const sessions = Array.from(this.savedSessions.values())
      .filter(s => !userId || s.userId === userId);

    if (sessions.length === 0) {
      return '📋 No saved sessions found';
    }

    const list = sessions
      .map(s => `- ${s.name} (${s.sessionId}) - ${s.createdAt.toLocaleDateString()}`)
      .join('\n');

    return `📋 Saved Sessions:\n${list}`;
  }

  async resumeSession(sessionId: string, userId?: string): Promise<string> {
    const saved = this.savedSessions.get(sessionId);
    if (!saved) {
      throw new Error('Session not found');
    }

    if (userId && saved.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return `🔄 Session resumed: ${saved.name}`;
  }

  async deleteSession(sessionId: string): Promise<string> {
    this.savedSessions.delete(sessionId);
    return `🗑️ Session deleted: ${sessionId}`;
  }
}

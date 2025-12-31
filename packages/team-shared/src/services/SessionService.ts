import { ISessionService } from '../interfaces/ISessionService.js';
import { UserCredentials, ExecutionResult } from '../types/AcpTypes.js';

export interface SessionData {
  sessionId: string;
  userId: string;
  teamId?: string;
  projectId?: string;
  history: Array<{ role: string; content: string; timestamp: number }>;
  tokenCount: number;
  lastActivity: number;
  capabilities: string[];
  metadata: Record<string, any>;
}

export interface SessionOptions {
  userId: string;
  teamId?: string;
  projectId?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export class SessionService implements ISessionService {
  private sessions = new Map<string, SessionData>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // ISessionService interface implementation
  async createSession(userId: string, credentials?: UserCredentials, workingDirectory?: string): Promise<string> {
    const sessionId = `session-${userId}-${Date.now()}`;
    const session: SessionData = {
      sessionId,
      userId,
      teamId: undefined, // UserCredentials doesn't have teamId
      projectId: undefined, // UserCredentials doesn't have projectId
      history: [],
      tokenCount: 0,
      lastActivity: Date.now(),
      capabilities: [],
      metadata: { workingDirectory, credentials },
    };

    this.sessions.set(sessionId, session);
    console.log(`[SessionService] Created session ${sessionId} for user ${userId}`);
    
    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session || null;
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, data);
      session.lastActivity = Date.now();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`[SessionService] Deleted session ${sessionId}`);
    }
  }

  async getUserSessions(userId: string): Promise<string[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .map(session => session.sessionId);
  }

  async updateTokenUsage(sessionId: string, inputTokens: number, outputTokens: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tokenCount += inputTokens + outputTokens;
      session.lastActivity = Date.now();
    }
  }

  async getSessionStats(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      teamId: session.teamId,
      projectId: session.projectId,
      messageCount: session.history.length,
      tokenCount: session.tokenCount,
      lastActivity: session.lastActivity,
      capabilities: session.capabilities,
      uptime: Date.now() - (session.history[0]?.timestamp || Date.now())
    };
  }

  async sendMessage(sessionId: string, message: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.history.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    session.tokenCount += Math.ceil(message.length / 4);
    session.lastActivity = Date.now();

    return {
      sessionId,
      messageId: `msg-${Date.now()}`,
      timestamp: Date.now()
    };
  }

  async executeCode(sessionId: string, code: string, language: string): Promise<ExecutionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    // Mock execution result - in real implementation this would execute code
    const result: ExecutionResult = {
      output: `Executed ${language} code: ${code.substring(0, 50)}...`,
      error: undefined,
      exitCode: 0,
      executionTime: Math.random() * 1000,
      resourceUsage: {
        memory: Math.random() * 100,
        cpu: Math.random() * 50
      }
    };

    session.history.push({
      role: 'system',
      content: `Code executed: ${language}`,
      timestamp: Date.now()
    });

    session.lastActivity = Date.now();
    return result;
  }

  // Enhanced methods for team functionality
  async createEnhancedSession(sessionId: string, options: SessionOptions): Promise<SessionData> {
    const session: SessionData = {
      sessionId,
      userId: options.userId,
      teamId: options.teamId,
      projectId: options.projectId,
      history: [],
      tokenCount: 0,
      lastActivity: Date.now(),
      capabilities: options.capabilities || [],
      metadata: options.metadata || {},
    };

    this.sessions.set(sessionId, session);
    console.log(`[SessionService] Created enhanced session ${sessionId} for user ${options.userId}`);
    
    return session;
  }

  async updateEnhancedSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    Object.assign(session, updates);
    session.lastActivity = Date.now();
    
    return true;
  }

  async deleteEnhancedSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`[SessionService] Deleted enhanced session ${sessionId}`);
    }
    return deleted;
  }

  async addMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.history.push({
      role,
      content,
      timestamp: Date.now()
    });

    // Update token count (rough estimation)
    session.tokenCount += Math.ceil(content.length / 4);
    session.lastActivity = Date.now();

    return true;
  }

  async getHistory(sessionId: string, limit?: number): Promise<Array<{ role: string; content: string; timestamp: number }>> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const history = session.history;
    return limit ? history.slice(-limit) : history;
  }

  async getSessionsByUser(userId: string): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  async getSessionsByTeam(teamId: string): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).filter(session => session.teamId === teamId);
  }

  async getActiveSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.log(`[SessionService] Cleaning up ${expiredSessions.length} expired sessions`);
      for (const sessionId of expiredSessions) {
        this.deleteEnhancedSession(sessionId);
      }
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    console.log('[SessionService] Shutdown complete');
  }
}

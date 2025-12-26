import type { ISessionManager, UserCredentials, ConversationMessage } from '@qwen-team/shared';
import { ServerClient } from '@qwen-team/server-sdk';
import { configManager } from '@qwen-team/shared';
import { nanoid } from 'nanoid';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface SessionMetadata {
  messageCount: number;
  lastActivity: Date;
  createdAt: Date;
}

interface SessionData {
  userId: string;
  sessionId: string;
  workspaceDir: string;
  client: ServerClient;
  metadata: SessionMetadata;
  tokenUsage: TokenUsage;
  conversationHistory: ConversationMessage[];
}

export class UserSessionManager {
  private userSessions = new Map<string, SessionData>();
  private sessionCleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.startSessionMonitoring();
  }

  async createSession(userId: string, credentials?: UserCredentials): Promise<string> {
    const sessionId = nanoid();
    const workspaceDir = `/tmp/qwen-workspace-${userId}`;

    // Create ServerClient with config manager
    const client = new ServerClient({
      apiKey: credentials?.apiKey || configManager.get('OPENAI_API_KEY'),
      baseUrl: credentials?.baseUrl || configManager.get('OPENAI_BASE_URL'),
      model: credentials?.model || configManager.get('OPENAI_MODEL') || 'qwen-coder-plus',
      workingDirectory: workspaceDir
    });

    await client.initialize();

    const session: SessionData = {
      userId,
      sessionId,
      workspaceDir,
      client,
      metadata: {
        messageCount: 0,
        lastActivity: new Date(),
        createdAt: new Date()
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      },
      conversationHistory: []
    };

    this.userSessions.set(userId, session);
    console.log(`Session created for user ${userId}`);
    return sessionId;
  }

  getUserSession(userId: string): SessionData | null {
    return this.userSessions.get(userId) || null;
  }

  async deleteSession(userId: string): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      await session.client.dispose();
      this.userSessions.delete(userId);
      console.log(`Session deleted for user ${userId}`);
    }
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    // Placeholder for session persistence
    console.log(`Session ${sessionId} saved`);
  }

  async loadSession(sessionId: string): Promise<any> {
    // Placeholder for session loading
    return null;
  }

  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes

      for (const [userId, session] of this.userSessions.entries()) {
        const inactive = now - session.metadata.lastActivity.getTime();
        if (inactive > timeout) {
          console.log(`Cleaning up inactive session for user ${userId}`);
          this.deleteSession(userId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  async shutdown(): Promise<void> {
    clearInterval(this.sessionCleanupInterval);
    
    for (const [userId, session] of this.userSessions.entries()) {
      await session.client.dispose();
    }
    
    this.userSessions.clear();
    console.log('UserSessionManager shutdown complete');
  }
}

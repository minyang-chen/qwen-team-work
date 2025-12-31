import { ServerClient, QueryResult, StreamChunk } from '@qwen-team/server-sdk';
import * as shared from '@qwen-team/shared';
const { uiServerLogger } = shared;

interface ClientSession {
  client: ServerClient;
  userId: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

interface AIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  sessionTimeout?: number; // milliseconds
  maxSessions?: number;
}

export class AIService {
  private sessions = new Map<string, ClientSession>();
  private config: AIServiceConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: AIServiceConfig) {
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes default
      maxSessions: 1000,
      ...config,
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes

    uiServerLogger.info('AIService initialized', {
      model: this.config.model,
      maxSessions: this.config.maxSessions,
    });
  }

  /**
   * Get or create a client for a user
   */
  async getClient(userId: string, workingDirectory?: string): Promise<ServerClient> {
    let session = this.sessions.get(userId);

    if (!session) {
      // Check max sessions limit
      if (this.sessions.size >= this.config.maxSessions!) {
        throw new Error('Maximum number of sessions reached');
      }

      // Create new client
      const client = new ServerClient({
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        sessionId: userId,
        workingDirectory: workingDirectory || '/tmp', // Use empty temp dir instead of project root
        approvalMode: 'yolo',
      });

      try {
        await client.initialize();

        session = {
          client,
          userId,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          messageCount: 0,
          tokenUsage: {
            input: 0,
            output: 0,
            total: 0,
          },
        };

        this.sessions.set(userId, session);
        uiServerLogger.info('AI client created', { userId, totalSessions: this.sessions.size });
      } catch (error) {
        uiServerLogger.error('Failed to initialize AI client', { userId }, error as Error);
        throw error;
      }
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session.client;
  }

  /**
   * Process a message and return complete result
   */
  async processMessage(
    userId: string,
    message: string,
    workingDirectory?: string
  ): Promise<QueryResult> {
    const client = await this.getClient(userId, workingDirectory);
    const session = this.sessions.get(userId)!;

    try {
      const result = await client.query(message);

      // Update session stats
      session.messageCount++;
      session.lastActivity = Date.now();
      if (result.usage) {
        session.tokenUsage.input += result.usage.input;
        session.tokenUsage.output += result.usage.output;
        session.tokenUsage.total += result.usage.total;
      }

      uiServerLogger.info('Message processed', {
        userId,
        messageCount: session.messageCount,
        tokenUsage: session.tokenUsage,
      });

      return result;
    } catch (error) {
      uiServerLogger.error('Message processing failed', { userId }, error as Error);
      throw error;
    }
  }

  /**
   * Process a message with streaming response
   */
  async *processMessageStream(
    userId: string,
    message: string,
    workingDirectory?: string
  ): AsyncIterator<StreamChunk> {
    const client = await this.getClient(userId, workingDirectory);
    const session = this.sessions.get(userId)!;

    try {
      session.messageCount++;
      session.lastActivity = Date.now();

      for await (const chunk of client.queryStream(message)) {
        session.lastActivity = Date.now();
        yield chunk;
      }

      uiServerLogger.info('Stream completed', {
        userId,
        messageCount: session.messageCount,
      });
    } catch (error) {
      uiServerLogger.error('Stream processing failed', { userId }, error as Error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(userId: string): ClientSession | null {
    return this.sessions.get(userId) || null;
  }

  /**
   * Get all active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      activeSessions: this.sessions.size,
      maxSessions: this.config.maxSessions,
      model: this.config.model,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Remove a specific user session
   */
  async removeSession(userId: string): Promise<boolean> {
    const session = this.sessions.get(userId);
    if (session) {
      try {
        await session.client.cleanup();
        this.sessions.delete(userId);
        uiServerLogger.info('Session removed', { userId, remainingSessions: this.sessions.size });
        return true;
      } catch (error) {
        uiServerLogger.error('Failed to remove session', { userId }, error as Error);
        return false;
      }
    }
    return false;
  }

  /**
   * Cleanup inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeout = this.config.sessionTimeout!;
    const toRemove: string[] = [];

    for (const [userId, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        toRemove.push(userId);
      }
    }

    if (toRemove.length > 0) {
      uiServerLogger.info('Cleaning up inactive sessions', { count: toRemove.length });

      for (const userId of toRemove) {
        await this.removeSession(userId);
      }
    }
  }

  /**
   * Shutdown service and cleanup all sessions
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);

    uiServerLogger.info('Shutting down AIService', { activeSessions: this.sessions.size });

    const promises = Array.from(this.sessions.keys()).map((userId) => this.removeSession(userId));
    await Promise.all(promises);

    uiServerLogger.info('AIService shutdown complete');
  }
}

// Create singleton instance
let aiServiceInstance: AIService | null = null;

export function createAIService(config: AIServiceConfig): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService(config);
  }
  return aiServiceInstance;
}

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    throw new Error('AIService not initialized. Call createAIService first.');
  }
  return aiServiceInstance;
}

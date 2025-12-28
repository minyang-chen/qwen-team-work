import { Session } from '../models/UnifiedModels';
import { EnhancedSessionData, ConversationMessage } from '@qwen-team/shared';
import { RedisCache } from '@qwen-team/shared/dist/cache/redisCache';

export class MongoSessionService {
  private cache: RedisCache;

  constructor() {
    this.cache = new RedisCache();
  }

  async saveSession(sessionData: EnhancedSessionData): Promise<void> {
    // Save to MongoDB
    const session = new Session({
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      status: 'active',
      workspacePath: sessionData.workspaceDir || '',
      conversationHistory: sessionData.conversationHistory || [],
      tokenUsage: {
        input: sessionData.tokenUsage.inputTokens,
        output: sessionData.tokenUsage.outputTokens,
        total: sessionData.tokenUsage.totalTokens
      },
      metadata: {},
      createdAt: sessionData.metadata.createdAt,
      lastActivity: sessionData.metadata.lastActivity
    });
    await session.save();

    // Cache session data
    await this.cache.cacheSession(sessionData.sessionId, sessionData);
  }

  async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    // Add to MongoDB
    await Session.updateOne(
      { sessionId },
      { 
        $push: { conversationHistory: message },
        $set: { lastActivity: new Date() }
      }
    );

    // Cache message
    await this.cache.cacheMessage(sessionId, message);
  }

  async getRecentMessages(sessionId: string, count: number = 50): Promise<ConversationMessage[]> {
    // Try cache first
    const cached = await this.cache.getRecentMessages(sessionId, count);
    if (cached.length > 0) return cached as ConversationMessage[];

    // Fallback to MongoDB
    const session = await Session.findOne({ sessionId });
    return (session?.conversationHistory.slice(-count) || []) as ConversationMessage[];
  }

  async updateTokenUsage(sessionId: string, inputTokens: number, outputTokens: number): Promise<void> {
    await Session.updateOne(
      { sessionId },
      { 
        $inc: { 
          'tokenUsage.input': inputTokens,
          'tokenUsage.output': outputTokens,
          'tokenUsage.total': inputTokens + outputTokens
        },
        $set: { lastActivity: new Date() }
      }
    );
  }
}

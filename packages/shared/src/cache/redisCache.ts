export interface ConversationMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata: {
    correlationId: string;
    timestamp: Date;
    version: string;
  };
}

export class RedisCache {
  private redis: any;
  private readonly MESSAGE_TTL = 3600; // 1 hour

  constructor() {
    try {
      const Redis = require('ioredis');
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
    } catch (error) {
      console.log('Redis not available, using memory cache');
      this.redis = null;
    }
  }

  async cacheMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    if (!this.redis) return;
    
    const key = `session:${sessionId}:messages`;
    await this.redis.lpush(key, JSON.stringify(message));
    await this.redis.expire(key, this.MESSAGE_TTL);
  }

  async getRecentMessages(sessionId: string, count: number = 50): Promise<ConversationMessage[]> {
    if (!this.redis) return [];
    
    const key = `session:${sessionId}:messages`;
    const messages = await this.redis.lrange(key, 0, count - 1);
    return messages.map((msg: string) => JSON.parse(msg));
  }

  async cacheSession(sessionId: string, sessionData: any): Promise<void> {
    const key = `session:${sessionId}:data`;
    await this.redis.setex(key, this.MESSAGE_TTL, JSON.stringify(sessionData));
  }

  async getSession(sessionId: string): Promise<any> {
    const key = `session:${sessionId}:data`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}:messages`, `session:${sessionId}:data`);
  }
}

import { Session } from '../models/UnifiedModels.js';
import { EnhancedSessionData, ConversationMessage } from '@qwen-team/shared';

export class MongoSessionService {
  constructor() {
    // Cache removed - not implemented in team-shared
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
  }

  async getRecentMessages(sessionId: string, count: number = 50): Promise<ConversationMessage[]> {
    // Get from MongoDB
    const session = await Session.findOne({ sessionId });
    const messages = session?.conversationHistory.slice(-count) || [];
    
    // Convert Date to number for timestamps
    return messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp
    })) as ConversationMessage[];
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

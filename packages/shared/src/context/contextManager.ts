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

export class ContextWindowManager {
  private readonly WINDOW_SIZE = 20;
  private readonly OVERLAP_SIZE = 5;

  createSlidingWindow(messages: ConversationMessage[], currentIndex: number): ConversationMessage[] {
    const start = Math.max(0, currentIndex - this.WINDOW_SIZE + this.OVERLAP_SIZE);
    const end = Math.min(messages.length, currentIndex + this.OVERLAP_SIZE);
    
    return messages.slice(start, end);
  }

  getRelevantContext(messages: ConversationMessage[], query: string): ConversationMessage[] {
    // Simple keyword-based relevance (would be enhanced with vector search)
    const keywords = query.toLowerCase().split(' ');
    
    return messages.filter(message => {
      const content = message.content.toLowerCase();
      return keywords.some(keyword => content.includes(keyword));
    }).slice(-this.WINDOW_SIZE);
  }

  compressWindow(messages: ConversationMessage[]): ConversationMessage[] {
    if (messages.length <= this.WINDOW_SIZE) return messages;

    // Keep first few and last few messages
    const keepStart = messages.slice(0, 3);
    const keepEnd = messages.slice(-this.WINDOW_SIZE + 3);
    
    // Add summary message
    const summary: ConversationMessage = {
      messageId: `summary_${Date.now()}`,
      role: 'system',
      content: `[Context Summary: ${messages.length - 6} messages omitted]`,
      metadata: {
        correlationId: 'context_compression',
        timestamp: new Date(),
        version: '1.0'
      }
    };

    return [...keepStart, summary, ...keepEnd];
  }
}

export class VectorSearchService {
  async searchSimilarMessages(query: string, messages: ConversationMessage[]): Promise<ConversationMessage[]> {
    // Placeholder for vector similarity search
    // Would integrate with embedding service
    
    const queryWords = query.toLowerCase().split(' ');
    const scored = messages.map(message => ({
      message,
      score: this.calculateSimilarity(queryWords, message.content.toLowerCase())
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.message);
  }

  private calculateSimilarity(queryWords: string[], content: string): number {
    const contentWords = content.split(' ');
    const matches = queryWords.filter(word => contentWords.includes(word));
    return matches.length / queryWords.length;
  }
}

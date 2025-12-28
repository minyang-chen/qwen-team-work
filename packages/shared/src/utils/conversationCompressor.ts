export class ConversationCompressor {
  private readonly TOKEN_LIMIT = 32000;
  private readonly COMPRESSION_RATIO = 0.3;

  compressHistory(messages: any[], currentTokens: number): any[] {
    if (currentTokens <= this.TOKEN_LIMIT) {
      return messages;
    }

    const targetTokens = Math.floor(this.TOKEN_LIMIT * this.COMPRESSION_RATIO);
    const recentMessages = messages.slice(-10); // Keep last 10 messages
    const oldMessages = messages.slice(0, -10);

    // Compress old messages by summarizing
    const summary = this.summarizeMessages(oldMessages);
    
    return [
      {
        messageId: `summary_${Date.now()}`,
        role: 'system',
        content: `[Conversation Summary]: ${summary}`,
        metadata: {
          correlationId: 'compression',
          timestamp: new Date(),
          version: '1.0'
        }
      },
      ...recentMessages
    ];
  }

  private summarizeMessages(messages: any[]): string {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    
    return `Previous conversation contained ${userMessages} user messages and ${assistantMessages} assistant responses covering various topics.`;
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4); // Rough estimation
  }
}

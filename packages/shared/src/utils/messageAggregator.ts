import { MessageChunk, ConversationMessage, TokenUsage } from '../schemas/messageSchemas.js';

export class MessageAggregator {
  private chunkBuffers = new Map<string, {
    chunks: MessageChunk[];
    correlationId: string;
    startTime: number;
    timeout?: NodeJS.Timeout;
  }>();

  private readonly aggregationTimeout = 5000; // 5 seconds
  private readonly maxChunks = 1000;

  addChunk(
    sessionId: string, 
    chunk: MessageChunk,
    onComplete: (aggregatedMessage: ConversationMessage) => void,
    onTimeout: (partialMessage: ConversationMessage) => void
  ): void {
    const key = `${sessionId}:${chunk.correlationId}`;
    
    if (!this.chunkBuffers.has(key)) {
      this.chunkBuffers.set(key, {
        chunks: [],
        correlationId: chunk.correlationId,
        startTime: Date.now(),
      });
    }

    const buffer = this.chunkBuffers.get(key)!;
    buffer.chunks.push(chunk);

    // Clear existing timeout
    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
    }

    // Check if complete
    if (chunk.data.isComplete) {
      this.finalizeMessage(key, onComplete);
      return;
    }

    // Check chunk limit
    if (buffer.chunks.length >= this.maxChunks) {
      this.finalizeMessage(key, onComplete);
      return;
    }

    // Set new timeout
    buffer.timeout = setTimeout(() => {
      this.finalizeMessage(key, onTimeout);
    }, this.aggregationTimeout);
  }

  private finalizeMessage(
    key: string,
    callback: (message: ConversationMessage) => void
  ): void {
    const buffer = this.chunkBuffers.get(key);
    if (!buffer) return;

    // Clear timeout
    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
    }

    // Aggregate chunks
    const sortedChunks = buffer.chunks.sort((a, b) => a.timestamp - b.timestamp);
    const content = sortedChunks.map(chunk => chunk.data.content).join('');
    
    // Get final token usage from last chunk
    const finalChunk = sortedChunks[sortedChunks.length - 1];
    const tokenUsage = finalChunk?.data.tokenUsage;

    // Create conversation message
    const message: ConversationMessage = {
      messageId: buffer.correlationId,
      role: 'assistant',
      content,
      metadata: {
        correlationId: buffer.correlationId,
        tokenUsage,
        processingTime: Date.now() - buffer.startTime,
        version: '1.0'
      },
      timestamp: new Date()
    };

    // Cleanup and callback
    this.chunkBuffers.delete(key);
    callback(message);
  }

  // Cleanup old buffers
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.aggregationTimeout * 2;

    for (const [key, buffer] of this.chunkBuffers.entries()) {
      if (now - buffer.startTime > maxAge) {
        if (buffer.timeout) {
          clearTimeout(buffer.timeout);
        }
        this.chunkBuffers.delete(key);
      }
    }
  }

  // Get buffer status for monitoring
  getStatus(): { activeBuffers: number; totalChunks: number } {
    let totalChunks = 0;
    for (const buffer of this.chunkBuffers.values()) {
      totalChunks += buffer.chunks.length;
    }

    return {
      activeBuffers: this.chunkBuffers.size,
      totalChunks
    };
  }
}

export const messageAggregator = new MessageAggregator();

// Cleanup every minute
setInterval(() => messageAggregator.cleanup(), 60000);

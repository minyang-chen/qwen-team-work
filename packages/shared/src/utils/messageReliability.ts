import { MessageAck, WebSocketMessage } from '../schemas/messageSchemas.js';
import { MessageTransformer } from './messageTransformer.js';

export class MessageReliabilityManager {
  private pendingMessages = new Map<string, {
    message: WebSocketMessage;
    timestamp: number;
    retryCount: number;
    onAck: (ack: MessageAck) => void;
    onTimeout: (message: WebSocketMessage) => void;
  }>();

  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds
  private readonly ackTimeout = 10000; // 10 seconds

  // Send message with acknowledgment tracking
  sendWithAck(
    message: WebSocketMessage,
    sendFn: (msg: WebSocketMessage) => void,
    onAck: (ack: MessageAck) => void,
    onTimeout: (msg: WebSocketMessage) => void
  ): void {
    this.pendingMessages.set(message.id, {
      message,
      timestamp: Date.now(),
      retryCount: 0,
      onAck,
      onTimeout
    });

    sendFn(message);
    this.scheduleTimeout(message.id);
  }

  // Handle received acknowledgment
  handleAck(ack: MessageAck): boolean {
    const pending = this.pendingMessages.get(ack.data.originalMessageId);
    if (!pending) return false;

    this.pendingMessages.delete(ack.data.originalMessageId);
    pending.onAck(ack);
    return true;
  }

  // Retry with exponential backoff
  private retry(messageId: string, sendFn: (msg: WebSocketMessage) => void): void {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    pending.retryCount++;
    
    if (pending.retryCount > this.maxRetries) {
      this.pendingMessages.delete(messageId);
      pending.onTimeout(pending.message);
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, pending.retryCount - 1) + Math.random() * 1000,
      this.maxDelay
    );

    setTimeout(() => {
      if (this.pendingMessages.has(messageId)) {
        sendFn(pending.message);
        this.scheduleTimeout(messageId);
      }
    }, delay);
  }

  private scheduleTimeout(messageId: string): void {
    setTimeout(() => {
      const pending = this.pendingMessages.get(messageId);
      if (pending) {
        this.retry(messageId, (msg) => {
          // This will be provided by the caller
          console.warn('Retry attempted but no send function available');
        });
      }
    }, this.ackTimeout);
  }

  // Cleanup old pending messages
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.maxDelay * 2;

    for (const [messageId, pending] of this.pendingMessages.entries()) {
      if (now - pending.timestamp > maxAge) {
        this.pendingMessages.delete(messageId);
        pending.onTimeout(pending.message);
      }
    }
  }

  // Get reliability metrics
  getMetrics(): {
    pendingCount: number;
    totalRetries: number;
    averageRetryCount: number;
  } {
    let totalRetries = 0;
    for (const pending of this.pendingMessages.values()) {
      totalRetries += pending.retryCount;
    }

    return {
      pendingCount: this.pendingMessages.size,
      totalRetries,
      averageRetryCount: this.pendingMessages.size > 0 ? totalRetries / this.pendingMessages.size : 0
    };
  }
}

// Message ordering with sequence numbers
export class MessageSequencer {
  private sequenceCounters = new Map<string, number>();
  private pendingSequences = new Map<string, Map<number, WebSocketMessage>>();

  // Add sequence number to message
  addSequence(sessionId: string, message: WebSocketMessage): WebSocketMessage & { sequence: number } {
    if (!this.sequenceCounters.has(sessionId)) {
      this.sequenceCounters.set(sessionId, 0);
    }

    const sequence = this.sequenceCounters.get(sessionId)!;
    this.sequenceCounters.set(sessionId, sequence + 1);

    return {
      ...message,
      sequence
    };
  }

  // Process message in order
  processInOrder(
    sessionId: string,
    message: WebSocketMessage & { sequence: number },
    processor: (msg: WebSocketMessage) => void
  ): void {
    if (!this.pendingSequences.has(sessionId)) {
      this.pendingSequences.set(sessionId, new Map());
    }

    const pending = this.pendingSequences.get(sessionId)!;
    pending.set(message.sequence, message);

    // Process all consecutive messages
    let expectedSequence = 0;
    while (pending.has(expectedSequence)) {
      const msg = pending.get(expectedSequence)!;
      pending.delete(expectedSequence);
      processor(msg);
      expectedSequence++;
    }
  }

  // Cleanup session
  cleanupSession(sessionId: string): void {
    this.sequenceCounters.delete(sessionId);
    this.pendingSequences.delete(sessionId);
  }
}

export const messageReliabilityManager = new MessageReliabilityManager();
export const messageSequencer = new MessageSequencer();

// Cleanup every 5 minutes
setInterval(() => {
  messageReliabilityManager.cleanup();
}, 300000);

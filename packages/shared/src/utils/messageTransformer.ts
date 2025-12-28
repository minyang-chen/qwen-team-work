import { nanoid } from 'nanoid';
import { 
  ChatMessage, 
  ToolCallMessage, 
  MessageChunk, 
  MessageAck,
  AcpMessage, 
  ConversationMessage,
  WebSocketMessage,
  ChatData,
  ToolData
} from '../schemas/messageSchemas.js';

export class MessageTransformer {
  // Create base message properties
  static createBaseMessage(correlationId?: string) {
    return {
      id: nanoid(),
      correlationId: correlationId || nanoid(),
      timestamp: Date.now(),
      version: '1.0' as const
    };
  }

  // Transform WebSocket chat message to ACP
  static chatToAcp(wsMessage: ChatMessage): AcpMessage {
    return {
      ...this.createBaseMessage(wsMessage.correlationId),
      type: 'chat.send',
      data: wsMessage.data,
      userId: wsMessage.data.userId,
      sessionId: wsMessage.data.sessionId
    };
  }

  // Transform WebSocket tool message to ACP
  static toolToAcp(wsMessage: ToolCallMessage): AcpMessage {
    return {
      ...this.createBaseMessage(wsMessage.correlationId),
      type: 'tool.execute',
      data: wsMessage.data,
      userId: wsMessage.data.userId,
      sessionId: wsMessage.data.sessionId
    };
  }

  // Transform chat message for MongoDB storage
  static chatToMongo(wsMessage: ChatMessage): ConversationMessage {
    return {
      messageId: wsMessage.id,
      role: 'user',
      content: wsMessage.data.content,
      attachments: wsMessage.data.attachments?.map(att => ({
        fileName: att.fileName,
        fileType: att.fileType,
        filePath: att.filePath || '',
        contentHash: att.contentHash
      })),
      metadata: {
        correlationId: wsMessage.correlationId,
        version: wsMessage.version
      },
      timestamp: new Date(wsMessage.timestamp)
    };
  }

  // Transform assistant response for MongoDB storage
  static responseToMongo(
    content: string, 
    correlationId: string, 
    tokenUsage?: any,
    toolCalls?: any[]
  ): ConversationMessage {
    return {
      messageId: nanoid(),
      role: 'assistant',
      content,
      toolCalls: toolCalls?.map(tc => ({
        callId: tc.callId || nanoid(),
        name: tc.name,
        args: tc.args,
        status: tc.status || 'completed',
        result: tc.result
      })),
      metadata: {
        correlationId,
        tokenUsage,
        version: '1.0'
      },
      timestamp: new Date()
    };
  }

  // Aggregate message chunks into single message
  static aggregateChunks(chunks: MessageChunk[]): string {
    return chunks
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(chunk => chunk.data.content)
      .join('');
  }

  // Create acknowledgment message
  static createAck(
    originalMessageId: string, 
    status: 'received' | 'processed' | 'stored' | 'failed',
    correlationId: string,
    error?: string
  ): MessageAck {
    return {
      ...this.createBaseMessage(correlationId),
      type: 'message.ack',
      data: {
        originalMessageId,
        status,
        error
      }
    };
  }

  // Create message chunk
  static createChunk(
    content: string, 
    correlationId: string, 
    isComplete = false,
    tokenUsage?: any
  ): MessageChunk {
    return {
      ...this.createBaseMessage(correlationId),
      type: 'message.chunk',
      data: {
        content,
        isComplete,
        tokenUsage
      }
    };
  }

  // Validate and transform any message
  static validateAndTransform<T>(
    schema: any, 
    data: unknown, 
    transformer?: (validated: any) => T
  ): { success: boolean; data?: T; error?: string } {
    try {
      const validated = schema.parse(data);
      const transformed = transformer ? transformer(validated) : validated;
      return { success: true, data: transformed };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || error.message 
      };
    }
  }
}

// Message ordering utilities
export class MessageOrderManager {
  private messageQueue = new Map<string, { message: any; sequence: number; timestamp: number }[]>();
  private expectedSequence = new Map<string, number>();

  addMessage(sessionId: string, message: any, sequence: number): { shouldProcess: boolean; orderedMessages: any[] } {
    if (!this.messageQueue.has(sessionId)) {
      this.messageQueue.set(sessionId, []);
      this.expectedSequence.set(sessionId, 0);
    }

    const queue = this.messageQueue.get(sessionId)!;
    const expected = this.expectedSequence.get(sessionId)!;

    // Add to queue
    queue.push({ message, sequence, timestamp: Date.now() });
    queue.sort((a, b) => a.sequence - b.sequence);

    // Process in-order messages
    const orderedMessages: any[] = [];
    let currentExpected = expected;

    while (queue.length > 0 && queue[0].sequence === currentExpected) {
      const item = queue.shift()!;
      orderedMessages.push(item.message);
      currentExpected++;
    }

    this.expectedSequence.set(sessionId, currentExpected);

    return {
      shouldProcess: orderedMessages.length > 0,
      orderedMessages
    };
  }

  cleanup(sessionId: string, maxAge = 300000) { // 5 minutes
    const queue = this.messageQueue.get(sessionId);
    if (!queue) return;

    const now = Date.now();
    const filtered = queue.filter(item => now - item.timestamp < maxAge);
    
    if (filtered.length === 0) {
      this.messageQueue.delete(sessionId);
      this.expectedSequence.delete(sessionId);
    } else {
      this.messageQueue.set(sessionId, filtered);
    }
  }
}

export const messageOrderManager = new MessageOrderManager();

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

export interface ConversationThread {
  threadId: string;
  parentMessageId?: string;
  messages: ConversationMessage[];
  createdAt: Date;
  isActive: boolean;
}

export class ThreadManager {
  private threads = new Map<string, ConversationThread>();

  createThread(sessionId: string, parentMessageId?: string): string {
    const threadId = `thread_${sessionId}_${Date.now()}`;
    
    const thread: ConversationThread = {
      threadId,
      parentMessageId,
      messages: [],
      createdAt: new Date(),
      isActive: true
    };

    this.threads.set(threadId, thread);
    return threadId;
  }

  addMessageToThread(threadId: string, message: ConversationMessage): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.messages.push(message);
    }
  }

  branchThread(originalThreadId: string, fromMessageId: string): string {
    const originalThread = this.threads.get(originalThreadId);
    if (!originalThread) return '';

    const branchPoint = originalThread.messages.findIndex(m => m.messageId === fromMessageId);
    if (branchPoint === -1) return '';

    const newThreadId = this.createThread(originalThreadId, fromMessageId);
    const newThread = this.threads.get(newThreadId)!;
    
    // Copy messages up to branch point
    newThread.messages = originalThread.messages.slice(0, branchPoint + 1);
    
    return newThreadId;
  }

  getThread(threadId: string): ConversationThread | undefined {
    return this.threads.get(threadId);
  }

  getActiveThreads(sessionId: string): ConversationThread[] {
    return Array.from(this.threads.values())
      .filter(thread => thread.threadId.includes(sessionId) && thread.isActive);
  }
}

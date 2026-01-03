import type { ISessionManager, UserCredentials } from '@qwen-team/shared';
import { ServerClient } from '../server/index.js';
import { DockerSandbox } from '@qwen-team/shared';
import * as config from '../config/env.js';
import { nanoid } from 'nanoid';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface SessionMetadata {
  messageCount: number;
  lastActivity: Date;
  createdAt: Date;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  workspaceDir: string;
  client: ServerClient;
  sandbox: DockerSandbox;
  metadata: SessionMetadata;
  tokenUsage: TokenUsage;
  conversationHistory: ChatMessage[];
  contextWindow: number;
  maxTokens: number;
}

export class UserSessionManager {
  private userSessions = new Map<string, SessionData>();
  private sessionCleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.startSessionMonitoring();
  }

  async createSession(userId: string, credentials?: UserCredentials, workingDirectory?: string): Promise<string> {
    const sessionId = nanoid();
    
    // Import modules first
    const fs = await import('fs');
    const path = await import('path');
    
    // Create individual user workspace in NFS
    const nfsBasePath = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';
    const userWorkspaceDir = path.resolve(process.cwd(), nfsBasePath, 'individual', userId);
    
    // Ensure the workspace directory exists with proper permissions
    try {
      await fs.promises.mkdir(userWorkspaceDir, { recursive: true });
      await fs.promises.chmod(userWorkspaceDir, 0o777);
      console.log(`[UserSessionManager] Created workspace directory: ${userWorkspaceDir}`);
      
      // Create a README in the workspace
      const readmePath = path.join(userWorkspaceDir, 'README.md');
      try {
        await fs.promises.access(readmePath);
      } catch {
        await fs.promises.writeFile(
          readmePath,
          `# User Workspace\n\nThis is your personal workspace for code development.\n\nUser ID: ${userId}\nCreated: ${new Date().toISOString()}\n`,
        );
      }
    } catch (error) {
      console.warn(`[UserSessionManager] Could not create workspace directory: ${error}`);
    }

    console.log(`[UserSessionManager] Creating session for user ${userId} with workspace: ${userWorkspaceDir}`);

    // Create ServerClient with user's individual workspace
    const client = new ServerClient({
      apiKey: credentials?.apiKey || config.OPENAI_API_KEY,
      baseUrl: credentials?.baseUrl || config.OPENAI_BASE_URL,
      model: credentials?.model || config.OPENAI_MODEL || 'qwen3-coder:30b',
      workingDirectory: userWorkspaceDir
    });

    await client.initialize();

    // Create Docker sandbox for user with NFS mapping
    console.log(`[UserSessionManager] Creating Docker sandbox for user ${userId}`);
    const sandbox = new DockerSandbox({
      image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
      workspaceDir: userWorkspaceDir,
      userId: userId,
      network: process.env.SANDBOX_NETWORK || 'bridge',
      memory: process.env.SANDBOX_MEMORY || '1g',
      cpus: parseInt(process.env.SANDBOX_CPUS || '2'),
    });
    
    await sandbox.start();
    console.log(`[UserSessionManager] Docker sandbox created for user ${userId}`);

    const session: SessionData = {
      userId,
      sessionId,
      workspaceDir: userWorkspaceDir,
      client,
      sandbox,
      metadata: {
        messageCount: 0,
        lastActivity: new Date(),
        createdAt: new Date()
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      },
      conversationHistory: [],
      contextWindow: 4000, // Default context window
      maxTokens: 32000 // Default max tokens
    };

    this.userSessions.set(userId, session);
    console.log(`Session created for user ${userId}`);
    return sessionId;
  }

  async destroySession(userId: string): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      try {
        // Cleanup Docker sandbox
        await session.sandbox.cleanup();
        console.log(`[UserSessionManager] Docker sandbox cleaned up for user ${userId}`);
        
        // Cleanup ServerClient
        await session.client.cleanup();
        console.log(`[UserSessionManager] ServerClient cleaned up for user ${userId}`);
        
        // Remove from memory
        this.userSessions.delete(userId);
        console.log(`[UserSessionManager] Session destroyed for user ${userId}`);
      } catch (error) {
        console.error(`[UserSessionManager] Error destroying session for user ${userId}:`, error);
        throw error;
      }
    }
  }

  getUserSession(userId: string): SessionData | null {
    return this.userSessions.get(userId) || null;
  }

  getSessionById(sessionId: string): SessionData | null {
    for (const session of this.userSessions.values()) {
      if (session.sessionId === sessionId) {
        return session;
      }
    }
    return null;
  }

  async deleteSession(userId: string): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      await session.client.cleanup();
      this.userSessions.delete(userId);
      console.log(`Session deleted for user ${userId}`);
    }
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    // Placeholder for session persistence
    console.log(`Session ${sessionId} saved`);
  }

  async loadSession(sessionId: string): Promise<any> {
    // Placeholder for session loading
    return null;
  }

  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes

      for (const [userId, session] of this.userSessions.entries()) {
        const inactive = now - session.metadata.lastActivity.getTime();
        if (inactive > timeout) {
          console.log(`Cleaning up inactive session for user ${userId}`);
          this.deleteSession(userId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  async shutdown(): Promise<void> {
    clearInterval(this.sessionCleanupInterval);
    
    for (const [userId, session] of this.userSessions.entries()) {
      await session.client.cleanup();
    }
    
    this.userSessions.clear();
    console.log('UserSessionManager shutdown complete');
  }

  addMessageToHistory(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): void {
    const session = this.getSessionById(sessionId);
    if (session) {
      const message: ChatMessage = {
        role,
        content,
        timestamp: new Date(),
        tokenCount: this.estimateTokenCount(content)
      };
      
      session.conversationHistory.push(message);
      session.metadata.messageCount++;
      session.metadata.lastActivity = new Date();
      
      // Update token usage
      if (role === 'user') {
        session.tokenUsage.inputTokens += message.tokenCount || 0;
      } else if (role === 'assistant') {
        session.tokenUsage.outputTokens += message.tokenCount || 0;
      }
      session.tokenUsage.totalTokens = session.tokenUsage.inputTokens + session.tokenUsage.outputTokens;
      
      // Manage context window
      this.manageContextWindow(session);
    }
  }

  getConversationHistory(sessionId: string): ChatMessage[] {
    const session = this.getSessionById(sessionId);
    return session?.conversationHistory || [];
  }

  private estimateTokenCount(text: string): number {
    // Simple token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private manageContextWindow(session: SessionData): void {
    const totalTokens = session.conversationHistory.reduce(
      (sum, msg) => sum + (msg.tokenCount || 0), 0
    );
    
    if (totalTokens > session.contextWindow) {
      // Keep system messages and recent messages within context window
      const systemMessages = session.conversationHistory.filter(msg => msg.role === 'system');
      const nonSystemMessages = session.conversationHistory.filter(msg => msg.role !== 'system');
      
      // Keep most recent messages that fit in context window
      let currentTokens = systemMessages.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);
      const recentMessages: ChatMessage[] = [];
      
      for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
        const msg = nonSystemMessages[i];
        if (msg) {
          const msgTokens = msg.tokenCount || 0;
          
          if (currentTokens + msgTokens <= session.contextWindow) {
            recentMessages.unshift(msg);
            currentTokens += msgTokens;
          } else {
            break;
          }
        }
      }
      
      session.conversationHistory = [...systemMessages, ...recentMessages];
      console.log(`Context window managed for session ${session.sessionId}: ${session.conversationHistory.length} messages, ${currentTokens} tokens`);
    }
  }

  getConversationHistory(sessionId: string): ChatMessage[] {
    const session = this.getSessionById(sessionId);
    return session ? session.conversationHistory : [];
  }

  clearConversationHistory(sessionId: string): void {
    const session = this.getSessionById(sessionId);
    if (session) {
      // Keep only system messages
      session.conversationHistory = session.conversationHistory.filter(msg => msg.role === 'system');
      session.metadata.messageCount = session.conversationHistory.length;
      session.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      console.log(`Conversation history cleared for session ${sessionId}`);
    }
  }

  compressConversationHistory(sessionId: string): { before: number; after: number } {
    const session = this.getSessionById(sessionId);
    if (!session) {
      return { before: 0, after: 0 };
    }
    
    const beforeCount = session.conversationHistory.length;
    
    // Keep system messages and last 10 exchanges (20 messages)
    const systemMessages = session.conversationHistory.filter(msg => msg.role === 'system');
    const nonSystemMessages = session.conversationHistory.filter(msg => msg.role !== 'system');
    const recentMessages = nonSystemMessages.slice(-20);
    
    session.conversationHistory = [...systemMessages, ...recentMessages];
    const afterCount = session.conversationHistory.length;
    
    console.log(`Conversation history compressed for session ${sessionId}: ${beforeCount} → ${afterCount} messages`);
    return { before: beforeCount, after: afterCount };
  }
}

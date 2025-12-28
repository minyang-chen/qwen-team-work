import type { ISessionManager, IAgentDiscovery, UserCredentials, ExecutionResult } from '@qwen-code/shared';
import { EnhancedSessionData, SessionMetadata, MessageMetadata, TokenUsage, ConversationMessage } from '@qwen-team/shared';
import { GeminiClient, Config, ApprovalMode, AuthType } from '@qwen-code/core';
import { ConversationCompressor } from '@qwen-team/shared/dist/utils/conversationCompressor';
import { NFSBackupService } from '@qwen-team/shared/dist/backup/nfsBackupService';
import { nanoid } from 'nanoid';

interface DockerSandbox {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getSandboxInfo(): Promise<any>;
  execute(command: string): Promise<string>;
}

interface SandboxManager {
  getSandbox(userId: string, workingDirectory?: string): Promise<DockerSandbox>;
  updateActivity(userId: string): void;
}

export class UserSessionManager implements ISessionManager {
  private userSessions = new Map<string, EnhancedSessionData>();
  private sessionCleanupInterval!: NodeJS.Timeout;
  private executionSessions = new Map<string, ExecutionSession>();
  private savedSessions = new Map<string, SavedSessionData>();
  private compressor = new ConversationCompressor();
  private backupService = new NFSBackupService();
  private autoSaveIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.startSessionMonitoring();
  }

  private startAutoSave(sessionId: string, userId: string): void {
    const interval = setInterval(async () => {
      const session = this.userSessions.get(userId);
      if (session) {
        await this.backupService.backupSession(sessionId, session.conversationHistory);
        session.metadata.lastActivity = new Date();
      }
    }, 60000); // Auto-save every minute

    this.autoSaveIntervals.set(sessionId, interval);
  }

  private stopAutoSave(sessionId: string): void {
    const interval = this.autoSaveIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(sessionId);
    }
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<{
    content: string;
    timestamp: number;
  }> {
    const session = this.userSessions.get(userId);
    if (!session) {
      throw new Error('User session not found');
    }

    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      messageId: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {
        correlationId: `corr_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0'
      }
    };
    session.conversationHistory.push(userMessage);
    session.metadata.messageCount++;

    // Process message and get response
    const response = { content: `Response to: ${message}`, timestamp: Date.now() };

    // Add assistant message to conversation history
    const assistantMessage: ConversationMessage = {
      messageId: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        correlationId: userMessage.metadata.correlationId,
        timestamp: new Date(),
        version: '1.0'
      }
    };
    session.conversationHistory.push(assistantMessage);
    session.metadata.messageCount++;

    return response;
  }

  async executeCode(userId: string, sessionId: string, code: string, language: string): Promise<ExecutionResult> {
    const session = this.userSessions.get(userId);
    if (!session) {
      throw new Error('User session not found');
    }
    // This would be handled by the CoreAdapter with sandbox
    return {
      output: `Executed ${language} code in sandbox`,
      error: undefined,
      exitCode: 0,
      executionTime: 100
    };
  }

  async createUserSession(
    userId: string,
    credentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<string> {
    // Check existing session
    const existingSession = this.userSessions.get(userId);
    if (existingSession && existingSession.client) {
      return existingSession.sessionId;
    }

    const sessionId = `session_${userId}_${Date.now()}`;
    
    // Setup workspace directory
    const fs = require('fs').promises;
    const path = require('path');
    const nfsBasePath = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';
    const userWorkspace = workingDirectory || path.resolve(process.cwd(), nfsBasePath, 'users', userId);
    
    try {
      await fs.mkdir(userWorkspace, { recursive: true });
      await fs.chmod(userWorkspace, 0o777);
    } catch (error) {
      console.log('User workspace creation skipped:', error);
    }

    // Create IDE directory to prevent ENOENT errors
    try {
      await fs.mkdir('/tmp/gemini/ide', { recursive: true });
    } catch (error) {
      console.log('IDE directory creation skipped:', error);
    }

    // Create qwen-code config with sandbox
    const config = new Config({
      sessionId,
      targetDir: userWorkspace,
      cwd: userWorkspace,
      debugMode: false,
      approvalMode: ApprovalMode.YOLO,
      mcpServers: {},
      includeDirectories: [],
      model: credentials?.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      sandbox: {
        command: 'docker' as const,
        image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
      },
    });

    await config.initialize();

    // Setup credentials
    const apiKey = credentials?.apiKey || process.env.OPENAI_API_KEY || 'sk-svcacct-team-key';
    let baseUrl = credentials?.baseUrl || process.env.OPENAI_BASE_URL || 'http://10.0.0.139:8080/v1';
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = `${baseUrl}/v1`;
    }

    config.updateCredentials({ apiKey, baseUrl, model: config.getModel() });
    await config.refreshAuth(AuthType.USE_OPENAI, true);

    // Create client
    const client = new GeminiClient(config);
    await client.initialize();

    // Store session
    const sessionData: EnhancedSessionData = {
      sessionId,
      userId,
      conversationHistory: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      metadata: {
        createdAt: new Date(Date.now()),
        lastActivity: new Date(Date.now()),
        messageCount: 0,
        compressionCount: 0
      },
      workspaceDir: userWorkspace,
      client,
      config
    };

    this.userSessions.set(userId, sessionData);

    // Save to MongoDB for persistence
    try {
      const mongoService = new (require('../../backend/src/services/mongoSessionService').MongoSessionService)();
      await mongoService.saveSession(sessionData);
    } catch (error) {
      console.log('MongoDB persistence skipped:', error);
    }

    // Start auto-save for this session
    this.startAutoSave(sessionId, userId);

    console.log(`Created sandboxed session for user ${userId}: ${sessionId}`);
    return sessionId;
  }

  getUserSession(userId: string): EnhancedSessionData | null {
    const session = this.userSessions.get(userId);
    if (session) {
      session.metadata.lastActivity = new Date();
    }
    return session || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      // Stop auto-save
      this.stopAutoSave(session.sessionId);
      
      // Final backup before deletion
      await this.backupService.backupSession(session.sessionId, session.conversationHistory);
      
      // Cleanup would happen here
      this.userSessions.delete(userId);
      console.log(`Deleted session for user ${userId}`);
    }
  }

  getUserSessions(userId: string): string[] {
    const session = this.userSessions.get(userId);
    return session ? [session.sessionId] : [];
  }

  async updateTokenUsage(
    userId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      session.tokenUsage.inputTokens += inputTokens;
      session.tokenUsage.outputTokens += outputTokens;
      session.tokenUsage.totalTokens += inputTokens + outputTokens;

      // Check if compression is needed
      if (session.tokenUsage.totalTokens > 30000) {
        session.conversationHistory = this.compressor.compressHistory(
          session.conversationHistory,
          session.tokenUsage.totalTokens
        );
        // Reset token count after compression
        session.tokenUsage.totalTokens = Math.floor(session.tokenUsage.totalTokens * 0.3);
      }
    }
  }

  async getSessionStats(userId: string, sessionId: string): Promise<{
    tokenUsage: TokenUsage;
    createdAt: Date;
    lastActivity: Date;
  } | null> {
    const session = this.userSessions.get(userId);
    if (session) {
      return {
        tokenUsage: session.tokenUsage,
        createdAt: session.metadata.createdAt,
        lastActivity: session.metadata.lastActivity,
      };
    }
    return null;
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const usersToCleanup: string[] = [];

    for (const [userId, session] of this.userSessions) {
      if ((now - session.metadata.lastActivity.getTime()) > maxAge) {
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      await this.deleteUserSession(userId);
    }
  }

  // Compatibility methods
  async getSession(sessionId: string): Promise<{
    id: string;
    userId: string;
    client?: any;
    config?: any;
    tokenUsage: TokenUsage;
    createdAt: Date;
    lastActivity: Date;
  } | null> {
    for (const [userId, session] of this.userSessions) {
      if (session.sessionId === sessionId) {
        return {
          id: sessionId,
          userId,
          client: session.client,
          config: session.config,
          tokenUsage: session.tokenUsage,
          createdAt: session.metadata.createdAt,
          lastActivity: session.metadata.lastActivity
        };
      }
    }
    return null;
  }

  async createSession(
    userId: string,
    userCredentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<{ id: string; userId: string }> {
    const sessionId = await this.createUserSession(userId, userCredentials, workingDirectory);
    return { id: sessionId, userId };
  }

  deleteSession(sessionId: string): void {
    for (const [userId, session] of this.userSessions) {
      if (session.sessionId === sessionId) {
        this.deleteUserSession(userId);
        break;
      }
    }
  }

  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Check every minute
  }

  // Session persistence methods
  async saveSession(sessionId: string, sessionData: SavedSessionData): Promise<void> {
    this.savedSessions.set(sessionId, sessionData);
  }

  async loadSession(sessionId: string): Promise<SavedSessionData | null> {
    return this.savedSessions.get(sessionId) || null;
  }

  async listSavedSessions(userId: string): Promise<SavedSessionData[]> {
    return Array.from(this.savedSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteSavedSession(sessionId: string): Promise<boolean> {
    return this.savedSessions.delete(sessionId);
  }
}

interface SessionData {
  sessionId: string;
  userId: string;
  conversationHistory: Array<{
    messageId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    metadata: {
      correlationId: string;
      version: string;
    };
  }>;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface ExecutionSession {
  userId: string;
  sessionId: string;
  sandbox: DockerSandbox;
  workspaceDir: string;
  createdAt: number;
  lastActivity: number;
  resourceLimits: {
    memory: string;
    cpus: number;
    diskSpace: string;
    networkAccess: boolean;
  };
}

export interface SavedSessionData {
  id: string;
  name: string;
  userId: string;
  conversationHistory: Array<{
    messageId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    metadata: {
      correlationId: string;
      version: string;
    };
  }>;
  workspacePath?: string;
  createdAt: Date;
  metadata?: {
    messageCount: number;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
}

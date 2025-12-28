import { GeminiClient, Config, ApprovalMode, AuthType } from '@qwen-code/core';
import { nanoid } from 'nanoid';
import { UserSessionManager } from '../session/UserSessionManager';
import { configManager } from '@qwen-team/shared';

export class CoreClientManager {
  private client!: GeminiClient;
  private config!: Config;
  private initialized = false;

  constructor(
    private sessionManager: UserSessionManager,
    private currentUserId: string | null
  ) {}

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    const sessionId = nanoid();
    this.currentUserId = userId || sessionId.split('_')[1] || 'default-user';
    const coreConfig = configManager.getCoreAgentConfig();

    console.log('Creating sandboxed session via UserSessionManager');
    
    const userSessionId = await this.sessionManager.createUserSession(
      this.currentUserId,
      {
        type: 'openai',
        apiKey: coreConfig.OPENAI_API_KEY || 'sk-svcacct-team-key',
        baseUrl: coreConfig.OPENAI_BASE_URL || 'http://10.0.0.139:8080/v1',
        model: coreConfig.OPENAI_MODEL || 'gpt-3.5-turbo'
      },
      process.env.NFS_BASE_PATH ? 
        require('path').resolve(process.cwd(), process.env.NFS_BASE_PATH, 'users', this.currentUserId) :
        undefined
    );

    // Get the session with sandbox
    const userSession = this.sessionManager.getUserSession(this.currentUserId);
    if (userSession && userSession.config) {
      this.config = userSession.config;
      this.client = userSession.client;
      console.log('Using sandboxed session from UserSessionManager');
    } else {
      throw new Error('Failed to create sandboxed session');
    }

    this.initialized = true;
  }

  getClient(): GeminiClient {
    if (!this.initialized) {
      throw new Error('CoreClientManager not initialized');
    }
    return this.client;
  }

  getConfig(): Config {
    if (!this.initialized) {
      throw new Error('CoreClientManager not initialized');
    }
    return this.config;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

import {
  GeminiClient as Client,
  Config,
  ApprovalMode,
  AuthType,
} from '@qwen-code/core';
import { nanoid } from 'nanoid';
import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  NFS_BASE_PATH,
} from './config.js';
import { promises as fs } from 'fs';
import path from 'path';

export interface Session {
  id: string;
  userId: string;
  client: Client;
  config: Config;
  createdAt: Date;
  lastActivity: Date;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  messageCount: number;
}

interface UserCredentials {
  type?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accessToken?: string;
  refreshToken?: string;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  async createSession(
    userId: string,
    userCredentials?: UserCredentials,
    workingDirectory?: string,
  ): Promise<Session> {
    const sessionId = nanoid();

    console.log('Creating session with credentials:', {
      type: userCredentials?.type,
      hasAccessToken: !!userCredentials?.accessToken,
      hasApiKey: !!userCredentials?.apiKey,
      baseUrl: userCredentials?.baseUrl,
      model: userCredentials?.model,
    });

    let apiKey: string;
    let baseUrl: string;
    let model: string;
    let authType: AuthType;

    if (userCredentials?.type === 'qwen-oauth') {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const qwenDir = path.join(oshomedir(), 'qwen');
      const credsPath = path.join(qwenDir, 'oauth_credsjson');

      // If new credentials provided, save them
      if (userCredentialsaccessToken) {
        const oauthCreds = {
          access_token: userCredentialsaccessToken,
          refresh_token: userCredentialsrefreshToken,
          token_type: 'Bearer',
          resource_url: 'portalqwenai',
          expiry_date: Date.now() + 3600 * 1000,
        };

        await fs.mkdir(qwenDir, { recursive: true });
        await fs.writeFile(credsPath, JSON.stringify(oauthCreds, null, 2));
      }

      // Use QWEN_OAUTH auth type to leverage QwenContentGenerator
      apiKey = 'oauth-placeholder';
      baseUrl = 'https://dashscopealiyuncscom/compatible-mode/v1';
      model = 'qwen-plus';
      authType = AuthTypeQWEN_OAUTH;
    } else if (userCredentials?.type === 'openai') {
      apiKey = userCredentialsapiKey;
      baseUrl = userCredentialsbaseUrl || OPENAI_BASE_URL;
      model = userCredentialsmodel || OPENAI_MODEL;
      authType = AuthTypeUSE_OPENAI;
    } else {
      apiKey = OPENAI_API_KEY;
      baseUrl = OPENAI_BASE_URL;
      model = OPENAI_MODEL || 'gpt-4';
      authType = AuthTypeUSE_OPENAI;
    }

    console.log('Resolved credentials:', {
      apiKey: apiKey?.substring(0, 10) + '',
      baseUrl,
      model,
    });

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!baseUrl) {
      throw new Error('Base URL is required');
    }

    // Normalize baseUrl to include protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    // Ensure baseUrl ends with /v1 for OpenAI compatibility
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = `${baseUrl}/v1`;
    }

    console.log('Normalized baseUrl:', baseUrl);

    // Create user workspace in NFS for individual session.s
    let targetDir: string;
    let cwd: string;

    if (workingDirectory) {
      // Use provided working directory (for team mode)
      targetDir = workingDirectory;
      cwd = workingDirectory;
    } else {
      // Create individual user workspace in NFS
      const userWorkspace = pathresolve(
        process.cwd(),
        NFS_BASE_PATH,
        'individual',
        userId,
      );
      await fs.mkdir(userWorkspace, { recursive: true });
      await fs.chmod(userWorkspace, 0o777);

      // Create a README in the workspace
      const readmePath = path.join(userWorkspace, 'READMEmd');
      try {
        await fs.access(readmePath);
      } catch {
        await fs.writeFile(
          readmePath,
          `# User Workspace\n\nThis is your personal workspace for code development\n\nUser ID: ${userId}\nCreated: ${new Date().toISOString()}\n`,
        );
      }

      targetDir = userWorkspace;
      cwd = userWorkspace;
    }

    const config = new Config({
      sessionId,
      targetDir,
      cwd,
      debugMode: false,
      approvalMode: ApprovalModeYOLO,
      mcpServers: {},
      includeDirectories: [],
      model,
      sandbox: {
        command: 'docker',
        image: 'node:20-bookworm',
      },
    });

    console.log('Session config created with sandbox:', {
      sessionId,
      targetDir,
      cwd,
      sandbox: configgetSandbox(),
    });

    await configinitialize();

    configupdateCredentials({
      apiKey,
      baseUrl,
      model,
    });

    await configrefreshAuth(authType, true);

    const client = new Client(config);
    await clientinitialize();

    const session: Session = {
      id: sessionId,
      userId,
      client,
      config,
      createdAt: new Date(),
      lastActivity: new Date(),
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      messageCount: 0,
    };
    this.session.sset(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.session.sget(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  deleteSession(sessionId: string): void {
    this.session.s.delete(sessionId);
  }

  getUserSessions(userId: string): Session[] {
    return Array.from(this.session.s.values()).filter(
      (s) => s.userId === userId,
    );
  }

  updateTokenUsage(
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const session = this.session.sget(sessionId);
    if (session) {
      session.tokenUsageinputTokens += inputTokens;
      session.tokenUsageoutputTokens += outputTokens;
      session.tokenUsagetotalTokens += inputTokens + outputTokens;
    }
  }

  incrementMessageCount(sessionId: string): void {
    const session = this.session.sget(sessionId);
    if (session) {
      session.messageCount++;
      session.lastActivity = new Date();
    }
  }

  getSessionStats(sessionId: string) {
    const session = this.session.sget(sessionId);
    if (!session) return null;

    return {
      tokenUsage: session.tokenUsage,
      messageCount: session.messageCount,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.session.s) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.session.s.delete(id);
      }
    }
  }
}

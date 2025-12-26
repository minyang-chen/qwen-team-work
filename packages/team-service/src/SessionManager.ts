import { ServerClient } from '@qwen-team/server-sdk';
import { nanoid } from 'nanoid';
import type { ConversationMessage } from '@qwen-team/shared';
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
  client: ServerClient;
  createdAt: Date;
  lastActivity: Date;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  messageCount: number;
  conversationHistory: ConversationMessage[];
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

    if (userCredentials?.type === 'qwen-oauth') {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const qwenDir = path.join(os.homedir(), '.qwen');
      const credsPath = path.join(qwenDir, 'oauth_creds.json');

      // If new credentials provided, save them
      if (userCredentials.accessToken) {
        const oauthCreds = {
          access_token: userCredentials.accessToken,
          refresh_token: userCredentials.refreshToken,
          token_type: 'Bearer',
          resource_url: 'portal.qwen.ai',
          expiry_date: Date.now() + 3600 * 1000,
        };

        await fs.mkdir(qwenDir, { recursive: true });
        await fs.writeFile(credsPath, JSON.stringify(oauthCreds, null, 2));
      }

      apiKey = 'oauth-placeholder';
      baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      model = 'qwen-plus';
    } else if (userCredentials?.type === 'openai') {
      apiKey = userCredentials.apiKey!;
      baseUrl = userCredentials.baseUrl || OPENAI_BASE_URL || 'https://api.openai.com/v1';
      model = userCredentials.model || OPENAI_MODEL || 'gpt-4';
    } else {
      apiKey = OPENAI_API_KEY || 'dummy-key';
      baseUrl = OPENAI_BASE_URL || 'https://api.openai.com/v1';
      model = OPENAI_MODEL || 'gpt-4';
    }

    console.log('Resolved credentials:', {
      apiKey: apiKey?.substring(0, 10) + '...',
      baseUrl,
      model,
    });

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!baseUrl) {
      throw new Error('Base URL is required');
    }

    // Normalize baseUrl
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    if (!baseUrl.endsWith('/v1')) {
      baseUrl = `${baseUrl}/v1`;
    }

    console.log('Normalized baseUrl:', baseUrl);

    // Create user workspace
    let targetDir: string;

    if (workingDirectory) {
      targetDir = workingDirectory;
    } else {
      const userWorkspace = path.resolve(
        process.cwd(),
        NFS_BASE_PATH,
        'individual',
        userId,
      );
      await fs.mkdir(userWorkspace, { recursive: true });
      await fs.chmod(userWorkspace, 0o777);

      const readmePath = path.join(userWorkspace, 'README.md');
      try {
        await fs.access(readmePath);
      } catch {
        await fs.writeFile(
          readmePath,
          `# User Workspace\n\nThis is your personal workspace for code development\n\nUser ID: ${userId}\nCreated: ${new Date().toISOString()}\n`,
        );
      }

      targetDir = userWorkspace;
    }

    // Create ServerClient
    const client = new ServerClient({
      apiKey,
      baseUrl,
      model,
      workingDirectory: targetDir,
    });

    await client.initialize();

    const session: Session = {
      id: sessionId,
      userId,
      client,
      createdAt: new Date(),
      lastActivity: new Date(),
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      messageCount: 0,
      conversationHistory: [],
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId,
    );
  }

  updateTokenUsage(
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tokenUsage.inputTokens += inputTokens;
      session.tokenUsage.outputTokens += outputTokens;
      session.tokenUsage.totalTokens += inputTokens + outputTokens;
    }
  }

  incrementMessageCount(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messageCount++;
      session.lastActivity = new Date();
    }
  }

  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
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
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}

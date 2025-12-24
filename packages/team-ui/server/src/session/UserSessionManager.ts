import type { IAgentDiscovery } from '@qwen-team/shared';
import { AcpClient } from '../acp/AcpClient.js';
import { SandboxManager } from '../SandboxManager.js';
import { DockerSandbox } from '../DockerSandbox.js';

// Local type definitions for missing shared types
interface ISessionManager {
  createUserSession(userId: string, credentials: UserCredentials, workingDirectory?: string): Promise<string>;
  deleteUserSession(userId: string): Promise<void>;
  getUserSessions(userId: string): string[];
}

interface UserCredentials {
  type: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class UserSessionManager implements ISessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sessionCleanupInterval!: NodeJS.Timeout;
  private sandboxManager = new SandboxManager();
  private executionSessions = new Map<string, ExecutionSession>();

  constructor(private agentDiscovery: IAgentDiscovery) {
    this.startSessionMonitoring();
  }

  async createUserSession(
    userId: string,
    credentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<string> {
    // Check existing session
    const existingClient = this.userSessions.get(userId);
    if (existingClient && existingClient.connectionState === 'connected') {
      return existingClient.sessionId!;
    }

    // Create ACP client
    const acpClient = new AcpClient(this.agentDiscovery);
    await acpClient.connect(['session.create', 'chat.send', 'tools.execute']);

    // Create session via protocol
    const sessionId = await acpClient.request('session.create', {
      userId,
      credentials,
      workingDirectory
    });

    // Create sandbox
    const sandbox = await this.sandboxManager.getSandbox(userId, workingDirectory || `/tmp/qwen-workspace-${userId}`);

    // Link session and sandbox
    this.executionSessions.set(sessionId, {
      userId,
      sessionId,
      sandbox,
      workspaceDir: workingDirectory || `/tmp/qwen-workspace-${userId}`,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      resourceLimits: {
        memory: '512m',
        cpus: 1,
        diskSpace: '1g',
        networkAccess: false
      }
    });

    this.userSessions.set(userId, acpClient);
    return sessionId;
  }

  getUserSession(userId: string): AcpClient | null {
    return this.userSessions.get(userId) || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      await acpClient.request('session.destroy', {
        sessionId: acpClient.sessionId
      });
      await this.cleanupExecutionSession(acpClient.sessionId!);
      this.userSessions.delete(userId);
    }
  }

  getUserSessions(userId: string): string[] {
    const acpClient = this.userSessions.get(userId);
    return acpClient ? [acpClient.sessionId!] : [];
  }

  async updateTokenUsage(
    userId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      await acpClient.request('session.updateTokens', {
        sessionId,
        inputTokens,
        outputTokens
      });
    }
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      return await acpClient.request('session.getStats', { sessionId });
    }
    return null;
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }
    return await acpClient.request('chat.send', { sessionId, content: message });
  }

  async sendMessageWithStreaming(
    userId: string, 
    sessionId: string, 
    message: string, 
    streamHandler: {
      onChunk: (chunk: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }

    try {
      // For now, use the existing sendMessage and simulate streaming
      const response = await acpClient.request('chat.send', { sessionId, content: message });
      
      if (response && response.content) {
        // Extract content after <|end|> token
        let content = response.content;
        const endTokenIndex = content.indexOf('<|end|>');
        if (endTokenIndex !== -1) {
          content = content.substring(endTokenIndex + 7).trim();
        }
        
        // Simulate streaming by chunking the response
        const chunkSize = 50;
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          streamHandler.onChunk(chunk);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      streamHandler.onComplete();
    } catch (error) {
      streamHandler.onError(error as Error);
    }
  }

  async executeCode(userId: string, sessionId: string, code: string, language: string): Promise<ExecutionResult> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }
    return await acpClient.request('tools.execute', { sessionId, code, language });
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const usersToCleanup: string[] = [];

    for (const [userId, acpClient] of this.userSessions) {
      const stats = await this.getSessionStats(userId, acpClient.sessionId!);
      if (stats && (now - stats.lastActivity) > maxAge) {
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      await this.deleteUserSession(userId);
    }
  }

  // Additional methods for compatibility with existing code
  async getSession(sessionId: string): Promise<any> {
    // Find user by sessionId
    for (const [userId, acpClient] of this.userSessions) {
      if (acpClient.sessionId === sessionId) {
        return {
          id: sessionId,
          userId,
          acpClient,
          // Mock properties for compatibility
          tokenUsage: await this.getSessionStats(userId, sessionId).then(s => s?.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
          createdAt: new Date(),
          lastActivity: new Date()
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
    // Find user by sessionId and delete
    for (const [userId, acpClient] of this.userSessions) {
      if (acpClient.sessionId === sessionId) {
        this.deleteUserSession(userId);
        break;
      }
    }
  }

  private async cleanupExecutionSession(sessionId: string): Promise<void> {
    const execSession = this.executionSessions.get(sessionId);
    if (execSession) {
      await execSession.sandbox.stop();
      this.executionSessions.delete(sessionId);
    }
  }

  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Check every minute
  }
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

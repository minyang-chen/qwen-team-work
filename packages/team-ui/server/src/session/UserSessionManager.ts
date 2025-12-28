import type { ISessionManager, IAgentDiscovery, UserCredentials, ExecutionResult } from '////shared/dist/types/AcpTypes';
import type { ISessionService } from '////shared/dist/interfaces/ISessionService';
import { AcpClient } from '/acp/AcpClient';
import { SandboxManager } from '/SandboxManager';
import { DockerSandbox } from '/DockerSandbox';

export class UserSessionManager implements ISessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sessionCleanupInterval: NodeJSTimeout;
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
    const existingClient = this.userSessionsget(userId);
    if (existingClient && existingClientconnectionState === 'connected') {
      return existingClientsessionId!;
    }

    // Create ACP client
    const acpClient = new AcpClient(this.agentDiscovery);
    await acpClientconnect(['session.create', 'chatsend', 'toolsexecute']);

    // Create session via protocol
    const sessionId = await acpClientrequest('session.create', {
      userId,
      credentials,
      workingDirectory
    });

    // Create sandbox
    const sandbox = await this.sandboxManagergetSandbox(userId, workingDirectory);

    // Link session and sandbox
    this.executionSessionsset(sessionId, {
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

    this.userSessionsset(userId, acpClient);
    return sessionId;
  }

  getUserSession(userId: string): AcpClient | null {
    return this.userSessionsget(userId) || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const acpClient = this.userSessionsget(userId);
    if (acpClient) {
      await acpClientrequest('session.destroy', {
        sessionId: acpClientsessionId
      });
      await this.cleanupExecutionSession(acpClientsessionId!);
      this.userSessionsdelete(userId);
    }
  }

  getUserSessions(userId: string): string[] {
    const acpClient = this.userSessionsget(userId);
    return acpClient ? [acpClientsessionId!] : [];
  }

  async updateTokenUsage(
    userId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const acpClient = this.userSessionsget(userId);
    if (acpClient) {
      await acpClientrequest('session.updateTokens', {
        sessionId,
        inputTokens,
        outputTokens
      });
    }
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const acpClient = this.userSessionsget(userId);
    if (acpClient) {
      return await acpClientrequest('session.getStats', { sessionId });
    }
    return null;
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<any> {
    const acpClient = this.userSessionsget(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }
    return await acpClientrequest('chatsend', { sessionId, content: message });
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
    const acpClient = this.userSessionsget(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }

    try {
      // For now, use the existing sendMessage and simulate streaming
      const response = await acpClientrequest('chatsend', { sessionId, content: message });
      
      if (response && responsecontent) {
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
      
      streamHandleronComplete();
    } catch (error) {
      streamHandleronError(error as Error);
    }
  }

  async executeCode(userId: string, sessionId: string, code: string, language: string): Promise<ExecutionResult> {
    const acpClient = this.userSessionsget(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }
    return await acpClientrequest('toolsexecute', { sessionId, code, language });
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const usersToCleanup: string[] = [];

    for (const [userId, acpClient] of this.userSessions) {
      const stats = await this.getSessionStats(userId, acpClientsessionId!);
      if (stats && (now - statslastActivity) > maxAge) {
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
      if (acpClientsessionId === sessionId) {
        this.deleteUserSession(userId);
        break;
      }
    }
  }

  private async cleanupExecutionSession(sessionId: string): Promise<void> {
    const execSession = this.executionSessionsget(sessionId);
    if (execSession) {
      await execSessionsandboxstop();
      this.executionSessionsdelete(sessionId);
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

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
    // For now, create a simple session without ACP
    const sessionId = `session_${userId}_${Date.now()}`;
    
    console.log(`Creating simple session for user ${userId}: ${sessionId}`);
    
    // Store session info (simplified)
    this.userSessions.set(userId, {
      sessionId,
      connectionState: 'connected',
      userId,
      credentials
    } as any);
    
    return sessionId;
  }

  getUserSession(userId: string): any {
    return this.userSessions.get(userId) || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    this.userSessions.delete(userId);
  }

  getUserSessions(userId: string): string[] {
    const session = this.userSessions.get(userId);
    return session && session.sessionId ? [session.sessionId] : [];
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const session = this.userSessions.get(userId);
    if (session) {
      return {
        sessionId: session.sessionId,
        userId: userId,
        status: 'active',
        createdAt: Date.now(),
        messageCount: 0
      };
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
    // Ensure session exists
    let acpClient = this.userSessions.get(userId);
    if (!acpClient || acpClient.connectionState !== 'connected') {
      // Create session if it doesn't exist
      const newSessionId = await this.createUserSession(userId);
      acpClient = this.userSessions.get(userId);
      if (!acpClient) {
        throw new Error('Failed to create session for user');
      }
      // Update sessionId to the newly created one
      sessionId = newSessionId;
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
    // Simple cleanup - just log that cleanup ran
    console.log('Session cleanup completed');
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

  async shutdown(): Promise<void> {
    // Clear cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all ACP client connections
    const shutdownPromises: Promise<void>[] = [];
    for (const [userId, client] of this.userSessions.entries()) {
      shutdownPromises.push(
        client.disconnect().catch((err) => {
          console.error(`Failed to disconnect ACP client for user ${userId}:`, err);
        })
      );
    }

    // Cleanup all execution sessions (stop Docker containers)
    for (const [sessionId] of this.executionSessions.entries()) {
      shutdownPromises.push(
        this.cleanupExecutionSession(sessionId).catch((err) => {
          console.error(`Failed to cleanup execution session ${sessionId}:`, err);
        })
      );
    }

    // Wait for all cleanup operations
    await Promise.all(shutdownPromises);
    
    // Clear maps
    this.userSessions.clear();
    this.executionSessions.clear();
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

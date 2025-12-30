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
  
  // Circuit breaker state
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds

  constructor(private agentDiscovery: IAgentDiscovery) {
    this.startSessionMonitoring();
  }

  async createUserSession(
    userId: string,
    credentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<string> {
    // Check existing session
    const existingSession = this.userSessions.get(userId);
    if (existingSession && existingSession.sessionId) {
      return existingSession.sessionId;
    }

    // Create session using ACP client with retry logic
    let lastError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const acpClient = new AcpClient(this.agentDiscovery);
        await acpClient.connect(['session.create', 'chat.send', 'tools.execute']);

        // Create session via ACP protocol
        const sessionResponse = await acpClient.request('session.create', {
          userId,
          credentials,
          workingDirectory
        });

        const sessionId = typeof sessionResponse === 'string' 
          ? sessionResponse 
          : sessionResponse.session?.sessionId || sessionResponse.sessionId;

        // Store ACP client with session info
        acpClient.sessionId = sessionId;
        this.userSessions.set(userId, acpClient);
        
        console.log(`Creating session for user ${userId}: ${sessionId} (attempt ${attempt})`);
        return sessionId;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Session creation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw new Error(`Failed to create session after ${maxRetries} attempts: ${lastError?.message}`);
  }

  getUserSession(userId: string): any {
    return this.userSessions.get(userId) || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      try {
        await acpClient.request('session.destroy', {
          sessionId: acpClient.sessionId
        });
      } catch (error) {
        console.error('Error destroying session:', error);
      }
      await acpClient.disconnect();
      this.userSessions.delete(userId);
    }
  }

  getUserSessions(userId: string): string[] {
    const acpClient = this.userSessions.get(userId);
    return acpClient && acpClient.sessionId ? [acpClient.sessionId] : [];
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      try {
        return await acpClient.request('session.getStats', { sessionId, userId });
      } catch (error) {
        console.error('Error getting session stats:', error);
        return {
          sessionId: acpClient.sessionId,
          userId: userId,
          status: 'active',
          createdAt: Date.now(),
          messageCount: 0
        };
      }
    }
    return null;
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
    // Handle shell commands directly
    if (message.startsWith('!')) {
      await this.executeShellCommand(userId, message, streamHandler);
      return;
    }

    // Check circuit breaker state
    if (this.circuitBreakerState === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN - ACP service unavailable');
      } else {
        this.circuitBreakerState = 'HALF_OPEN';
        console.log('Circuit breaker moved to HALF_OPEN state');
      }
    }

    try {
      const acpClient = this.userSessions.get(userId);
      if (!acpClient || acpClient.connectionState !== 'connected') {
        throw new Error('No active session found');
      }

      // Send message via ACP protocol
      const response = await acpClient.request('chat.send', {
        sessionId,
        message,
        stream: true
      });
      
      // Handle response - simulate streaming
      if (response && response.content) {
        const content = response.content;
        const chunkSize = 20;
        
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          streamHandler.onChunk(chunk);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      streamHandler.onComplete();
      
      // Success - reset circuit breaker
      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'CLOSED';
        this.failureCount = 0;
        console.log('Circuit breaker reset to CLOSED state');
      }
      
    } catch (error) {
      // Handle circuit breaker failure
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.circuitBreakerState = 'OPEN';
        console.log(`Circuit breaker opened after ${this.failureCount} failures`);
      }
      
      throw error;
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
      try {
        const stats = await this.getSessionStats(userId, acpClient.sessionId!);
        if (stats && (now - stats.lastActivity) > maxAge) {
          usersToCleanup.push(userId);
        }
      } catch (error) {
        console.error(`Error checking session stats for user ${userId}:`, error);
        // Remove problematic session
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      console.log(`Cleaning up inactive session for user: ${userId}`);
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

  async shutdown(): Promise<void> {
    // Clear cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all ACP client connections
    const shutdownPromises: Promise<void>[] = [];
    for (const [userId, acpClient] of this.userSessions.entries()) {
      shutdownPromises.push(
        acpClient.disconnect().catch((err) => {
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

  getCircuitBreakerStatus(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  async checkAcpHealth(): Promise<boolean> {
    try {
      // Try to get available agents
      const agent = await this.agentDiscovery.selectBestAgent('session.create');
      return !!agent;
    } catch (error) {
      console.error('ACP health check failed:', error);
      return false;
    }
  }

  resetCircuitBreaker(): void {
    this.circuitBreakerState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('Circuit breaker manually reset');
  }

  private async executeShellCommand(
    userId: string,
    message: string,
    streamHandler: {
      onChunk: (chunk: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      const command = message.slice(1).trim(); // Remove '!' prefix
      
      if (!command) {
        streamHandler.onChunk('❌ **Error:** Empty command\n');
        streamHandler.onComplete();
        return;
      }

      // Ensure user workspace exists
      const { NFS_BASE_PATH } = await import('../config.js');
      const { promises: fs } = await import('fs');
      const { resolve } = await import('path');
      
      const userWorkspace = resolve(process.cwd(), NFS_BASE_PATH, 'individual', userId);
      await fs.mkdir(userWorkspace, { recursive: true });
      await fs.chmod(userWorkspace, 0o777);

      // Get user's sandbox
      const sandbox = await this.sandboxManager.getSandbox(userId, userWorkspace);
      
      // Execute command
      const startTime = Date.now();
      const result = await sandbox.execute(command);
      const duration = Date.now() - startTime;

      // Format output with nice markdown
      let output = `## 🐚 Shell Command\n\n`;
      output += `\`\`\`bash\n$ ${command}\n\`\`\`\n\n`;
      
      if (result.stdout) {
        output += `### 📤 Output\n\`\`\`\n${result.stdout.trim()}\n\`\`\`\n\n`;
      }
      
      if (result.stderr) {
        output += `### ⚠️ Error Output\n\`\`\`\n${result.stderr.trim()}\n\`\`\`\n\n`;
      }
      
      // Status info
      const statusIcon = result.exitCode === 0 ? '✅' : '❌';
      output += `### ${statusIcon} Status\n`;
      output += `- **Exit Code:** ${result.exitCode}\n`;
      output += `- **Duration:** ${duration}ms\n`;
      output += `- **Executed in:** Docker sandbox\n`;

      // Stream the formatted result
      streamHandler.onChunk(output);
      streamHandler.onComplete();
      
    } catch (error) {
      const errorMsg = `## ❌ Shell Execution Failed\n\n\`\`\`\n${error instanceof Error ? error.message : 'Unknown error'}\n\`\`\`\n`;
      streamHandler.onChunk(errorMsg);
      streamHandler.onComplete();
    }
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

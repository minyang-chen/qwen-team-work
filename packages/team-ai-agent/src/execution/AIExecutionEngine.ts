import { ServerClient } from '../server/ServerClient.js';
import { EnhancedToolExecutor } from './EnhancedToolExecutor.js';
import type { 
  EnhancedServerConfig, 
  EnhancedQueryResult, 
  EnhancedStreamChunk 
} from '../server/types.js';

interface AIExecutionContext {
  sessionId: string;
  userId: string;
  teamId?: string;
  projectId?: string;
  workingDirectory?: string;
}

export class AIExecutionEngine {
  private clients = new Map<string, ServerClient>();
  private executors = new Map<string, EnhancedToolExecutor>();

  async getOrCreateClient(context: AIExecutionContext): Promise<ServerClient> {
    const clientKey = `${context.userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`;
    
    let client = this.clients.get(clientKey);
    if (!client) {
      const config: EnhancedServerConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL || 'qwen-coder',
        sessionId: context.sessionId,
        workingDirectory: context.workingDirectory || '/workspace',
        teamId: context.teamId,
        projectId: context.projectId,
        collaborationMode: context.teamId ? 'shared' : 'individual',
      };

      client = new ServerClient(config);
      await client.initialize();
      
      this.clients.set(clientKey, client);
      this.executors.set(clientKey, new EnhancedToolExecutor(client));
    }

    return client;
  }

  async executeMessage(
    message: string,
    context: AIExecutionContext
  ): Promise<EnhancedQueryResult> {
    const client = await this.getOrCreateClient(context);
    return client.query(message, {
      sessionContext: [],
      mcpServers: {},
      toolPreferences: {},
    });
  }

  async *executeMessageStream(
    message: string,
    context: AIExecutionContext
  ): AsyncGenerator<EnhancedStreamChunk> {
    const client = await this.getOrCreateClient(context);
    
    for await (const chunk of client.queryStream(message, {
      sessionContext: [],
      mcpServers: {},
      toolPreferences: {},
    })) {
      yield chunk;
    }
  }

  async getToolExecutor(context: AIExecutionContext): Promise<EnhancedToolExecutor> {
    const clientKey = `${context.userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`;
    await this.getOrCreateClient(context); // Ensure client exists
    return this.executors.get(clientKey)!;
  }

  async cleanup(context: AIExecutionContext): Promise<void> {
    const clientKey = `${context.userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`;
    
    const client = this.clients.get(clientKey);
    if (client) {
      await client.cleanup();
      this.clients.delete(clientKey);
      this.executors.delete(clientKey);
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.clients.values()).map(client => client.cleanup());
    await Promise.all(cleanupPromises);
    
    this.clients.clear();
    this.executors.clear();
  }

  getActiveSessionsCount(): number {
    return this.clients.size;
  }

  getHealthStatus() {
    return {
      status: 'healthy',
      activeSessions: this.clients.size,
      timestamp: new Date().toISOString(),
    };
  }
}

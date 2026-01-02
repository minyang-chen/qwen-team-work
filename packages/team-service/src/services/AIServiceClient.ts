import { AcpClient } from '../acp/AcpClient.js';
import type { AcpMessage, AcpResponse, IAgentDiscovery } from '@qwen-team/shared';
import { AgentConfigManager } from '../discovery/AgentConfigManager.js';

interface AIServiceConfig {
  agentEndpoint: string;
  timeout?: number;
  retries?: number;
}

export class AIServiceClient {
  private acpClient: AcpClient;
  private agentDiscovery: IAgentDiscovery;

  constructor(private config: AIServiceConfig) {
    // Create agent discovery manager
    this.agentDiscovery = new AgentConfigManager();
    this.acpClient = new AcpClient(this.agentDiscovery);
  }

  async sendMessage(
    message: string,
    context: {
      sessionId: string;
      userId: string;
      teamId?: string;
      projectId?: string;
      workingDirectory?: string;
    }
  ): Promise<any> {
    // Ensure connection
    if (!this.acpClient.isConnected()) {
      await this.acpClient.connect(['chat.send']);
    }

    const response = await this.acpClient.request('chat.send', {
      message,
      ...context
    });
    
    return response;
  }

  async *streamMessage(
    message: string,
    context: {
      sessionId: string;
      userId: string;
      teamId?: string;
      projectId?: string;
      workingDirectory?: string;
    }
  ): AsyncGenerator<any> {
    console.log('[AIServiceClient] streamMessage called');
    
    if (!this.acpClient.isConnected()) {
      await this.acpClient.connect(['chat.send']);
    }

    const response = await this.acpClient.request('chat.send', {
      message,
      ...context
    });

    const content = response?.content || response?.text || '';
    console.log('[AIServiceClient] Got content, length:', content.length);
    
    const chunkSize = 20;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      yield { type: 'content', text: chunk };
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    yield { type: 'finished' };
  }

  async executeTool(
    toolName: string,
    parameters: any,
    context: {
      sessionId: string;
      userId: string;
      teamId?: string;
      projectId?: string;
    }
  ): Promise<any> {
    // Ensure connection
    if (!this.acpClient.isConnected()) {
      await this.acpClient.connect(['tools.execute']);
    }

    const response = await this.acpClient.request('tools.execute', {
      toolName,
      parameters,
      ...context
    });
    
    return response;
  }

  async getHealth(): Promise<any> {
    // Ensure connection
    if (!this.acpClient.isConnected()) {
      await this.acpClient.connect(['health.check']);
    }

    const response = await this.acpClient.request('health.check', {});
    return response;
  }

  async disconnect(): Promise<void> {
    await this.acpClient.disconnect();
  }
}

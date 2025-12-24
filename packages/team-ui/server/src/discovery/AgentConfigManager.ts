import type { IAgentDiscovery, AgentConfig } from '@qwen-team/shared';
import { promises as fs } from 'fs';
import path from 'path';

// Extended agent config with additional properties from JSON
interface ExtendedAgentConfig extends AgentConfig {
  priority?: number;
  healthCheck?: string;
  maxSessions?: number;
  metadata?: {
    name: string;
    version: string;
    region: string;
  };
}

export class AgentConfigManager implements IAgentDiscovery {
  private agents: ExtendedAgentConfig[] = [];
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'agents.json');
    this.loadConfiguration();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.agents = config.agents.sort((a: ExtendedAgentConfig, b: ExtendedAgentConfig) => 
        (a.priority || 0) - (b.priority || 0)
      );
      console.log(`Loaded ${this.agents.length} agent configurations`);
    } catch (error) {
      console.warn('Failed to load agent configuration, using defaults:', error);
      this.agents = this.getDefaultAgents();
    }
  }

  private getDefaultAgents(): ExtendedAgentConfig[] {
    return [{
      id: 'qwen-core-local',
      endpoint: 'ws://localhost:8080',
      capabilities: ['session.create', 'chatsend', 'toolsexecute'],
      priority: 1,
      healthCheck: 'http://localhost:8080/health',
      metadata: {
        name: 'Local Qwen Core Agent',
        version: '100',
        maxSessions: 100
      }
    }];
  }

  async discoverAgents(timeout: number = 5000): Promise<AgentConfig[]> {
    const healthyAgents: AgentConfig[] = [];

    for (const agent of this.agents) {
      try {
        const isHealthy = await this.healthCheck(agent, timeout);
        if (isHealthy) {
          healthyAgents.push(agent);
        }
      } catch (error) {
        console.warn(`Agent ${agent.id} health check failed:`, (error as Error).message);
      }
    }

    return healthyAgents;
  }

  async selectBestAgent(capability: string): Promise<AgentConfig | null> {
    const capabilities = Array.isArray(capability) ? capability : [capability];
    const healthyAgents = await this.discoverAgents();

    for (const agent of healthyAgents) {
      if (this.hasCapabilities(agent, capabilities)) {
        console.log(`Selected agent: ${agent.id} at ${agent.endpoint}`);
        return agent;
      }
    }

    console.error('No compatible agents found for capabilities:', capabilities);
    return null;
  }

  getAvailableAgents(): ExtendedAgentConfig[] {
    return this.agents;
  }

  private hasCapabilities(agent: AgentConfig, required: string[]): boolean {
    return required.every(cap => agent.capabilities.includes(cap));
  }

  private async healthCheck(agent: ExtendedAgentConfig, timeout: number = 2000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(agent.healthCheck || `${agent.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async reloadConfiguration(): Promise<void> {
    await this.loadConfiguration();
  }

  addAgent(agent: ExtendedAgentConfig): void {
    this.agents.push(agent);
    this.agents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  removeAgent(agentId: string): boolean {
    const initialLength = this.agents.length;
    this.agents = this.agents.filter(agent => agent.id !== agentId);
    return this.agents.length < initialLength;
  }

  getAgentById(agentId: string): ExtendedAgentConfig | null {
    return this.agents.find(agent => agent.id === agentId) || null;
  }

  // Required by IAgentDiscovery interface
  async registerAgent(agent: AgentConfig): Promise<void> {
    this.addAgent(agent as ExtendedAgentConfig);
  }
}

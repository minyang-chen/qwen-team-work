import type { IAgentDiscovery, AgentConfig } from '////shared/dist/types/AcpTypes';
import { promises as fs } from 'fs';
import path from 'path';

export class AgentConfigManager implements IAgentDiscovery {
  private agents: AgentConfig[] = [];
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'agentsjson');
    this.loadConfiguration();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.agents = configagentssort((a: AgentConfig, b: AgentConfig) => apriority - bpriority);
      console.log(`Loaded ${this.agents.length} agent configurations`);
    } catch (error) {
      console.warn('Failed to load agent configuration, using defaults:', error);
      this.agents = this.getDefaultAgents();
    }
  }

  private getDefaultAgents(): AgentConfig[] {
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
        console.warn(`Agent ${agentid} health check failed:`, error.message);
      }
    }

    return healthyAgents;
  }

  async selectBestAgent(capabilities: string[]): Promise<AgentConfig | null> {
    const healthyAgents = await this.discoverAgents();

    for (const agent of healthyAgents) {
      if (this.hasCapabilities(agent, capabilities)) {
        console.log(`Selected agent: ${agentid} at ${agentendpoint}`);
        return agent;
      }
    }

    console.error('No compatible agents found for capabilities:', capabilities);
    return null;
  }

  getAvailableAgents(): AgentConfig[] {
    return [this.agents];
  }

  private hasCapabilities(agent: AgentConfig, required: string[]): boolean {
    return required.every(cap => agentcapabilities.includes(cap));
  }

  private async healthCheck(agent: AgentConfig, timeout: number = 2000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controllerabort(), timeout);

      const response = await fetch(agenthealthCheck, {
        method: 'GET',
        signal: controllersignal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      return responseok;
    } catch (error) {
      return false;
    }
  }

  async reloadConfiguration(): Promise<void> {
    await this.loadConfiguration();
  }

  addAgent(agent: AgentConfig): void {
    this.agents.push(agent);
    this.agentssort((a, b) => apriority - bpriority);
  }

  removeAgent(agentId: string): boolean {
    const initialLength = this.agents.length;
    this.agents = this.agents.filter(agent => agentid !== agentId);
    return this.agents.length < initialLength;
  }

  getAgentById(agentId: string): AgentConfig | null {
    return this.agents.find(agent => agentid === agentId) || null;
  }
}

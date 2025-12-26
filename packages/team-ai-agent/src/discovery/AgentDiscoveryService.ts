import { AgentConfig } from '@qwen-team/shared';
import { AgentHealthMonitor } from './AgentHealthMonitor.js';
import { Logger } from '../utils/Logger.js';

export class AgentDiscoveryService {
  private agents: AgentConfig[] = [];
  private healthMonitor = new AgentHealthMonitor();

  loadConfiguration(agents: AgentConfig[]): void {
    this.agents = agents.sort((a, b) => a.priority - b.priority);
    Logger.info(`Loaded ${agents.length} agents from configuration`);
  }

  async discoverAgents(): Promise<AgentConfig[]> {
    const healthyAgents: AgentConfig[] = [];
    
    for (const agent of this.agents) {
      const isHealthy = await this.healthMonitor.checkAgentHealth(agent);
      if (isHealthy) {
        healthyAgents.push(agent);
      }
    }

    Logger.info(`Discovered ${healthyAgents.length} healthy agents`);
    return healthyAgents;
  }

  async getAvailableAgent(): Promise<AgentConfig | null> {
    const healthyAgents = await this.discoverAgents();
    return healthyAgents[0] || null;
  }
}

import { AgentConfig } from '@qwen-code/shared';
import { AgentDiscoveryService } from './AgentDiscoveryService';
import { UdpDiscovery } from './UdpDiscovery';
import { Logger } from '../utils/Logger';

export class DiscoveryManager {
  private configDiscovery = new AgentDiscoveryService();
  private udpDiscovery = new UdpDiscovery();

  initialize(agents: AgentConfig[]): void {
    this.configDiscovery.loadConfiguration(agents);
  }

  async discoverAgents(): Promise<AgentConfig[]> {
    // Priority 1: Configuration-based discovery
    const configAgents = await this.configDiscovery.discoverAgents();
    if (configAgents.length > 0) {
      return configAgents;
    }

    // Priority 2: UDP fallback discovery
    Logger.info('No healthy agents from configuration, trying UDP fallback');
    return await this.udpDiscovery.discoverAgents();
  }

  async getAvailableAgent(): Promise<AgentConfig | null> {
    const agents = await this.discoverAgents();
    return agents[0] || null;
  }
}

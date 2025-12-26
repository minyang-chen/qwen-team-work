import { AgentConfig } from '@qwen-team/shared';
import { Logger } from '../utils/Logger.js';

export class UdpDiscovery {
  async discoverAgents(): Promise<AgentConfig[]> {
    try {
      // Minimal UDP discovery implementation - placeholder
      Logger.info('UDP discovery fallback activated');
      return [];
    } catch (error) {
      Logger.error('UDP discovery failed', error);
      return [];
    }
  }
}

// ACP (Agent Communication Protocol) Types
export interface AgentConfig {
  id: string;
  name: string;
  endpoint: string;
  capabilities: string[];
}

export interface AcpResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface IAgentDiscovery {
  discoverAgents(): Promise<AgentConfig[]>;
  registerAgent(config: AgentConfig): Promise<void>;
  selectBestAgent?(capability: string): Promise<AgentConfig | null>;
}

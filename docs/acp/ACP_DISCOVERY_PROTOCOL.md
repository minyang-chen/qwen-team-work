# ACP Agent Discovery Protocol - Updated

## **Discovery Strategy Overview**

### **Primary Method: Configuration-Based Selection**
- **Default approach** for production deployments
- **No network dependencies** or firewall configuration required
- **Explicit agent configuration** with health monitoring
- **Predictable and secure** agent selection

### **Fallback Method: UDP Discovery (Optional)**
- **Disabled by default** in production
- **Development/testing only** unless explicitly enabled
- **Requires network configuration** and security considerations

## **Implementation Priority**

```
1. Configuration-Based (Primary) ──► Production Ready
2. Health Monitoring            ──► Reliability  
3. UDP Discovery (Optional)     ──► Development Aid
```

## **Configuration-Based Discovery**

### **1. Agent Configuration File**

#### **`config/agents.json`**
```json
{
  "discovery": {
    "method": "config",
    "fallbackEnabled": false,
    "healthCheckInterval": 30000,
    "connectionTimeout": 5000
  },
  "agents": [
    {
      "id": "qwen-core-primary",
      "endpoint": "ws://localhost:8080",
      "healthCheck": "http://localhost:8080/health",
      "capabilities": ["session.create", "chat.send", "tools.execute"],
      "priority": 1,
      "maxSessions": 100,
      "metadata": {
        "name": "Qwen Core Agent",
        "version": "1.0.0",
        "region": "local"
      }
    }
  ]
}
```

### **2. Configuration Manager**

#### **`packages/web-ui/server/src/discovery/AgentConfigManager.ts`**
```typescript
import { Logger } from '../utils/Logger';

interface AgentConfig {
  id: string;
  endpoint: string;
  healthCheck: string;
  capabilities: string[];
  priority: number;
  maxSessions: number;
  metadata: Record<string, any>;
}

export class AgentConfigManager {
  private agents: AgentConfig[] = [];
  private logger: Logger;

  constructor(configPath: string = './config/agents.json') {
    this.logger = new Logger('AgentConfigManager');
    this.loadConfiguration(configPath);
  }

  private loadConfiguration(configPath: string) {
    try {
      const config = require(configPath);
      this.agents = config.agents.sort((a, b) => a.priority - b.priority);
      this.logger.info(`Loaded ${this.agents.length} agent configurations`);
    } catch (error) {
      this.logger.error('Failed to load agent configuration:', error);
      throw new Error('Agent configuration required');
    }
  }

  async selectBestAgent(requiredCapabilities: string[]): Promise<AgentConfig | null> {
    for (const agent of this.agents) {
      if (this.hasCapabilities(agent, requiredCapabilities)) {
        if (await this.healthCheck(agent)) {
          return agent;
        }
      }
    }
    return null;
  }

  private hasCapabilities(agent: AgentConfig, required: string[]): boolean {
    return required.every(cap => agent.capabilities.includes(cap));
  }

  private async healthCheck(agent: AgentConfig): Promise<boolean> {
    try {
      const response = await fetch(agent.healthCheck, { 
        method: 'GET',
        timeout: 2000 
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(`Health check failed for ${agent.id}:`, error.message);
      return false;
    }
  }

  getAvailableAgents(): AgentConfig[] {
    return [...this.agents];
  }
}
```

### **3. Enhanced ACP Client**

#### **Update `packages/web-ui/server/src/acp/AcpClient.ts`**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { AgentConfigManager } from '../discovery/AgentConfigManager';
import { Logger } from '../utils/Logger';

export class AcpClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private configManager: AgentConfigManager;
  private currentAgent: any = null;
  private logger: Logger;

  constructor(configPath?: string) {
    this.configManager = new AgentConfigManager(configPath);
    this.logger = new Logger('AcpClient');
  }

  async connect(requiredCapabilities: string[] = ['session.create', 'chat.send']): Promise<void> {
    // Primary: Configuration-based selection
    const agent = await this.configManager.selectBestAgent(requiredCapabilities);
    
    if (!agent) {
      throw new Error('No healthy agents available');
    }

    await this.connectToAgent(agent);
    this.currentAgent = agent;
    this.logger.info(`Connected to agent: ${agent.id}`);
  }

  private async connectToAgent(agent: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(agent.endpoint);
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      
      // Set connection timeout
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  // ... rest of existing methods
}
```

## **Optional UDP Discovery (Fallback)**

### **Configuration to Enable**
```json
{
  "discovery": {
    "method": "config",
    "fallbackEnabled": true,
    "udpDiscoveryTimeout": 5000
  }
}
```

### **Minimal UDP Implementation**
```typescript
// Only used when configuration fails and explicitly enabled
private async fallbackUdpDiscovery(): Promise<AgentConfig | null> {
  if (!this.isFallbackEnabled()) return null;
  
  // Simple UDP broadcast implementation
  // ... existing UDP code (simplified)
}
```

## **Benefits of Configuration-First Approach**

### **Production Advantages**
- ✅ **No network configuration** required
- ✅ **Predictable agent selection** 
- ✅ **Security compliance** (no broadcast traffic)
- ✅ **Explicit health monitoring**
- ✅ **Load balancing control**

### **Operational Benefits**
- ✅ **Configuration management** integration
- ✅ **Environment-specific** agent selection
- ✅ **Monitoring and alerting** ready
- ✅ **Disaster recovery** planning

## **Migration Path**

### **Phase 1: Configuration Only**
- Implement configuration-based discovery
- Add health monitoring
- Test agent selection logic

### **Phase 2: Optional UDP (If Needed)**
- Add UDP discovery as fallback
- Disabled by default
- Development/testing environments only

This approach addresses the network complexity and security concerns while maintaining the flexibility for automatic discovery when needed.

interface DiscoveredAgent {
  agentId: string;
  endpoint: string;
  capabilities: string[];
  metadata: {
    name: string;
    version: string;
    models?: string[];
    maxSessions?: number;
  };
  lastSeen: number;
}

export class AgentDiscovery {
  private socket: dgram.Socket | null = null;
  private discoveredAgents = new Map<string, DiscoveredAgent>();
  private logger: Logger;

  constructor(private discoveryPort: number = 9999) {
    this.logger = new Logger('AgentDiscovery');
  }

  async discoverAgents(timeout: number = 5000): Promise<DiscoveredAgent[]> {
    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket('udp4');
      
      // Listen for agent announcements
      this.socket.on('message', (msg, rinfo) => {
        try {
          const message: AcpMessage = JSON.parse(msg.toString());
          if (message.type === 'agent.announce') {
            this.handleAgentAnnouncement(message, rinfo);
          }
        } catch (error) {
          this.logger.warn('Invalid announcement message:', error);
        }
      });

      this.socket.bind(() => {
        // Send discovery request
        const discoveryMessage: AcpMessage = {
          id: `discover_${Date.now()}`,
          type: 'agent.discover',
          payload: {
            requiredCapabilities: ['chat.send', 'session.create'],
            clientInfo: {
              name: 'qwen-web-ui',
              version: '1.0.0'
            }
          },
          timestamp: Date.now()
        };

        const message = Buffer.from(JSON.stringify(discoveryMessage));
        this.socket?.send(message, this.discoveryPort, '255.255.255.255');
        
        this.logger.info('Sent discovery request');
      });

      // Timeout and return results
      setTimeout(() => {
        this.socket?.close();
        const agents = Array.from(this.discoveredAgents.values());
        this.logger.info(`Discovered ${agents.length} agents`);
        resolve(agents);
      }, timeout);
    });
  }

  private handleAgentAnnouncement(message: AcpMessage, rinfo: dgram.RemoteInfo): void {
    const { agentId, endpoint, capabilities, metadata } = message.payload;
    
    const agent: DiscoveredAgent = {
      agentId,
      endpoint,
      capabilities,
      metadata,
      lastSeen: Date.now()
    };

    this.discoveredAgents.set(agentId, agent);
    this.logger.info(`Discovered agent: ${agentId} at ${endpoint}`);
  }

  async selectBestAgent(requiredCapabilities: string[] = []): Promise<DiscoveredAgent | null> {
    const agents = await this.discoverAgents();
    
    // Filter by required capabilities
    const compatibleAgents = agents.filter(agent => 
      requiredCapabilities.every(cap => agent.capabilities.includes(cap))
    );

    if (compatibleAgents.length === 0) {
      return null;
    }

    // Select agent with most available capacity
    return compatibleAgents.reduce((best, current) => {
      const bestCapacity = best.metadata.maxSessions || 100;
      const currentCapacity = current.metadata.maxSessions || 100;
      return currentCapacity > bestCapacity ? current : best;
    });
  }

  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values());
  }

  clearDiscoveredAgents(): void {
    this.discoveredAgents.clear();
  }
}
```

### **2. Enhanced ACP Client with Discovery**

#### **Update `packages/web-ui/server/src/acp/AcpClient.ts`**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { AgentDiscovery } from '../discovery/AgentDiscovery';
import { SessionCommands } from '../commands/SessionCommands';
import { Logger } from '../utils/Logger';

export class AcpClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private agentDiscovery: AgentDiscovery;
  private logger: Logger;
  // ... existing properties

  constructor(sessionCommands: SessionCommands) {
    this.sessionCommands = sessionCommands;
    this.agentDiscovery = new AgentDiscovery();
    this.logger = new Logger('AcpClient');
  }

  async connect(agentUrl?: string, userId?: string): Promise<void> {
    this.userId = userId || null;
    
    let targetUrl = agentUrl;
    
    // Use discovery if no URL provided
    if (!targetUrl) {
      this.logger.info('No agent URL provided, starting discovery...');
      const agent = await this.agentDiscovery.selectBestAgent([
        'session.create',
        'chat.send'
      ]);
      
      if (!agent) {
        throw new Error('No compatible agents discovered');
      }
      
      targetUrl = agent.endpoint;
      this.logger.info(`Selected agent: ${agent.agentId} at ${targetUrl}`);
    }

    // Connect to agent
    this.connectionState = 'connecting';
    this.ws = new WebSocket(targetUrl);
    
    // ... existing connection logic
  }

  async discoverAgents(): Promise<any[]> {
    return await this.agentDiscovery.discoverAgents();
  }

  // ... rest of existing methods
}
```

### **3. Configuration Updates**

#### **`packages/web-ui/server/src/config.ts`**
```typescript
export const config = {
  // ... existing config
  
  // Discovery Configuration
  discovery: {
    enabled: process.env.ACP_DISCOVERY_ENABLED !== 'false',
    port: parseInt(process.env.ACP_DISCOVERY_PORT || '9999'),
    timeout: parseInt(process.env.ACP_DISCOVERY_TIMEOUT || '5000'),
    retries: parseInt(process.env.ACP_DISCOVERY_RETRIES || '3'),
    fallbackUrl: process.env.ACP_FALLBACK_URL || 'ws://localhost:8080'
  }
};
```

### **4. Environment Variables**

#### **`.env.example`**
```env
# Discovery Configuration
ACP_DISCOVERY_ENABLED=true
ACP_DISCOVERY_PORT=9999
ACP_DISCOVERY_TIMEOUT=5000
ACP_DISCOVERY_RETRIES=3
ACP_FALLBACK_URL=ws://localhost:8080

# Agent Configuration (for qwen-core-agent)
ACP_PORT=8080
AGENT_ID=qwen-core-1
AGENT_NAME=Qwen Core Agent
AGENT_VERSION=1.0.0
MAX_SESSIONS=1000
```

## Discovery Message Types

### **Discovery Request**
```typescript
{
  id: "discover_1703123456789",
  type: "agent.discover",
  payload: {
    requiredCapabilities: ["chat.send", "session.create"],
    clientInfo: {
      name: "qwen-web-ui",
      version: "1.0.0"
    }
  },
  timestamp: 1703123456789
}
```

### **Agent Announcement**
```typescript
{
  id: "announce_1703123456790",
  type: "agent.announce",
  payload: {
    agentId: "qwen-core-1",
    endpoint: "ws://192.168.1.100:8080",
    capabilities: [
      "session.create",
      "session.destroy",
      "chat.send",
      "chat.stream",
      "code.execute"
    ],
    metadata: {
      name: "Qwen Core Agent",
      version: "1.0.0",
      models: ["qwen3-coder-plus", "qwen3-coder-30b"],
      maxSessions: 1000,
      currentSessions: 45,
      load: 0.45
    }
  },
  timestamp: 1703123456790
}
```

## Security Considerations

### **1. Network Security**
- Discovery limited to local network (broadcast domain)
- Optional authentication tokens for agent announcements
- Rate limiting on discovery requests

### **2. Agent Validation**
- Verify agent capabilities before connection
- Validate agent metadata and version compatibility
- Implement agent health checks

### **3. Fallback Mechanisms**
- Fallback to configured agent URL if discovery fails
- Retry logic with exponential backoff
- Manual agent configuration override

## Testing Discovery Protocol

### **Unit Tests**
```typescript
// packages/web-ui/server/__tests__/AgentDiscovery.test.ts
describe('AgentDiscovery', () => {
  test('should discover agents on network', async () => {
    const discovery = new AgentDiscovery();
    const agents = await discovery.discoverAgents(1000);
    
    expect(agents).toBeInstanceOf(Array);
    // Test with mock UDP responses
  });

  test('should select best agent based on capacity', async () => {
    const discovery = new AgentDiscovery();
    // Mock multiple agents with different capacities
    const bestAgent = await discovery.selectBestAgent(['chat.send']);
    
    expect(bestAgent).toBeDefined();
    expect(bestAgent?.capabilities).toContain('chat.send');
  });
});
```

### **Integration Tests**
```typescript
// Test discovery with real agent
describe('Discovery Integration', () => {
  test('should connect to discovered agent', async () => {
    const client = new AcpClient(sessionCommands);
    await client.connect(); // No URL - should use discovery
    
    const response = await client.sendMessage('Hello');
    expect(response.success).toBe(true);
  });
});
```

This discovery protocol implementation enables automatic agent detection and selection, making the ACP system more robust and easier to deploy.

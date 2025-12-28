# UserSessionManager - Complete SessionManager Replacement

## **Overview**

This document details the complete replacement of the existing `SessionManager` with `UserSessionManager` for ACP integration. This eliminates all integration conflicts by using a protocol-based approach from the ground up.

## **File Changes Required**

### **1. Create New Files**

#### **`server/src/session/UserSessionManager.ts`**
```typescript
import { AcpClient } from '../acp/AcpClient';
import { IAgentDiscovery } from '@qwen-code/shared';
import { SandboxManager } from '../SandboxManager';
import { DockerSandbox } from '../DockerSandbox';

export class UserSessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sessionCleanupInterval: NodeJS.Timeout;
  private sandboxManager = new SandboxManager();
  private executionSessions = new Map<string, ExecutionSession>();

  constructor(private agentDiscovery: IAgentDiscovery) {
    this.startSessionMonitoring();
  }

  async createUserSession(
    userId: string,
    userCredentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<string> {
    // Check existing session
    const existingClient = this.userSessions.get(userId);
    if (existingClient && existingClient.connectionState === 'connected') {
      return existingClient.sessionId!;
    }

    // Create ACP client
    const acpClient = new AcpClient(this.agentDiscovery);
    await acpClient.connect(['session.create', 'chat.send', 'tools.execute']);

    // Create session via protocol
    const sessionId = await acpClient.request('session.create', {
      userId,
      credentials: userCredentials,
      workingDirectory
    });

    // Create sandbox
    const sandbox = await this.sandboxManager.getSandbox(userId, workingDirectory);

    // Link session and sandbox
    this.executionSessions.set(sessionId, {
      userId,
      sessionId,
      sandbox,
      workspaceDir: workingDirectory || `/tmp/qwen-workspace-${userId}`,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      resourceLimits: {
        memory: '512m',
        cpus: 1,
        diskSpace: '1g',
        networkAccess: false
      }
    });

    this.userSessions.set(userId, acpClient);
    return sessionId;
  }

  getUserSession(userId: string): AcpClient | null {
    return this.userSessions.get(userId) || null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      await acpClient.request('session.destroy', {
        sessionId: acpClient.sessionId
      });
      await this.cleanupExecutionSession(acpClient.sessionId!);
      this.userSessions.delete(userId);
    }
  }

  getUserSessions(userId: string): string[] {
    const acpClient = this.userSessions.get(userId);
    return acpClient ? [acpClient.sessionId!] : [];
  }

  async updateTokenUsage(
    userId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      await acpClient.request('session.updateTokens', {
        sessionId,
        inputTokens,
        outputTokens
      });
    }
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      return await acpClient.request('session.getStats', { sessionId });
    }
    return null;
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }
    return await acpClient.request('chat.send', { sessionId, content: message });
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const usersToCleanup: string[] = [];

    for (const [userId, acpClient] of this.userSessions) {
      const stats = await this.getSessionStats(userId, acpClient.sessionId!);
      if (stats && (now - stats.lastActivity) > maxAge) {
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      await this.deleteUserSession(userId);
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
    }, 60000);
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

interface UserCredentials {
  type?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accessToken?: string;
  refreshToken?: string;
}
```

#### **`server/src/acp/AcpClient.ts`**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse, IAgentDiscovery } from '@qwen-code/shared';
import { generateId } from '../utils/generateId';

export class AcpClient {
  private ws: WebSocket | null = null;
  public sessionId: string | null = null;
  public connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private pendingRequests = new Map<string, PendingRequest>();

  constructor(private agentDiscovery: IAgentDiscovery) {}

  async connect(capabilities: string[]): Promise<void> {
    const agent = await this.agentDiscovery.selectBestAgent(capabilities);
    if (!agent) {
      throw new Error('No compatible agents found');
    }

    this.connectionState = 'connecting';
    this.ws = new WebSocket(agent.endpoint);

    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.connectionState = 'connected';
        this.setupMessageHandling();
        resolve();
      };

      this.ws!.onerror = (error) => {
        this.connectionState = 'error';
        reject(error);
      };
    });
  }

  async request(type: string, payload: any): Promise<any> {
    if (this.connectionState !== 'connected') {
      throw new Error('ACP client not connected');
    }

    const id = generateId();
    const message: AcpMessage = { id, type, payload, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private setupMessageHandling(): void {
    this.ws!.onmessage = (event) => {
      const response: AcpResponse = JSON.parse(event.data);
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        if (response.success) {
          pending.resolve(response.data);
        } else {
          pending.reject(new Error(response.error?.message || 'Request failed'));
        }
        this.pendingRequests.delete(response.id);
      }
    };
  }

  getAgentUrl(): string {
    return this.ws?.url || '';
  }
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}
```

### **2. Delete Old Files**

- **`server/src/SessionManager.ts`** - Remove entirely

### **3. Update Existing Files**

#### **`server/src/index.ts`**
```typescript
// OLD imports
import { SessionManager } from './SessionManager.js';

// NEW imports
import { UserSessionManager } from './session/UserSessionManager.js';
import { AgentConfigManager } from './discovery/AgentConfigManager.js';

// OLD instantiation
const sessionManager = new SessionManager();

// NEW instantiation
const agentDiscovery = new AgentConfigManager();
const userSessionManager = new UserSessionManager(agentDiscovery);

// OLD API endpoints (8 locations to update)
app.post('/api/sessions', async (request, reply) => {
  const session = await sessionManager.createSession(user.userId, user.credentials, workingDirectory);
  return { sessionId: session.id };
});

// NEW API endpoints
app.post('/api/sessions', async (request, reply) => {
  const sessionId = await userSessionManager.createUserSession(user.userId, user.credentials, workingDirectory);
  return { sessionId };
});

// Update all other endpoints similarly...
```

#### **`server/src/websocket.ts`**
```typescript
// OLD imports and parameters
import type { SessionManager } from './SessionManager.js';
export function setupWebSocket(io: SocketServer, sessionManager: SessionManager) {

// NEW imports and parameters
import type { UserSessionManager } from './session/UserSessionManager.js';
export function setupWebSocket(io: SocketServer, userSessionManager: UserSessionManager) {

// OLD message handling
socket.on('chat:message', async (data) => {
  const session = sessionManager.getSession(data.sessionId);
  if (!session) {
    socket.emit('error', { message: 'Session not found' });
    return;
  }
  
  const adapter = new ClientAdapter(session.client, toolExecutor, ...);
  await adapter.sendMessage(finalMessage, socket, abortController.signal);
});

// NEW message handling
socket.on('chat:message', async (data) => {
  try {
    const response = await userSessionManager.sendMessage(
      data.userId,
      data.sessionId,
      data.message
    );
    socket.emit('chat:response', response);
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
});
```

## **Migration Steps**

### **Step 1: Create New Files**
```bash
# Create UserSessionManager and AcpClient
touch server/src/session/UserSessionManager.ts
touch server/src/acp/AcpClient.ts
touch server/src/discovery/AgentConfigManager.ts
```

### **Step 2: Update Imports and Usage**
```bash
# Update all files that import SessionManager
# Replace 8 usage locations in index.ts and websocket.ts
```

### **Step 3: Remove Old Files**
```bash
# Delete old SessionManager
rm server/src/SessionManager.ts
```

### **Step 4: Test Integration**
```bash
# Test all functionality with new UserSessionManager
npm test
```

## **Benefits of Complete Replacement**

1. **✅ No Integration Conflicts**: Built specifically for ACP protocol
2. **✅ User-Centric Design**: Better multi-user session management
3. **✅ Protocol-Based**: All communication via ACP messages
4. **✅ Standalone Deployment**: No @qwen-code/core dependencies
5. **✅ Clean Architecture**: No legacy constraints or workarounds

## **Testing Checklist**

- [ ] Session creation via API endpoint
- [ ] WebSocket message handling
- [ ] Token usage tracking
- [ ] Session statistics
- [ ] Session cleanup
- [ ] User session isolation
- [ ] ACP protocol communication
- [ ] Error handling and recovery

This complete replacement approach eliminates all integration conflicts and provides a clean, ACP-native session management system.

# ACP Code Changes - Part 2: Web-UI Package (Continued)

## Package: `packages/web-ui` (Continued)

### New Files (Continued)

#### **4. `server/src/session/SessionPersistenceManager.ts`**
```typescript
import { SavedSession } from '@qwen-code/shared';
import { HybridSessionManager } from './HybridSessionManager';
import { NFSWorkspaceManager } from '../storage/NFSWorkspaceManager';
import { ConversationCompressor } from '../utils/ConversationCompressor';
import { acpSessionService } from '../../../backend/src/services/acpSessionService';
import { ConversationHistory } from '../../../backend/src/models/AcpSession';

export class SessionPersistenceManager {
  constructor(
    private sessionManager: HybridSessionManager,
    private nfsManager: NFSWorkspaceManager,
    private compressor: ConversationCompressor
  ) {}

  async saveSession(userId: string, sessionId: string, metadata?: any): Promise<string> {
    const session = this.sessionManager.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Get workspace paths
    const workspacePaths = this.nfsManager.getWorkspacePaths(userId, sessionId);
    const savedWorkspacePaths = this.nfsManager.getWorkspacePaths(userId, `saved_${sessionId}`);

    // Copy workspace files to saved location
    await this.nfsManager.copyWorkspace(workspacePaths.active, savedWorkspacePaths.saved);

    // Get and compress conversation history
    const conversationHistory = await this.getConversationHistory(sessionId);
    const compressedHistory = await this.compressor.compress(conversationHistory);

    // Save to MongoDB
    await acpSessionService.saveSession(
      sessionId,
      userId,
      savedWorkspacePaths.saved,
      compressedHistory,
      metadata
    );

    return sessionId;
  }

  async resumeSession(userId: string, sessionId: string): Promise<string> {
    // Load saved session from MongoDB
    const savedSession = await acpSessionService.getSavedSession(userId, sessionId);
    if (!savedSession) throw new Error('Session not found');

    // Create new active session
    const newSession = await this.sessionManager.createSession(userId);

    // Restore workspace files
    const newWorkspacePaths = this.nfsManager.getWorkspacePaths(userId, newSession.id);
    await this.nfsManager.restoreWorkspace(savedSession.workspacePath, newWorkspacePaths.active);

    // Restore conversation history
    const decompressedHistory = await this.compressor.decompress(savedSession.conversationHistory);
    await this.restoreConversationHistory(newSession.id, decompressedHistory);

    return newSession.id;
  }

  async listUserSessions(userId: string): Promise<any[]> {
    return await acpSessionService.listUserSavedSessions(userId);
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const savedSession = await acpSessionService.getSavedSession(userId, sessionId);
    if (!savedSession) throw new Error('Session not found');

    // Delete workspace files
    await this.nfsManager.cleanupWorkspace(savedSession.workspacePath);

    // Delete from MongoDB
    await acpSessionService.deleteSavedSession(userId, sessionId);
  }

  private async getConversationHistory(sessionId: string): Promise<any[]> {
    const history = await ConversationHistory.findOne({ sessionId });
    return history?.messages || [];
  }

  private async restoreConversationHistory(sessionId: string, messages: any[]): Promise<void> {
    await ConversationHistory.findOneAndUpdate(
      { sessionId },
      { sessionId, messages, lastUpdated: new Date() },
      { upsert: true }
    );
  }
}
```

#### **5. `server/src/commands/SessionCommands.ts`**
```typescript
import { SessionPersistenceManager } from '../session/SessionPersistenceManager';

export class SessionCommands {
  constructor(private persistenceManager: SessionPersistenceManager) {}

  async handleCommand(userId: string, sessionId: string, command: string): Promise<string> {
    const [cmd, ...args] = command.trim().split(' ');

    switch (cmd) {
      case '/save':
        return await this.handleSave(userId, sessionId, args[0]);
      
      case '/sessions':
        return await this.handleList(userId);
      
      case '/resume':
        if (!args[0]) throw new Error('Usage: /resume <sessionId>');
        return await this.handleResume(userId, args[0]);
      
      case '/delete':
        if (!args[0]) throw new Error('Usage: /delete <sessionId>');
        return await this.handleDelete(userId, args[0]);
      
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }

  private async handleSave(userId: string, sessionId: string, projectName?: string): Promise<string> {
    const metadata = projectName ? { projectName } : undefined;
    await this.persistenceManager.saveSession(userId, sessionId, metadata);
    return `✅ Session saved${projectName ? ` as "${projectName}"` : ''}`;
  }

  private async handleList(userId: string): Promise<string> {
    const sessions = await this.persistenceManager.listUserSessions(userId);
    
    if (sessions.length === 0) {
      return '📝 No saved sessions found';
    }

    const sessionList = sessions.map((s, index) => 
      `${index + 1}. ${s.sessionId} - ${s.metadata?.projectName || 'Untitled'} (${new Date(s.lastSaved).toLocaleDateString()})`
    ).join('\n');

    return `📋 Saved Sessions:\n${sessionList}`;
  }

  private async handleResume(userId: string, sessionId: string): Promise<string> {
    const newSessionId = await this.persistenceManager.resumeSession(userId, sessionId);
    return `🔄 Session resumed as ${newSessionId}`;
  }

  private async handleDelete(userId: string, sessionId: string): Promise<string> {
    await this.persistenceManager.deleteSession(userId, sessionId);
    return `🗑️ Session ${sessionId} deleted`;
  }
}
```

#### **6. `server/src/acp/AcpClient.ts`**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { SessionCommands } from '../commands/SessionCommands';
import { nanoid } from 'nanoid';

export class AcpClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private sessionCommands: SessionCommands;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor(sessionCommands: SessionCommands) {
    this.sessionCommands = sessionCommands;
  }

  async connect(agentUrl: string, userId: string): Promise<void> {
    this.connectionState = 'connecting';
    this.userId = userId;
    
    this.ws = new WebSocket(agentUrl);
    
    this.ws.onopen = () => {
      this.connectionState = 'connected';
    };

    this.ws.onmessage = (event) => {
      const response: AcpResponse = JSON.parse(event.data);
      this.handleResponse(response);
    };

    this.ws.onerror = () => {
      this.connectionState = 'error';
    };

    this.ws.onclose = () => {
      this.connectionState = 'disconnected';
    };

    await this.waitForConnection();

    // Create session
    const sessionResponse = await this.request('session.create', { userId });
    this.sessionId = sessionResponse.sessionId;
  }

  async sendMessage(content: string): Promise<AcpResponse> {
    if (!this.sessionId || !this.userId) throw new Error('No active session');

    // Handle session commands
    if (content.startsWith('/')) {
      try {
        const result = await this.sessionCommands.handleCommand(this.userId, this.sessionId, content);
        return { 
          id: nanoid(), 
          success: true, 
          data: { content: result }, 
          timestamp: Date.now() 
        };
      } catch (error) {
        return { 
          id: nanoid(), 
          success: false, 
          error: { code: 'COMMAND_ERROR', message: error.message }, 
          timestamp: Date.now() 
        };
      }
    }

    // Regular chat message
    return await this.request('chat.send', {
      sessionId: this.sessionId,
      content
    });
  }

  async executeCode(code: string, language: string): Promise<AcpResponse> {
    if (!this.sessionId) throw new Error('No active session');

    return await this.request('code.execute', {
      sessionId: this.sessionId,
      code,
      language
    });
  }

  private async request(type: string, payload: any): Promise<any> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to ACP agent');
    }

    const id = nanoid();
    const message: AcpMessage = {
      id,
      type,
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws?.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private handleResponse(response: AcpResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error?.message || 'Unknown error'));
      }
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected') {
        resolve();
        return;
      }

      const checkConnection = () => {
        if (this.connectionState === 'connected') {
          resolve();
        } else if (this.connectionState === 'error') {
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.request('session.destroy', { sessionId: this.sessionId });
      } catch (error) {
        console.warn('Failed to properly destroy session:', error);
      }
    }

    this.ws?.close();
    this.sessionId = null;
    this.userId = null;
    this.connectionState = 'disconnected';
  }
}
```

### Modified Files

#### **`server/src/SessionManager.ts`** (Major Refactor)
```typescript
import { HybridSessionManager } from './session/HybridSessionManager';
import { SessionPersistenceManager } from './session/SessionPersistenceManager';
import { NFSWorkspaceManager } from './storage/NFSWorkspaceManager';
import { ConversationCompressor } from './utils/ConversationCompressor';
import { SessionCommands } from './commands/SessionCommands';
import { AcpClient } from './acp/AcpClient';

export class SessionManager {
  private hybridSessionManager: HybridSessionManager;
  private persistenceManager: SessionPersistenceManager;
  private acpClients = new Map<string, AcpClient>();
  private sessionCommands: SessionCommands;

  constructor() {
    this.hybridSessionManager = new HybridSessionManager();
    
    const nfsManager = new NFSWorkspaceManager();
    const compressor = new ConversationCompressor();
    
    this.persistenceManager = new SessionPersistenceManager(
      this.hybridSessionManager,
      nfsManager,
      compressor
    );
    
    this.sessionCommands = new SessionCommands(this.persistenceManager);
  }

  async createSession(userId: string): Promise<string> {
    // Create hybrid session (in-memory + MongoDB + Docker)
    const session = await this.hybridSessionManager.createSession(userId);

    // Create ACP client for this session
    const acpClient = new AcpClient(this.sessionCommands);
    
    const agentUrl = process.env.ACP_AGENT_URL || 'ws://localhost:8080';
    await acpClient.connect(agentUrl, userId);

    this.acpClients.set(session.id, acpClient);

    return session.id;
  }

  async sendMessage(sessionId: string, content: string): Promise<any> {
    const acpClient = this.acpClients.get(sessionId);
    if (!acpClient) throw new Error('Session not found');

    // Update activity
    await this.hybridSessionManager.updateActivity(sessionId);

    return await acpClient.sendMessage(content);
  }

  async executeCode(sessionId: string, code: string, language: string): Promise<any> {
    const acpClient = this.acpClients.get(sessionId);
    if (!acpClient) throw new Error('Session not found');

    // Update activity
    await this.hybridSessionManager.updateActivity(sessionId);

    return await acpClient.executeCode(code, language);
  }

  async destroySession(sessionId: string): Promise<void> {
    // Disconnect ACP client
    const acpClient = this.acpClients.get(sessionId);
    if (acpClient) {
      await acpClient.disconnect();
      this.acpClients.delete(sessionId);
    }

    // Terminate hybrid session
    await this.hybridSessionManager.terminateSession(sessionId);
  }

  getActiveSessionCount(): number {
    return this.acpClients.size;
  }
}
```

#### **`server/src/config.ts`** (Add ACP Configuration)
```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Existing config...
  port: parseInt(process.env.PORT || '3001'),
  
  // ACP Configuration
  acp: {
    agentUrl: process.env.ACP_AGENT_URL || 'ws://localhost:8080',
    discoveryEnabled: process.env.ACP_DISCOVERY_ENABLED === 'true',
    discoveryTimeout: parseInt(process.env.ACP_DISCOVERY_TIMEOUT || '5000'),
    maxRetries: parseInt(process.env.ACP_MAX_RETRIES || '3'),
    timeout: parseInt(process.env.ACP_TIMEOUT || '30000')
  },

  // Session Configuration
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 min
    warningTimeout: parseInt(process.env.SESSION_WARNING_TIMEOUT || '1500000'), // 25 min
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5')
  },

  // Storage Configuration
  storage: {
    nfsBasePath: process.env.NFS_BASE_PATH || '/nfs',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_acp_sessions'
  }
};
```

#### **`server/package.json`** (Add Dependencies)
```json
{
  "name": "@qwen-code/web-ui-server",
  "version": "1.0.0",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "express": "^4.18.0",
    "ws": "^8.14.0",
    "mongoose": "^7.5.0",
    "nanoid": "^4.0.0",
    "dotenv": "^16.3.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0",
    "@types/node": "^20.0.0"
  }
}
```

### Environment Configuration

#### **`server/.env.example`**
```env
# ACP Configuration
ACP_AGENT_URL=ws://localhost:8080
ACP_DISCOVERY_ENABLED=true
ACP_DISCOVERY_TIMEOUT=5000
ACP_MAX_RETRIES=3
ACP_TIMEOUT=30000

# Session Configuration
SESSION_TIMEOUT=1800000
SESSION_WARNING_TIMEOUT=1500000
MAX_SESSIONS_PER_USER=5

# Storage Configuration
NFS_BASE_PATH=/nfs
MONGODB_URI=mongodb://localhost:27017/qwen_acp_sessions

# Existing configuration...
PORT=3001
```

---

## Testing Files

### **`server/src/__tests__/HybridSessionManager.test.ts`**
```typescript
import { HybridSessionManager } from '../session/HybridSessionManager';
import { ActiveSession } from '../../../backend/src/models/AcpSession';

describe('HybridSessionManager', () => {
  let manager: HybridSessionManager;

  beforeEach(() => {
    manager = new HybridSessionManager();
  });

  test('should create session in memory and MongoDB', async () => {
    const session = await manager.createSession('user123');
    
    expect(session.id).toBeDefined();
    expect(session.userId).toBe('user123');
    expect(manager.getActiveSession(session.id)).toBeDefined();
    
    const dbSession = await ActiveSession.findOne({ sessionId: session.id });
    expect(dbSession).toBeDefined();
    expect(dbSession?.userId).toBe('user123');
  });

  test('should update activity timestamp', async () => {
    const session = await manager.createSession('user123');
    const originalActivity = session.lastActivity;
    
    await new Promise(resolve => setTimeout(resolve, 10));
    await manager.updateActivity(session.id);
    
    const updatedSession = manager.getActiveSession(session.id);
    expect(updatedSession?.lastActivity).toBeGreaterThan(originalActivity);
  });

  test('should terminate session and cleanup resources', async () => {
    const session = await manager.createSession('user123');
    
    await manager.terminateSession(session.id);
    
    expect(manager.getActiveSession(session.id)).toBeUndefined();
    
    const dbSession = await ActiveSession.findOne({ sessionId: session.id });
    expect(dbSession?.status).toBe('terminated');
  });
});
```

### **`server/src/__tests__/SessionPersistence.test.ts`**
```typescript
import { SessionPersistenceManager } from '../session/SessionPersistenceManager';
import { HybridSessionManager } from '../session/HybridSessionManager';
import { NFSWorkspaceManager } from '../storage/NFSWorkspaceManager';
import { ConversationCompressor } from '../utils/ConversationCompressor';

describe('SessionPersistenceManager', () => {
  let manager: SessionPersistenceManager;
  let sessionManager: HybridSessionManager;

  beforeEach(() => {
    sessionManager = new HybridSessionManager();
    const nfsManager = new NFSWorkspaceManager();
    const compressor = new ConversationCompressor();
    
    manager = new SessionPersistenceManager(sessionManager, nfsManager, compressor);
  });

  test('should save and resume session', async () => {
    // Create and save session
    const session = await sessionManager.createSession('user123');
    await manager.saveSession('user123', session.id, { projectName: 'test-project' });
    
    // Resume session
    const newSessionId = await manager.resumeSession('user123', session.id);
    
    expect(newSessionId).toBeDefined();
    expect(newSessionId).not.toBe(session.id); // Should be new session ID
    
    const newSession = sessionManager.getActiveSession(newSessionId);
    expect(newSession).toBeDefined();
  });

  test('should list user saved sessions', async () => {
    const session = await sessionManager.createSession('user123');
    await manager.saveSession('user123', session.id, { projectName: 'test-project' });
    
    const sessions = await manager.listUserSessions('user123');
    
    expect(sessions).toHaveLength(1);
    expect(sessions[0].metadata?.projectName).toBe('test-project');
  });
});
```

This completes the detailed code changes for the web-ui package. The next part will cover any remaining packages and deployment configurations.

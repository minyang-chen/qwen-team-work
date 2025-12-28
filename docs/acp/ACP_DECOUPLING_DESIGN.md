# ACP-Based Decoupling Design Document

## **Executive Summary**

This document outlines the design for decoupling `packages/web-ui` and `packages/backend` from `@qwen-code/core` using Agent Communication Protocol (ACP), enabling standalone deployment outside the main qwen-code project.

## **Current State vs Target State**

### **Current Architecture**
```
packages/web-ui/server ──imports──► @qwen-code/core
packages/backend ──────────────────► (independent)
```

### **Target Architecture**
```
┌─────────────────────────────────────────┐    ACP Discovery    ┌─────────────────────────────────────────┐
│          Standalone Deployment          │ ◄─────────────────► │         qwen-code Project               │
│  ┌─────────────────────────────────────┐ │                     │  ┌─────────────────────────────────────┐ │
│  │         packages/web-ui             │ │   agent.discover    │  │         qwen-core-agent             │ │
│  │  ┌─────────────────────────────────┐│ │ ──────────────────► │  │  ┌─────────────────────────────────┐│ │
│  │  │      ACP Client Library         ││ │                     │  │  │      ACP Message Handler       ││ │
│  │  │  • AgentDiscovery               ││ │   agent.announce    │  │  │  • SessionManager               ││ │
│  │  │  • WebSocket Connection         ││ │ ◄────────────────── │  │  │  • ToolExecutor                 ││ │
│  │  │  • Message Routing              ││ │                     │  │  │  • AgentAnnouncer               ││ │
│  │  └─────────────────────────────────┘│ │                     │  │  └─────────────────────────────────┘│ │
│  └─────────────────────────────────────┘ │                     │  │                                     │ │
│  ┌─────────────────────────────────────┐ │   chat.send         │  │  ┌─────────────────────────────────┐ │
│  │        packages/backend             │ │   tools.execute     │  │  │        @qwen-code/core          │ │
│  │  ┌─────────────────────────────────┐│ │   session.create    │  │  │  • GeminiClient                 │ │
│  │  │      ACP Client Library         ││ │ ──────────────────► │  │  │  • CoreToolScheduler            │ │
│  │  │  • AgentDiscovery               ││ │                     │  │  │  • Config                       │ │
│  │  │  • Database Operations          ││ │   Response Stream   │  │  │  • Authentication               │ │
│  │  │  • User Management              ││ │ ◄────────────────── │  │  └─────────────────────────────────┘│ │
│  │  └─────────────────────────────────┘│ │                     │  └─────────────────────────────────────┘ │
│  └─────────────────────────────────────┘ │                     └─────────────────────────────────────────┘
│  ┌─────────────────────────────────────┐ │
│  │         shared-types                │ │     Discovery Flow:
│  │  • AcpMessage                       │ │     1. Broadcast agent.discover
│  │  • AcpResponse                      │ │     2. Agents respond with agent.announce
│  │  • Agent Interface                  │ │     3. Client selects best agent
│  │  • Capability Definitions           │ │     4. Establish WebSocket connection
│  └─────────────────────────────────────┘ │     5. Begin ACP message exchange
└─────────────────────────────────────────┘
```

## **Design Principles**

1. **Zero Direct Dependencies**: No imports from `@qwen-code/core` in standalone packages
2. **Protocol-Based Communication**: All interactions via standardized ACP messages
3. **Deployment Independence**: Web-UI/Backend can deploy without qwen-code project
4. **Backward Compatibility**: Existing functionality preserved
5. **Gradual Migration**: Phased implementation approach

### **Session Transition Error Handling**

#### **Error Boundaries and Fallback Mechanisms**
```typescript
// Session transition error handling
export class SessionTransitionManager {
  async saveSession(sessionId: string): Promise<SaveResult> {
    try {
      // Primary save attempt
      return await this.primarySave(sessionId);
    } catch (error) {
      // Fallback mechanisms
      return await this.handleSaveError(sessionId, error);
    }
  }

  private async handleSaveError(sessionId: string, error: Error): Promise<SaveResult> {
    // 1. Retry with exponential backoff
    if (this.isRetryableError(error)) {
      return await this.retryWithBackoff(sessionId);
    }
    
    // 2. Graceful degradation - save locally
    if (this.isNetworkError(error)) {
      return await this.saveLocally(sessionId);
    }
    
    // 3. User notification with recovery options
    return {
      success: false,
      error: error.message,
      recoveryOptions: ['retry', 'save_locally', 'continue_without_save']
    };
  }
}

// Connection resilience
export class ResilientAcpClient {
  private connectionPool: WebSocket[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      await this.reconnectWithFallback();
    }
  }

  private async reconnectWithFallback(): Promise<void> {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.connect();
        return;
      } catch (error) {
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          // Switch to offline mode
          this.enableOfflineMode();
          throw new Error('Agent unavailable - switched to offline mode');
        }
        await this.delay(Math.pow(2, this.reconnectAttempts) * 1000);
      }
    }
  }
}
```

### **Performance Optimization**

#### **WebSocket Connection Pooling**
```typescript
export class ConnectionPool {
  private pool: WebSocket[] = [];
  private maxConnections = 10;
  private activeConnections = 0;

  async getConnection(): Promise<WebSocket> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    if (this.activeConnections < this.maxConnections) {
      return await this.createConnection();
    }
    
    // Wait for available connection
    return await this.waitForConnection();
  }

  releaseConnection(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      this.pool.push(ws);
    }
  }
}

// Session cleanup optimization
export class OptimizedSessionManager {
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  startOptimizedCleanup(): void {
    setInterval(() => {
      this.batchCleanupSessions();
    }, this.cleanupInterval);
  }

  private async batchCleanupSessions(): Promise<void> {
    const expiredSessions = await this.findExpiredSessions();
    await Promise.all(expiredSessions.map(s => this.cleanupSession(s.id)));
  }
}
```

#### **MongoDB Query Optimization**
```typescript
// Optimized session queries
export class OptimizedSessionService {
  async findActiveSessions(userId: string): Promise<Session[]> {
    return await ActiveSession.find({ userId, status: 'active' })
      .select('sessionId userId lastActivity') // Only needed fields
      .lean() // Return plain objects
      .limit(10) // Reasonable limit
      .sort({ lastActivity: -1 }); // Index on lastActivity
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    // Batch updates to reduce database calls
    await ActiveSession.updateOne(
      { sessionId },
      { 
        lastActivity: new Date(),
        $inc: { activityCount: 1 }
      }
    );
  }
}
```

## **UserSessionManager - Complete SessionManager Replacement**

### **Architecture: Protocol-Based Session Management**
```typescript
// Complete replacement for existing SessionManager
export class UserSessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sessionCleanupInterval: NodeJS.Timeout;
  private sandboxManager = new SandboxManager();
  private executionSessions = new Map<string, ExecutionSession>();

  constructor(private agentDiscovery: IAgentDiscovery) {
    this.startSessionMonitoring();
  }

  // ✅ Replaces SessionManager.createSession()
  async createUserSession(
    userId: string, 
    userCredentials?: UserCredentials,
    workingDirectory?: string
  ): Promise<string> {
    // Check if user already has active session
    const existingClient = this.userSessions.get(userId);
    if (existingClient && existingClient.connectionState === 'connected') {
      return existingClient.sessionId;
    }

    // Create new ACP client for user
    const acpClient = new AcpClient(this.agentDiscovery);
    await acpClient.connect(['session.create', 'chat.send', 'tools.execute']);

    // Create session via ACP protocol
    const sessionId = await acpClient.request('session.create', {
      userId,
      credentials: userCredentials,
      workingDirectory
    });

    // Create isolated Docker sandbox
    const sandbox = await this.sandboxManager.getSandbox(userId, workingDirectory);

    // Link ACP session with execution environment
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

  // ✅ Replaces SessionManager.getSession()
  getUserSession(userId: string): AcpClient | null {
    return this.userSessions.get(userId) || null;
  }

  // ✅ Replaces SessionManager.deleteSession()
  async deleteUserSession(userId: string): Promise<void> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      // Destroy session via ACP protocol
      await acpClient.request('session.destroy', {
        sessionId: acpClient.sessionId
      });

      // Cleanup execution environment
      await this.cleanupExecutionSession(acpClient.sessionId);

      // Remove from active sessions
      this.userSessions.delete(userId);
    }
  }

  // ✅ Replaces SessionManager.getUserSessions()
  getUserSessions(userId: string): string[] {
    const acpClient = this.userSessions.get(userId);
    return acpClient ? [acpClient.sessionId] : [];
  }

  // ✅ Replaces SessionManager.updateTokenUsage()
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

  // ✅ Replaces SessionManager.getSessionStats()
  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (acpClient) {
      return await acpClient.request('session.getStats', { sessionId });
    }
    return null;
  }

  // ✅ Replaces SessionManager.cleanup()
  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const usersToCleanup: string[] = [];

    for (const [userId, acpClient] of this.userSessions) {
      const stats = await this.getSessionStats(userId, acpClient.sessionId);
      if (stats && (now - stats.lastActivity) > maxAge) {
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      await this.deleteUserSession(userId);
    }
  }

  // ✅ New: Send message via ACP protocol
  async sendMessage(userId: string, sessionId: string, message: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }

    return await acpClient.request('chat.send', {
      sessionId,
      content: message
    });
  }

  // ✅ New: Execute code via ACP protocol
  async executeCode(userId: string, sessionId: string, code: string, language: string): Promise<any> {
    const acpClient = this.userSessions.get(userId);
    if (!acpClient) {
      throw new Error('User session not found');
    }

    return await acpClient.request('tools.execute', {
      sessionId,
      code,
      language
    });
  }

  private async cleanupExecutionSession(sessionId: string): Promise<void> {
    const execSession = this.executionSessions.get(sessionId);
    if (execSession) {
      // Stop and remove Docker container
      await execSession.sandbox.stop();
      
      // Clean up workspace files
      await this.cleanupWorkspace(execSession.workspaceDir);
      
      this.executionSessions.delete(sessionId);
    }
  }

  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Check every minute
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

### **ACP Client Implementation**
```typescript
export class AcpClient {
  private ws: WebSocket | null = null;
  public sessionId: string | null = null;
  public connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private pendingRequests = new Map<string, PendingRequest>();

  constructor(private agentDiscovery: IAgentDiscovery) {}

  async connect(capabilities: string[]): Promise<void> {
    // Discover and connect to best agent
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
    const message: AcpMessage = {
      id,
      type,
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));

      // Timeout after 30 seconds
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

## **Database Architecture - MongoDB Only**

### **Unified MongoDB Schema**
```typescript
// Single MongoDB database with all collections
interface UnifiedDatabase {
  // User management (migrated from PostgreSQL)
  users: Collection<{
    _id: ObjectId;
    username: string;
    email: string;
    fullName: string;
    phone?: string;
    passwordHash: string;
    nfsWorkspacePath: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
  }>;

  // Team management (migrated from PostgreSQL)
  teams: Collection<{
    _id: ObjectId;
    teamName: string;
    specialization?: string;
    description?: string;
    nfsWorkspacePath: string;
    createdBy: ObjectId;
    members: [{
      userId: ObjectId;
      role: string;
      status: 'active' | 'disabled';
      joinedAt: Date;
    }];
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
  }>;

  // API keys (migrated from PostgreSQL)
  apiKeys: Collection<{
    _id: ObjectId;
    userId: ObjectId;
    apiKey: string;
    createdAt: Date;
    expiresAt?: Date;
    isActive: boolean;
  }>;

  // File embeddings with vector search (migrated from PostgreSQL)
  fileEmbeddings: Collection<{
    _id: ObjectId;
    filePath: string;
    fileName: string;
    workspaceType: 'private' | 'team';
    ownerId: ObjectId;
    teamId?: ObjectId;
    contentHash: string;
    embedding: number[]; // MongoDB Vector Search
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // ACP sessions (new for ACP)
  sessions: Collection<{
    _id: ObjectId;
    sessionId: string;
    userId: ObjectId;
    teamId?: ObjectId;
    status: 'active' | 'saved' | 'terminated';
    workspacePath: string;
    conversationHistory: [{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      embedding?: number[]; // For semantic search
    }];
    metadata: any;
    createdAt: Date;
    lastActivity: Date;
  }>;

  // Projects (existing MongoDB collections)
  projects: Collection<Project>;
  projectSections: Collection<ProjectSection>;
  projectStats: Collection<ProjectStats>;
}
```

### **Vector Search Configuration**
```typescript
// MongoDB Vector Search indexes
const vectorIndexes = {
  // File embeddings vector search
  fileEmbeddings: {
    name: 'file_vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [{
        type: 'vector',
        path: 'embedding',
        numDimensions: 768,
        similarity: 'cosine'
      }]
    }
  },

  // Conversation embeddings vector search
  sessions: {
    name: 'conversation_vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [{
        type: 'vector',
        path: 'conversationHistory.embedding',
        numDimensions: 768,
        similarity: 'cosine'
      }]
    }
  }
};
```

### **Benefits of MongoDB-Only Architecture**
- ✅ **Single database** eliminates dual-database complexity
- ✅ **Native vector search** with MongoDB Community Edition (free)
- ✅ **Document model** perfect for ACP sessions and conversations
- ✅ **Unified backup/restore** procedures
- ✅ **Simplified connection management**
- ✅ **Better scaling** for session-based workloads
- ✅ **Flexible schema** for evolving ACP requirements

## **Package Architecture & Dependencies**

### **NPM Workspace Structure**
```json
// Root package.json
{
  "name": "qwen-code-workspace",
  "workspaces": [
    "packages/shared",
    "packages/backend", 
    "packages/web-ui",
    "packages/qwen-core-agent"
  ],
  "dependencies": {
    "@qwen-code/shared": "workspace:*"
  }
}
```

### **Package Dependencies**
```
@qwen-code/shared (base types)
├── No dependencies
└── Exports: ACP types, interfaces

packages/backend
├── Dependencies: @qwen-code/shared
└── Exports: Session services, database models

packages/web-ui  
├── Dependencies: @qwen-code/shared
└── Exports: Web interface, ACP client

packages/qwen-core-agent
├── Dependencies: @qwen-code/shared, @qwen-code/core
└── Exports: ACP server, agent service
```

### **Dependency Injection Pattern**
```typescript
// Shared interface
export interface ISessionService {
  createSession(userId: string): Promise<string>;
  getSession(sessionId: string): Promise<Session | null>;
}

// Backend implementation
export class AcpSessionService implements ISessionService {
  // Implementation
}

// Web-UI usage
export class SessionManager {
  constructor(private sessionService: ISessionService) {}
}
```

## **Agent Discovery Strategy**

### **Primary: Configuration-Based Selection**
```typescript
// Agent configuration (primary method)
interface AgentConfig {
  id: string;
  endpoint: string;
  capabilities: string[];
  priority: number;
  healthCheck: string;
  metadata: {
    name: string;
    version: string;
    maxSessions?: number;
  };
}

// Configuration file: config/agents.json
{
  "agents": [
    {
      "id": "qwen-core-primary",
      "endpoint": "ws://localhost:8080",
      "capabilities": ["session.create", "chat.send", "tools.execute"],
      "priority": 1,
      "healthCheck": "http://localhost:8080/health",
      "metadata": {
        "name": "Qwen Core Agent",
        "version": "1.0.0",
        "maxSessions": 100
      }
    }
  ],
  "fallback": {
    "enabled": true,
    "discoveryTimeout": 5000,
    "retryAttempts": 3
  }
}
```

### **Fallback: UDP Discovery (Optional)**
- Only used when configuration fails
- Disabled by default in production
- Requires explicit network configuration

## **Component Design**

### **1. ACP Message Protocol**

```typescript
// Shared message types (can be published as separate npm package)
interface AcpMessage {
  id: string;           // Unique message identifier (UUID/nanoid)
  type: string;         // Message type (e.g., "chat.send", "agent.discover")
  payload: any;         // Message-specific data
  timestamp: number;    // Unix timestamp in milliseconds
  version?: string;     // Protocol version (default: "1.0")
  source?: string;      // Sender identifier
  target?: string;      // Recipient identifier (optional)
  correlation?: string; // For linking related messages
}

interface AcpResponse {
  id: string;           // Same as request ID
  success: boolean;     // Operation success status
  data?: any;          // Response payload (if successful)
  error?: AcpError;    // Error details (if failed)
  timestamp: number;    // Response timestamp
  duration?: number;    // Processing time in milliseconds
}

interface AcpError {
  code: string;         // Error code (e.g., "INVALID_SESSION")
  message: string;      // Human-readable error message
  details?: any;        // Additional error context
}

// Message Types
type MessageType = 
  | 'agent.discover'
  | 'agent.announce'
  | 'session.create'
  | 'session.destroy' 
  | 'chat.send'
  | 'chat.stream'
  | 'tools.execute'
  | 'config.get'
  | 'auth.validate'
  | 'health.check'
  | 'health.ok';
```

## **Message Content Types & Delivery Methods**

### **Basic Text Messages**

#### **Simple Text Message**
```typescript
{
  id: "text-001",
  type: "chat.send",
  payload: {
    sessionId: "sess-abc123",
    content: {
      type: "text",
      data: "Explain how async/await works in JavaScript"
    },
    metadata: {
      language: "en",
      encoding: "utf-8"
    }
  },
  timestamp: 1703123456789
}
```

#### **Formatted Text Message**
```typescript
{
  id: "text-002", 
  type: "chat.send",
  payload: {
    sessionId: "sess-abc123",
    content: {
      type: "text",
      format: "markdown",
      data: "Please review this **critical bug** in the `authentication` module:\n\n```javascript\nif (user.password = hash) {\n  return true;\n}\n```"
    },
    context: {
      urgency: "high",
      tags: ["bug", "security", "authentication"]
    }
  },
  timestamp: 1703123456789
}
```

### **Multi-Modal Messages with Images**

#### **Inline Image Content**
```typescript
{
  id: "multimodal-001",
  type: "chat.send", 
  payload: {
    sessionId: "sess-abc123",
    content: {
      type: "multimodal",
      parts: [
        {
          type: "text",
          data: "What's wrong with this UI design?"
        },
        {
          type: "image",
          delivery: "inline",
          format: "base64",
          mimeType: "image/png",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
          metadata: {
            width: 1920,
            height: 1080,
            size: 245760,
            filename: "dashboard-mockup.png"
          }
        }
      ]
    },
    options: {
      visionModel: true,
      analysisType: "ui-design"
    }
  },
  timestamp: 1703123456789
}
```

#### **Referenced Image Content**
```typescript
{
  id: "multimodal-002",
  type: "chat.send",
  payload: {
    sessionId: "sess-abc123", 
    content: {
      type: "multimodal",
      parts: [
        {
          type: "text",
          data: "Analyze the error shown in this screenshot"
        },
        {
          type: "image",
          delivery: "reference",
          url: "https://cdn.example.com/screenshots/error-001.png",
          metadata: {
            contentType: "image/png",
            size: 156789,
            lastModified: "2024-01-15T10:30:00Z",
            checksum: "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
          },
          auth: {
            type: "bearer",
            token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
          }
        }
      ]
    }
  },
  timestamp: 1703123456789
}
```

### **Messages with Artifacts**

#### **Code Artifact**
```typescript
{
  id: "artifact-001",
  type: "chat.send",
  payload: {
    sessionId: "sess-abc123",
    content: {
      type: "text",
      data: "Here's the refactored authentication component:"
    },
    artifacts: [
      {
        id: "auth-component-v2",
        type: "code",
        title: "Refactored Authentication Component",
        delivery: "inline",
        content: {
          language: "typescript",
          data: `import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onError }) => {
  // Component implementation
};`
        },
        metadata: {
          framework: "react",
          version: "18.x",
          dependencies: ["react", "@types/react"],
          size: 1247
        }
      }
    ]
  },
  timestamp: 1703123456789
}
```

#### **File Artifact with Reference**
```typescript
{
  id: "artifact-002", 
  type: "chat.send",
  payload: {
    sessionId: "sess-abc123",
    content: {
      type: "text",
      data: "I've created a comprehensive test suite for the API endpoints:"
    },
    artifacts: [
      {
        id: "api-test-suite",
        type: "file",
        title: "API Test Suite",
        delivery: "reference",
        url: "file:///workspace/tests/api.test.ts",
        metadata: {
          mimeType: "text/typescript",
          size: 15420,
          lineCount: 487,
          testCount: 45,
          coverage: 0.95
        }
      }
    ]
  },
  timestamp: 1703123456789
}
```

### **Delivery Method Interfaces**

#### **Inline Content Delivery**
```typescript
interface InlineContent {
  delivery: "inline";
  format: "text" | "base64" | "binary";
  data: string | Buffer;
  encoding?: "utf-8" | "ascii" | "base64";
  compression?: {
    algorithm: "gzip" | "brotli";
    originalSize: number;
  };
}
```

#### **Reference Content Delivery**
```typescript
interface ReferenceContent {
  delivery: "reference";
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  auth?: {
    type: "bearer" | "basic" | "api-key";
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
  cache?: {
    ttl: number;           // Time to live in seconds
    etag?: string;         // For conditional requests
    lastModified?: string;
  };
  fallback?: InlineContent; // Fallback if reference fails
}
```

#### **Content Validation & Security**
```typescript
const ContentValidation = {
  maxInlineSize: 10 * 1024 * 1024,    // 10MB for inline content
  maxReferenceSize: 100 * 1024 * 1024, // 100MB for referenced content
  allowedMimeTypes: [
    "text/plain", "text/markdown", "text/html",
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/json", "application/javascript",
    "video/mp4", "audio/mpeg"
  ],
  maxArtifacts: 10,
  maxMultimodalParts: 20
};

interface SecureContent {
  encryption?: {
    algorithm: "AES-256-GCM";
    key: string;           // Encrypted with session key
    iv: string;
    tag: string;
  };
  signature?: {
    algorithm: "RS256";
    signature: string;     // Content signature
    publicKey: string;     // For verification
  };
  sanitization?: {
    htmlSanitized: boolean;
    scriptStripped: boolean;
    malwareScanned: boolean;
  };
}
```

### **2. Core Agent Service (qwen-code project)**

```typescript
// packages/qwen-core-agent/src/index.ts
class QwenCoreAgent {
  private clients = new Map<string, WebSocket>();
  
  async handleMessage(ws: WebSocket, message: AcpMessage) {
    switch (message.type) {
      case 'session.create':
        return this.createSession(message.payload);
      case 'chat.send':
        return this.sendMessage(message.payload);
      case 'tools.execute':
        return this.executeTools(message.payload);
    }
  }
  
  private async createSession(payload: any) {
    const { GeminiClient, Config } = await import('@qwen-code/core');
    // Session creation logic
  }
}
```

### **3. ACP Discovery Protocol**

```typescript
// packages/web-ui/server/src/acp/AgentDiscovery.ts
class AgentDiscovery {
  async discoverAgents(): Promise<Agent[]> {
    const agents = [];
    
    // 1. Broadcast discovery request
    const discoveryMessage = {
      type: "agent.discover",
      id: generateId(),
      payload: {
        requiredCapabilities: ["chat", "tools"],
        clientInfo: { name: "qwen-web-ui", version: "1.0.0" }
      }
    };
    
    // 2. Listen for agent announcements
    const responses = await this.broadcastAndListen(discoveryMessage, 5000);
    
    // 3. Parse agent capabilities
    for (const response of responses) {
      if (response.type === "agent.announce") {
        agents.push({
          id: response.payload.agentId,
          endpoint: response.payload.endpoint,
          capabilities: response.payload.capabilities,
          metadata: response.payload.metadata
        });
      }
    }
    
    return agents;
  }
}

// packages/qwen-core-agent/src/discovery/AgentAnnouncer.ts
class AgentAnnouncer {
  async announceAgent() {
    const announcement = {
      type: "agent.announce",
      id: generateId(),
      payload: {
        agentId: this.config.agentId,
        endpoint: `ws://${this.config.host}:${this.config.port}`,
        capabilities: [
          "chat.send",
          "chat.stream", 
          "session.create",
          "session.destroy",
          "tools.execute",
          "config.get"
        ],
        metadata: {
          name: "Qwen Core Agent",
          version: "1.0.0",
          models: ["qwen-plus", "qwen-turbo"],
          maxSessions: 100
        }
      }
    };
    
    await this.broadcast(announcement);
  }
  
  onDiscoveryRequest(message: AcpMessage) {
    if (message.type === "agent.discover") {
      this.announceAgent();
    }
  }
}
```

### **4. ACP Client Library (standalone packages)**

```typescript
// packages/web-ui/server/src/acp/AcpClient.ts
class AcpClient {
  private ws: WebSocket;
  private pendingRequests = new Map<string, Promise<any>>();
  private discovery: AgentDiscovery;
  
  constructor() {
    this.discovery = new AgentDiscovery();
  }
  
  async connect(): Promise<void> {
    const agents = await this.discovery.discoverAgents();
    if (agents.length === 0) {
      throw new Error("No ACP agents discovered");
    }
    
    // Connect to first available agent
    const agent = agents[0];
    this.ws = new WebSocket(agent.endpoint);
    
    this.ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        pending.resolve(response);
        this.pendingRequests.delete(response.id);
      }
    };
  }
  
  async request(type: string, payload: any): Promise<any> {
    const id = generateId();
    const message: AcpMessage = { id, type, payload, timestamp: Date.now() };
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
    });
  }
}
```

## **Session Management Architecture**

### **ACP Client Session Management**

#### **Enhanced ACP Client with Configuration-Based Discovery**
```typescript
// Enhanced ACP Client with configuration-first approach
export class AcpClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private agentConfig: AgentConfig[];
  private currentAgent: AgentConfig | null = null;
  
  constructor(configPath?: string) {
    this.loadAgentConfiguration(configPath);
  }
  
  private loadAgentConfiguration(configPath?: string) {
    const config = require(configPath || './config/agents.json');
    this.agentConfig = config.agents.sort((a, b) => a.priority - b.priority);
  }
  
  async connect(userId?: string): Promise<void> {
    // Primary: Try configured agents in priority order
    for (const agent of this.agentConfig) {
      try {
        if (await this.healthCheck(agent)) {
          await this.connectToAgent(agent, userId);
          this.currentAgent = agent;
          return;
        }
      } catch (error) {
        console.warn(`Failed to connect to ${agent.id}:`, error.message);
        continue;
      }
    }
    
    // Fallback: UDP discovery (if enabled)
    if (this.isFallbackEnabled()) {
      const discoveredAgent = await this.fallbackDiscovery();
      if (discoveredAgent) {
        await this.connectToAgent(discoveredAgent, userId);
        return;
      }
    }
    
    throw new Error('No available agents found');
  }
  
  private async healthCheck(agent: AgentConfig): Promise<boolean> {
    try {
      const response = await fetch(agent.healthCheck, { timeout: 2000 });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async connectToAgent(agent: AgentConfig, userId?: string): Promise<void> {
    this.connectionState = 'connecting';
    this.ws = new WebSocket(agent.endpoint);
    
    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.connectionState = 'connected';
        resolve();
      };
      
      this.ws!.onerror = (error) => {
        this.connectionState = 'error';
        reject(error);
      };
    });
  }
  
  private isFallbackEnabled(): boolean {
    const config = require('./config/agents.json');
    return config.fallback?.enabled || false;
  }
  
  private async fallbackDiscovery(): Promise<AgentConfig | null> {
    // Optional UDP discovery implementation
    // Only used when configuration fails
    return null;
  }
}
  
  interface ClientSession {
    id: string;
    agentUrl: string;
    userId?: string;
    capabilities: string[];
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    tokenUsage: { input: number; output: number; total: number };
    metadata: Record<string, any>;
  }
  
  async connect(agentUrl: string, options?: ConnectOptions): Promise<ClientSession> {
    this.connectionState = 'connecting';
    
    try {
      this.ws = new WebSocket(agentUrl);
      await this.waitForConnection();
      
      const sessionResponse = await this.createSession(options);
      this.sessionId = sessionResponse.sessionId;
      
      this.startHeartbeat();
      this.processMessageQueue();
      
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      
      return {
        id: this.sessionId,
        agentUrl,
        userId: options?.userId,
        capabilities: sessionResponse.capabilities,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        metadata: options?.metadata || {}
      };
    } catch (error) {
      this.connectionState = 'error';
      throw new AcpError('CONNECTION_FAILED', `Failed to connect: ${error.message}`);
    }
  }
  
  async sendMessage(content: MessageContent, options?: SendOptions): Promise<AcpResponse> {
    if (!this.sessionId || this.connectionState !== 'connected') {
      throw new AcpError('NO_ACTIVE_SESSION', 'No active session available');
    }
    
    const message: AcpMessage = {
      id: generateId(),
      type: options?.streaming ? 'chat.stream' : 'chat.send',
      payload: { sessionId: this.sessionId, content, options },
      timestamp: Date.now()
    };
    
    return options?.streaming 
      ? this.sendStreamingMessage(message, options.onChunk)
      : this.sendAndWaitForResponse(message);
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.ping();
      } catch (error) {
        this.attemptReconnect();
      }
    }, 30000);
  }
}

interface ConnectOptions {
  userId?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

interface SendOptions {
  streaming?: boolean;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
  enableVision?: boolean;
  onChunk?: (chunk: string) => void;
}
```

### **ACP Server Session Management**

#### **Server Session Architecture**
```typescript
// packages/qwen-core-agent/src/session/SessionManager.ts
export class AcpSessionManager {
  private sessions = new Map<string, ServerSession>();
  private cleanupInterval: NodeJS.Timeout;
  private maxSessions = 1000;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  interface ServerSession {
    id: string;
    clientId: string;
    userId?: string;
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    tokenUsage: { input: number; output: number; total: number };
    context: {
      conversationHistory: ChatMessage[];
      systemPrompt?: string;
      tools: string[];
      preferences: SessionPreferences;
    };
    state: 'active' | 'idle' | 'terminated';
    resources: { memoryUsage: number; cpuTime: number; activeConnections: number };
  }
  
  async createSession(request: SessionCreateRequest): Promise<ServerSession> {
    if (this.sessions.size >= this.maxSessions) {
      await this.cleanupIdleSessions();
      if (this.sessions.size >= this.maxSessions) {
        throw new AcpError('SESSION_LIMIT_EXCEEDED', 'Maximum sessions reached');
      }
    }
    
    const sessionId = generateSessionId();
    const session: ServerSession = {
      id: sessionId,
      clientId: request.clientId,
      userId: request.userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      context: {
        conversationHistory: [],
        systemPrompt: request.systemPrompt,
        tools: request.capabilities?.includes('tools') ? this.getAvailableTools() : [],
        preferences: {
          model: request.preferences?.model || 'qwen3-coder-plus',
          temperature: request.preferences?.temperature || 0.7,
          maxTokens: request.preferences?.maxTokens || 4000,
          streaming: request.preferences?.streaming || false
        }
      },
      state: 'active',
      resources: { memoryUsage: 0, cpuTime: 0, activeConnections: 1 }
    };
    
    this.sessions.set(sessionId, session);
    await this.initializeSessionContext(session);
    
    return session;
  }
  
  async processMessage(sessionId: string, message: ChatMessage): Promise<ChatResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AcpError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    
    if (session.state !== 'active') {
      throw new AcpError('SESSION_INACTIVE', `Session ${sessionId} is not active`);
    }
    
    session.lastActivity = Date.now();
    session.messageCount++;
    session.context.conversationHistory.push(message);
    
    const startTime = Date.now();
    const response = await this.processWithCore(session, message);
    const processingTime = Date.now() - startTime;
    
    session.tokenUsage.input += response.usage?.inputTokens || 0;
    session.tokenUsage.output += response.usage?.outputTokens || 0;
    session.tokenUsage.total = session.tokenUsage.input + session.tokenUsage.output;
    session.resources.cpuTime += processingTime;
    
    session.context.conversationHistory.push({
      role: 'assistant',
      content: response.content,
      timestamp: Date.now()
    });
    
    await this.enforceSessionLimits(session);
    
    return response;
  }
  
  private async processWithCore(session: ServerSession, message: ChatMessage): Promise<ChatResponse> {
    const { GeminiClient, CoreToolScheduler, Config } = await import('@qwen-code/core');
    
    const client = new GeminiClient(new Config());
    const scheduler = new CoreToolScheduler();
    
    const context = this.buildContextFromHistory(session.context.conversationHistory);
    
    if (session.context.tools.length > 0 && message.content.includes('tool:')) {
      const toolResults = await scheduler.executeTools(message.toolRequests || []);
      return this.formatToolResponse(toolResults);
    }
    
    const response = await client.generateContent({
      messages: context,
      model: session.context.preferences.model,
      temperature: session.context.preferences.temperature,
      maxTokens: session.context.preferences.maxTokens
    });
    
    return {
      content: response.text,
      usage: {
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens
      },
      metadata: {
        model: session.context.preferences.model,
        processingTime: Date.now() - message.timestamp
      }
    };
  }
  
  private async enforceSessionLimits(session: ServerSession): Promise<void> {
    const maxTokens = 100000;
    const maxMessages = 1000;
    
    if (session.tokenUsage.total > maxTokens) {
      session.context.conversationHistory = await this.compressHistory(
        session.context.conversationHistory
      );
      session.tokenUsage.total = Math.floor(session.tokenUsage.total * 0.3);
    }
    
    if (session.messageCount > maxMessages) {
      const keepMessages = 100;
      session.context.conversationHistory = session.context.conversationHistory.slice(-keepMessages);
      session.messageCount = keepMessages;
    }
  }
  
  getSessionStats(): SessionStats {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.state === 'active');
    
    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      totalTokenUsage: activeSessions.reduce((sum, s) => sum + s.tokenUsage.total, 0),
      averageSessionAge: activeSessions.reduce((sum, s) => sum + (Date.now() - s.createdAt), 0) / activeSessions.length,
      memoryUsage: activeSessions.reduce((sum, s) => sum + s.resources.memoryUsage, 0)
    };
  }
}

interface SessionCreateRequest {
  clientId: string;
  userId?: string;
  capabilities?: string[];
  preferences?: SessionPreferences;
  systemPrompt?: string;
}

interface SessionPreferences {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalTokenUsage: number;
  averageSessionAge: number;
  memoryUsage: number;
}
```

## **Multi-User Session Management**

### **Session Isolation Architecture**

#### **Client-Side User Session Management**
```typescript
// packages/web-ui/server/src/session/UserSessionManager.ts
export class UserSessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sessionCleanupInterval: NodeJS.Timeout;
  
  constructor() {
    this.startSessionMonitoring();
  }
  
  async createUserSession(userId: string, options?: ConnectOptions): Promise<AcpClient> {
    // Check if user already has active session
    const existingClient = this.userSessions.get(userId);
    if (existingClient && existingClient.connectionState === 'connected') {
      return existingClient;
    }
    
    // Create new ACP client for user
    const client = new AcpClient();
    await client.connect(agentUrl, { 
      userId,
      ...options 
    });
    
    this.userSessions.set(userId, client);
    
    // Set up session event handlers
    client.onDisconnect(() => {
      this.userSessions.delete(userId);
    });
    
    return client;
  }
  
  getUserSession(userId: string): AcpClient | null {
    return this.userSessions.get(userId) || null;
  }
  
  async ensureActiveSession(userId: string): Promise<AcpClient> {
    let client = this.userSessions.get(userId);
    
    if (!client || client.connectionState === 'disconnected') {
      // Create new session for returning user
      client = await this.createUserSession(userId);
    }
    
    return client;
  }
  
  async logoutUser(userId: string): Promise<void> {
    const client = this.userSessions.get(userId);
    if (client) {
      // Gracefully destroy session
      await client.destroySession();
      
      // Remove from active sessions
      this.userSessions.delete(userId);
    }
  }
  
  async logoutAllUsers(): Promise<void> {
    const logoutPromises = Array.from(this.userSessions.keys()).map(userId => 
      this.logoutUser(userId)
    );
    
    await Promise.all(logoutPromises);
  }
  
  getActiveUserCount(): number {
    return this.userSessions.size;
  }
  
  getActiveUsers(): string[] {
    return Array.from(this.userSessions.keys());
  }
  
  private startSessionMonitoring(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupDisconnectedSessions();
    }, 60000); // Check every minute
  }
  
  private cleanupDisconnectedSessions(): void {
    for (const [userId, client] of this.userSessions) {
      if (client.connectionState === 'disconnected' || client.connectionState === 'error') {
        this.userSessions.delete(userId);
      }
    }
  }
}
```

#### **Server-Side Multi-User Session Handling**
```typescript
// packages/qwen-core-agent/src/session/MultiUserSessionManager.ts
export class MultiUserSessionManager extends AcpSessionManager {
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds
  private sessionUsers = new Map<string, string>(); // sessionId -> userId
  
  async createSession(request: SessionCreateRequest): Promise<ServerSession> {
    const session = await super.createSession(request);
    
    // Track user sessions
    if (request.userId) {
      if (!this.userSessions.has(request.userId)) {
        this.userSessions.set(request.userId, new Set());
      }
      this.userSessions.get(request.userId)!.add(session.id);
      this.sessionUsers.set(session.id, request.userId);
    }
    
    return session;
  }
  
  async destroySession(sessionId: string): Promise<void> {
    const userId = this.sessionUsers.get(sessionId);
    
    // Clean up user session tracking
    if (userId) {
      const userSessionSet = this.userSessions.get(userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(userId);
        }
      }
      this.sessionUsers.delete(sessionId);
    }
    
    await super.destroySession(sessionId);
  }
  
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);
    if (sessionIds) {
      const destroyPromises = Array.from(sessionIds).map(sessionId => 
        this.destroySession(sessionId)
      );
      await Promise.all(destroyPromises);
    }
  }
  
  getUserSessions(userId: string): ServerSession[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map(sessionId => this.sessions.get(sessionId))
      .filter(session => session !== undefined) as ServerSession[];
  }
  
  getActiveUserCount(): number {
    return this.userSessions.size;
  }
  
  getUserStats(): UserStats {
    const totalUsers = this.userSessions.size;
    const totalSessions = this.sessions.size;
    const averageSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0;
    
    return {
      totalUsers,
      totalSessions,
      averageSessionsPerUser,
      activeUsers: Array.from(this.userSessions.keys())
    };
  }
}

interface UserStats {
  totalUsers: number;
  totalSessions: number;
  averageSessionsPerUser: number;
  activeUsers: string[];
}
```

## **Session Cleanup & Inactivity Handling**

### **Automatic Session Cleanup**

#### **Inactivity-Based Cleanup**
```typescript
// Enhanced session cleanup with configurable timeouts
export class AcpSessionManager {
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes default
  private warningTimeout = 25 * 60 * 1000; // 25 minutes warning
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(config?: SessionConfig) {
    this.sessionTimeout = config?.sessionTimeout || this.sessionTimeout;
    this.warningTimeout = config?.warningTimeout || this.warningTimeout;
    this.startCleanupProcess();
  }
  
  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToWarn: string[] = [];
    const sessionsToCleanup: string[] = [];
    
    for (const [sessionId, session] of this.sessions) {
      const idleTime = now - session.lastActivity;
      
      if (idleTime > this.sessionTimeout) {
        sessionsToCleanup.push(sessionId);
      } else if (idleTime > this.warningTimeout && session.state === 'active') {
        sessionsToWarn.push(sessionId);
      }
    }
    
    // Send inactivity warnings
    for (const sessionId of sessionsToWarn) {
      await this.sendInactivityWarning(sessionId);
    }
    
    // Cleanup expired sessions
    for (const sessionId of sessionsToCleanup) {
      await this.destroySession(sessionId);
    }
  }
  
  private async sendInactivityWarning(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'idle';
      
      // Notify client of impending timeout
      const warningMessage: AcpMessage = {
        id: generateId(),
        type: 'session.warning',
        payload: {
          sessionId,
          message: 'Session will expire in 5 minutes due to inactivity',
          timeoutIn: this.sessionTimeout - this.warningTimeout
        },
        timestamp: Date.now()
      };
      
      await this.sendToClient(sessionId, warningMessage);
    }
  }
  
  async extendSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.state = 'active';
    }
  }
  
  private async cleanupSessionResources(session: ServerSession): Promise<void> {
    // Clear conversation history
    session.context.conversationHistory = [];
    
    // Release memory
    session.resources.memoryUsage = 0;
    
    // Close any active tool processes
    await this.terminateActiveTools(session.id);
    
    // Notify other services of session cleanup
    await this.notifySessionCleanup(session.id);
    
    // Update session state
    session.state = 'terminated';
  }
  
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupIdleSessions();
      await this.updateSessionMetrics();
      await this.enforceResourceLimits();
    }, 60000); // Run every minute
  }
  
  private async enforceResourceLimits(): Promise<void> {
    const stats = this.getSessionStats();
    
    // If memory usage is high, cleanup oldest idle sessions first
    if (stats.memoryUsage > this.maxMemoryUsage) {
      const idleSessions = Array.from(this.sessions.values())
        .filter(s => s.state === 'idle')
        .sort((a, b) => a.lastActivity - b.lastActivity);
      
      for (const session of idleSessions.slice(0, 10)) {
        await this.destroySession(session.id);
      }
    }
  }
}

interface SessionConfig {
  sessionTimeout?: number;
  warningTimeout?: number;
  maxMemoryUsage?: number;
  maxSessionsPerUser?: number;
}
```

### **Client-Side Session Recovery**

#### **Automatic Reconnection & Session Recovery**
```typescript
// Enhanced ACP Client with session recovery
export class AcpClient {
  private sessionRecoveryEnabled = true;
  private lastKnownSessionId: string | null = null;
  
  async connect(agentUrl: string, options?: ConnectOptions): Promise<ClientSession> {
    try {
      // Attempt to recover existing session first
      if (this.sessionRecoveryEnabled && this.lastKnownSessionId) {
        const recovered = await this.attemptSessionRecovery();
        if (recovered) {
          return recovered;
        }
      }
      
      // Create new session if recovery fails
      return await this.createNewSession(agentUrl, options);
    } catch (error) {
      this.connectionState = 'error';
      throw error;
    }
  }
  
  private async attemptSessionRecovery(): Promise<ClientSession | null> {
    try {
      const recoveryMessage: AcpMessage = {
        id: generateId(),
        type: 'session.recover',
        payload: { sessionId: this.lastKnownSessionId },
        timestamp: Date.now()
      };
      
      const response = await this.sendAndWaitForResponse(recoveryMessage);
      
      if (response.success) {
        this.sessionId = this.lastKnownSessionId;
        this.connectionState = 'connected';
        this.startHeartbeat();
        
        return response.data.session;
      }
    } catch (error) {
      console.warn('Session recovery failed:', error);
    }
    
    return null;
  }
  
  private async handleInactivityWarning(message: AcpMessage): Promise<void> {
    // Automatically extend session on warning
    const extendMessage: AcpMessage = {
      id: generateId(),
      type: 'session.extend',
      payload: { sessionId: this.sessionId },
      timestamp: Date.now()
    };
    
    await this.sendAndWaitForResponse(extendMessage);
  }
  
  async destroySession(): Promise<void> {
    if (this.sessionId) {
      const message: AcpMessage = {
        id: generateId(),
        type: 'session.destroy',
        payload: { sessionId: this.sessionId },
        timestamp: Date.now()
      };
      
      try {
        await this.sendAndWaitForResponse(message);
      } catch (error) {
        console.warn('Failed to properly destroy session:', error);
      }
      
      // Clear recovery data
      this.lastKnownSessionId = null;
    }
    
    this.cleanup();
  }
}
```

## **Session Lifecycle Summary**

### **Multi-User Flow**
1. **User Login** → `UserSessionManager.createUserSession()` → Unique ACP client
2. **Concurrent Users** → Each gets isolated session with unique `sessionId`
3. **Session Isolation** → No cross-contamination of conversations or state

### **Cleanup Flow**
1. **Active Session** → `lastActivity` updated on each message
2. **25 Minutes Idle** → Server sends inactivity warning
3. **30 Minutes Idle** → Server auto-destroys session
4. **Explicit Logout** → Immediate session cleanup
5. **User Returns** → New session created automatically

### **Resource Management**
- **Memory Cleanup** → Conversation history cleared
- **Connection Cleanup** → WebSocket connections closed
- **Process Cleanup** → Active tools terminated
- **Metric Updates** → Session statistics updated

## **User Code Execution & Docker Sandbox Integration**

### **User Session Flow**

#### **1. User Login → ACP Session + Docker Sandbox**
```typescript
async createUserSession(userId: string): Promise<AcpClient> {
  // Step 1: Create ACP session for communication
  const acpClient = new AcpClient();
  await acpClient.connect(agentUrl, { userId });
  
  // Step 2: Create isolated Docker sandbox for this user
  const sandbox = await this.sandboxManager.getSandbox(userId, workspaceDir);
  
  // Step 3: Link them together
  this.executionSessions.set(acpClient.sessionId, {
    userId,
    sandbox,
    workspaceDir: `/tmp/qwen-workspace-${userId}`,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    resourceLimits: {
      memory: '512m',
      cpus: 1,
      diskSpace: '1g',
      networkAccess: false
    }
  });
  
  return acpClient;
}
```

#### **2. All User Activity in Docker Sandbox**
```typescript
// File operations
await sandbox.execute(`echo "console.log('hello')" > app.js`);

// Code execution  
await sandbox.execute(`node app.js`);

// Shell commands
await sandbox.execute(`ls -la`);

// Package installation
await sandbox.execute(`npm install express`);

// Git operations
await sandbox.execute(`git clone https://github.com/user/repo.git`);
```

### **What Happens in the Sandbox**

#### **User's Isolated Environment**
- **File System**: `/tmp/qwen-workspace-${userId}` - completely isolated
- **Process Space**: All user processes run inside container
- **Network**: Isolated network (optional internet access)
- **Resources**: Memory/CPU limits per user
- **Persistence**: Files persist during session, cleaned up on logout

#### **ACP Communication Flow**
```typescript
// User sends message via ACP
user: "Create a React app and run it"

// ACP routes to core agent
acpClient.sendMessage(content) 
  → ACP Server processes request
  → Generates tool calls for sandbox execution
  → Returns commands to execute

// Commands executed in user's sandbox
sandbox.execute(`npx create-react-app my-app`)
sandbox.execute(`cd my-app && npm start`)
```

### **Enhanced UserSessionManager with Sandbox Integration**
```typescript
// packages/web-ui/server/src/acp/UserSessionManager.ts
export class UserSessionManager {
  private userSessions = new Map<string, AcpClient>();
  private sandboxManager = new SandboxManager();
  private executionSessions = new Map<string, ExecutionSession>();
  
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
  
  async executeCode(sessionId: string, code: string, language: string): Promise<ExecutionResult> {
    const executionSession = this.executionSessions.get(sessionId);
    if (!executionSession) {
      throw new AcpError('NO_EXECUTION_SESSION', 'No execution environment for session');
    }
    
    // Update activity
    executionSession.lastActivity = Date.now();
    
    // Execute in isolated container
    const result = await executionSession.sandbox.execute(code);
    
    return {
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
      resourceUsage: await this.getResourceUsage(executionSession.sandbox)
    };
  }
  
  async logoutUser(userId: string): Promise<void> {
    // Clean up ACP session
    await super.logoutUser(userId);
    
    // Clean up execution environments
    for (const [sessionId, execSession] of this.executionSessions) {
      if (execSession.userId === userId) {
        await this.cleanupExecutionSession(sessionId);
      }
    }
  }
  
  private async cleanupExecutionSession(sessionId: string): Promise<void> {
    const execSession = this.executionSessions.get(sessionId);
    if (execSession) {
      // Stop and remove Docker container
      await execSession.sandbox.stop();
      
      // Clean up workspace files
      await this.cleanupWorkspace(execSession.workspaceDir);
      
      this.executionSessions.delete(sessionId);
    }
  }
}
```

### **ACP Message Types for Code Execution**
```typescript
// Enhanced ACP protocol for code execution
interface CodeExecutionMessage extends AcpMessage {
  type: 'code.execute';
  payload: {
    sessionId: string;
    code: string;
    language: 'python' | 'javascript' | 'bash' | 'sql';
    options?: {
      timeout?: number;
      memory?: string;
      networkAccess?: boolean;
      allowFileSystem?: boolean;
    };
  };
}

interface CodeExecutionResponse extends AcpResponse {
  data: {
    output: string;
    error?: string;
    exitCode: number;
    executionTime: number;
    resourceUsage: {
      memory: number;
      cpu: number;
      diskIO: number;
    };
  };
}
```

### **Security & Resource Management**
```typescript
const securityConfig = {
  containerLimits: {
    memory: '512m',
    cpus: 1,
    diskSpace: '1g',
    networkAccess: false,
    rootAccess: false
  },
  executionLimits: {
    timeout: 30000, // 30 seconds
    maxProcesses: 10,
    maxFileSize: '10m'
  }
};
```

## **Session Persistence & Resumption**

### **Save Session Work**
```typescript
interface SavedSession {
  userId: string;
  sessionId: string;
  workspacePath: string;
  conversationHistory: AcpMessage[];
  createdAt: number;
  lastSaved: number;
  metadata: {
    projectName?: string;
    description?: string;
    tags?: string[];
  };
}

class SessionPersistenceManager {
  async saveSession(userId: string, sessionId: string, metadata?: any): Promise<string> {
    const session = this.executionSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    // Create persistent workspace
    const savedWorkspacePath = `/persistent/workspaces/${userId}/${sessionId}`;
    await this.copyWorkspace(session.workspaceDir, savedWorkspacePath);
    
    // Save conversation history
    const conversationHistory = await this.getConversationHistory(sessionId);
    
    const savedSession: SavedSession = {
      userId,
      sessionId,
      workspacePath: savedWorkspacePath,
      conversationHistory,
      createdAt: session.createdAt,
      lastSaved: Date.now(),
      metadata
    };
    
    await this.persistenceStore.save(`session:${userId}:${sessionId}`, savedSession);
    return sessionId;
  }
}
```

### **Logout/Timeout with Save Option**
```typescript
async handleUserLogout(userId: string, saveSession: boolean = false): Promise<void> {
  const activeSessions = this.getActiveSessionsForUser(userId);
  
  for (const sessionId of activeSessions) {
    if (saveSession) {
      // Save before cleanup
      await this.sessionPersistence.saveSession(userId, sessionId);
    }
    
    // Clean up active resources
    await this.cleanupExecutionSession(sessionId);
  }
  
  // Clean up ACP session
  await this.logoutUser(userId);
}

async handleInactivityTimeout(userId: string): Promise<void> {
  // Auto-save on timeout
  await this.handleUserLogout(userId, true);
}
```

### **Resume Session on Login**
```typescript
async resumeSession(userId: string, sessionId: string): Promise<AcpClient> {
  // Load saved session
  const savedSession = await this.persistenceStore.get(`session:${userId}:${sessionId}`);
  if (!savedSession) throw new Error('Session not found');
  
  // Create new ACP session
  const acpClient = new AcpClient();
  await acpClient.connect(agentUrl, { userId });
  
  // Create new sandbox
  const sandbox = await this.sandboxManager.getSandbox(userId, workspaceDir);
  
  // Restore workspace files
  await this.restoreWorkspace(savedSession.workspacePath, sandbox.workspaceDir);
  
  // Restore conversation history
  await acpClient.restoreHistory(savedSession.conversationHistory);
  
  // Create new execution session
  this.executionSessions.set(acpClient.sessionId, {
    userId,
    sandbox,
    workspaceDir: sandbox.workspaceDir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    resourceLimits: this.defaultResourceLimits
  });
  
  return acpClient;
}
```

### **Session Management UI Flow**
```typescript
// User commands for session management
interface SessionCommands {
  '/save [name]': 'Save current session with optional name';
  '/sessions': 'List saved sessions';
  '/resume <sessionId>': 'Resume a saved session';
  '/delete <sessionId>': 'Delete a saved session';
}

async handleSaveCommand(userId: string, sessionName?: string): Promise<void> {
  const currentSessionId = this.getCurrentSessionId(userId);
  const metadata = sessionName ? { projectName: sessionName } : undefined;
  
  const savedSessionId = await this.sessionPersistence.saveSession(
    userId, 
    currentSessionId, 
    metadata
  );
  
  console.log(`Session saved as: ${savedSessionId}`);
}

async handleListSessions(userId: string): Promise<SavedSession[]> {
  return await this.persistenceStore.listUserSessions(userId);
}
```

### **Hybrid Storage Architecture**

#### **Storage Strategy Overview**
```typescript
interface HybridStorageArchitecture {
  // 1. Active Session State (In-Memory + MongoDB backup)
  activeSessions: {
    primary: 'In-Memory Map<string, ServerSession>',
    backup: 'MongoDB.acp_sessions.active_sessions',
    ttl: '30 minutes inactivity'
  },
  
  // 2. Saved Sessions (MongoDB)
  savedSessions: {
    storage: 'MongoDB.acp_sessions.saved_sessions',
    indexes: ['userId', 'sessionId', 'lastSaved']
  },
  
  // 3. Workspace Files (NFS)
  workspaceFiles: {
    active: '/nfs/private/{userId}/active/{sessionId}/',
    saved: '/nfs/private/{userId}/saved/{sessionId}/',
    temp: '/nfs/private/{userId}/temp/{sessionId}/'
  },
  
  // 4. Conversation History (MongoDB with compression)
  conversationHistory: {
    storage: 'MongoDB.acp_sessions.conversation_history',
    compression: 'gzip for messages > 100'
  }
}
```

#### **Hybrid Session Manager Implementation**
```typescript
class HybridSessionManager {
  // Active sessions in memory for performance
  private activeSessions = new Map<string, ServerSession>();
  
  // MongoDB models for persistence
  private ActiveSessionModel: mongoose.Model<ActiveSession>;
  private SavedSessionModel: mongoose.Model<SavedSession>;
  private ConversationModel: mongoose.Model<ConversationHistory>;
  
  constructor() {
    this.initializeModels();
    this.startCleanupProcess();
  }
  
  async createSession(userId: string): Promise<ServerSession> {
    const session = this.createInMemorySession(userId);
    
    // Store in memory for fast access
    this.activeSessions.set(session.id, session);
    
    // Backup to MongoDB
    await this.ActiveSessionModel.create({
      sessionId: session.id,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active'
    });
    
    return session;
  }
  
  async saveSession(sessionId: string, metadata?: any): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    // Save workspace files to persistent NFS location
    const activeWorkspace = `/nfs/private/${session.userId}/active/${sessionId}`;
    const savedWorkspace = `/nfs/private/${session.userId}/saved/${sessionId}`;
    await this.copyWorkspace(activeWorkspace, savedWorkspace);
    
    // Save session metadata to MongoDB
    await this.SavedSessionModel.create({
      sessionId,
      userId: session.userId,
      workspacePath: savedWorkspace,
      conversationHistory: await this.getCompressedHistory(sessionId),
      metadata,
      createdAt: session.createdAt,
      lastSaved: new Date()
    });
    
    return sessionId;
  }
  
  async resumeSession(userId: string, sessionId: string): Promise<ServerSession> {
    // Load saved session from MongoDB
    const savedSession = await this.SavedSessionModel.findOne({ 
      userId, 
      sessionId 
    });
    if (!savedSession) throw new Error('Session not found');
    
    // Create new active session
    const newSession = await this.createSession(userId);
    
    // Restore workspace files from NFS
    const savedWorkspace = savedSession.workspacePath;
    const activeWorkspace = `/nfs/private/${userId}/active/${newSession.id}`;
    await this.restoreWorkspace(savedWorkspace, activeWorkspace);
    
    // Restore conversation history
    await this.restoreConversationHistory(newSession.id, savedSession.conversationHistory);
    
    return newSession;
  }
}
```

#### **MongoDB Schema Definitions**
```typescript
// Active sessions schema
const activeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'idle', 'terminated'], default: 'active' },
  resourceUsage: {
    memory: Number,
    cpu: Number,
    tokenUsage: { input: Number, output: Number, total: Number }
  }
});

// Saved sessions schema
const savedSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  workspacePath: { type: String, required: true },
  conversationHistory: { type: Buffer }, // Compressed conversation data
  metadata: {
    projectName: String,
    description: String,
    tags: [String]
  },
  createdAt: { type: Date, required: true },
  lastSaved: { type: Date, default: Date.now }
});

// Conversation history schema
const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  messages: [{ 
    role: String, 
    content: String, 
    timestamp: Date,
    tokenUsage: { input: Number, output: Number }
  }],
  compressed: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});
```

#### **NFS Workspace Operations**
```typescript
class NFSWorkspaceManager {
  private nfsBasePath = process.env.NFS_BASE_PATH || '/nfs';
  
  async copyWorkspace(source: string, destination: string): Promise<void> {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await this.executeCommand(`cp -r "${source}" "${destination}"`);
  }
  
  async restoreWorkspace(source: string, destination: string): Promise<void> {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await this.executeCommand(`cp -r "${source}" "${destination}"`);
  }
  
  async cleanupWorkspace(workspacePath: string): Promise<void> {
    if (await fs.access(workspacePath).then(() => true).catch(() => false)) {
      await fs.rm(workspacePath, { recursive: true, force: true });
    }
  }
  
  getWorkspacePaths(userId: string, sessionId: string) {
    return {
      active: `${this.nfsBasePath}/private/${userId}/active/${sessionId}`,
      saved: `${this.nfsBasePath}/private/${userId}/saved/${sessionId}`,
      temp: `${this.nfsBasePath}/private/${userId}/temp/${sessionId}`
    };
  }
}
```

### **ACP Protocol Extensions for Persistence**
```typescript
interface SaveSessionMessage extends AcpMessage {
  type: 'session.save';
  payload: {
    sessionName?: string;
    metadata?: Record<string, any>;
  };
}

interface ResumeSessionMessage extends AcpMessage {
  type: 'session.resume';
  payload: {
    sessionId: string;
  };
}

interface ListSessionsMessage extends AcpMessage {
  type: 'session.list';
  payload: {};
}
```

## **Key Points**

1. **One Sandbox Per User** - Each user gets their own isolated Docker container
2. **Session Lifecycle** - Sandbox created on login, destroyed on logout/timeout
3. **Complete Isolation** - Users cannot access each other's files or processes
4. **Persistent Workspace** - Files remain available throughout the session
5. **Resource Limits** - Each sandbox has memory/CPU/disk limits
6. **ACP Integration** - Code execution requests routed through ACP protocol
7. **Session Persistence** - Save/resume sessions with workspace and conversation history
8. **Auto-save on Timeout** - Inactive sessions automatically saved before cleanup
9. **Workspace Restoration** - Files and conversation history restored on resume
  
  async createSession(config: any): Promise<string> {
    return this.request('session.create', config);
  }
  
  async sendMessage(sessionId: string, content: string): Promise<AsyncIterable<string>> {
    return this.request('chat.stream', { sessionId, content });
  }
}
```

### **5. Service Layer Replacement**

```typescript
// packages/web-ui/server/src/services/LlmService.ts
class LlmService {
  constructor(private acpClient: AcpClient) {}
  
  async createSession(userId: string, credentials: any): Promise<string> {
    return this.acpClient.createSession({
      userId,
      credentials,
      workingDirectory: process.cwd()
    });
  }
  
  async sendMessage(sessionId: string, content: string) {
    return this.acpClient.sendMessage(sessionId, content);
  }
  
  async executeTools(sessionId: string, toolCalls: any[]) {
    return this.acpClient.request('tools.execute', { sessionId, toolCalls });
  }
}
```

## **Implementation Plan**

### **Phase 1: Foundation (Week 1)**
1. Create `@qwen-code/acp-types` package for shared types
2. Implement basic ACP client library
3. Create minimal core agent service
4. Establish WebSocket communication

### **Phase 2: Core Migration (Week 2)**
1. Replace `SessionManager` with ACP calls
2. Migrate `ToolExecutor` to use ACP
3. Update `ClientAdapter` for ACP communication
4. Add error handling and reconnection logic

### **Phase 3: Deployment Separation (Week 3)**
1. Extract web-ui/backend to standalone repository
2. Publish ACP client as npm package
3. Update build and deployment scripts
4. Add configuration for ACP endpoint

### **Phase 4: Production Readiness (Week 4)**
1. Add authentication and security
2. Implement load balancing for multiple agents
3. Add monitoring and health checks
4. Performance optimization and testing

## **Deployment Architecture**

### **Standalone Deployment**
```yaml
# docker-compose.yml (standalone)
services:
  qwen-core-agent:
    image: qwen-core-agent:latest
    environment:
      - ACP_PORT=8080
      - AGENT_ID=qwen-core-1
    labels:
      - "acp.capabilities=chat,tools,session-management"
    networks:
      - acp-network
  
  web-ui:
    image: qwen-web-ui:latest
    environment:
      - ACP_DISCOVERY_ENABLED=true
      - ACP_DISCOVERY_TIMEOUT=5000
    networks:
      - acp-network
  
  backend:
    image: qwen-backend:latest
    environment:
      - ACP_DISCOVERY_ENABLED=true
      - ACP_DISCOVERY_TIMEOUT=5000
    networks:
      - acp-network

networks:
  acp-network:
    driver: bridge
```

### **Configuration**
```typescript
// packages/web-ui/server/src/config.ts
export const ACP_CONFIG = {
  endpoint: process.env.ACP_ENDPOINT || 'ws://localhost:8080',
  discovery: {
    enabled: process.env.ACP_DISCOVERY_ENABLED !== 'false',
    timeout: parseInt(process.env.ACP_DISCOVERY_TIMEOUT || '5000'),
    retries: parseInt(process.env.ACP_DISCOVERY_RETRIES || '3')
  },
  reconnectInterval: 5000,
  timeout: 30000,
  maxRetries: 3
};
```

## **Benefits**

1. **Independent Deployment**: Web-UI can deploy without qwen-code project
2. **Scalability**: Multiple web-ui instances → single core agent
3. **Technology Flexibility**: Core agent could be rewritten in any language
4. **Fault Isolation**: Core crashes don't affect web-ui
5. **Version Independence**: Web-UI and core can have different release cycles
6. **Automatic Discovery**: No manual endpoint configuration required
7. **High Availability**: Automatic failover to healthy agents

## **Migration Strategy**

### **Backward Compatibility**
```typescript
// Feature flag for gradual migration
const USE_ACP = process.env.USE_ACP === 'true';

if (USE_ACP) {
  // Use ACP client
  const llmService = new AcpLlmService(acpClient);
} else {
  // Use direct core imports (legacy)
  const llmService = new DirectLlmService();
}
```

### **Testing Strategy**
1. **Unit Tests**: Mock ACP client for isolated testing
2. **Integration Tests**: Test ACP communication end-to-end
3. **Performance Tests**: Compare ACP vs direct import performance
4. **Compatibility Tests**: Ensure feature parity

## **Security Considerations**

1. **Authentication**: JWT tokens for ACP connections
2. **Authorization**: Session-based access control
3. **Transport Security**: WSS (WebSocket Secure) for production
4. **Rate Limiting**: Prevent ACP message flooding
5. **Input Validation**: Sanitize all ACP payloads

## **Monitoring & Observability**

```typescript
// ACP metrics
interface AcpMetrics {
  messagesPerSecond: number;
  averageResponseTime: number;
  activeConnections: number;
  errorRate: number;
}
```

## **Risk Mitigation**

1. **Network Latency**: Local deployment of core agent
2. **Single Point of Failure**: Multiple core agent instances
3. **Message Loss**: Implement message acknowledgment
4. **Version Compatibility**: Semantic versioning for ACP protocol

This design enables complete decoupling while maintaining all existing functionality through a clean, protocol-based architecture.

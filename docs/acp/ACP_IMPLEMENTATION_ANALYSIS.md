# ACP Implementation Analysis & Storage Architecture

## Executive Summary

This document analyzes the current `ACP_DECOUPLING_DESIGN.md` against the existing codebase (`packages/backend` and `packages/web-ui`) to identify:
1. Missing implementation details
2. Duplicate or conflicting information
3. Storage architecture clarification (MongoDB vs NFS)
4. Gaps between design and current implementation

## Storage Architecture Clarification

### Current Implementation

#### **MongoDB Usage**
```typescript
// packages/backend/src/services/mongoService.ts
// MongoDB is used for:
1. User-specific databases: `user_{userId}`
   - tasks
   - todos
   - chat_sessions
   - projects

2. Team-specific databases: `team_{teamId}`
   - tasks
   - projects
   - chat_sessions
   - documents
   - notifications

// packages/backend/src/services/sessionService.ts
// MongoDB collections in main database:
- user_sessions (JWT tokens, workspace paths, active team)
- team_sessions (team-specific sessions)
```

#### **NFS Usage**
```typescript
// packages/backend/src/services/nfsService.ts
// NFS is used for:
1. Private user workspaces: /private/{userId}
2. Team shared workspaces: /shared/{teamId}

// File system operations only - no metadata storage
```

#### **PostgreSQL Usage**
```typescript
// packages/backend/src/config/database.ts
// PostgreSQL is used for:
- User accounts
- Team management
- Project metadata
- Relational data
```

### **Recommended Storage Architecture for ACP Sessions**

```typescript
// Session Persistence Storage Strategy
interface StorageArchitecture {
  // 1. Session Metadata → MongoDB
  sessionMetadata: {
    storage: 'MongoDB',
    database: 'acp_sessions',
    collections: {
      active_sessions: 'Real-time session state',
      saved_sessions: 'Persistent saved sessions',
      session_history: 'Audit trail'
    }
  },
  
  // 2. Workspace Files → NFS
  workspaceFiles: {
    storage: 'NFS',
    paths: {
      active: '/nfs/workspaces/active/{userId}/{sessionId}',
      saved: '/nfs/workspaces/saved/{userId}/{sessionId}',
      temp: '/nfs/workspaces/temp/{userId}/{sessionId}'
    }
  },
  
  // 3. Conversation History → MongoDB
  conversationHistory: {
    storage: 'MongoDB',
    database: 'acp_sessions',
    collection: 'conversation_history',
    compression: 'gzip for old messages'
  },
  
  // 4. Docker Container State → In-Memory + Metadata in MongoDB
  dockerState: {
    runtime: 'In-Memory (Docker daemon)',
    metadata: 'MongoDB (container IDs, resource usage)'
  }
}
```

## Analysis: Design vs Implementation

### 1. Session Management

#### **Design (ACP_DECOUPLING_DESIGN.md)**
```typescript
// Proposed: ACP-based session management
class AcpSessionManager {
  private sessions = new Map<string, ServerSession>();
  // In-memory session storage
}

class UserSessionManager {
  private userSessions = new Map<string, AcpClient>();
  // In-memory user session mapping
}
```

#### **Current Implementation**
```typescript
// packages/backend/src/services/sessionService.ts
// MongoDB-based session storage
const UserSession = mongoose.model('user_sessions', userSessionSchema);
const TeamSession = mongoose.model('team_sessions', teamSessionSchema);

// Persistent session storage with JWT tokens
```

#### **Gap Analysis**
- ❌ **Missing**: ACP session management is not implemented
- ❌ **Missing**: In-memory session maps for active sessions
- ✅ **Exists**: MongoDB session persistence (but for JWT, not ACP)
- ⚠️ **Conflict**: Design uses in-memory storage, current uses MongoDB
- 🔧 **Recommendation**: Hybrid approach - in-memory for active, MongoDB for persistence

### 2. Docker Sandbox Integration

#### **Design (ACP_DECOUPLING_DESIGN.md)**
```typescript
// Proposed: UserSessionManager with sandbox integration
export class UserSessionManager {
  private sandboxManager = new SandboxManager();
  private executionSessions = new Map<string, ExecutionSession>();
  
  async createUserSession(userId: string): Promise<AcpClient> {
    const sandbox = await this.sandboxManager.getSandbox(userId, workspaceDir);
    // Links ACP session with Docker sandbox
  }
}
```

#### **Current Implementation**
```typescript
// packages/web-ui/server/src/SandboxManager.ts
export class SandboxManager {
  private sandboxes = new Map<string, DockerSandbox>();
  
  async getSandbox(userId: string, workspaceDir: string): Promise<DockerSandbox> {
    // Already creates per-user Docker containers
  }
}

// packages/web-ui/server/src/SessionManager.ts
// Separate session management - NOT integrated with sandboxes
```

#### **Gap Analysis**
- ✅ **Exists**: Docker sandbox per user (SandboxManager)
- ✅ **Exists**: Workspace directory management
- ❌ **Missing**: Integration between ACP sessions and Docker sandboxes
- ❌ **Missing**: ExecutionSession tracking
- 🔧 **Recommendation**: Create bridge between SessionManager and SandboxManager

### 3. Session Persistence & Resumption

#### **Design (ACP_DECOUPLING_DESIGN.md)**
```typescript
// Proposed: Session save/resume functionality
class SessionPersistenceManager {
  async saveSession(userId: string, sessionId: string): Promise<string> {
    // Save workspace to persistent storage
    const savedWorkspacePath = `/persistent/workspaces/${userId}/${sessionId}`;
    await this.copyWorkspace(session.workspaceDir, savedWorkspacePath);
    
    // Save conversation history
    await this.persistenceStore.save(`session:${userId}:${sessionId}`, savedSession);
  }
  
  async resumeSession(userId: string, sessionId: string): Promise<AcpClient> {
    // Restore workspace and conversation
  }
}
```

#### **Current Implementation**
```typescript
// packages/backend/src/services/nfsService.ts
// Only creates workspaces, no save/restore functionality
async createPrivateWorkspace(userId: string): Promise<string> {
  const workspacePath = path.join(NFS_BASE_PATH, 'private', userId);
  await fs.mkdir(workspacePath, { recursive: true });
}

// packages/backend/src/services/sessionService.ts
// Only JWT session management, no workspace persistence
```

#### **Gap Analysis**
- ❌ **Missing**: Session save functionality
- ❌ **Missing**: Workspace copy/restore operations
- ❌ **Missing**: Conversation history persistence
- ❌ **Missing**: Session resume functionality
- ❌ **Missing**: `/save`, `/sessions`, `/resume` commands
- 🔧 **Recommendation**: Implement complete SessionPersistenceManager

### 4. Multi-User Session Isolation

#### **Design (ACP_DECOUPLING_DESIGN.md)**
```typescript
// Proposed: Multi-user session tracking
class MultiUserSessionManager extends AcpSessionManager {
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds
  private sessionUsers = new Map<string, string>(); // sessionId -> userId
}
```

#### **Current Implementation**
```typescript
// packages/backend/src/services/mongoService.ts
// Per-user MongoDB databases
async createUserDatabase(userId: string) {
  const dbName = `user_${userId.replace(/-/g, '_')}`;
  // Creates isolated database per user
}

// packages/web-ui/server/src/SandboxManager.ts
// Per-user Docker containers
async getSandbox(userId: string, workspaceDir: string) {
  const containerId = `qwen-sandbox-${userId}`;
  // Creates isolated container per user
}
```

#### **Gap Analysis**
- ✅ **Exists**: Per-user database isolation (MongoDB)
- ✅ **Exists**: Per-user Docker container isolation
- ❌ **Missing**: Session-to-user mapping in ACP context
- ❌ **Missing**: Multi-session per user support
- 🔧 **Recommendation**: Add session tracking layer on top of existing isolation

### 5. Inactivity Timeout & Cleanup

#### **Design (ACP_DECOUPLING_DESIGN.md)**
```typescript
// Proposed: Automatic cleanup with warnings
private sessionTimeout = 30 * 60 * 1000; // 30 minutes
private warningTimeout = 25 * 60 * 1000; // 25 minutes

async cleanupIdleSessions(): Promise<void> {
  // Send warnings at 25 minutes
  // Cleanup at 30 minutes
  // Auto-save before cleanup
}
```

#### **Current Implementation**
```typescript
// packages/backend/src/services/sessionService.ts
// JWT expiration only (24 hours)
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// No inactivity tracking
// No auto-cleanup
// No warning system
```

#### **Gap Analysis**
- ❌ **Missing**: Inactivity timeout (30 minutes)
- ❌ **Missing**: Warning system (25 minutes)
- ❌ **Missing**: Auto-save on timeout
- ❌ **Missing**: Cleanup interval process
- ✅ **Exists**: JWT expiration (but too long - 24 hours)
- 🔧 **Recommendation**: Implement complete inactivity management system

## Missing Implementation Details

### 1. **ACP Protocol Implementation**
```typescript
// NOT FOUND in current codebase:
- AcpClient class
- AcpMessage interface
- AcpResponse interface
- WebSocket-based ACP communication
- Agent discovery protocol
- Message routing
```

### 2. **Session Persistence Layer**
```typescript
// NOT FOUND in current codebase:
interface PersistenceStore {
  save(key: string, data: SavedSession): Promise<void>;
  get(key: string): Promise<SavedSession | null>;
  delete(key: string): Promise<void>;
  listUserSessions(userId: string): Promise<SavedSession[]>;
  copyWorkspace(source: string, destination: string): Promise<void>;
  restoreWorkspace(source: string, destination: string): Promise<void>;
}
```

### 3. **Session Commands**
```typescript
// NOT FOUND in current codebase:
'/save [name]'     // Save current session
'/sessions'        // List saved sessions
'/resume <id>'     // Resume saved session
'/delete <id>'     // Delete saved session
```

### 4. **Code Execution Integration**
```typescript
// NOT FOUND in current codebase:
interface CodeExecutionMessage extends AcpMessage {
  type: 'code.execute';
  payload: {
    sessionId: string;
    code: string;
    language: string;
  };
}

// SandboxedToolExecutor exists but not integrated with ACP
```

## Duplicate/Conflicting Information

### 1. **Session Storage Strategy**

**Conflict:**
- Design: In-memory session storage (`Map<string, ServerSession>`)
- Current: MongoDB persistent storage (`mongoose.model('user_sessions')`)

**Resolution:**
```typescript
// Hybrid approach
class HybridSessionManager {
  // Active sessions in memory for performance
  private activeSessions = new Map<string, ServerSession>();
  
  // Persistent storage in MongoDB for recovery
  private persistentStore: mongoose.Model<UserSession>;
  
  async createSession(userId: string): Promise<ServerSession> {
    const session = this.createInMemorySession(userId);
    this.activeSessions.set(session.id, session);
    
    // Also persist to MongoDB
    await this.persistentStore.create({
      session_id: session.id,
      user_id: userId,
      created_at: new Date(),
      last_activity: new Date()
    });
    
    return session;
  }
}
```

### 2. **Workspace Paths**

**Conflict:**
- Design: `/persistent/workspaces/{userId}/{sessionId}`
- Current: `/private/{userId}` (no session-level isolation)

**Resolution:**
```typescript
// Align with design - add session-level directories
const workspacePaths = {
  active: `${NFS_BASE_PATH}/private/${userId}/active/${sessionId}`,
  saved: `${NFS_BASE_PATH}/private/${userId}/saved/${sessionId}`,
  temp: `${NFS_BASE_PATH}/private/${userId}/temp/${sessionId}`
};
```

### 3. **Session Timeout**

**Conflict:**
- Design: 30 minutes inactivity timeout
- Current: 24 hours JWT expiration

**Resolution:**
```typescript
// Two-tier timeout system
const timeouts = {
  inactivityTimeout: 30 * 60 * 1000,  // 30 min - cleanup active session
  jwtExpiration: 24 * 60 * 60 * 1000  // 24 hours - security token
};

// Active session expires after 30 min inactivity
// JWT remains valid for 24 hours for re-authentication
```

## Recommended Storage Architecture

### **Complete Storage Strategy**

```typescript
interface CompleteStorageArchitecture {
  // 1. Active Session State (In-Memory + MongoDB backup)
  activeSessions: {
    primary: 'In-Memory Map',
    backup: 'MongoDB.acp_sessions.active_sessions',
    ttl: '30 minutes inactivity'
  },
  
  // 2. Saved Sessions (MongoDB)
  savedSessions: {
    storage: 'MongoDB.acp_sessions.saved_sessions',
    fields: {
      userId: 'string',
      sessionId: 'string',
      workspacePath: 'string (NFS path)',
      conversationHistory: 'compressed array',
      metadata: 'object',
      createdAt: 'date',
      lastSaved: 'date'
    },
    indexes: ['userId', 'sessionId', 'lastSaved']
  },
  
  // 3. Active Workspace Files (NFS)
  activeWorkspaces: {
    storage: 'NFS',
    path: '/nfs/private/{userId}/active/{sessionId}/',
    lifecycle: 'Deleted on session cleanup unless saved'
  },
  
  // 4. Saved Workspace Files (NFS)
  savedWorkspaces: {
    storage: 'NFS',
    path: '/nfs/private/{userId}/saved/{sessionId}/',
    lifecycle: 'Persistent until user deletes'
  },
  
  // 5. Conversation History (MongoDB)
  conversationHistory: {
    storage: 'MongoDB.acp_sessions.conversation_history',
    fields: {
      sessionId: 'string',
      messages: 'array (compressed if > 100 messages)',
      tokenUsage: 'object',
      lastUpdated: 'date'
    },
    compression: 'gzip for messages > 100'
  },
  
  // 6. Docker Container Metadata (MongoDB)
  dockerMetadata: {
    storage: 'MongoDB.acp_sessions.docker_containers',
    fields: {
      userId: 'string',
      sessionId: 'string',
      containerId: 'string',
      containerName: 'string',
      resourceUsage: 'object',
      status: 'running | stopped | error',
      createdAt: 'date'
    }
  },
  
  // 7. User Authentication (PostgreSQL - existing)
  userAuth: {
    storage: 'PostgreSQL.users',
    purpose: 'User accounts, teams, projects'
  }
}
```

### **Data Flow Diagram**

```
User Login
    ↓
[PostgreSQL] ← Authenticate user
    ↓
Create ACP Session
    ↓
[In-Memory Map] ← Store active session
    ↓
[MongoDB.active_sessions] ← Backup session state
    ↓
Create Docker Sandbox
    ↓
[Docker Daemon] ← Create container
    ↓
[MongoDB.docker_containers] ← Store container metadata
    ↓
[NFS /active/{userId}/{sessionId}] ← Create workspace
    ↓
User Works (30 min activity)
    ↓
User Saves Session (/save command)
    ↓
[MongoDB.saved_sessions] ← Save session metadata
    ↓
[NFS /saved/{userId}/{sessionId}] ← Copy workspace files
    ↓
[MongoDB.conversation_history] ← Save conversation
    ↓
User Logout or Timeout
    ↓
[In-Memory Map] ← Remove active session
    ↓
[Docker Daemon] ← Stop & remove container
    ↓
[NFS /active/{userId}/{sessionId}] ← Delete active workspace
    ↓
[MongoDB.active_sessions] ← Mark session as terminated
    ↓
User Returns & Resumes (/resume <sessionId>)
    ↓
[MongoDB.saved_sessions] ← Load session metadata
    ↓
Create New ACP Session
    ↓
[NFS /saved/{userId}/{sessionId}] → [NFS /active/{userId}/{newSessionId}]
    ↓
[MongoDB.conversation_history] → Restore to new session
    ↓
Continue Working
```

## Implementation Priority

### **Phase 1: Foundation (Week 1)**
1. ✅ Implement hybrid session storage (in-memory + MongoDB)
2. ✅ Add session-level workspace directories in NFS
3. ✅ Integrate SessionManager with SandboxManager
4. ✅ Add inactivity tracking and timeout

### **Phase 2: Persistence (Week 2)**
1. ✅ Implement SessionPersistenceManager
2. ✅ Add workspace copy/restore operations
3. ✅ Add conversation history compression
4. ✅ Implement `/save`, `/sessions`, `/resume` commands

### **Phase 3: ACP Integration (Week 3)**
1. ✅ Implement ACP protocol (AcpClient, AcpMessage)
2. ✅ Add code execution messages
3. ✅ Integrate with existing Docker sandboxes
4. ✅ Add session recovery on reconnect

### **Phase 4: Production (Week 4)**
1. ✅ Add monitoring and metrics
2. ✅ Implement cleanup jobs
3. ✅ Add session analytics
4. ✅ Performance optimization

## Conclusion

### **Key Findings**

1. **Storage Architecture**: Use **MongoDB for metadata** and **NFS for files**
2. **Current Implementation**: Has building blocks (Docker, NFS, MongoDB) but lacks integration
3. **Missing Components**: ACP protocol, session persistence, save/resume functionality
4. **Conflicts**: In-memory vs persistent storage, workspace paths, timeout durations
5. **Recommendation**: Hybrid approach combining design goals with current infrastructure

### **Next Steps**

1. Update `ACP_DECOUPLING_DESIGN.md` with storage architecture clarification
2. Create implementation plan aligning design with current codebase
3. Implement SessionPersistenceManager using MongoDB + NFS
4. Add session save/resume commands
5. Integrate ACP protocol with existing Docker sandbox infrastructure

# ACP Implementation Plan - Updated

## Executive Summary

This document outlines the implementation plan for integrating ACP (Agent Communication Protocol) with the existing qwen-code infrastructure. Based on package analysis, we will enhance existing packages and create one new core agent package.

## Package Implementation Strategy

### **Existing Packages (Enhanced)**
- `packages/shared` - ACP types and interfaces
- `packages/backend` - Database models and session services  
- `packages/web-ui` - ACP client integration and session management

### **New Packages (Created)**
- `packages/qwen-core-agent` - Core agent service with ACP server

## Implementation Phases

### **Phase 0: Database Migration (Week 0 - Pre-ACP)**

#### **0.1 PostgreSQL to MongoDB Migration**
**Files to Create:**
- `scripts/migrate-postgresql-to-mongodb.js` - Main migration script
- `scripts/validate-migration.js` - Data validation and integrity checks
- `scripts/rollback-to-postgresql.js` - Rollback script if needed
- `src/models/MongoModels.ts` - Unified MongoDB models
- `src/services/MongoUserService.ts` - MongoDB user service implementation

**Migration Tasks:**
- [ ] **Export PostgreSQL data** to JSON format (users, teams, team_members, api_keys, file_embeddings)
- [ ] **Create MongoDB collections** with proper indexes and vector search configuration
- [ ] **Transform relational data** to document structure (embed team members in teams)
- [ ] **Migrate vector embeddings** from pgvector to MongoDB Vector Search
- [ ] **Update application services** to use MongoDB queries instead of PostgreSQL
- [ ] **Validate data integrity** and run comprehensive tests
- [ ] **Update connection configuration** to MongoDB-only

**Migration Script Structure:**
```javascript
class PostgreSQLToMongoMigration {
  async migrate() {
    // 1. Export PostgreSQL data
    const pgData = await this.exportPostgreSQLData();
    
    // 2. Transform to MongoDB document structure
    const mongoData = await this.transformToDocuments(pgData);
    
    // 3. Create MongoDB collections and indexes
    await this.createMongoCollections();
    
    // 4. Import data to MongoDB
    await this.importToMongoDB(mongoData);
    
    // 5. Create vector search indexes
    await this.createVectorIndexes();
    
    // 6. Validate migration
    await this.validateMigration();
  }
}
```

#### **0.2 Application Code Updates**
**Files to Modify:**
- `src/services/userService.ts` - Replace PostgreSQL queries with MongoDB operations
- `src/services/teamService.ts` - Update team management for document model
- `src/services/embeddingService.ts` - Use MongoDB Vector Search instead of pgvector
- `src/config/database.ts` - Remove PostgreSQL, keep MongoDB only

**Tasks:**
- [ ] **Replace SQL queries** with MongoDB operations in all services
- [ ] **Update user authentication** to use MongoDB user collection
- [ ] **Modify team management** to use embedded members model
- [ ] **Update vector search** to use MongoDB Vector Search API
- [ ] **Remove PostgreSQL dependencies** from package.json
- [ ] **Update environment configuration** for MongoDB-only setup

### **Phase 1: Foundation & Types (Week 1)**

### **Phase 1: Foundation & Types (Week 1)**

#### **1.1 Create `packages/shared` Package**
**Files to Create:**
- `src/types/AcpTypes.ts` - Core ACP message interfaces
- `src/types/SessionTypes.ts` - Session and workspace types  
- `src/interfaces/ISessionService.ts` - Session service interface
- `src/interfaces/IAgentDiscovery.ts` - Discovery service interface
- `src/index.ts` - Export all types and interfaces
- `package.json` - Package configuration with proper exports
- `tsconfig.json` - TypeScript configuration

**Package Configuration:**
```json
{
  "name": "@qwen-code/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./interfaces": "./dist/interfaces/index.js"
  }
}
```

**Tasks:**
- [ ] Create ACP message protocol types (`AcpMessage`, `AcpResponse`, `AcpError`)
- [ ] Define session interfaces (`ISessionService`, `ISessionManager`)
- [ ] Create workspace and execution result types
- [ ] Setup proper TypeScript exports and declarations
- [ ] Configure npm workspace publishing

#### **1.2 Enhance `packages/backend` Package (MongoDB-Only)**
**Files to Create:**
- `src/models/UnifiedModels.ts` - All MongoDB models (User, Team, ApiKey, FileEmbedding, Session)
- `src/services/MongoSessionService.ts` - MongoDB-based session service (implements ISessionService)
- `src/services/MongoUserService.ts` - MongoDB user management
- `src/services/MongoTeamService.ts` - MongoDB team management
- `src/services/VectorSearchService.ts` - MongoDB Vector Search implementation

**Files to Modify:**
- `src/config/database.ts` - MongoDB-only configuration
- `src/config/env.ts` - Remove PostgreSQL environment variables
- `package.json` - Remove pg dependency, keep mongoose only

**Package Configuration:**
```json
{
  "name": "@qwen-code/backend",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "mongoose": "^8.0.0"
  }
}
```

**MongoDB-Only Implementation:**
```typescript
// ✅ MongoDB-only approach
import { ISessionService } from '@qwen-code/shared';
import { Session, User, Team } from '../models/UnifiedModels';

export class MongoSessionService implements ISessionService {
  async createSession(userId: string, options?: any): Promise<string> {
    const session = await Session.create({
      userId: new ObjectId(userId),
      workspacePath: options?.workspacePath,
      status: 'active',
      conversationHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });
    return session.sessionId;
  }
  // ... other methods using MongoDB operations
}
```

**Tasks:**
- [ ] **Create unified MongoDB models** for all entities (User, Team, Session, etc.)
- [ ] **Implement MongoDB-based services** replacing PostgreSQL queries
- [ ] **Setup MongoDB Vector Search** for file embeddings and conversations
- [ ] **Configure MongoDB indexes** for optimal query performance
- [ ] **Remove PostgreSQL dependencies** and configuration
- [ ] **Update connection management** to MongoDB-only

#### **1.3 Setup Development Environment**
**Files to Create:**
- `scripts/setup-mongodb.js` - MongoDB initialization
- `scripts/setup-nfs.js` - NFS directory structure
- `docker-compose.dev.yml` - Development containers

**Tasks:**
- [ ] Create MongoDB setup script with collections and indexes
- [ ] Create NFS directory structure script
- [ ] Setup development Docker Compose
- [ ] Add environment configuration files
- [ ] Test database connections and storage

### **Phase 2: Web-UI Enhancement (Week 2)**

#### **2.1 Dependency Injection Setup**
**Files to Create:**
- `server/src/di/Container.ts` - Dependency injection container
- `server/src/di/ServiceRegistry.ts` - Service registration
- `server/src/services/SessionServiceFactory.ts` - Service factory

**Package Configuration:**
```json
{
  "name": "@qwen-code/web-ui",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "inversify": "^6.0.0"
  }
}
```

**Dependency Injection Pattern:**
```typescript
// Service registration
container.bind<ISessionService>('SessionService').to(RemoteSessionService);
container.bind<IAgentDiscovery>('AgentDiscovery').to(ConfigBasedDiscovery);

// Usage in SessionManager
export class SessionManager {
  constructor(
    @inject('SessionService') private sessionService: ISessionService,
    @inject('AgentDiscovery') private agentDiscovery: IAgentDiscovery
  ) {}
}
```

**Tasks:**
- [ ] Setup dependency injection container (Inversify)
- [ ] Create service interfaces and implementations
- [ ] Register services with proper scoping
- [ ] Update existing classes to use DI pattern

#### **2.2 UserSessionManager - Complete SessionManager Replacement**
**Files to Create:**
- `server/src/session/UserSessionManager.ts` - Complete replacement for SessionManager
- `server/src/acp/AcpClient.ts` - ACP WebSocket client for protocol communication
- `server/src/discovery/AgentConfigManager.ts` - Configuration-based agent selection
- `server/src/adapters/AcpToolExecutor.ts` - ACP-based tool execution

**Files to Delete:**
- `server/src/SessionManager.ts` - Remove old SessionManager entirely

**Files to Modify:**
- `server/src/index.ts` - Replace SessionManager import and usage
- `server/src/websocket.ts` - Update to use UserSessionManager methods
- `server/package.json` - Add ACP dependencies

**Complete Replacement Strategy:**
```typescript
// OLD SessionManager usage (8 locations to update)
const sessionManager = new SessionManager();
sessionManager.createSession(userId, creds, workingDir)
sessionManager.getSession(sessionId)
sessionManager.deleteSession(sessionId)
sessionManager.getUserSessions(userId)
sessionManager.updateTokenUsage(sessionId, input, output)
sessionManager.getSessionStats(sessionId)
sessionManager.cleanup()

// NEW UserSessionManager usage
const userSessionManager = new UserSessionManager(agentDiscovery);
userSessionManager.createUserSession(userId, creds, workingDir)
userSessionManager.getUserSession(userId)
userSessionManager.deleteUserSession(userId)
userSessionManager.getUserSessions(userId)
userSessionManager.updateTokenUsage(userId, sessionId, input, output)
userSessionManager.getSessionStats(userId, sessionId)
userSessionManager.cleanup()
```

**Tasks:**
- [ ] **Create UserSessionManager** with complete ACP integration
- [ ] **Implement AcpClient** for WebSocket protocol communication
- [ ] **Replace all SessionManager imports** in index.ts and websocket.ts
- [ ] **Update WebSocket handlers** to use protocol-based communication
- [ ] **Update API endpoints** to use UserSessionManager methods
- [ ] **Remove old SessionManager** file and dependencies
- [ ] **Add ACP configuration** for agent discovery and connection

#### **2.3 Session Transition Error Handling**
**Files to Create:**
- `server/src/error/SessionTransitionManager.ts` - Error boundaries and fallback mechanisms
- `server/src/connection/ResilientAcpClient.ts` - Connection resilience with retry logic
- `server/src/connection/ConnectionPool.ts` - WebSocket connection pooling
- `server/src/performance/OptimizedSessionManager.ts` - Performance-optimized session management

**Tasks:**
- [ ] Implement session save/resume error boundaries with fallback mechanisms
- [ ] Add connection resilience with exponential backoff retry
- [ ] Create WebSocket connection pooling (max 10 connections)
- [ ] Implement graceful degradation for agent unavailability
- [ ] Add user notification system for recovery options
- [ ] Optimize session cleanup with batch operations (5-minute intervals)

#### **2.4 WebSocket and API Integration Updates**
**Files to Modify:**
- `server/src/websocket.ts` - Replace SessionManager with UserSessionManager
- `server/src/index.ts` - Update API endpoints for UserSessionManager

**WebSocket Handler Updates:**
```typescript
// OLD websocket.ts usage
export function setupWebSocket(
  io: SocketServer,
  sessionManager: SessionManager, // ❌ Remove
) {
  socket.on('chat:message', async (data) => {
    const session = sessionManager.getSession(data.sessionId); // ❌ Remove
    // Direct client access...
  });
}

// NEW websocket.ts usage
export function setupWebSocket(
  io: SocketServer,
  userSessionManager: UserSessionManager, // ✅ Replace
) {
  socket.on('chat:message', async (data) => {
    const response = await userSessionManager.sendMessage( // ✅ Protocol-based
      data.userId,
      data.sessionId,
      data.message
    );
    socket.emit('chat:response', response);
  });
}
```

**API Endpoint Updates:**
```typescript
// OLD index.ts API endpoints
app.post('/api/sessions', async (request, reply) => {
  const session = await sessionManager.createSession(userId, creds); // ❌ Remove
  return { sessionId: session.id };
});

// NEW index.ts API endpoints
app.post('/api/sessions', async (request, reply) => {
  const sessionId = await userSessionManager.createUserSession(userId, creds); // ✅ Replace
  return { sessionId };
});
```

**Tasks:**
- [ ] **Update WebSocket message handlers** to use UserSessionManager methods
- [ ] **Replace direct client access** with ACP protocol calls
- [ ] **Update API endpoints** for session creation, stats, and management
- [ ] **Add user-based session tracking** instead of session-based
- [ ] **Update error handling** for ACP protocol errors
- [ ] **Test WebSocket and API functionality** with ACP integration
**Files to Modify:**
- `server/src/SessionManager.ts` - Major refactor for ACP integration
- `server/src/config.ts` - Add ACP configuration
- `server/package.json` - Add new dependencies

**Tasks:**
- [ ] Refactor SessionManager to use HybridSessionManager
- [ ] Add ACP client integration to existing session flow
- [ ] Update configuration with ACP and session settings
- [ ] Add required dependencies (ws, nanoid, etc.)
- [ ] Maintain backward compatibility during transition

### **Phase 3: Core Agent Service (Week 3)**

#### **3.1 Create `packages/qwen-core-agent` Package**
**Package Configuration:**
```json
{
  "name": "@qwen-code/qwen-core-agent",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "@qwen-code/core": "workspace:*",
    "ws": "^8.0.0"
  }
}
```

**Proper Import Structure:**
```typescript
// ✅ Correct imports
import { AcpMessage, ISessionService } from '@qwen-code/shared';
import { GeminiClient, Config } from '@qwen-code/core';

// Service implementation
export class CoreSessionService implements ISessionService {
  // Implementation using @qwen-code/core
}
```

**Files to Create:**
- `src/index.ts` - Main agent service entry point
- `src/server/AcpServer.ts` - WebSocket server for ACP protocol
- `src/services/CoreSessionService.ts` - Implements ISessionService
- `src/adapters/CoreAdapter.ts` - @qwen-code/core integration
- `package.json` - Proper workspace dependencies

**Tasks:**
- [ ] Add @qwen-code/shared and @qwen-code/core dependencies
- [ ] Implement ISessionService using @qwen-code/core
- [ ] Create ACP WebSocket server with message routing
- [ ] Add proper service exports and interfaces
- [ ] Integrate with existing @qwen-code/core functionality

#### **3.2 Agent Configuration and Health Monitoring**
**Files to Create:**
- `src/config/AgentConfigValidator.ts` - Configuration validation
- `src/health/HealthChecker.ts` - Agent health monitoring
- `src/discovery/AgentAnnouncer.ts` - Optional UDP announcer (disabled by default)

**Tasks:**
- [ ] Implement configuration file validation and loading
- [ ] Create health check endpoints and monitoring
- [ ] Add agent capacity and load balancing
- [ ] Implement configuration hot-reload
- [ ] Add optional UDP discovery (fallback only)
- [ ] Create agent registration and deregistration

#### **3.3 Performance and Monitoring**
**Files to Create:**
- `src/performance/ConnectionPool.ts` - WebSocket connection pooling
- `src/monitoring/HealthChecker.ts` - Agent health monitoring
- `src/database/OptimizedQueries.ts` - MongoDB query optimization
- `src/cleanup/BatchSessionCleanup.ts` - Optimized session cleanup

**Tasks:**
- [ ] Implement WebSocket connection pooling with configurable limits
- [ ] Add MongoDB query optimization with proper indexing
- [ ] Create batch session cleanup with 5-minute intervals
- [ ] Implement health check endpoints for monitoring
- [ ] Add performance metrics collection
- [ ] Optimize database queries with lean() and field selection
**Files to Create:**
- `src/adapters/CoreAdapter.ts` - Bridge to @qwen-code/core
- `src/adapters/ToolAdapter.ts` - Tool execution adapter
- `src/adapters/ConfigAdapter.ts` - Configuration adapter

**Tasks:**
- [ ] Create adapter layer for @qwen-code/core integration
- [ ] Implement tool execution through existing CoreToolScheduler
- [ ] Add configuration management and validation
- [ ] Integrate with existing GeminiClient for AI responses
- [ ] Add authentication and authorization handling
- [ ] Implement resource management and limits

### **Phase 4: Integration & Production (Week 4)**

#### **4.1 End-to-End Integration**
**Files to Modify:**
- `packages/web-ui/server/src/index.ts` - Add health checks and monitoring
- `packages/web-ui/server/src/websocket.ts` - Integrate ACP client
- Root `docker-compose.yml` - Add qwen-core-agent service
- Root `package.json` - Add workspace scripts

**Tasks:**
- [ ] Integrate all components in web-ui server
- [ ] Add health monitoring and status endpoints
- [ ] Update WebSocket handlers to use ACP client
- [ ] Create Docker Compose with all services
- [ ] Add development and production environment configs
- [ ] Test end-to-end session flow (create → save → resume)

#### **4.2 Testing & Validation**
**Files to Create:**
- `packages/shared/__tests__/` - Type validation tests
- `packages/backend/__tests__/` - Database operation tests
- `packages/web-ui/server/__tests__/` - Session management tests
- `packages/qwen-core-agent/__tests__/` - ACP protocol tests
- `scripts/integration-test.js` - End-to-end test script

**Tasks:**
- [ ] Create unit tests for all new components
- [ ] Add integration tests for session persistence
- [ ] Test ACP protocol communication
- [ ] Validate Docker sandbox integration
- [ ] Performance testing with multiple concurrent sessions
- [ ] Load testing for session cleanup and resource management

#### **4.3 Deployment & Documentation**
**Files to Create:**
- `k8s/` - Kubernetes deployment manifests
- `scripts/deploy.sh` - Deployment automation
- `docs/ACP_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `docs/ACP_API_REFERENCE.md` - API documentation

**Tasks:**
- [ ] Create Kubernetes manifests for production deployment
- [ ] Add deployment automation scripts
- [ ] Create comprehensive deployment documentation
- [ ] Add API reference documentation
- [ ] Create migration guide from existing system
- [ ] Add monitoring and alerting configuration

---

## Detailed Task Breakdown

### **Week 1: Foundation (Days 1-7)**

#### **Day 1-2: Package Structure**
- [ ] Create `packages/shared` with TypeScript setup
- [ ] Define all ACP types and interfaces
- [ ] Setup workspace dependencies and build scripts
- [ ] Create MongoDB setup scripts

#### **Day 3-4: Backend Enhancement**
- [ ] Create ACP session MongoDB models
- [ ] Implement acpSessionService CRUD operations
- [ ] Enhance nfsService with session-level operations
- [ ] Update database configuration and indexing

#### **Day 5-7: Development Environment**
- [ ] Setup development Docker Compose
- [ ] Create NFS directory structure
- [ ] Test database connections and storage
- [ ] Validate package dependencies and builds

### **Week 2: Web-UI Enhancement (Days 8-14)**

#### **Day 8-9: Storage Layer**
- [ ] Implement NFSWorkspaceManager
- [ ] Create ConversationCompressor utility
- [ ] Build HybridSessionManager with Docker integration
- [ ] Test workspace operations and session storage

#### **Day 10-11: Session Management**
- [ ] Implement SessionPersistenceManager
- [ ] Create SessionCommands handler
- [ ] Add session save/resume functionality
- [ ] Test session persistence workflow

#### **Day 12-14: ACP Client Integration**
- [ ] Create AcpClient with WebSocket communication
- [ ] Refactor existing SessionManager
- [ ] Update configuration and dependencies
- [ ] Test ACP client communication (mock server)

### **Week 3: Core Agent Service (Days 15-21)**

#### **Day 15-16: Package Creation**
- [ ] Create `packages/qwen-core-agent` structure
- [ ] Implement ACP WebSocket server
- [ ] Create message routing and validation
- [ ] Setup package dependencies

#### **Day 17-18: Session Management**
- [ ] Implement server-side AcpSessionManager
- [ ] Add MultiUserSessionManager for isolation
- [ ] Create session lifecycle handlers
- [ ] Test session creation and cleanup

#### **Day 19-21: Core Integration**
- [ ] Create adapters for @qwen-code/core
- [ ] Implement chat and code execution handlers
- [ ] Add agent discovery protocol
- [ ] Test end-to-end ACP communication

### **Week 4: Integration & Production (Days 22-28)**

#### **Day 22-23: Integration**
- [ ] Connect web-ui with qwen-core-agent
- [ ] Add health monitoring and status endpoints
- [ ] Update Docker Compose with all services
- [ ] Test complete session workflow

#### **Day 24-25: Testing**
- [ ] Create comprehensive test suites
- [ ] Run integration and performance tests
- [ ] Fix bugs and optimize performance
- [ ] Validate resource cleanup and limits

#### **Day 26-28: Deployment**
- [ ] Create Kubernetes manifests
- [ ] Add deployment automation
- [ ] Write deployment and API documentation
- [ ] Prepare migration guide and rollout plan

---

## Success Criteria

### **Functional Requirements**
- [ ] Session creation in < 2 seconds
- [ ] Session save/resume in < 5 seconds
- [ ] Support for 100+ concurrent sessions
- [ ] 99.9% session data integrity
- [ ] Complete workspace restoration accuracy

### **Technical Requirements**
- [ ] ACP protocol fully implemented
- [ ] Multi-user session isolation
- [ ] Automatic session cleanup and resource management
- [ ] Docker sandbox integration maintained
- [ ] Backward compatibility with existing features

### **Operational Requirements**
- [ ] Health monitoring and alerting
- [ ] Deployment automation
- [ ] Comprehensive documentation
- [ ] Migration path from existing system
- [ ] Performance monitoring and optimization

---

## Risk Mitigation

### **Technical Risks**
- **Data Loss**: Automatic backups and transaction safety
- **Performance**: Connection pooling and session limits
- **Compatibility**: Feature flags and gradual rollout
- **Resource Leaks**: Comprehensive cleanup and monitoring

### **Operational Risks**
- **Deployment Issues**: Staged rollout and rollback procedures
- **User Impact**: Backward compatibility and migration support
- **Monitoring Gaps**: Comprehensive health checks and alerting
- **Documentation**: Clear guides and API references

This updated implementation plan provides a clear 4-week roadmap with specific tasks, timelines, and success criteria for implementing the ACP integration across the correct package structure.

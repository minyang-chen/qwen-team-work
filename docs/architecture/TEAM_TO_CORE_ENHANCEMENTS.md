# Team Backend Enhancement Plan

## 🎯 **Enhancement Overview**

Transform team packages from **basic Docker wrappers** to **full AI-powered collaboration platform** with complete core integration.

## 📦 **Package Enhancement Details**

### **1. packages/team-server-sdk** - Complete Rewrite

#### **Current State:**
```typescript
// Limited: Docker + basic tool execution
ServerClient → DockerSandbox → Shell commands only
```

#### **Enhanced Implementation:**
```typescript
import { 
  Config, 
  GeminiClient, 
  ContentGenerator,
  ToolRegistry,
  CoreToolScheduler,
  ChatCompressionService,
  LoopDetectionService 
} from '@qwen-code/core';

export class ServerClient {
  private config: Config;
  private client: GeminiClient;
  private contentGenerator: ContentGenerator;
  private toolRegistry: ToolRegistry;
  private toolScheduler: CoreToolScheduler;
  private compressionService: ChatCompressionService;
  private loopDetection: LoopDetectionService;
  private dockerSandbox: DockerSandbox; // Keep for shell commands

  constructor(config: EnhancedServerConfig) {
    // Initialize full Config with all core capabilities
    this.config = new Config({
      sessionId: config.sessionId,
      targetDir: config.workingDirectory,
      model: config.model,
      approvalMode: ApprovalMode.YOLO,
      mcpServers: config.mcpServers || {},
      // Full core configuration
    });
    
    this.client = new GeminiClient(this.config);
    this.toolRegistry = this.config.getToolRegistry();
    this.setupEnhancedToolExecution();
  }

  // Full AI pipeline methods
  async query(prompt: string): Promise<EnhancedQueryResult>
  async *queryStream(prompt: string): AsyncGenerator<EnhancedStreamChunk>
  async executeTools(requests: ToolCallRequestInfo[]): Promise<ToolCallResponseInfo[]>
  async compressSession(): Promise<void>
  async resetChat(): Promise<void>
}
```

#### **New Features:**
- ✅ **Full Config Integration**: All core settings and capabilities
- ✅ **Multi-Provider Support**: Qwen, OpenAI, Anthropic, Gemini
- ✅ **Complete Tool Ecosystem**: File, web, memory, shell, MCP tools
- ✅ **Streaming Support**: Real-time response generation
- ✅ **Session Management**: Compression, turn management, loop detection
- ✅ **MCP Integration**: External tool protocol support

### **2. packages/team-ai-agent** - Core AI Integration

#### **Current State:**
```typescript
// Basic: ACP wrapper around limited ServerClient
AcpServer → ChatHandler → ServerClient → Docker only
```

#### **Enhanced Implementation:**
```typescript
import { ServerClient } from '@qwen-team/server-sdk'; // Enhanced version
import { 
  ChatCompressionService,
  SessionService,
  MCPServerManager 
} from '@qwen-code/core';

export class ChatHandler {
  private client: ServerClient; // Now full-featured
  private sessionService: SessionService;
  private compressionService: ChatCompressionService;
  private mcpManager: MCPServerManager;

  async handleChatMessage(message: AcpMessage): Promise<AcpResponse> {
    // Enhanced conversation management
    const session = await this.sessionService.getOrCreateSession(userId);
    
    // Check for compression needs
    if (session.tokenCount > COMPRESSION_THRESHOLD) {
      await this.compressionService.compressSession(session);
    }
    
    // Full AI pipeline execution
    const result = await this.client.query(prompt, {
      sessionContext: session.history,
      mcpServers: session.mcpServers,
      toolPreferences: session.toolPreferences
    });
    
    return this.translator.sdkToAcp(result, message.id);
  }
}

export class AcpServer {
  private chatHandler: ChatHandler;
  private sessionManager: EnhancedSessionManager;
  private toolManager: ToolManager;
  
  // Enhanced ACP protocol support
  // Multi-user session isolation
  // Advanced tool execution coordination
}
```

#### **New Features:**
- ✅ **Full AI Pipeline**: Complete core integration
- ✅ **Advanced Session Management**: Compression, persistence, recovery
- ✅ **Tool Coordination**: All core tools + MCP extensions
- ✅ **Multi-User Support**: Isolated sessions with shared resources
- ✅ **Real-time Streaming**: WebSocket-based live responses

### **3. packages/team-service** - Enterprise Backend

#### **Current State:**
```typescript
// Basic: Simple API wrapper
FastifyServer → AIService → ServerClient → Limited tools
```

#### **Enhanced Implementation:**
```typescript
import { ServerClient } from '@qwen-team/server-sdk'; // Enhanced version
import { 
  Config,
  AuthenticationService,
  TelemetryService,
  MCPServerRegistry 
} from '@qwen-code/core';

export class AIService {
  private clients = new Map<string, EnhancedClientSession>();
  private authService: AuthenticationService;
  private telemetryService: TelemetryService;
  private mcpRegistry: MCPServerRegistry;

  async getClient(userId: string, teamId?: string): Promise<ServerClient> {
    // Enhanced client creation with full capabilities
    const client = new ServerClient({
      sessionId: `${teamId}-${userId}`,
      model: this.getModelForTeam(teamId),
      mcpServers: await this.mcpRegistry.getServersForTeam(teamId),
      toolPreferences: await this.getToolPreferences(userId, teamId),
      authProvider: this.authService.getProvider(userId)
    });
    
    return client;
  }

  async processMessage(
    userId: string, 
    message: string, 
    context: EnhancedMessageContext
  ): Promise<EnhancedQueryResult> {
    const client = await this.getClient(userId, context.teamId);
    
    // Enhanced processing with full context
    const result = await client.query(message, {
      projectContext: context.projectFiles,
      teamMembers: context.teamMembers,
      sharedMemory: context.sharedMemory,
      toolApprovals: context.toolApprovals
    });
    
    // Track telemetry
    this.telemetryService.recordInteraction(userId, result);
    
    return result;
  }
}

// Enhanced WebSocket support
export class WebSocketManager {
  // Real-time collaboration features
  // Shared session broadcasting
  // Tool execution coordination
  // Live cursor/editing support
}
```

#### **New Features:**
- ✅ **Team-Aware AI**: Context sharing across team members
- ✅ **Project Integration**: Full project file context
- ✅ **Advanced Authentication**: Qwen OAuth2, team permissions
- ✅ **Real-time Collaboration**: Live editing, shared sessions
- ✅ **Enterprise Features**: Telemetry, audit logs, compliance

### **4. packages/team-shared** - Enhanced Foundation

#### **Enhanced Implementation:**
```typescript
// Enhanced Docker sandbox (already implemented)
export * from './docker/DockerSandbox.js';
export * from './docker/SandboxedToolExecutor.js';

// New shared services
export * from './services/SessionService.js';
export * from './services/TeamContextService.js';
export * from './services/CollaborationService.js';

// Enhanced types
export interface EnhancedServerConfig extends ServerConfig {
  teamId?: string;
  projectId?: string;
  mcpServers?: MCPServerConfig[];
  toolPreferences?: ToolPreferences;
  collaborationMode?: 'individual' | 'shared' | 'review';
}

export interface TeamContext {
  teamId: string;
  members: TeamMember[];
  sharedMemory: SharedMemoryContext;
  projectFiles: ProjectFileContext;
  toolApprovals: ToolApprovalSettings;
}
```

## 🔧 **Implementation Phases**

### **Phase 1: Core Integration (Week 1-2)**
```bash
# Update team-server-sdk
packages/team-server-sdk/
├── src/
│   ├── ServerClient.ts          # Full core integration
│   ├── EnhancedConfig.ts        # Extended configuration
│   └── ToolManager.ts           # Complete tool ecosystem

# Dependencies
"@qwen-code/core": "latest"      # Full core access
```

### **Phase 2: AI Agent Enhancement (Week 2-3)**
```bash
# Update team-ai-agent  
packages/team-ai-agent/
├── src/
│   ├── handlers/
│   │   ├── EnhancedChatHandler.ts    # Full AI pipeline
│   │   └── ToolCoordinator.ts        # Advanced tool management
│   ├── session/
│   │   └── AdvancedSessionManager.ts # Compression, persistence
│   └── streaming/
│       └── RealtimeStreaming.ts      # WebSocket streaming
```

### **Phase 3: Service Backend (Week 3-4)**
```bash
# Update team-service
packages/team-service/
├── src/
│   ├── services/
│   │   ├── EnhancedAIService.ts      # Team-aware AI
│   │   ├── CollaborationService.ts   # Real-time collaboration  
│   │   └── ProjectContextService.ts  # Project integration
│   ├── websocket/
│   │   └── CollaborativeWebSocket.ts # Live collaboration
│   └── auth/
│       └── QwenOAuthIntegration.ts   # Enhanced authentication
```

### **Phase 4: Shared Services (Week 4)**
```bash
# Enhance team-shared
packages/team-shared/
├── src/
│   ├── services/
│   │   ├── SessionService.ts         # Advanced session management
│   │   ├── TeamContextService.ts     # Team collaboration context
│   │   └── CollaborationService.ts   # Real-time features
│   └── types/
│       └── EnhancedTypes.ts          # Extended type definitions
```

## 📊 **Feature Comparison**

| Feature | Current | Enhanced |
|---------|---------|----------|
| **AI Models** | Basic OpenAI | Qwen, OpenAI, Anthropic, Gemini |
| **Tools** | Shell only | All core tools + MCP |
| **Streaming** | None | Real-time WebSocket |
| **Session Mgmt** | Basic | Compression, persistence |
| **Authentication** | JWT only | Qwen OAuth2 + JWT |
| **Collaboration** | None | Real-time shared sessions |
| **Project Context** | None | Full file/project awareness |
| **Tool Execution** | Docker only | Full ecosystem + Docker |

## 🎯 **Expected Outcomes**

### **Performance Improvements:**
- **10x more AI capabilities** (from 20% to 100% of core features)
- **Real-time collaboration** with sub-second response times
- **Advanced session management** with automatic compression
- **Enterprise-grade scalability** with proper resource management

### **New Capabilities:**
- **Multi-model support** for different use cases
- **Complete tool ecosystem** for comprehensive development tasks
- **Team collaboration features** with shared context and real-time editing
- **Project-aware AI** with full codebase understanding
- **MCP extensibility** for custom tool integration

This enhancement plan transforms the team packages from basic Docker wrappers into a **full-featured AI collaboration platform** matching and extending the core CLI capabilities.

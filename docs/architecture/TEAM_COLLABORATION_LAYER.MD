# Complete Qwen Code Team System Architecture

Based on analysis of all packages, here's the comprehensive design and implementation overview:

## System Architecture Overview

Qwen Code implements a **distributed team collaboration platform** with the following architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEAM COLLABORATION LAYER                     │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  team-web       │  team-service   │  team-storage   │team-shared│
│  (Frontend)     │  (Backend API)  │  (Database)     │(Common)   │
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│  team-ai-agent  │ team-server-sdk │                 │           │
│  (ACP Server)   │ (Integration)   │                 │           │
├─────────────────┴─────────────────┴─────────────────┴───────────┤
│                    CORE QWEN CODE LAYER                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  packages/cli   │  packages/core  │  packages/sdk-typescript    │
│  (Terminal UI)  │  (AI Engine)    │  (Programmatic API)         │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Package Analysis

### **Team Layer Packages**

#### 1. **packages/team-shared** - Foundation
**Purpose**: Common utilities and type definitions

**Key Components**:
- **ACP Types**: Protocol definitions for agent communication
- **Error Handling**: Standardized error classes and handlers
- **Interfaces**: Common service interfaces (ISessionService)
- **Logger**: Shared logging utilities
- **Docker Sandbox**: Session-based containerized execution
  - **DockerSandboxConfig**: Common configuration interface
  - **DockerSandbox**: Persistent container lifecycle management
  - **SandboxedToolExecutor**: Unified tool execution in containers

**Design Pattern**: **Shared Kernel** - provides consistent types and functionality across all team packages

#### 2. **packages/team-server-sdk** - Integration Bridge
**Purpose**: Integrates qwen-code core with team services

**Key Components**:
- **ServerClient**: Main integration class with qwen-code core
- **TeamToolInjector**: Custom tool injection for team features
- **RetryHandler & CircuitBreaker**: Resilience patterns
- **Uses shared Docker sandbox**: Session-based container management

**Design Patterns**:
- **Adapter Pattern**: Bridges core and team functionality
- **Decorator Pattern**: Adds team capabilities to core tools
- **Circuit Breaker**: Fault tolerance for external services

#### 3. **packages/team-ai-agent** - ACP Server
**Purpose**: Agent Communication Protocol server implementation

**Key Components**:
- **AcpServer**: WebSocket-based ACP protocol server
- **UserSessionManager**: Multi-user session isolation
- **MessageRouter**: Routes messages between components
- **CoreAdapter**: Integrates with qwen-code core
- **AgentDiscoveryService**: Service discovery and health monitoring

**Design Patterns**:
- **Mediator Pattern**: MessageRouter coordinates communication
- **Observer Pattern**: Event-driven agent discovery
- **Strategy Pattern**: Different session management strategies

#### 4. **packages/team-service** - Backend API
**Purpose**: Main backend service with REST API and WebSocket support

**Key Components**:
- **Fastify Framework**: High-performance web server
- **UserSessionManager**: Session lifecycle management
- **AiService**: AI model integration and management
- **AcpClient**: Communicates with ACP agents
- **Uses shared Docker sandbox**: Session-based container management

**Design Patterns**:
- **Layered Architecture**: Controllers → Services → Data Access
- **Proxy Pattern**: Middleware for authentication and rate limiting
- **Factory Pattern**: Session and sandbox creation

#### 5. **packages/team-storage** - Data Layer
**Purpose**: MongoDB-based persistent storage

**Key Components**:
- **UnifiedModels**: Mongoose schemas for all data entities
- **EmbeddingService**: Vector search capabilities
- **UserService**: User management and authentication
- **TeamService**: Team collaboration features
- **ProjectService**: Project and workspace management

**Design Patterns**:
- **Repository Pattern**: Data access abstraction
- **Active Record**: Mongoose model pattern
- **Observer Pattern**: Model lifecycle hooks

#### 6. **packages/team-web** - Frontend
**Purpose**: React-based web interface

**Key Components**:
- **ChatContainer**: Real-time conversation interface
- **MessageList**: Message rendering with syntax highlighting
- **ToolApproval**: Interactive tool execution approval
- **SessionSidebar**: Session and project navigation
- **WebSocket Integration**: Real-time communication

**Design Patterns**:
- **Component Architecture**: React component hierarchy
- **State Management**: Zustand for global state
- **Observer Pattern**: WebSocket event handling
- **Command Pattern**: User action processing

### **Core Layer Integration**

The team packages integrate with the existing core packages:

- **packages/core**: Provides AI engine, tools, and content generation
- **packages/cli**: Terminal interface (can work standalone or with team features)
- **packages/sdk-typescript**: Programmatic API (extended by team-server-sdk)

## Key Design Principles

### 1. **Microservices Architecture**
- Each team package serves a specific domain
- Services communicate via well-defined APIs
- Independent deployment and scaling

### 2. **Agent Communication Protocol (ACP)**
- WebSocket-based real-time communication
- Agent discovery and health monitoring
- Session isolation and management

### 3. **Session-Based Containerized Execution**
- **Persistent containers per user session** (not per command)
- User workspace isolation with state persistence
- Container lifecycle tied to login/logout events
- Resource management and security constraints

### 4. **Multi-tenancy**
- User session isolation
- Team-based access control
- Project workspace separation

### 5. **Real-time Collaboration**
- WebSocket connections for live updates
- Shared session management
- Concurrent user support

## Data Flow Architecture

### 1. **User Interaction Flow**
```
Web UI → WebSocket → team-service → team-ai-agent → qwen-core → AI Model
```

### 2. **Tool Execution Flow**
```
AI Request → team-shared/SandboxedToolExecutor → Persistent Docker Container → Results
```

### 3. **Container Lifecycle Flow**
```
User Login → Create Container → Execute Commands → User Logout → Cleanup Container
```

### 4. **Data Persistence Flow**
```
User Action → team-service → team-storage → MongoDB → Vector Search
```

### 4. **Session Management Flow**
```
User Login → JWT Token → Session Creation → ACP Agent Assignment → Container Creation → Workspace Setup
```

## Implementation Highlights

### **Scalability Features**
- **Horizontal Scaling**: Multiple ACP agents can run in parallel
- **Load Balancing**: Session distribution across agents
- **Resource Isolation**: Persistent Docker containers per user session
- **Shared Components**: Consolidated Docker functionality eliminates duplication

### **Security Features**
- **JWT Authentication**: Secure user sessions
- **Sandboxed Execution**: Isolated tool execution in persistent containers
- **Input Sanitization**: XSS and injection prevention
- **Rate Limiting**: API abuse prevention
- **Container Security**: Restricted capabilities and read-only filesystems

### **Reliability Features**
- **Circuit Breaker**: Fault tolerance for external services
- **Retry Logic**: Automatic retry with exponential backoff
- **Health Monitoring**: Agent and service health checks
- **Session Recovery**: Persistent session state and container lifecycle
- **Graceful Cleanup**: Automatic container removal on session timeout

This architecture enables Qwen Code to scale from individual CLI usage to enterprise team collaboration while maintaining the core AI capabilities and extending them with team-specific features.

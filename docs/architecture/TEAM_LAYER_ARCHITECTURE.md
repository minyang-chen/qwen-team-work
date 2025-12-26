# Team Layer Architecture

## Overview

The team collaboration layer provides multi-user, session-based access to qwen-code functionality. It consists of a web frontend, API gateway, optional ACP protocol adapter, and a server SDK that wraps the core qwen-code functionality.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  team-web (React Frontend)                               │   │
│  │  - User interface                                        │   │
│  │  - WebSocket client                                      │   │
│  │  - State management (Zustand)                           │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                   WebSocket / HTTP
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                    API Gateway Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  team-service (Fastify Server)                           │   │
│  │  - WebSocket server (Socket.IO)                          │   │
│  │  - REST API endpoints                                    │   │
│  │  - Authentication/Authorization (JWT)                    │   │
│  │  - Request routing                                       │   │
│  └────────────┬─────────────────────────┬───────────────────┘   │
└───────────────┼─────────────────────────┼────────────────────────┘
                │                         │
        ┌───────┴────────┐       ┌────────▼────────┐
        │                │       │                 │
┌───────▼────────┐  ┌────▼───────▼─────┐  ┌───────▼────────┐
│ team-storage   │  │  team-ai-agent      │  │ Direct Usage   │
│ (MongoDB)      │  │  (ACP Protocol)  │  │ (Optional)     │
│                │  │                  │  │                │
│ - User data    │  │ - WebSocket      │  │ - Bypass ACP   │
│ - Teams        │  │ - Message router │  │ - Direct SDK   │
│ - Sessions     │  │ - Protocol xlate │  │                │
│ - Files        │  └────────┬─────────┘  └────────┬───────┘
└────────────────┘           │                     │
                             └──────────┬──────────┘
                                        │
                               Server SDK API
                                        │
┌────────────────────────────────────────▼─────────────────────────┐
│              Server SDK Layer (@qwen-team/server-sdk)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ServerClient                                            │   │
│  │  - query(prompt): Promise<QueryResult>                  │   │
│  │  - queryStream(prompt): AsyncIterator<StreamChunk>      │   │
│  │  - Session management                                   │   │
│  │  - Core wrapper (no subprocess)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                Core Internal API
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│              Core Layer (@qwen-code/core)                         │
│  - GeminiClient (LLM communication)                               │
│  - Config (configuration management)                              │
│  - CoreToolScheduler (tool execution)                             │
│  - File operations, Shell execution                               │
└───────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### 1. Presentation Layer

#### **@qwen-team/web** (team-web)
**Technology**: React + Vite + TypeScript

**Responsibilities**:
- User interface rendering
- WebSocket client for real-time communication
- State management with Zustand
- Markdown rendering with syntax highlighting
- File upload/download UI

**Does NOT**:
- Make direct API calls to core
- Manage authentication (delegates to team-service)
- Store sensitive data

### 2. API Gateway Layer

#### **@qwen-team/service** (team-service)
**Technology**: Fastify + Socket.IO + TypeScript

**Responsibilities**:
- WebSocket server for real-time chat
- REST API endpoints for user/team management
- JWT authentication and authorization
- Request validation and sanitization
- Rate limiting
- Routes requests to team-storage or team-ai-agent/server-sdk

**Does NOT**:
- Directly manipulate core
- Store data (delegates to team-storage)
- Execute AI queries directly (delegates to server-sdk)

### 3. Data Layer

#### **@qwen-team/storage** (team-storage)
**Technology**: Express + MongoDB + Mongoose

**Responsibilities**:
- User data persistence
- Team and project management
- Session metadata storage
- File metadata and storage
- Vector embeddings for search

**Does NOT**:
- Execute AI queries
- Handle WebSocket connections
- Manage authentication (delegates to team-service)

### 4. Protocol Adapter Layer (Optional)

#### **@qwen-team/ai-agent** (team-ai-agent)
**Technology**: WebSocket + TypeScript

**Responsibilities**:
- ACP protocol WebSocket server
- Protocol translation (ACP ↔ Server SDK)
- Message routing
- Session isolation

**When to Use**:
- Distributed architecture (separate AI workers)
- Non-Node.js clients
- Network-level isolation
- Centralized rate limiting

**When to Skip**:
- All clients are Node.js/TypeScript
- Simple deployment model
- Direct SDK usage is sufficient

### 5. Server SDK Layer

#### **@qwen-team/server-sdk** (team-server-sdk) **[NEW]**
**Technology**: TypeScript wrapper around @qwen-code/core

**Responsibilities**:
- Clean server-friendly API over core
- Session management
- Query execution (no subprocess)
- Streaming support
- Error handling and retry logic

**Public API**:
```typescript
export class ServerClient {
  constructor(config: ServerConfig);
  query(prompt: string): Promise<QueryResult>;
  queryStream(prompt: string): AsyncIterator<StreamChunk>;
  dispose(): Promise<void>;
}
```

**Does NOT**:
- Spawn CLI subprocess (unlike @qwen-code/sdk)
- Handle HTTP/WebSocket protocols
- Manage user authentication

### 6. Core Layer

#### **@qwen-code/core**
**Technology**: TypeScript + Google Gemini API

**Responsibilities**:
- LLM communication (GeminiClient)
- Tool execution (CoreToolScheduler)
- File operations
- Shell execution
- Configuration management
- Sandbox management

## Data Flow

### User Query Flow

```
1. User types message in team-web
   ↓
2. team-web sends via WebSocket to team-service
   {
     type: 'chat.message',
     content: 'Explain this code',
     sessionId: 'sess-123'
   }
   ↓
3. team-service validates and routes
   ↓
4a. Option A: Direct to server-sdk
    team-service → server-sdk.query()
    
4b. Option B: Via ACP protocol
    team-service → team-ai-agent (ACP) → server-sdk.query()
   ↓
5. server-sdk wraps core
   const client = new ServerClient(config);
   const result = await client.query(prompt);
   ↓
6. core executes
   GeminiClient → LLM API
   CoreToolScheduler → Tool execution
   ↓
7. Response flows back
   core → server-sdk → team-service → team-web
   ↓
8. team-web displays result
```

## Dependency Management

### Package Dependencies

```json
// @qwen-team/web
{
  "dependencies": {
    "react": "^18.2.0",
    "socket.io-client": "^4.6.0",
    "zustand": "^4.4.7"
  }
}

// @qwen-team/service
{
  "dependencies": {
    "@qwen-team/server-sdk": "workspace:*",
    "@qwen-team/shared": "workspace:*",
    "fastify": "^4.25.0",
    "socket.io": "^4.6.0"
  }
}

// @qwen-team/storage
{
  "dependencies": {
    "@qwen-team/shared": "workspace:*",
    "express": "^4.18.2",
    "mongoose": "^8.0.3"
  }
}

// @qwen-team/ai-agent (optional)
{
  "dependencies": {
    "@qwen-team/server-sdk": "workspace:*",
    "@qwen-team/shared": "workspace:*",
    "ws": "^8.0.0"
  }
}

// @qwen-team/server-sdk
{
  "dependencies": {
    "@qwen-code/core": "^0.5.1"
  }
}

// @qwen-team/shared
{
  "dependencies": {
    // Only utility libraries, no core/SDK dependencies
  }
}
```

### Import Rules

```typescript
// ✅ CORRECT: team-service imports
import { ServerClient } from '@qwen-team/server-sdk';
import { AcpMessage } from '@qwen-team/shared';

// ✅ CORRECT: server-sdk imports
import { GeminiClient, Config } from '@qwen-code/core';

// ❌ WRONG: Don't import core directly in team-service
import { GeminiClient } from '@qwen-code/core';

// ❌ WRONG: Don't cross package boundaries
import { MongoService } from '../../team-storage/src/services';
```

## Configuration

### Environment Variables

```bash
# team-web/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# team-service/.env
PORT=3001
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/qwen-team
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=qwen-coder-plus

# team-storage/.env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/qwen-team
JWT_SECRET=your-secret-key

# team-ai-agent/.env (if using ACP)
PORT=8001
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=qwen-coder-plus
```

## Deployment

### Development

```bash
# Start all services
cd packages/team-web && npm run dev &
cd packages/team-service && npm run dev &
cd packages/team-storage && npm run dev &

# Optional: Start ACP agent
cd packages/team-ai-agent && npm run dev &
```

### Production

```bash
# Build all packages
npm run build

# Start services
cd packages/team-web && npm run preview &
cd packages/team-service && npm start &
cd packages/team-storage && npm start &
```

### Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  team-web:
    build: ./packages/team-web
    ports:
      - "3000:3000"
  
  team-service:
    build: ./packages/team-service
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/qwen-team
  
  team-storage:
    build: ./packages/team-storage
    ports:
      - "3002:3002"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/qwen-team
  
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

## Security

### Authentication Flow

```
1. User logs in via team-web
   ↓
2. team-web → team-service (POST /auth/login)
   ↓
3. team-service validates credentials with team-storage
   ↓
4. team-service issues JWT token
   ↓
5. team-web stores token in memory
   ↓
6. All subsequent requests include JWT in Authorization header
   ↓
7. team-service validates JWT on each request
```

### Session Isolation

- Each user has separate server-sdk client instance
- Sessions isolated by userId
- No shared state between users
- Sandbox execution for tool calls

## Monitoring

### Key Metrics

```typescript
interface Metrics {
  // API Gateway
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  
  // WebSocket
  activeConnections: number;
  messagesPerSecond: number;
  
  // AI Processing
  activeSessions: number;
  tokenUsage: { input: number; output: number };
  averageQueryTime: number;
  
  // Storage
  databaseConnections: number;
  queryLatency: number;
}
```

## Migration Path

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for step-by-step instructions to migrate to this architecture.

## Version History

- **v2.0** (2025-12-25): Updated architecture
  - Renamed packages (team-backend → team-storage, etc.)
  - Added @qwen-team/server-sdk
  - Made team-ai-agent optional
  - Clarified layer responsibilities

# Team Layer Architecture Summary

## Package Overview

```
packages/
├── team-web/           # React frontend (Presentation)
├── team-service/       # Fastify API gateway (API Gateway)
├── team-storage/       # MongoDB persistence (Data Layer)
├── team-ai-agent/      # ACP protocol adapter (Optional)
├── team-server-sdk/    # Core wrapper (NEW - To be created)
└── team-shared/        # Common types
```

## Architecture Flow

### **Primary Flow (Recommended)**
```
team-web → team-service → team-server-sdk → @qwen-code/core
```

### **Alternative Flow (With ACP Protocol)**
```
team-web → team-service → team-ai-agent → team-server-sdk → @qwen-code/core
```

### **Data Flow**
```
team-web → team-service → team-storage (MongoDB)
```

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  team-web (React + Vite + TypeScript)             │    │
│  │  - UI components                                   │    │
│  │  - WebSocket client                                │    │
│  │  - State management (Zustand)                      │    │
│  └────────────────────┬───────────────────────────────┘    │
└───────────────────────┼──────────────────────────────────────┘
                        │
                WebSocket / HTTP
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  team-service (Fastify + Socket.IO)               │    │
│  │  - WebSocket server                                │    │
│  │  - REST API                                        │    │
│  │  - JWT authentication                              │    │
│  │  - Request routing                                 │    │
│  └────────┬──────────────────────┬────────────────────┘    │
└───────────┼──────────────────────┼───────────────────────────┘
            │                      │
    ┌───────┴────────┐    ┌────────▼────────┐
    │                │    │                 │
┌───▼────────┐  ┌────▼────▼─────┐  ┌───────▼────────┐
│ team-      │  │ team-ai-agent │  │ Direct Usage   │
│ storage    │  │ (Optional)    │  │ (Bypass ACP)   │
│            │  │               │  │                │
│ MongoDB    │  │ ACP Protocol  │  │ Direct SDK     │
│ Mongoose   │  │ WebSocket     │  │ calls          │
└────────────┘  └────────┬──────┘  └────────┬───────┘
                         │                  │
                         └────────┬─────────┘
                                  │
                         Server SDK API
                                  │
┌─────────────────────────────────▼────────────────────────────┐
│              SERVER SDK LAYER (NEW)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @qwen-team/server-sdk                            │    │
│  │                                                    │    │
│  │  class ServerClient {                             │    │
│  │    query(prompt): Promise<QueryResult>            │    │
│  │    queryStream(prompt): AsyncIterator<Chunk>      │    │
│  │  }                                                 │    │
│  │                                                    │    │
│  │  - Wraps @qwen-code/core                          │    │
│  │  - No subprocess overhead                         │    │
│  │  - Session management                             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────┘
                                  │
                         Core Internal API
                                  │
┌─────────────────────────────────▼────────────────────────────┐
│              CORE LAYER                                      │
│                                                              │
│  @qwen-code/core                                            │
│  - GeminiClient (LLM communication)                         │
│  - Config (configuration)                                   │
│  - CoreToolScheduler (tool execution)                       │
│  - File operations, Shell execution                         │
└──────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

| Package | Purpose | Technology | Dependencies |
|---------|---------|------------|--------------|
| **team-web** | User interface | React + Vite | None (frontend only) |
| **team-service** | API gateway, routing | Fastify + Socket.IO | team-server-sdk, team-shared |
| **team-storage** | Data persistence | Express + MongoDB | team-shared |
| **team-ai-agent** | ACP protocol adapter | WebSocket | team-server-sdk, team-shared |
| **team-server-sdk** | Core wrapper | TypeScript | @qwen-code/core |
| **team-shared** | Common types | TypeScript | None |

## Key Design Decisions

### 1. **Direct SDK Usage (Recommended)**
- team-service uses team-server-sdk directly
- No ACP protocol overhead
- Simpler architecture
- Lower latency

**When to use:**
- All clients are Node.js/TypeScript
- Single deployment environment
- Simple scaling requirements

### 2. **ACP Protocol (Optional)**
- team-service → team-ai-agent → team-server-sdk
- Network-level isolation
- Language-agnostic protocol

**When to use:**
- Distributed architecture
- Non-Node.js clients
- Separate AI worker pools
- Network boundary requirements

### 3. **Server SDK (New Package)**
- Wraps @qwen-code/core with clean API
- No subprocess (unlike @qwen-code/sdk)
- Server-optimized
- Reusable across packages

## Data Flow Examples

### Example 1: User Query (Direct)
```
1. User types in team-web
   ↓
2. WebSocket to team-service
   ↓
3. team-service → team-server-sdk.query()
   ↓
4. team-server-sdk → @qwen-code/core
   ↓
5. core → LLM API
   ↓
6. Response back through chain
   ↓
7. Display in team-web
```

### Example 2: User Query (With ACP)
```
1. User types in team-web
   ↓
2. WebSocket to team-service
   ↓
3. team-service → team-ai-agent (ACP WebSocket)
   ↓
4. team-ai-agent → team-server-sdk.query()
   ↓
5. team-server-sdk → @qwen-code/core
   ↓
6. core → LLM API
   ↓
7. Response back through chain
   ↓
8. Display in team-web
```

### Example 3: Data Persistence
```
1. User creates team in team-web
   ↓
2. HTTP POST to team-service
   ↓
3. team-service → team-storage API
   ↓
4. team-storage → MongoDB
   ↓
5. Response back to team-web
```

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State**: Zustand
- **Styling**: Tailwind CSS
- **WebSocket**: Socket.IO Client

### Backend
- **API Gateway**: Fastify
- **WebSocket**: Socket.IO
- **Database**: MongoDB + Mongoose
- **Auth**: JWT
- **Language**: TypeScript

### AI Layer
- **Core**: @qwen-code/core
- **Wrapper**: @qwen-team/server-sdk (NEW)
- **Protocol**: ACP (optional)
- **Language**: TypeScript

## Environment Configuration

### team-web/.env
```bash
VITE_API_URL=http://localhost:8002
VITE_WS_URL=http://localhost:8002
```

### team-service/.env
```bash
PORT=8002
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/qwen-team
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.example.com/v1
OPENAI_MODEL=qwen-coder-plus
```

### team-storage/.env
```bash
PORT=8000
MONGODB_URI=mongodb://localhost:27017/qwen-team
JWT_SECRET=your-secret-key
```

### team-ai-agent/.env (if using)
```bash
PORT=8001
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.example.com/v1
OPENAI_MODEL=qwen-coder-plus
```

## Deployment

### Development
```bash
# Terminal 1: Frontend
cd packages/team-web && npm run dev

# Terminal 2: API Gateway
cd packages/team-service && npm run dev

# Terminal 3: Storage
cd packages/team-storage && npm run dev

# Terminal 4 (optional): AI Agent
cd packages/team-ai-agent && npm run dev
```

### Production
```bash
# Build all packages
npm run build

# Start services
npm run start --workspaces
```

## Next Steps

1. **Create team-server-sdk package**
   - Implement ServerClient class
   - Wrap @qwen-code/core
   - Add session management

2. **Update team-service**
   - Import team-server-sdk
   - Replace direct core usage
   - Add error handling

3. **Update team-ai-agent (optional)**
   - Use team-server-sdk
   - Remove direct core imports
   - Add protocol translation

4. **Testing**
   - Unit tests for each package
   - Integration tests for flows
   - E2E tests for user scenarios

## Migration Status

- [x] Rename packages (team-backend → team-storage, etc.)
- [x] Update architecture documentation
- [ ] Create team-server-sdk package
- [ ] Refactor team-service to use server-sdk
- [ ] Refactor team-ai-agent to use server-sdk
- [ ] Update tests
- [ ] Deploy and validate

## References

- [Full Architecture](./TEAM_LAYER_ARCHITECTURE.md)
- [Quick Reference](./TEAM_LAYER_QUICK_REFERENCE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

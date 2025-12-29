# Package Structure Reference

## Current Package Layout

```
qwen-team-work/
├── packages/
│   ├── team-web/              # @qwen-team/web
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── stores/        # Zustand stores
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   ├── team-service/          # @qwen-team/service
│   │   ├── src/
│   │   │   ├── routes/        # API routes
│   │   │   ├── services/      # Business logic
│   │   │   ├── websocket/     # WebSocket handlers
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── team-storage/          # @qwen-team/storage
│   │   ├── src/
│   │   │   ├── models/        # MongoDB models
│   │   │   ├── routes/        # REST API
│   │   │   ├── services/      # Data services
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── team-ai-agent/         # @qwen-team/ai-agent (Optional)
│   │   ├── src/
│   │   │   ├── server/        # ACP WebSocket server
│   │   │   ├── protocol/      # Protocol translation
│   │   │   ├── handlers/      # Message handlers
│   │   │   ├── session/       # Session management
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── team-server-sdk/       # @qwen-team/server-sdk (TO BE CREATED)
│   │   ├── src/
│   │   │   ├── ServerClient.ts
│   │   │   ├── SessionManager.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── team-shared/           # @qwen-team/shared
│       ├── src/
│       │   ├── types/         # Type definitions
│       │   ├── interfaces/    # Service interfaces
│       │   ├── utils/         # Shared utilities
│       │   └── index.ts
│       └── package.json
│
└── docs/
    └── architecture/
        ├── TEAM_LAYER_ARCHITECTURE.md
        ├── TEAM_LAYER_QUICK_REFERENCE.md
        ├── MIGRATION_GUIDE.md
        ├── ARCHITECTURE_SUMMARY.md
        └── PACKAGE_STRUCTURE.md (this file)
```

## Package Dependencies

```
team-web
  └─→ (no backend dependencies)

team-service
  ├─→ @qwen-team/server-sdk@workspace:*
  └─→ @qwen-team/shared@workspace:*

team-storage
  └─→ @qwen-team/shared@workspace:*

team-ai-agent (optional)
  ├─→ @qwen-team/server-sdk@workspace:*
  └─→ @qwen-team/shared@workspace:*

team-server-sdk
  └─→ @qwen-code/core@^0.5.1

team-shared
  └─→ (no dependencies)
```

## Package Purposes

### team-web
**Purpose**: User-facing web application  
**Technology**: React + Vite + TypeScript  
**Port**: 3000  
**Depends on**: None (frontend only)

### team-service
**Purpose**: API gateway and WebSocket server  
**Technology**: Fastify + Socket.IO  
**Port**: 3001  
**Depends on**: team-server-sdk, team-shared

### team-storage
**Purpose**: Data persistence layer  
**Technology**: Express + MongoDB  
**Port**: 3002  
**Depends on**: team-shared

### team-ai-agent
**Purpose**: ACP protocol adapter (optional)  
**Technology**: WebSocket  
**Port**: 8001  
**Depends on**: team-server-sdk, team-shared

### team-server-sdk
**Purpose**: Core wrapper for server usage  
**Technology**: TypeScript  
**Port**: N/A (library)  
**Depends on**: @qwen-code/core

### team-shared
**Purpose**: Shared types and utilities  
**Technology**: TypeScript  
**Port**: N/A (library)  
**Depends on**: None

## Communication Patterns

### Frontend ↔ Backend
```
team-web ←→ team-service
  Protocol: WebSocket (Socket.IO) + HTTP (REST)
  Format: JSON
```

### Backend ↔ Storage
```
team-service ←→ team-storage
  Protocol: HTTP (REST)
  Format: JSON
```

### Backend ↔ AI
```
Option A (Direct):
  team-service → team-server-sdk
    Protocol: Function calls
    Format: TypeScript types

Option B (ACP):
  team-service → team-ai-agent → team-server-sdk
    Protocol: WebSocket (ACP)
    Format: JSON
```

### AI ↔ Core
```
team-server-sdk → @qwen-code/core
  Protocol: Function calls
  Format: TypeScript types
```

## Development Workflow

### Starting All Services
```bash
# Terminal 1: Frontend
cd packages/team-web
npm run dev

# Terminal 2: API Gateway
cd packages/team-service
npm run dev

# Terminal 3: Storage
cd packages/team-storage
npm run dev

# Terminal 4 (optional): AI Agent
cd packages/team-ai-agent
npm run dev
```

### Building All Packages
```bash
# From root
npm run build

# Or individually
cd packages/team-web && npm run build
cd packages/team-service && npm run build
cd packages/team-storage && npm run build
cd packages/team-ai-agent && npm run build
cd packages/team-server-sdk && npm run build
cd packages/team-shared && npm run build
```

## Port Allocation

| Service | Port | Protocol |
|---------|------|----------|
| team-web | 8003 | HTTP |
| team-service | 8002 | HTTP + WebSocket |
| team-ai-agent | 8001 | WebSocket |
| team-storage | 8000 | HTTP |
| MongoDB | 27017 | MongoDB Protocol |

## Environment Variables

### Required for team-service
```bash
PORT=3001
JWT_SECRET=<secret>
MONGODB_URI=mongodb://localhost:27017/qwen-team
OPENAI_API_KEY=<key>
OPENAI_BASE_URL=<url>
OPENAI_MODEL=<model>
```

### Required for team-storage
```bash
PORT=3002
MONGODB_URI=mongodb://localhost:27017/qwen-team
JWT_SECRET=<secret>
```

### Required for team-ai-agent (if used)
```bash
PORT=8001
OPENAI_API_KEY=<key>
OPENAI_BASE_URL=<url>
OPENAI_MODEL=<model>
```

## Next Steps

1. ✅ Package structure defined
2. ✅ Dependencies mapped
3. ✅ Communication patterns documented
4. ⏳ Create team-server-sdk package
5. ⏳ Implement ServerClient
6. ⏳ Update team-service to use server-sdk
7. ⏳ Update team-ai-agent to use server-sdk
8. ⏳ Add tests
9. ⏳ Deploy

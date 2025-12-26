# Team Layer Architecture - Quick Reference

## Layer Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                           │
│ - team-web (React, WebSocket client)                        │
│                                                              │
│ Responsibilities: UI rendering, user interaction            │
│ Does NOT: Business logic, data persistence                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  WebSocket / HTTP
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ API GATEWAY LAYER                                            │
│ - team-service (Fastify, Socket.IO, JWT auth)              │
│                                                              │
│ Responsibilities: Routing, auth, validation                 │
│ Does NOT: Data storage, AI execution                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────┐                   ┌────────▼────────┐
│ DATA LAYER     │                   │ AI LAYER        │
│ team-storage   │                   │ (Choose one)    │
│ (MongoDB)      │                   │                 │
└────────────────┘                   │ Option A:       │
                                     │ team-service    │
                                     │ → server-sdk    │
                                     │                 │
                                     │ Option B:       │
                                     │ team-service    │
                                     │ → team-ai-agent    │
                                     │ → server-sdk    │
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ @qwen-team/     │
                                     │ server-sdk      │
                                     │                 │
                                     │ - ServerClient  │
                                     │ - Core wrapper  │
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ @qwen-code/core │
                                     └─────────────────┘
```

## Key Principles

### ✅ DO

1. **Use Server SDK, not Core**
   ```typescript
   import { ServerClient } from '@qwen-team/server-sdk';
   const client = new ServerClient({ apiKey: '...' });
   const result = await client.query('Hello');
   ```

2. **Layer Separation**
   ```typescript
   team-web → team-service → team-storage (data)
                          → server-sdk (AI)
   ```

3. **Inject Dependencies**
   ```typescript
   class AIService {
     constructor(private serverSdk: ServerClient) {}
   }
   ```

4. **Isolate Sessions**
   ```typescript
   // One SDK client per user
   sessions.set(userId, { client: new ServerClient(...) });
   ```

### ❌ DON'T

1. **Don't Import Core Directly**
   ```typescript
   // ❌ WRONG in team-service
   import { GeminiClient } from '@qwen-code/core';
   ```

2. **Don't Cross Boundaries**
   ```typescript
   // ❌ WRONG
   import { MongoService } from '../../team-storage/src/services';
   ```

3. **Don't Mix Concerns**
   ```typescript
   // ❌ WRONG - team-web shouldn't call server-sdk
   import { ServerClient } from '@qwen-team/server-sdk';
   ```

## Message Flow Example

### User Query: "Explain this code"

```
1. User → team-web (React)
   "Explain this code"

2. team-web → team-service (WebSocket)
   { type: 'chat', content: 'Explain this code', sessionId: 'sess-1' }

3. team-service → server-sdk
   const client = await getClientForSession('sess-1');
   const result = await client.query('Explain this code');

4. server-sdk → core
   GeminiClient.sendMessage(...)

5. core → LLM
   API call

6. LLM → core
   Response

7. core → server-sdk
   QueryResult { text: '...' }

8. server-sdk → team-service
   QueryResult

9. team-service → team-web (WebSocket)
   { type: 'response', content: '...' }

10. team-web → User
    Display response
```

## Package Dependencies

```
team-web
  ↓ (no backend dependencies)
  
team-service
  ├─→ @qwen-team/server-sdk@workspace:*
  └─→ @qwen-team/shared@workspace:*
  
team-storage
  └─→ @qwen-team/shared@workspace:*
  
team-ai-agent (optional)
  ├─→ @qwen-team/server-sdk@workspace:*
  └─→ @qwen-team/shared@workspace:*
  
@qwen-team/server-sdk
  └─→ @qwen-code/core@^0.5.1
```

## File Structure

```
packages/
├── team-web/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   └── package.json
│
├── team-service/          # API gateway
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── aiService.ts    # Uses server-sdk
│   │   └── websocket/
│   └── package.json
│
├── team-storage/          # Data persistence
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
│
├── team-ai-agent/            # ACP protocol (optional)
│   ├── src/
│   │   ├── server/
│   │   ├── protocol/
│   │   └── handlers/
│   └── package.json
│
├── team-server-sdk/       # Core wrapper
│   ├── src/
│   │   ├── ServerClient.ts
│   │   ├── SessionManager.ts
│   │   └── types.ts
│   └── package.json
│
└── team-shared/           # Common types
    ├── src/
    │   ├── types/
    │   └── interfaces/
    └── package.json
```

## Configuration

### team-service/.env

```bash
# Server
PORT=3001
NODE_ENV=production

# Auth
JWT_SECRET=your-secret-key

# Database
MONGODB_URI=mongodb://localhost:27017/qwen-team

# AI Configuration
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.example.com/v1
OPENAI_MODEL=qwen-coder-plus
```

### Usage in Code

```typescript
// team-service/src/services/aiService.ts
import { ServerClient } from '@qwen-team/server-sdk';

export class AIService {
  private clients = new Map<string, ServerClient>();
  
  async getClient(userId: string): Promise<ServerClient> {
    if (!this.clients.has(userId)) {
      const client = new ServerClient({
        apiKey: process.env.OPENAI_API_KEY!,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
        sessionId: userId
      });
      this.clients.set(userId, client);
    }
    return this.clients.get(userId)!;
  }
  
  async processMessage(userId: string, message: string) {
    const client = await this.getClient(userId);
    return await client.query(message);
  }
}
```

## Error Handling

### Error Flow

```
Core Error
  ↓
Server SDK catches and wraps
  ↓
team-service catches and formats
  ↓
team-web displays to user
```

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: 'TOOL_EXECUTION_FAILED',
    message: 'Failed to read file',
    details: {
      tool: 'fs_read',
      path: '/etc/shadow'
    }
  },
  timestamp: Date.now()
}
```

## Testing

### Unit Test Example

```typescript
// team-service/src/services/aiService.test.ts
describe('AIService', () => {
  it('processes message via server-sdk', async () => {
    const mockSdk = createMockServerSdk();
    const service = new AIService(mockSdk);
    
    mockSdk.query.mockResolvedValue({
      text: 'Hello back!'
    });
    
    const result = await service.processMessage('user-1', 'Hello');
    
    expect(result.text).toBe('Hello back!');
  });
});
```

### Integration Test Example

```typescript
// team-service/test/integration.test.ts
describe('WebSocket Integration', () => {
  it('handles chat message end-to-end', async () => {
    const ws = await connectWebSocket('ws://localhost:3001');
    
    ws.send(JSON.stringify({
      type: 'chat',
      content: 'Hello',
      sessionId: 'sess-1'
    }));
    
    const response = await waitForMessage(ws);
    
    expect(response.type).toBe('response');
    expect(response.content).toBeDefined();
  });
});
```

## Deployment Checklist

- [ ] All packages built (`npm run build`)
- [ ] Environment variables configured
- [ ] MongoDB running and accessible
- [ ] Ports exposed (3000, 3001, 3002)
- [ ] JWT secret set
- [ ] OpenAI API key configured
- [ ] Health checks working
- [ ] Logging configured
- [ ] Monitoring enabled

## Common Pitfalls

### ❌ Pitfall 1: Direct Core Import in team-service
```typescript
// DON'T
import { GeminiClient } from '@qwen-code/core';
```

**Fix**: Use server-sdk
```typescript
// DO
import { ServerClient } from '@qwen-team/server-sdk';
```

### ❌ Pitfall 2: Frontend Calling Backend Directly
```typescript
// DON'T - team-web calling team-storage
fetch('http://localhost:3002/api/users');
```

**Fix**: Go through team-service
```typescript
// DO - team-web calling team-service
fetch('http://localhost:3001/api/users');
```

### ❌ Pitfall 3: Shared State
```typescript
// DON'T
const globalClient = new ServerClient();
```

**Fix**: Session isolation
```typescript
// DO
class AIService {
  private clients = new Map<string, ServerClient>();
  
  getClient(userId: string): ServerClient {
    // One client per user
  }
}
```

### ❌ Pitfall 4: Missing Error Handling
```typescript
// DON'T
const result = await client.query(prompt);
return result.text;
```

**Fix**: Handle errors
```typescript
// DO
try {
  const result = await client.query(prompt);
  return { success: true, data: result.text };
} catch (error) {
  return { success: false, error: error.message };
}
```

## Quick Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development
cd packages/team-web && npm run dev &
cd packages/team-service && npm run dev &
cd packages/team-storage && npm run dev &

# Run tests
npm test --workspaces

# Clean build artifacts
npm run clean
```

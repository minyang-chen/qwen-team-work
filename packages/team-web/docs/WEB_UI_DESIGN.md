# Qwen Code Web UI - Design Document

**Version:** 1.0  
**Date:** December 4, 2025

## Executive Summary

Add a web-based interface to Qwen Code that provides all CLI functionality through a modern browser UI, enabling easier access, better visualization, and enhanced collaboration features.

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interfaces                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Terminal   │  │   Web UI     │  │  VS Code     │     │
│  │     CLI      │  │  (Browser)   │  │  Extension   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Shared Core Package                      │
│  - Business Logic, API Integration, Tool System             │
└─────────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/
├── cli/                    # Existing CLI (React/Ink)
├── web-ui/                 # New Web UI package
│   ├── client/            # Frontend (React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── contexts/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── package.json
│   └── server/            # Backend (Express/Fastify)
│       ├── src/
│       │   ├── api/
│       │   ├── websocket/
│       │   ├── auth/
│       │   └── services/
│       └── package.json
├── core/                   # Shared core (existing)
└── vscode-ide-companion/   # Existing VS Code extension
```

---

## Design Approach

### Option 1: Thin Server Architecture (Recommended)

**Concept**: Minimal server layer, maximum code reuse from core package

```
Browser (React) ←→ WebSocket/HTTP ←→ Thin Server ←→ Core Package
```

**Advantages**:

- Maximum code reuse (90%+ from core)
- Consistent behavior across CLI and Web
- Easier maintenance
- Single source of truth

**Implementation**:

```typescript
// Server acts as adapter
class WebUIServer {
  private client: Client; // From core package

  async handleChatMessage(sessionId: string, message: string) {
    const session = this.sessions.get(sessionId);
    return await this.client.sendMessage(message, session.context);
  }
}
```

### Option 2: Thick Server Architecture

**Concept**: Server reimplements logic, client is pure UI

**Disadvantages**:

- Code duplication
- Maintenance burden
- Behavior divergence risk

**Not Recommended**

---

## Detailed Design

### 1. Frontend (Client)

**Technology Stack**:

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand or React Context
- **WebSocket**: Socket.io-client
- **HTTP Client**: Fetch API or Axios

**Key Components**:

```typescript
// Component Structure
src/
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── StreamingMessage.tsx
│   │   └── ToolApprovalDialog.tsx
│   ├── sidebar/
│   │   ├── SessionList.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── ExtensionManager.tsx
│   ├── tools/
│   │   ├── ToolExecutionView.tsx
│   │   ├── FileViewer.tsx
│   │   └── ShellOutput.tsx
│   └── common/
│       ├── CodeBlock.tsx
│       ├── Markdown.tsx
│       └── ErrorBoundary.tsx
├── pages/
│   ├── ChatPage.tsx
│   ├── SettingsPage.tsx
│   └── LoginPage.tsx
├── hooks/
│   ├── useChat.ts
│   ├── useWebSocket.ts
│   └── useToolApproval.ts
├── contexts/
│   ├── AuthContext.tsx
│   ├── SessionContext.tsx
│   └── SettingsContext.tsx
└── services/
    ├── api.ts
    ├── websocket.ts
    └── storage.ts
```

**Core Features**:

1. **Chat Interface**

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  streaming?: boolean;
}

function ChatContainer() {
  const { messages, sendMessage, isStreaming } = useChat();
  const { approveToolCall, rejectToolCall } = useToolApproval();

  return (
    <div className="chat-container">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
```

2. **Real-time Streaming**

```typescript
function useChat() {
  const ws = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    ws.on('message:chunk', (chunk) => {
      setMessages((prev) => updateStreamingMessage(prev, chunk));
    });

    ws.on('tool:request', (toolCall) => {
      // Show approval dialog
    });
  }, [ws]);

  return { messages, sendMessage: ws.send };
}
```

3. **Tool Approval UI**

```typescript
function ToolApprovalDialog({ toolCall, onApprove, onReject }) {
  return (
    <Dialog>
      <DialogTitle>Approve Tool Execution</DialogTitle>
      <DialogContent>
        <CodeBlock language="json">
          {JSON.stringify(toolCall, null, 2)}
        </CodeBlock>
      </DialogContent>
      <DialogActions>
        <Button onClick={onReject}>Reject</Button>
        <Button onClick={onApprove} variant="primary">Approve</Button>
      </DialogActions>
    </Dialog>
  );
}
```

### 2. Backend (Server)

**Technology Stack**:

- **Framework**: Fastify (faster) or Express
- **WebSocket**: Socket.io
- **Session**: Redis or in-memory
- **Auth**: JWT + OAuth2

**Architecture**:

```typescript
// Server Structure
src/
├── api/
│   ├── routes/
│   │   ├── chat.ts
│   │   ├── sessions.ts
│   │   ├── settings.ts
│   │   └── auth.ts
│   └── middleware/
│       ├── auth.ts
│       └── errorHandler.ts
├── websocket/
│   ├── handlers/
│   │   ├── chatHandler.ts
│   │   ├── toolHandler.ts
│   │   └── sessionHandler.ts
│   └── middleware/
│       └── authMiddleware.ts
├── services/
│   ├── SessionManager.ts
│   ├── ClientAdapter.ts
│   └── ToolApprovalService.ts
└── index.ts
```

**Core Implementation**:

1. **Session Manager**

```typescript
class SessionManager {
  private sessions = new Map<string, SessionState>();

  createSession(userId: string, config: Config): Session {
    const client = createClient(config); // From core package
    const session = {
      id: generateId(),
      userId,
      client,
      context: createContext(),
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
}
```

2. **WebSocket Handler**

```typescript
class ChatHandler {
  constructor(
    private sessionManager: SessionManager,
    private toolApprovalService: ToolApprovalService,
  ) {}

  async handleMessage(socket: Socket, data: ChatMessageData) {
    const session = this.sessionManager.getSession(data.sessionId);
    if (!session) throw new Error('Session not found');

    // Use core client
    const stream = session.client.sendMessageStream(data.message);

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        socket.emit('message:chunk', chunk);
      } else if (chunk.type === 'toolCall') {
        // Request approval
        const approved = await this.toolApprovalService.requestApproval(
          socket,
          chunk.toolCall,
        );

        if (approved) {
          // Continue execution
          await session.client.executeTool(chunk.toolCall);
        }
      }
    }

    socket.emit('message:complete');
  }
}
```

3. **Tool Approval Service**

```typescript
class ToolApprovalService {
  private pendingApprovals = new Map<string, PendingApproval>();

  async requestApproval(socket: Socket, toolCall: ToolCall): Promise<boolean> {
    const approvalId = generateId();

    return new Promise((resolve) => {
      this.pendingApprovals.set(approvalId, { toolCall, resolve });

      socket.emit('tool:approval-required', {
        approvalId,
        toolCall,
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          this.pendingApprovals.delete(approvalId);
          resolve(false);
        },
        5 * 60 * 1000,
      );
    });
  }

  handleApproval(approvalId: string, approved: boolean) {
    const pending = this.pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(approved);
      this.pendingApprovals.delete(approvalId);
    }
  }
}
```

4. **REST API Routes**

```typescript
// chat.ts
export function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/sessions', async (req, reply) => {
    const session = sessionManager.createSession(req.user.id, req.body.config);
    return { sessionId: session.id };
  });

  app.get('/api/sessions/:id/history', async (req, reply) => {
    const session = sessionManager.getSession(req.params.id);
    return session.client.getHistory();
  });

  app.post('/api/sessions/:id/compress', async (req, reply) => {
    const session = sessionManager.getSession(req.params.id);
    await session.client.compressHistory();
    return { success: true };
  });
}
```

### 3. Authentication

**Flow**:

```
Browser → Server → OAuth Provider → Server → Browser
```

**Implementation**:

```typescript
// Reuse core OAuth implementations
import { QwenOAuth2 } from '@qwen-code/core';

class WebAuthService {
  private oauth = new QwenOAuth2();

  async initiateLogin(req: Request, res: Response) {
    const authUrl = await this.oauth.getAuthorizationUrl({
      redirectUri: 'http://localhost:3000/auth/callback',
    });
    res.redirect(authUrl);
  }

  async handleCallback(req: Request, res: Response) {
    const tokens = await this.oauth.exchangeCodeForTokens(req.query.code);
    const jwt = this.generateJWT(tokens);
    res.cookie('auth_token', jwt, { httpOnly: true });
    res.redirect('/');
  }
}
```

### 4. State Management

**Client-Side State**:

```typescript
// Using Zustand
interface ChatStore {
  sessions: Session[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;

  createSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  approveToolCall: (id: string) => void;
  rejectToolCall: (id: string) => void;
}

const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,

  createSession: async () => {
    const response = await api.post('/api/sessions');
    set((state) => ({
      sessions: [...state.sessions, response.data],
      activeSessionId: response.data.id,
    }));
  },

  sendMessage: async (message: string) => {
    const { activeSessionId } = get();
    set({ isStreaming: true });

    // Add user message
    set((state) => ({
      messages: [
        ...state.messages,
        {
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
      ],
    }));

    // WebSocket will handle streaming response
    ws.emit('chat:message', { sessionId: activeSessionId, message });
  },
}));
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals**: Basic infrastructure

**Tasks**:

1. Create `packages/web-ui` structure
2. Setup Vite + React + TypeScript
3. Setup Fastify + Socket.io
4. Implement basic WebSocket communication
5. Create SessionManager using core Client

**Deliverable**: Echo server - send message, get response

### Phase 2: Core Features (Week 3-4)

**Goals**: Chat functionality

**Tasks**:

1. Implement streaming message display
2. Add tool approval workflow
3. Integrate with core tool system
4. Add session management UI
5. Implement settings panel

**Deliverable**: Functional chat with tool execution

### Phase 3: Authentication (Week 5)

**Goals**: Secure access

**Tasks**:

1. Implement OAuth2 flow
2. Add JWT authentication
3. Session persistence
4. User management

**Deliverable**: Secure, multi-user system

### Phase 4: Advanced Features (Week 6-8)

**Goals**: Feature parity with CLI

**Tasks**:

1. File viewer/editor
2. Shell output display
3. History compression UI
4. Extension management
5. MCP integration UI
6. Vision model support

**Deliverable**: Full feature parity

### Phase 5: Polish (Week 9-10)

**Goals**: Production ready

**Tasks**:

1. Error handling
2. Loading states
3. Responsive design
4. Accessibility
5. Performance optimization
6. Documentation

**Deliverable**: Production-ready web UI

---

## Code Reuse Strategy

### Shared from Core Package

**100% Reuse**:

- Client logic
- Tool system
- API integration
- Authentication
- Services (shell, file, git)
- Utilities

**Adapter Pattern**:

```typescript
// web-ui/server/src/adapters/ClientAdapter.ts
import { Client, Config } from '@qwen-code/core';

export class WebClientAdapter {
  private client: Client;

  constructor(config: Config) {
    this.client = new Client(config);
  }

  async sendMessage(message: string, onChunk: (chunk: any) => void) {
    const stream = this.client.sendMessageStream(message);

    for await (const chunk of stream) {
      onChunk(chunk);
    }
  }

  // Delegate all methods to core client
  getHistory = () => this.client.getHistory();
  compressHistory = () => this.client.compressHistory();
  executeTool = (tool: ToolCall) => this.client.executeTool(tool);
}
```

### Shared from CLI Package

**Reusable Logic** (extract to shared utils):

- Settings schema
- Configuration loading
- Command definitions
- Prompt templates

**Not Reusable**:

- Ink components (terminal-specific)
- Terminal UI logic

---

## Technology Recommendations

### Frontend

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "socket.io-client": "^4.6.0",
    "@tanstack/react-query": "^5.14.0",
    "tailwindcss": "^3.3.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "react-markdown": "^9.0.0",
    "prismjs": "^1.29.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0"
  }
}
```

### Backend

```json
{
  "dependencies": {
    "fastify": "^4.25.0",
    "socket.io": "^4.6.0",
    "jsonwebtoken": "^9.0.2",
    "redis": "^4.6.0",
    "@qwen-code/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0"
  }
}
```

---

## Deployment Architecture

### Development

```
Browser → http://localhost:5173 (Vite Dev Server)
              ↓
          WebSocket/HTTP
              ↓
       http://localhost:3000 (Fastify Server)
              ↓
          Core Package
```

### Production

```
Browser → Nginx (Reverse Proxy)
              ↓
          ┌─────────┴─────────┐
          ↓                   ↓
    Static Files        Fastify Server
    (React Build)       (WebSocket/API)
                              ↓
                        Core Package
```

**Docker Compose**:

```yaml
services:
  web-ui:
    build: ./packages/web-ui/client
    ports:
      - '80:80'

  api:
    build: ./packages/web-ui/server
    ports:
      - '3000:3000'
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

---

## Security Considerations

### 1. Authentication

- JWT with short expiration (15 min)
- Refresh tokens (7 days)
- HttpOnly cookies
- CSRF protection

### 2. Authorization

- Session isolation per user
- Tool execution approval required
- File access restrictions
- Rate limiting

### 3. WebSocket Security

- Authentication on connection
- Message validation
- Rate limiting per socket
- Automatic disconnect on suspicious activity

### 4. Data Protection

- Encrypt sensitive data at rest
- HTTPS only in production
- Secure credential storage
- No logging of sensitive data

---

## Performance Considerations

### 1. Frontend

- Code splitting by route
- Lazy load components
- Virtual scrolling for long chats
- Debounce user input
- Optimize re-renders

### 2. Backend

- Connection pooling
- Redis for session storage
- Stream large responses
- Implement backpressure
- Horizontal scaling support

### 3. WebSocket

- Binary protocol for large data
- Compression
- Heartbeat mechanism
- Reconnection logic

---

## Testing Strategy

### Frontend Tests

```typescript
// Component test
describe('ChatContainer', () => {
  it('should send message on submit', async () => {
    const { getByRole, getByText } = render(<ChatContainer />);
    const input = getByRole('textbox');
    const button = getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(getByText('Hello')).toBeInTheDocument();
    });
  });
});
```

### Backend Tests

```typescript
// Integration test
describe('ChatHandler', () => {
  it('should handle message and stream response', async () => {
    const socket = createMockSocket();
    const handler = new ChatHandler(sessionManager, toolApprovalService);

    await handler.handleMessage(socket, {
      sessionId: 'test-session',
      message: 'Hello',
    });

    expect(socket.emit).toHaveBeenCalledWith(
      'message:chunk',
      expect.any(Object),
    );
    expect(socket.emit).toHaveBeenCalledWith('message:complete');
  });
});
```

### E2E Tests

```typescript
// Playwright test
test('complete chat flow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.fill('[data-testid="message-input"]', 'List files');
  await page.click('[data-testid="send-button"]');

  await page.waitForSelector('[data-testid="tool-approval-dialog"]');
  await page.click('[data-testid="approve-button"]');

  await page.waitForSelector('[data-testid="assistant-message"]');
  expect(await page.textContent('[data-testid="assistant-message"]')).toContain(
    'files',
  );
});
```

---

## Migration Path

### For Existing CLI Users

**Option 1**: Run both

```bash
# Terminal 1: Start web server
qwen serve --port 3000

# Terminal 2: Use CLI as normal
qwen
```

**Option 2**: Web-only mode

```bash
qwen serve --web-only
# Opens browser automatically
```

### Configuration Sharing

Both CLI and Web UI share same config:

```
~/.qwen/
├── settings.json      # Shared settings
├── credentials.json   # Shared credentials
└── sessions/          # Shared session history
```

---

## Summary

### Recommended Approach

1. **Thin Server Architecture**: Maximum code reuse from core package
2. **Modern Stack**: React + Fastify + Socket.io
3. **Phased Implementation**: 10-week timeline
4. **Security First**: JWT + OAuth2 + rate limiting
5. **Feature Parity**: All CLI features in web UI

### Key Benefits

- **90%+ code reuse** from core package
- **Consistent behavior** across CLI and Web
- **Easy maintenance** - single source of truth
- **Better UX** - visual interface, easier onboarding
- **Collaboration ready** - multi-user support built-in

### Next Steps

1. Create `packages/web-ui` structure
2. Setup basic Vite + React app
3. Setup Fastify server with Socket.io
4. Implement SessionManager using core Client
5. Build basic chat interface
6. Iterate on features

---

**Document Version**: 1.0  
**Author**: Qwen Code Team  
**Date**: December 4, 2025

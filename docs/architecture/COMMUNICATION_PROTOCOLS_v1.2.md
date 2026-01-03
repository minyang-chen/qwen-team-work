# Communication Protocols & Package Integration

**Version:** 1.2.0  
**Date:** January 3, 2026  
**Status:** Updated to reflect actual implementation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [WebSocket Communication](#websocket-communication)
3. [ACP (Agent Communication Protocol)](#acp-agent-communication-protocol)
4. [REST API Communication](#rest-api-communication)
5. [Session Management](#session-management)
6. [Model Provider Pattern](#model-provider-pattern)
7. [packages/core Integration](#packagescore-integration)
8. [Inter-Package Communication](#inter-package-communication)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                      team-web (Port 8003)                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ WebSocket (Socket.IO)
                 │ HTTP REST
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                    team-service (Port 8002)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OptimizedWebSocket  │  EnhancedAIService                │  │
│  │         │                      │                          │  │
│  │         │                      ▼                          │  │
│  │         │              AIServiceClient                    │  │
│  │         │                      │                          │  │
│  │         │                      ▼                          │  │
│  │         │                  AcpClient                      │  │
│  └─────────┼──────────────────────┼───────────────────────────┘
            │                      │
            │ HTTP REST            │ ACP (WebSocket)
            │                      │
┌───────────▼──────────────────────▼───────────────────────────────┐
│  team-storage (8000)      team-ai-agent (8001)                   │
│  ┌──────────────┐         ┌────────────────────────────────┐    │
│  │  MongoDB     │         │  AcpServer                      │    │
│  │  NFS Storage │         │    │                            │    │
│  └──────────────┘         │    ▼                            │    │
│                           │  MessageRouter                  │    │
│                           │    │                            │    │
│                           │    ▼                            │    │
│                           │  OpenAIClient                   │    │
│                           │    │                            │    │
│                           │    ▼                            │    │
│                           │  ModelProvider (qwen/openai)    │    │
│                           │    │                            │    │
│                           │    ▼                            │    │
│                           │  LLM API                        │    │
│                           └────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## WebSocket Communication

### 1. team-web → team-service

**Connection Setup**

```typescript
// packages/team-web/src/hooks/useWebSocket.ts
const socket = io('http://localhost:8002', {
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  auth: {
    token: localStorage.getItem('team_session_token')
  }
});
```

**Events: Client → Server**

```typescript
// Send chat message
socket.emit('ai_chat', {
  userId: 'demo',
  sessionId: 'sess_123abc',
  message: 'Hello, how are you?',
  messageId: '1234567890'
});
```

**Events: Server → Client**

```typescript
// Receive streaming chunks
socket.on('ai_stream_chunk', (data) => {
  // data = {
  //   type: 'chunk' | 'complete' | 'error',
  //   messageId: '1234567890',
  //   content: 'Hello! I am...'
  // }
});
```

### 2. team-service WebSocket Handler

**File:** `packages/team-service/src/websocket/OptimizedWebSocket.ts`

```typescript
socket.on('ai_chat', async (data) => {
  const { userId, sessionId, message, messageId } = data;
  
  // Handle slash commands locally
  if (message.startsWith('/')) {
    const result = await commandHandler.execute(message, userId);
    socket.emit('ai_stream_chunk', {
      type: 'chunk',
      messageId,
      content: result.output
    });
    socket.emit('ai_stream_chunk', {
      type: 'complete',
      messageId
    });
    return;
  }
  
  // Handle shell commands with ! prefix
  if (message.startsWith('!')) {
    const command = message.substring(1).trim();
    const result = await client.executeShellCommand(command);
    socket.emit('ai_stream_chunk', {
      type: 'chunk',
      messageId,
      content: `\`\`\`bash\n$ ${command}\n${result}\`\`\``
    });
    socket.emit('ai_stream_chunk', {
      type: 'complete',
      messageId
    });
    return;
  }
  
  // Forward to AI agent via ACP
  const stream = aiService.processMessageStream(userId, message, {
    teamId: data.teamId,
    projectId: data.projectId
  });
  
  for await (const chunk of stream) {
    socket.emit('ai_stream_chunk', {
      type: 'chunk',
      messageId,
      content: chunk.text
    });
  }
  
  socket.emit('ai_stream_chunk', {
    type: 'complete',
    messageId
  });
});
```

---

## ACP (Agent Communication Protocol)

### Overview

ACP is a **WebSocket-based protocol** for communication between team-service and team-ai-agent. It provides:
- Session management
- Message routing
- Tool execution coordination
- Error handling

### Architecture

```
team-service                    team-ai-agent
    │                               │
    │  AIServiceClient              │  AcpServer
    │       │                       │       │
    │       ▼                       │       ▼
    │   AcpClient ─────ACP──────►  │  MessageRouter
    │                               │       │
    │                               │       ▼
    │                               │  SessionHandler
    │                               │  ChatHandler
    │                               │  ToolHandler
```

### ACP Message Format

```typescript
interface AcpMessage {
  id: string;              // Unique message ID
  type: string;            // Message type (e.g., 'chat', 'session', 'tool')
  data: {
    action?: string;       // Action to perform
    userId?: string;       // User identifier
    sessionId?: string;    // Session identifier
    message?: string;      // Chat message content
    [key: string]: any;    // Additional data
  };
  timestamp: string;       // ISO timestamp
}

interface AcpResponse {
  id: string;              // Matches request ID
  success: boolean;        // Operation success
  data?: any;              // Response data
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
```

### ACP Message Types

**1. Session Management**

```typescript
// Create session
{
  type: 'session',
  data: {
    action: 'create',
    userId: 'demo',
    workingDirectory: '/workspace'
  }
}

// Response
{
  success: true,
  data: {
    session: {
      sessionId: 'demo-individual-default',
      userId: 'demo'
    }
  }
}
```

**2. Chat Messages**

```typescript
// Send message
{
  type: 'chat',
  data: {
    userId: 'demo',
    sessionId: 'sess_123abc',
    message: 'Write a Python quicksort'
  }
}

// Response
{
  success: true,
  data: {
    text: 'Here is a Python quicksort implementation...',
    toolCalls: []
  }
}
```

**3. Tool Execution**

```typescript
// Tool request (from AI)
{
  type: 'tool',
  data: {
    action: 'execute',
    toolName: 'write_file',
    args: {
      path: 'quicksort.py',
      content: 'def quicksort(arr): ...'
    }
  }
}

// Response
{
  success: true,
  data: {
    result: 'File written successfully'
  }
}
```

### ACP Client Implementation

**File:** `packages/team-service/src/acp/AcpClient.ts`

```typescript
export class AcpClient {
  private socket: Socket | null = null;
  private agentDiscovery: IAgentDiscovery;
  
  async connect(capabilities: string[]): Promise<void> {
    const agents = await this.agentDiscovery.discoverAgents();
    const agent = agents[0]; // Primary agent
    
    this.socket = io(agent.endpoint, {
      transports: ['websocket'],
      reconnection: true
    });
    
    await new Promise((resolve, reject) => {
      this.socket!.on('connect', resolve);
      this.socket!.on('connect_error', reject);
    });
  }
  
  async request(type: string, data: any): Promise<AcpResponse> {
    const message: AcpMessage = {
      id: nanoid(),
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('acp_message', message);
      
      this.socket!.once(`acp_response_${message.id}`, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error?.message));
        }
      });
      
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });
  }
}
```

### ACP Server Implementation

**File:** `packages/team-ai-agent/src/server/AcpServer.ts`

```typescript
export class AcpServer {
  private io: SocketIOServer;
  private messageRouter: MessageRouter;
  
  constructor(port: number) {
    this.io = new SocketIOServer(port, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling']
    });
    
    this.messageRouter = new MessageRouter(
      sessionManager,
      serverClient
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('acp_message', async (message: AcpMessage) => {
        const response = await this.messageRouter.routeMessage(message);
        socket.emit(`acp_response_${message.id}`, response);
      });
    });
  }
}
```

---

## REST API Communication

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "demo",
  "password": "demo"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "695099320356ef030062423b",
    "username": "demo",
    "email": "demo@example.com"
  }
}
```

### Conversations

```http
# List conversations
GET /api/conversations/list?limit=100
Authorization: Bearer <token>

# Load conversation
GET /api/conversations/:sessionId
Authorization: Bearer <token>

# Save conversation
POST /api/conversations/:sessionId/save
Authorization: Bearer <token>
Content-Type: application/json
{
  "messages": [...]
}

# Rename conversation
PUT /api/conversations/:sessionId/rename
Authorization: Bearer <token>
Content-Type: application/json
{
  "name": "My Chat"
}

# Delete conversation
DELETE /api/conversations/:sessionId
Authorization: Bearer <token>

# Search conversations
GET /api/conversations/search?q=python
Authorization: Bearer <token>
```

### Context & Skills (New in v1.1.6)

```http
# List contexts
GET /api/conversations/:sessionId/contexts
Authorization: Bearer <token>

# Add context
POST /api/conversations/:sessionId/contexts
Authorization: Bearer <token>
Content-Type: application/json
{
  "name": "project_rules",
  "type": "block",
  "content": "Always use TypeScript"
}

# Remove context
DELETE /api/conversations/:sessionId/contexts/:name
Authorization: Bearer <token>

# List skills
GET /api/conversations/:sessionId/skills
Authorization: Bearer <token>

# Add skill
POST /api/conversations/:sessionId/skills
Authorization: Bearer <token>
Content-Type: application/json
{
  "name": "code_review",
  "description": "Review code for best practices"
}

# Edit skill
PUT /api/conversations/:sessionId/skills/:name
Authorization: Bearer <token>
Content-Type: application/json
{
  "description": "Updated description"
}

# Remove skill
DELETE /api/conversations/:sessionId/skills/:name
Authorization: Bearer <token>
```

### File Attachments

```http
# Upload attachments
POST /api/attachments/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  userId: demo
  sessionId: sess_123abc
  files: <binary>

Response:
{
  "success": true,
  "attachments": [
    {
      "id": "att_xyz",
      "name": "document.pdf",
      "type": "document",
      "url": "/api/attachments/demo/sess_123abc/att_xyz.pdf",
      "size": 1024000
    }
  ]
}

# Retrieve attachment
GET /api/attachments/:userId/:sessionId/:filename
Authorization: Bearer <token>
```

---

## Session Management

### Session Creation Flow

```
1. User logs in
   ↓
2. team-web connects WebSocket to team-service
   ↓
3. User sends first message
   ↓
4. team-service.EnhancedAIService.getOrCreateSession()
   ├─► Creates local session
   └─► Creates ACP session in team-ai-agent
       ↓
       AcpClient.request('session.create', { userId, workingDirectory })
       ↓
       team-ai-agent.SessionHandler.createSession()
       ↓
       UserSessionManager.createSession()
   ↓
5. Session ready for chat
```

### Session Types

**1. team-service Session (In-Memory)**

```typescript
interface EnhancedClientSession {
  userId: string;
  teamId?: string;
  projectId?: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  capabilities: string[];
  teamContext?: any;
}
```

**2. team-ai-agent Session (In-Memory)**

```typescript
interface SessionData {
  sessionId: string;
  userId: string;
  client: GeminiClient;
  workingDirectory: string;
  conversationHistory: ChatMessage[];
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata: {
    createdAt: Date;
    lastActivity: Date;
    messageCount: number;
  };
  contextWindow: number;
}
```

**3. team-storage Session (MongoDB)**

```typescript
interface ISession {
  sessionId: string;
  userId: ObjectId;
  teamId?: ObjectId;
  status: 'active' | 'saved' | 'terminated';
  workspacePath: string;
  conversationHistory: Array<{
    messageId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    attachments?: any[];
    toolCalls?: any[];
    timestamp: Date;
  }>;
  contexts: Array<{
    name: string;
    type: 'url' | 'block';
    content?: string;
    url?: string;
    createdAt: Date;
  }>;
  skills: Array<{
    name: string;
    description: string;
    createdAt: Date;
  }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
}
```

### Session Synchronization

**Problem:** Three separate session systems that need coordination

**Solution:**
1. team-service creates ACP session when creating local session
2. team-web saves conversation to MongoDB via HTTP
3. team-ai-agent loads conversation history from UserSessionManager

---

## Model Provider Pattern

### Overview

The Model Provider Pattern isolates model-specific logic (e.g., Qwen XML parsing) from generic OpenAI-compatible API handling.

### Architecture

```
OpenAIClient
    │
    ├─► ModelProviderRegistry
    │       │
    │       ├─► QwenModelProvider (XML parsing)
    │       └─► OpenAIModelProvider (standard JSON)
    │
    └─► Uses provider for:
        ├─► formatSystemPrompt()
        ├─► formatTools()
        ├─► parseResponse()
        └─► buildMessages()
```

### Provider Interface

```typescript
interface ModelProvider {
  name: string;
  formatSystemPrompt(prompt: string): string;
  formatTools(tools: any[]): any;
  parseResponse(response: any): ParsedResponse;
  isContinuation(request: any): boolean;
  buildMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    currentMessage: string,
    cycleHistory: any[]
  ): any[];
}
```

### Provider Selection

**1. Explicit Configuration (Recommended)**

```bash
# .env
MODEL_PROVIDER=qwen  # or openai
OPENAI_BASE_URL=http://10.0.0.82:8080/v1
OPENAI_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
```

**2. Auto-Detection**

```typescript
detectProvider(modelName: string, baseUrl?: string): ModelProvider {
  // Check explicit config
  if (process.env.MODEL_PROVIDER) {
    return this.get(process.env.MODEL_PROVIDER);
  }
  
  // Check model name
  if (modelName.includes('qwen')) return this.get('qwen');
  if (modelName.includes('gpt')) return this.get('openai');
  
  // Check base URL
  if (baseUrl?.includes('dashscope')) return this.get('qwen');
  if (baseUrl?.includes('openai.com')) return this.get('openai');
  
  // Default
  return this.get('openai');
}
```

### Qwen Provider (XML Parsing)

```typescript
export class QwenModelProvider implements ModelProvider {
  name = 'qwen';
  
  parseResponse(response: any): ParsedResponse {
    let content = response.choices?.[0]?.message?.content;
    
    // Extract from Qwen XML: <parameter=content>...</parameter>
    const xmlMatch = content?.match(/<parameter=content>\s*([\s\S]*?)\s*<\/parameter>/);
    if (xmlMatch) {
      content = xmlMatch[1].trim();
    } else {
      // Strip XML tags
      content = content?.replace(/<tool_call>[\s\S]*$/g, '').trim();
    }
    
    return { content, toolCalls: [...] };
  }
}
```

---

## packages/core Integration

### What team-ai-agent Uses from Core

**1. Tool Registry**

```typescript
import { ToolRegistry } from '@qwen-code/qwen-code-core';

const toolRegistry = config.getToolRegistry();
const tools = toolRegistry.getFunctionDeclarations();
```

**Available Tools:**
- `list_directory` - List files
- `read_file` - Read file contents
- `write_file` - Write to file
- `edit` - Edit file with search/replace
- `grep_search` - Search in files
- `glob` - Find files by pattern
- `run_shell_command` - Execute shell commands
- `web_fetch` - Fetch web content
- `web_search` - Search the web
- `save_memory` - Save user information
- `todo_write` - Task management

**2. System Prompts**

```typescript
import { getCoreSystemPrompt } from '@qwen-code/qwen-code-core';

const systemPrompt = getCoreSystemPrompt(userMemory, model);
```

**3. Config Management**

```typescript
import { Config } from '@qwen-code/qwen-code-core';

const config = new Config({
  targetDir: '/workspace',
  model: process.env.OPENAI_MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});
```

---

## Inter-Package Communication

### Communication Matrix

```
┌──────────────┬─────────────┬──────────────┬──────────────┬──────────────┐
│              │ team-web    │ team-service │ team-ai-agent│ team-storage │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-web     │      -      │  WebSocket   │      -       │  HTTP REST   │
│              │             │  (Socket.IO) │              │              │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-service │  WebSocket  │      -       │  ACP         │  HTTP REST   │
│              │  (Socket.IO)│              │  (WebSocket) │              │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-ai-agent│      -      │  ACP         │      -       │      -       │
│              │             │  (WebSocket) │              │              │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-storage │  HTTP REST  │  HTTP REST   │      -       │      -       │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-shared  │  (library)  │  (library)   │  (library)   │  (library)   │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ core         │      -      │      -       │  (library)   │      -       │
└──────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
```

### Complete Message Flow

```
1. User types "write a Python quicksort" in team-web
   ↓ WebSocket: ai_chat
2. team-service.OptimizedWebSocket receives message
   ↓ Check: Not slash command, not shell command
3. team-service.EnhancedAIService.processMessageStream()
   ↓ getOrCreateSession() → Creates ACP session if needed
4. team-service.AIServiceClient.streamMessage()
   ↓ ACP: chat.send
5. team-ai-agent.AcpServer receives ACP message
   ↓ MessageRouter.routeMessage()
6. team-ai-agent.MessageRouter checks session
   ✓ Session exists (created in step 3)
7. Load conversation history from UserSessionManager
8. team-ai-agent.ServerClient.queryStream()
   ↓ OpenAIClient.sendMessageStream()
9. ModelProvider formats prompt and tools
   ↓ API call to LLM
10. LLM returns response with tool call: write_file
11. ToolCoordinator executes write_file (from core)
    ↓ Docker sandbox execution
12. Tool result sent back to LLM
13. LLM generates final response
14. Stream chunks back through ACP
    ↓ team-service
    ↓ WebSocket: ai_stream_chunk
15. team-web displays response
16. Auto-save to team-storage via HTTP POST
    ↓ MongoDB persistence
```

---

## Version History

- **v1.2.0** (Jan 3, 2026) - Updated with ACP, Model Provider Pattern, Session Management
- **v1.1.4** (Jan 2, 2026) - Original documentation (outdated)

---

**Document Status:** ✅ Reflects actual implementation as of v1.1.6

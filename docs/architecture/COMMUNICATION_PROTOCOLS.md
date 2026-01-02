# Communication Protocols & Package Integration

**Version:** 1.1.4  
**Date:** January 2, 2026

---

## Table of Contents

1. [WebSocket Communication](#websocket-communication)
2. [REST API Communication](#rest-api-communication)
3. [packages/core Integration](#packagescore-integration)
4. [packages/cli Integration](#packagescli-integration)
5. [Inter-Package Communication](#inter-package-communication)

---

## WebSocket Communication

### Architecture Overview

```
team-web (Port 8003)
    │ Socket.IO Client
    │ ws://localhost:8002
    ▼
team-service (Port 8002)
    │ Socket.IO Server
    │ OptimizedWebSocket.ts
    │
    ├─► WebSocket to team-ai-agent
    │   ws://localhost:8001
    │
    └─► HTTP to team-storage
        http://localhost:8000
```

### 1. Frontend → team-service WebSocket

**Client Connection (team-web)**

**File:** `packages/team-web/src/pages/team/TaskAgent.tsx`

```typescript
import { io, Socket } from 'socket.io-client';

// Initialize Socket.IO client
const socket = io('http://localhost:8002', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  auth: {
    token: localStorage.getItem('team_session_token')
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to team-service');
  setWsConnected(true);
});

socket.on('disconnect', () => {
  console.log('Disconnected from team-service');
  setWsConnected(false);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

**Message Events:**

```typescript
// Send user message
socket.emit('user_message', {
  sessionId: currentSessionId,
  message: userInput,
  timestamp: new Date().toISOString()
});

// Receive AI streaming response
socket.on('ai_stream_chunk', (data) => {
  // data = { type: 'chunk', messageId: '...', content: '...' }
  setMessages(prev => prev.map(msg => 
    msg.id === data.messageId 
      ? { ...msg, content: msg.content + data.content }
      : msg
  ));
});

// Receive complete AI response
socket.on('ai_response', (data) => {
  // data = { messageId: '...', content: '...', timestamp: '...' }
  setMessages(prev => [...prev, {
    id: data.messageId,
    role: 'assistant',
    content: data.content,
    timestamp: new Date(data.timestamp)
  }]);
});

// Receive tool execution status
socket.on('tool_execution', (data) => {
  // data = { toolName: '...', status: 'running|completed|failed', result: '...' }
  console.log(`Tool ${data.toolName}: ${data.status}`);
});

// Receive errors
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  setError(error.message);
});

// Cancel ongoing request
const cancelRequest = () => {
  socket.emit('cancel_request', { sessionId: currentSessionId });
};
```

### 2. team-service WebSocket Server

**File:** `packages/team-service/src/websocket/OptimizedWebSocket.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class OptimizedWebSocket {
  private io: SocketIOServer;
  private commandHandler: CommandHandler;
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: 'http://localhost:8003',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.commandHandler = new CommandHandler();
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Extract user info from auth token
      const token = socket.handshake.auth.token;
      const userId = this.verifyToken(token);
      
      if (!userId) {
        socket.disconnect();
        return;
      }
      
      // Store user context
      socket.data.userId = userId;
      
      // Handle user messages
      socket.on('user_message', async (data) => {
        await this.handleUserMessage(socket, data);
      });
      
      // Handle cancel requests
      socket.on('cancel_request', (data) => {
        this.handleCancelRequest(socket, data);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.cleanup(socket);
      });
    });
  }
  
  private async handleUserMessage(socket: any, data: any): Promise<void> {
    const { sessionId, message } = data;
    const userId = socket.data.userId;
    
    // Check if it's a slash command
    if (message.startsWith('/')) {
      const result = await this.commandHandler.execute(message, userId);
      socket.emit('ai_response', {
        messageId: Date.now().toString(),
        content: result.output,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Forward to AI agent via WebSocket
    await this.forwardToAIAgent(socket, {
      userId,
      sessionId,
      message,
      timestamp: data.timestamp
    });
  }
  
  private async forwardToAIAgent(socket: any, data: any): Promise<void> {
    // Connect to team-ai-agent WebSocket
    const aiSocket = io('http://localhost:8001', {
      transports: ['websocket']
    });
    
    aiSocket.on('connect', () => {
      // Send message to AI agent
      aiSocket.emit('process_message', data);
    });
    
    // Stream AI responses back to client
    aiSocket.on('stream_chunk', (chunk) => {
      socket.emit('ai_stream_chunk', chunk);
    });
    
    aiSocket.on('stream_complete', (response) => {
      socket.emit('ai_response', response);
      aiSocket.disconnect();
    });
    
    aiSocket.on('tool_execution', (toolData) => {
      socket.emit('tool_execution', toolData);
    });
    
    aiSocket.on('error', (error) => {
      socket.emit('error', error);
      aiSocket.disconnect();
    });
  }
}
```

### 3. team-service → team-ai-agent WebSocket

**File:** `packages/team-ai-agent/src/server/AcpServer.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { OpenAIClient } from './OpenAIClient.js';

export class AcpServer {
  private io: SocketIOServer;
  private openAIClient: OpenAIClient;
  
  constructor(port: number) {
    this.io = new SocketIOServer(port, {
      cors: { origin: '*' }
    });
    
    this.openAIClient = new OpenAIClient(config);
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('[AcpServer] Client connected');
      
      socket.on('process_message', async (data) => {
        await this.processMessage(socket, data);
      });
      
      socket.on('disconnect', () => {
        console.log('[AcpServer] Client disconnected');
      });
    });
  }
  
  private async processMessage(socket: any, data: any): Promise<void> {
    const { userId, sessionId, message } = data;
    
    try {
      // Get AI response with streaming
      const stream = this.openAIClient.sendMessageStream(
        [{ text: message }],
        new AbortController().signal,
        `prompt-${Date.now()}`
      );
      
      let fullResponse = '';
      const messageId = Date.now().toString();
      
      for await (const event of stream) {
        if (event.type === 'content') {
          // Stream chunk to client
          socket.emit('stream_chunk', {
            type: 'chunk',
            messageId,
            content: event.content
          });
          fullResponse += event.content;
        }
        
        if (event.type === 'tool_call_request') {
          // Notify client of tool execution
          socket.emit('tool_execution', {
            toolName: event.toolCallRequest.name,
            status: 'running',
            args: event.toolCallRequest.args
          });
        }
        
        if (event.type === 'tool_call_response') {
          // Notify client of tool completion
          socket.emit('tool_execution', {
            toolName: event.toolCallResponse.name,
            status: 'completed',
            result: event.toolCallResponse.response
          });
        }
      }
      
      // Send complete response
      socket.emit('stream_complete', {
        messageId,
        content: fullResponse,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      socket.emit('error', {
        message: error.message,
        code: 'AI_ERROR'
      });
    }
  }
}
```

### WebSocket Event Types

**Client → team-service:**
```typescript
{
  'user_message': {
    sessionId: string;
    message: string;
    timestamp: string;
  },
  'cancel_request': {
    sessionId: string;
  }
}
```

**team-service → Client:**
```typescript
{
  'ai_stream_chunk': {
    type: 'chunk';
    messageId: string;
    content: string;
  },
  'ai_response': {
    messageId: string;
    content: string;
    timestamp: string;
  },
  'tool_execution': {
    toolName: string;
    status: 'running' | 'completed' | 'failed';
    args?: any;
    result?: any;
  },
  'error': {
    message: string;
    code: string;
  }
}
```

**team-service → team-ai-agent:**
```typescript
{
  'process_message': {
    userId: string;
    sessionId: string;
    message: string;
    timestamp: string;
  }
}
```

**team-ai-agent → team-service:**
```typescript
{
  'stream_chunk': {
    type: 'chunk';
    messageId: string;
    content: string;
  },
  'stream_complete': {
    messageId: string;
    content: string;
    timestamp: string;
  },
  'tool_execution': {
    toolName: string;
    status: string;
    args?: any;
    result?: any;
  },
  'error': {
    message: string;
    code: string;
  }
}
```

---

## REST API Communication

### API Architecture

```
team-web (Port 8003)
    │ HTTP/HTTPS
    │
    ├─► team-service (Port 8002)
    │   │ Proxy Layer
    │   │
    │   └─► team-storage (Port 8000)
    │       │ MongoDB + NFS
    │       └─► Direct API
    │
    └─► team-storage (Port 8000)
        Direct API calls
```

### 1. Authentication APIs

**Login**
```http
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "nfsWorkspacePath": "/nfs/users/john_doe_507f1f77"
  }
}
```

**Register**
```http
POST http://localhost:8000/api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "password": "SecurePassword123!"
}

Response: Same as login
```

### 2. Conversation APIs

**List Conversations**
```http
GET http://localhost:8000/api/conversations/list?limit=100
Authorization: Bearer <token>

Response:
{
  "conversations": [
    {
      "sessionId": "sess_123abc",
      "name": "Chat 01/02/2026",
      "messageCount": 15,
      "lastActivity": "2026-01-02T12:00:00.000Z",
      "preview": "Can you help me with..."
    }
  ]
}
```

**Load Conversation**
```http
GET http://localhost:8000/api/conversations/:sessionId
Authorization: Bearer <token>

Response:
{
  "sessionId": "sess_123abc",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-01-02T12:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2026-01-02T12:00:01.000Z"
    }
  ],
  "name": "Chat 01/02/2026",
  "createdAt": "2026-01-02T12:00:00.000Z",
  "lastActivity": "2026-01-02T12:05:00.000Z"
}
```

**Save Conversation**
```http
POST http://localhost:8000/api/conversations/:sessionId/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-01-02T12:00:00.000Z"
    }
  ]
}

Response:
{
  "success": true,
  "sessionId": "sess_123abc"
}
```

**Rename Conversation**
```http
PUT http://localhost:8000/api/conversations/:sessionId/rename
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project Discussion"
}

Response:
{
  "success": true
}
```

**Delete Conversation**
```http
DELETE http://localhost:8000/api/conversations/:sessionId
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

### 3. Session APIs

**Create Session**
```http
POST http://localhost:8000/api/sessions
Authorization: Bearer <token>

Response:
{
  "sessionId": "sess_123abc",
  "workspacePath": "/nfs/users/john_doe_507f1f77",
  "createdAt": "2026-01-02T12:00:00.000Z"
}
```

**Save Session**
```http
POST http://localhost:8000/api/sessions/save/:userId/:name
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationHistory": [...],
  "artifacts": [...]
}

Response:
{
  "success": true,
  "name": "my-session"
}
```

**Load Session**
```http
GET http://localhost:8000/api/sessions/load/:userId/:name
Authorization: Bearer <token>

Response:
{
  "name": "my-session",
  "conversationHistory": [...],
  "artifacts": [...],
  "lastActivity": "2026-01-02T12:00:00.000Z"
}
```

### 4. File Upload API

**Upload File**
```http
POST http://localhost:8000/api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  file: <binary>
  sessionId: "sess_123abc"

Response:
{
  "success": true,
  "fileName": "document.pdf",
  "filePath": "/nfs/users/john_doe_507f1f77/uploads/document.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf"
}
```

### API Client Implementation (team-web)

**File:** `packages/team-web/src/config/api.ts`

```typescript
const API_BASE = 'http://localhost:8000';

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  
  // Conversations
  listConversations: async (token: string, limit = 100) => {
    const response = await fetch(
      `${API_BASE}/api/conversations/list?limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.json();
  },
  
  loadConversation: async (token: string, sessionId: string) => {
    const response = await fetch(
      `${API_BASE}/api/conversations/${sessionId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.json();
  },
  
  saveConversation: async (
    token: string, 
    sessionId: string, 
    messages: any[]
  ) => {
    const response = await fetch(
      `${API_BASE}/api/conversations/${sessionId}/save`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages })
      }
    );
    return response.json();
  }
};
```

---

## packages/core Integration

### How team-ai-agent Uses packages/core

**File:** `packages/team-ai-agent/src/adapters/CoreAdapter.ts`

```typescript
import { 
  Config, 
  ToolRegistry,
  getCoreSystemPrompt 
} from '@qwen-code/qwen-code-core';

export class CoreAdapter {
  private config: Config;
  private toolRegistry: ToolRegistry;
  
  constructor(targetDir: string) {
    // Initialize core Config
    this.config = new Config({
      targetDir,
      model: process.env.OPENAI_MODEL || 'qwen3-coder:30b',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    });
    
    // Get tool registry from core
    this.toolRegistry = this.config.getToolRegistry();
  }
  
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
  
  getSystemPrompt(userMemory?: string, model?: string): string {
    // Use core's system prompt
    return getCoreSystemPrompt(userMemory, model);
  }
  
  getConfig(): Config {
    return this.config;
  }
}
```

### Tool Registration from Core

**File:** `packages/team-ai-agent/src/handlers/ToolCoordinator.ts`

```typescript
import { ToolRegistry } from '@qwen-code/qwen-code-core';

export class ToolCoordinator {
  private toolRegistry: ToolRegistry;
  
  constructor(config: Config) {
    // Get tool registry from core
    this.toolRegistry = config.getToolRegistry();
    
    // Core automatically registers these tools:
    // - list_directory (LSTool)
    // - read_file (ReadFileTool)
    // - write_file (WriteFileTool)
    // - edit (EditTool)
    // - grep_search (GrepTool)
    // - glob (GlobTool)
    // - run_shell_command (ShellTool)
    // - web_fetch (WebFetchTool)
    // - web_search (WebSearchTool)
    // - save_memory (MemoryTool)
    // - todo_write (TodoWriteTool)
    // - exit_plan_mode (ExitPlanModeTool)
  }
  
  async executeTool(
    toolName: string, 
    args: any, 
    signal: AbortSignal
  ): Promise<any> {
    // Get tool from core registry
    const tool = this.toolRegistry.getToolByName(toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Execute tool (from core)
    const result = await tool.execute(args, signal);
    
    return result;
  }
  
  getAvailableTools(): string[] {
    // Get all tool names from core
    return this.toolRegistry.getAllToolNames();
  }
  
  getToolDeclarations(): any[] {
    // Get tool schemas for LLM
    return this.toolRegistry.getFunctionDeclarations();
  }
}
```

### Core Tools Used

**From packages/core/src/tools:**

1. **File System Tools**
   - `LSTool` - List directory contents
   - `ReadFileTool` - Read file contents
   - `WriteFileTool` - Write to files
   - `EditTool` - Edit files with search/replace
   - `GlobTool` - Find files by pattern
   - `GrepTool` - Search file contents

2. **Execution Tools**
   - `ShellTool` - Execute shell commands

3. **Web Tools**
   - `WebFetchTool` - Fetch web content
   - `WebSearchTool` - Search the web

4. **Memory & Planning**
   - `MemoryTool` - Save information
   - `TodoWriteTool` - Task management
   - `ExitPlanModeTool` - Exit planning mode

### Tool Execution Flow with Core

```
User message → team-ai-agent
  ↓
OpenAIClient generates tool call
  ↓
ToolCoordinator receives request
  ↓
Get tool from core ToolRegistry
  ↓
Execute tool (core implementation)
  ↓
Tool runs in Docker sandbox (team-shared)
  ↓
Return result to ToolCoordinator
  ↓
Send result back to LLM
```

---

## packages/cli Integration

### Current Status

**packages/cli is NOT directly integrated** into the team packages. The CLI is a standalone command-line interface for Qwen Code.

### Why CLI is Separate

1. **Different Use Case**
   - CLI: Terminal-based, single-user, local execution
   - Team: Web-based, multi-user, server execution

2. **Different Architecture**
   - CLI: Direct tool execution on local machine
   - Team: Sandboxed execution in Docker containers

3. **Different Configuration**
   - CLI: Uses local `.qwen/` config directory
   - Team: Uses MongoDB for configuration

### What Team Packages Borrow from CLI

**1. Command Pattern**

The CLI's command system inspired team-service's CommandHandler:

```typescript
// Similar to CLI's command structure
class CommandHandler {
  private commands: Map<string, Function>;
  
  execute(input: string, userId: string) {
    // Parse command like CLI does
    const [command, ...args] = input.slice(1).split(/\s+/);
    
    // Execute command
    const handler = this.commands.get(command);
    return handler(args, userId);
  }
}
```

**2. System Prompts**

Team uses core's system prompts (which CLI also uses):

```typescript
import { getCoreSystemPrompt } from '@qwen-code/qwen-code-core';

// Same prompt used by CLI
const systemPrompt = getCoreSystemPrompt(userMemory, model);
```

**3. Tool Concepts**

Both use the same tool registry from core:

```typescript
// CLI and Team both use
import { ToolRegistry } from '@qwen-code/qwen-code-core';
```

### Potential CLI Integration (Future)

If we wanted to integrate CLI functionality:

```typescript
// Hypothetical integration
import { CLI } from '@qwen-code/qwen-code-cli';

class CLIAdapter {
  private cli: CLI;
  
  async executeCommand(command: string): Promise<string> {
    // Run CLI command in Docker sandbox
    const result = await this.cli.execute(command);
    return result;
  }
}
```

**Challenges:**
- CLI expects terminal environment
- CLI uses local file system
- CLI has interactive prompts
- CLI uses different config system

---

## Inter-Package Communication Summary

### Communication Matrix

```
┌──────────────┬─────────────┬──────────────┬──────────────┬──────────────┐
│              │ team-web    │ team-service │ team-ai-agent│ team-storage │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-web     │      -      │  WebSocket   │      -       │  HTTP REST   │
│              │             │  HTTP REST   │              │              │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-service │  WebSocket  │      -       │  WebSocket   │  HTTP REST   │
│              │  HTTP REST  │              │              │              │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-ai-agent│      -      │  WebSocket   │      -       │      -       │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-storage │  HTTP REST  │  HTTP REST   │      -       │      -       │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ team-shared  │  (library)  │  (library)   │  (library)   │  (library)   │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ core         │      -      │      -       │  (library)   │      -       │
└──────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
```

### Protocol Usage

**WebSocket (Socket.IO):**
- Real-time bidirectional communication
- Streaming AI responses
- Tool execution updates
- Used between: team-web ↔ team-service ↔ team-ai-agent

**HTTP REST:**
- Request/response operations
- CRUD operations
- Authentication
- File operations
- Used between: team-web ↔ team-storage, team-service ↔ team-storage

**Library Imports:**
- team-shared: Shared utilities, Docker sandbox
- core: Tool registry, system prompts, tool implementations

---

## Data Flow Example: Complete Chat Message

```
1. User types message in team-web
   ↓ WebSocket emit
2. team-service receives via Socket.IO
   ↓ Check if slash command
3. If not command, forward to team-ai-agent via WebSocket
   ↓
4. team-ai-agent receives message
   ↓ Load agent config (team-shared)
   ↓ Get system prompt (core)
   ↓ Get tool declarations (core)
   ↓ Call OpenAI API
5. LLM generates response with tool calls
   ↓
6. ToolCoordinator executes tools
   ↓ Get tool from core ToolRegistry
   ↓ Execute in Docker sandbox (team-shared)
   ↓ Return results
7. Send results back to LLM
   ↓ LLM generates final response
8. Stream response chunks
   ↓ WebSocket to team-service
   ↓ WebSocket to team-web
9. Display in UI
   ↓
10. Auto-save conversation
    ↓ HTTP POST to team-storage
    ↓ Save to MongoDB
```

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026

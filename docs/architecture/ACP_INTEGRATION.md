# ACP Protocol Integration: team-service ↔ team-ai-agent

This document explains how the **team-service** package uses the **Agent Communication Protocol (ACP)** to interact with the **team-ai-agent** package for AI-powered chat functionality.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         team-service                             │
│                                                                   │
│  ┌──────────────────┐      ┌─────────────────┐                 │
│  │ EnhancedAIService│─────►│ AIServiceClient │                 │
│  │  (Session Mgmt)  │      │  (ACP Wrapper)  │                 │
│  └──────────────────┘      └────────┬────────┘                 │
│                                      │                           │
│                                      ▼                           │
│                            ┌─────────────────┐                  │
│                            │   AcpClient     │                  │
│                            │ (WebSocket)     │                  │
│                            └────────┬────────┘                  │
└─────────────────────────────────────┼──────────────────────────┘
                                      │
                                      │ WebSocket (ACP Protocol)
                                      │ ws://localhost:8001
                                      │
┌─────────────────────────────────────┼──────────────────────────┐
│                         team-ai-agent│                          │
│                                      ▼                           │
│                            ┌─────────────────┐                  │
│                            │   AcpServer     │                  │
│                            │ (WebSocket)     │                  │
│                            └────────┬────────┘                  │
│                                      │                           │
│                                      ▼                           │
│                            ┌─────────────────┐                  │
│                            │ MessageRouter   │                  │
│                            └────────┬────────┘                  │
│                                      │                           │
│                    ┌─────────────────┼─────────────────┐        │
│                    ▼                 ▼                 ▼        │
│           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│           │SessionHandler│  │ ChatHandler  │  │ ToolHandler  ││
│           └──────────────┘  └──────────────┘  └──────────────┘│
│                    │                 │                 │        │
│                    └─────────────────┼─────────────────┘        │
│                                      ▼                           │
│                          ┌──────────────────────┐               │
│                          │ UserSessionManager   │               │
│                          │  (Per-user clients)  │               │
│                          └──────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. team-service Components

#### EnhancedAIService
**Location**: `packages/team-service/src/services/EnhancedAIService.ts`

**Purpose**: High-level service that manages AI sessions with team/project context

**Key Features**:
- Session management per user/team/project
- Token usage tracking
- Team context loading
- Telemetry and monitoring
- Session cleanup and timeout handling

**Key Methods**:
```typescript
// Create or retrieve session
async getOrCreateSession(userId, teamId?, projectId?, workingDirectory?)

// Send message via ACP
async processMessage(userId, message, context, workingDirectory?)

// Stream message via ACP
async *processMessageStream(userId, message, context, workingDirectory?)
```

#### AIServiceClient
**Location**: `packages/team-service/src/services/AIServiceClient.ts`

**Purpose**: Thin wrapper around AcpClient that provides AI-specific methods

**Key Features**:
- Abstracts ACP protocol details
- Provides typed interfaces for AI operations
- Handles connection management
- Converts between service-level and ACP-level messages

**Key Methods**:
```typescript
// Send chat message
async sendMessage(message, context)

// Stream chat response
async *streamMessage(message, context)

// Execute tools
async executeTool(toolName, parameters, context)

// Health check
async getHealth()
```

#### AcpClient
**Location**: `packages/team-service/src/acp/AcpClient.ts`

**Purpose**: Low-level WebSocket client implementing ACP protocol

**Key Features**:
- WebSocket connection management
- Agent discovery integration
- Request/response correlation (via message IDs)
- Automatic reconnection with exponential backoff
- Request timeout handling
- Streaming support

**Key Methods**:
```typescript
// Connect to agent
async connect(capabilities: string[])

// Send request and wait for response
async request(type, payload): Promise<any>

// Stream data
async *stream(type, payload): AsyncGenerator<any>

// Disconnect
async disconnect()
```

**Message Flow**:
```typescript
// 1. Convert service-level request to ACP message
const message: ExtendedAcpMessage = {
  id: nanoid(),                    // Unique request ID
  type: 'chat',                    // Message type
  data: {
    action: 'send',                // Action within type
    message: "Hello",
    userId: "user123",
    sessionId: "session-abc"
  },
  timestamp: Date.now()
};

// 2. Send via WebSocket
ws.send(JSON.stringify(message));

// 3. Store pending request
pendingRequests.set(message.id, { resolve, reject });

// 4. Wait for response with matching ID
// Response handled in onmessage handler
```

### 2. team-ai-agent Components

#### AcpServer
**Location**: `packages/team-ai-agent/src/server/AcpServer.ts`

**Purpose**: WebSocket server that receives and processes ACP messages

**Key Features**:
- WebSocket server on port 8001
- HTTP health check endpoint
- Message validation
- Connection management
- Error handling

**Initialization**:
```typescript
const server = new AcpServer(8001, agentConfigs);
await server.start();
```

#### MessageRouter
**Location**: `packages/team-ai-agent/src/server/MessageRouter.ts`

**Purpose**: Routes incoming ACP messages to appropriate handlers

**Key Features**:
- Message type routing (chat, session, tool)
- Protocol translation (ACP ↔ SDK)
- Error handling
- Response building

**Routing Logic**:
```typescript
switch (message.type) {
  case 'chat':
    // Get user's ServerClient from session
    const sessionData = sessionHandler.getUserSession(userId);
    const result = await sessionData.client.query(prompt);
    return translator.sdkToAcp(result, message.id);
    
  case 'session':
    return await sessionHandler.handleSessionMessage(message);
    
  case 'tool':
    return await toolHandler.handleToolExecution(message);
}
```

#### SessionHandler
**Location**: `packages/team-ai-agent/src/handlers/SessionHandler.ts`

**Purpose**: Manages user sessions and ServerClient instances

**Key Features**:
- Session creation/deletion
- Per-user ServerClient management
- Session statistics
- Working directory configuration

**Session Actions**:
```typescript
// Create session
{ action: 'create', userId, credentials, workingDirectory }

// Get session
{ action: 'get', userId }

// Get stats
{ action: 'getStats', sessionId }

// Delete session
{ action: 'delete', sessionId }
```

#### UserSessionManager
**Location**: `packages/team-ai-agent/src/session/UserSessionManager.ts`

**Purpose**: Stores and manages per-user ServerClient instances

**Key Features**:
- Per-user OpenAI client instances
- Session metadata tracking
- Working directory management
- Session cleanup

**Session Data Structure**:
```typescript
interface SessionData {
  sessionId: string;
  userId: string;
  client: ServerClient;           // OpenAI client instance
  metadata: {
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    workingDirectory?: string;
  };
}
```

## Complete Message Flow Example

### 1. User Sends Chat Message

**team-web** → **team-service** (WebSocket):
```typescript
socket.emit('user_message', {
  message: "Explain this code",
  sessionId: "session-123",
  userId: "user-456"
});
```

### 2. team-service Processes Request

**EnhancedAIService.processMessage()**:
```typescript
// Get or create session
const session = await getOrCreateSession(userId, teamId, projectId);

// Send via AIServiceClient
const result = await aiClient.sendMessage(message, {
  sessionId: `${userId}-${teamId}-${projectId}`,
  userId,
  teamId,
  projectId,
  workingDirectory
});
```

### 3. AIServiceClient Wraps in ACP

**AIServiceClient.sendMessage()**:
```typescript
// Ensure connection
if (!acpClient.isConnected()) {
  await acpClient.connect(['chat.send']);
}

// Send via ACP
const response = await acpClient.request('chat.send', {
  message,
  sessionId,
  userId,
  teamId,
  projectId,
  workingDirectory
});
```

### 4. AcpClient Sends WebSocket Message

**AcpClient.request()**:
```typescript
const message = {
  id: nanoid(),
  type: 'chat',
  data: {
    action: 'send',
    message: "Explain this code",
    sessionId: "user-456-team-789-project-101",
    userId: "user-456",
    workingDirectory: "/workspace/user-456"
  },
  timestamp: Date.now()
};

ws.send(JSON.stringify(message));

// Wait for response with matching ID
return new Promise((resolve, reject) => {
  pendingRequests.set(message.id, { resolve, reject });
});
```

### 5. team-ai-agent Receives Message

**AcpServer** → **MessageRouter**:
```typescript
// Validate message
if (!MessageValidator.validateMessage(message)) {
  return errorResponse;
}

// Route to handler
const response = await messageRouter.routeMessage(message);
ws.send(JSON.stringify(response));
```

### 6. MessageRouter Routes to ChatHandler

**MessageRouter.routeMessage()**:
```typescript
case 'chat':
  // Get user's session
  const sessionData = sessionHandler.getUserSession(userId);
  
  // Use user's ServerClient
  const { prompt } = translator.acpToSdk(message);
  const result = await sessionData.client.query(prompt);
  
  // Convert back to ACP format
  return translator.sdkToAcp(result, message.id);
```

### 7. ServerClient Calls OpenAI API

**ServerClient.query()**:
```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ],
  tools: availableTools
});

return {
  text: completion.choices[0].message.content,
  usage: completion.usage,
  toolCalls: completion.choices[0].message.tool_calls
};
```

### 8. Response Flows Back

**team-ai-agent** → **team-service** (WebSocket):
```typescript
{
  id: "original-message-id",
  success: true,
  data: {
    content: "This code implements...",
    usage: { input: 150, output: 200, total: 350 }
  },
  timestamp: Date.now()
}
```

**team-service** → **team-web** (WebSocket):
```typescript
socket.emit('ai_response', {
  content: "This code implements...",
  usage: { input: 150, output: 200, total: 350 }
});
```

## ACP Protocol Message Types

### Session Messages
```typescript
// Create session
{
  id: "msg-123",
  type: "session",
  data: {
    action: "create",
    userId: "user-456",
    credentials: { apiKey: "..." },
    workingDirectory: "/workspace/user-456"
  },
  timestamp: 1234567890
}

// Response
{
  id: "msg-123",
  success: true,
  data: {
    session: {
      sessionId: "session-abc",
      userId: "user-456"
    }
  },
  timestamp: 1234567891
}
```

### Chat Messages
```typescript
// Send chat
{
  id: "msg-124",
  type: "chat",
  data: {
    action: "send",
    message: "Explain this code",
    sessionId: "session-abc",
    userId: "user-456",
    workingDirectory: "/workspace/user-456"
  },
  timestamp: 1234567892
}

// Response
{
  id: "msg-124",
  success: true,
  data: {
    content: "This code implements...",
    usage: { input: 150, output: 200, total: 350 }
  },
  timestamp: 1234567893
}
```

### Tool Messages
```typescript
// Execute tool
{
  id: "msg-125",
  type: "tool",
  data: {
    action: "execute",
    toolName: "fs_read",
    parameters: { path: "/workspace/file.ts" },
    sessionId: "session-abc",
    userId: "user-456"
  },
  timestamp: 1234567894
}

// Response
{
  id: "msg-125",
  success: true,
  data: {
    result: "file contents..."
  },
  timestamp: 1234567895
}
```

## Connection Management

### Agent Discovery
**Location**: `packages/team-service/src/discovery/AgentConfigManager.ts`

**Purpose**: Discovers available AI agents and selects best one

```typescript
// Load agent configurations
const agents = [
  {
    id: "qwen-core-agent",
    name: "Qwen Core Agent",
    endpoint: "ws://localhost:8001",
    capabilities: ["chat.send", "tools.execute", "session.create"],
    status: "active"
  }
];

// Select best agent for capability
const agent = await agentDiscovery.selectBestAgent('chat.send');
```

### Connection Lifecycle

1. **Initial Connection**:
```typescript
await acpClient.connect(['chat.send']);
// Discovers agent → Opens WebSocket → Sets up handlers
```

2. **Automatic Reconnection**:
```typescript
// On disconnect, retry with exponential backoff
private async reconnect() {
  await new Promise(resolve => 
    setTimeout(resolve, Math.pow(2, reconnectAttempts) * 1000)
  );
  await this.connect(['chat.send']);
}
```

3. **Request Timeout**:
```typescript
// Each request has configurable timeout (default 120s)
setTimeout(() => {
  if (pendingRequests.has(id)) {
    pendingRequests.delete(id);
    reject(new Error('Request timeout'));
  }
}, 120000);
```

4. **Graceful Shutdown**:
```typescript
await acpClient.disconnect();
// Destroys session → Closes WebSocket → Cleans up
```

## Error Handling

### Connection Errors
```typescript
try {
  await acpClient.connect(['chat.send']);
} catch (error) {
  // Agent not available
  // Network error
  // Connection timeout
}
```

### Request Errors
```typescript
try {
  const response = await acpClient.request('chat.send', payload);
} catch (error) {
  // Request timeout
  // Invalid message format
  // Session not found
  // OpenAI API error
}
```

### Response Errors
```typescript
{
  id: "msg-123",
  success: false,
  error: {
    code: "SESSION_NOT_FOUND",
    message: "No active session found for user"
  },
  timestamp: 1234567890
}
```

## Configuration

### team-service Configuration
```typescript
// packages/team-service/src/config.ts
export const AI_AGENT_ENDPOINT = 
  process.env.AI_AGENT_ENDPOINT || 'ws://localhost:8001';

export const ACP_REQUEST_TIMEOUT = 
  parseInt(process.env.ACP_REQUEST_TIMEOUT || '120000');
```

### team-ai-agent Configuration
```typescript
// packages/team-ai-agent/src/config/env.ts
export const ACP_SERVER_PORT = 
  parseInt(process.env.ACP_SERVER_PORT || '8001');

export const SESSION_TIMEOUT = 
  parseInt(process.env.SESSION_TIMEOUT || '1800000'); // 30 min
```

## Benefits of ACP Architecture

1. **Decoupling**: team-service and team-ai-agent can be deployed independently
2. **Scalability**: Multiple team-service instances can connect to multiple team-ai-agent instances
3. **Resilience**: Automatic reconnection and error handling
4. **Flexibility**: Easy to add new message types and capabilities
5. **Monitoring**: Centralized health checks and telemetry
6. **Multi-tenancy**: Per-user sessions with isolated contexts

## Related Documentation

- [ACP Implementation Status](./ACP_IMPLEMENTATION_STATUS.md)
- [Communication Protocols](./COMMUNICATION_PROTOCOLS.md)
- [User Session Management](./USER_SESSION_MANAGEMENT.md)

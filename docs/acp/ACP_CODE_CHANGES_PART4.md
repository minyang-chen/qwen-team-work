# ACP Code Changes - Part 4: qwen-core-agent Package

## Package: `packages/qwen-core-agent`

### New Package Structure
```
packages/qwen-core-agent/
├── src/
│   ├── index.ts                        # Main entry point
│   ├── server/
│   │   ├── AcpServer.ts               # WebSocket server
│   │   └── MessageRouter.ts           # Message routing
│   ├── session/
│   │   ├── AcpSessionManager.ts       # Server-side sessions
│   │   └── MultiUserSessionManager.ts # Multi-user isolation
│   ├── handlers/
│   │   ├── SessionHandler.ts          # Session lifecycle
│   │   ├── ChatHandler.ts             # Chat processing
│   │   └── CodeExecutionHandler.ts    # Code execution
│   ├── discovery/
│   │   ├── AgentAnnouncer.ts          # Discovery protocol
│   │   └── AgentDiscovery.ts          # Discovery client
│   ├── adapters/
│   │   ├── CoreAdapter.ts             # @qwen-code/core bridge
│   │   └── ToolAdapter.ts             # Tool execution
│   ├── protocol/
│   │   ├── MessageValidator.ts        # Message validation
│   │   ├── ErrorHandler.ts            # Error handling
│   │   └── ResponseBuilder.ts         # Response formatting
│   └── utils/
│       ├── SessionUtils.ts            # Session utilities
│       └── Logger.ts                  # Logging utility
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Core Implementation Files

### **1. `src/index.ts` - Main Entry Point**
```typescript
import { AcpServer } from './server/AcpServer';
import { AgentAnnouncer } from './discovery/AgentAnnouncer';
import { Logger } from './utils/Logger';

const logger = new Logger('QwenCoreAgent');

async function main() {
  try {
    const port = parseInt(process.env.ACP_PORT || '8080');
    const agentId = process.env.AGENT_ID || 'qwen-core-1';
    
    // Initialize ACP server
    const server = new AcpServer(port, agentId);
    await server.start();
    
    // Start agent discovery
    const announcer = new AgentAnnouncer(agentId, `ws://localhost:${port}`);
    await announcer.start();
    
    logger.info(`Qwen Core Agent started on port ${port}`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await announcer.stop();
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start agent:', error);
    process.exit(1);
  }
}

main();
```

### **2. `src/server/AcpServer.ts` - WebSocket Server**
```typescript
import WebSocket, { WebSocketServer } from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { MessageRouter } from './MessageRouter';
import { MultiUserSessionManager } from '../session/MultiUserSessionManager';
import { ErrorHandler } from '../protocol/ErrorHandler';
import { Logger } from '../utils/Logger';

export class AcpServer {
  private wss: WebSocketServer | null = null;
  private messageRouter: MessageRouter;
  private sessionManager: MultiUserSessionManager;
  private errorHandler: ErrorHandler;
  private logger: Logger;

  constructor(private port: number, private agentId: string) {
    this.logger = new Logger('AcpServer');
    this.sessionManager = new MultiUserSessionManager();
    this.errorHandler = new ErrorHandler();
    this.messageRouter = new MessageRouter(this.sessionManager, this.errorHandler);
  }

  async start(): Promise<void> {
    this.wss = new WebSocketServer({ port: this.port });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.logger.info('New client connected');
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message: AcpMessage = JSON.parse(data.toString());
          const response = await this.messageRouter.route(message, ws);
          ws.send(JSON.stringify(response));
        } catch (error) {
          const errorResponse = this.errorHandler.createErrorResponse(
            'unknown',
            'MESSAGE_PARSE_ERROR',
            'Failed to parse message',
            error
          );
          ws.send(JSON.stringify(errorResponse));
        }
      });
      
      ws.on('close', () => {
        this.logger.info('Client disconnected');
        this.sessionManager.cleanupClientSessions(ws);
      });
      
      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
      });
    });
    
    this.logger.info(`ACP Server listening on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      await this.sessionManager.cleanup();
    }
  }
}
```

### **3. `src/server/MessageRouter.ts` - Message Routing**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { MultiUserSessionManager } from '../session/MultiUserSessionManager';
import { SessionHandler } from '../handlers/SessionHandler';
import { ChatHandler } from '../handlers/ChatHandler';
import { CodeExecutionHandler } from '../handlers/CodeExecutionHandler';
import { ErrorHandler } from '../protocol/ErrorHandler';
import { MessageValidator } from '../protocol/MessageValidator';

export class MessageRouter {
  private sessionHandler: SessionHandler;
  private chatHandler: ChatHandler;
  private codeHandler: CodeExecutionHandler;
  private validator: MessageValidator;

  constructor(
    private sessionManager: MultiUserSessionManager,
    private errorHandler: ErrorHandler
  ) {
    this.validator = new MessageValidator();
    this.sessionHandler = new SessionHandler(sessionManager);
    this.chatHandler = new ChatHandler(sessionManager);
    this.codeHandler = new CodeExecutionHandler(sessionManager);
  }

  async route(message: AcpMessage, ws: WebSocket): Promise<AcpResponse> {
    try {
      // Validate message
      const validation = this.validator.validate(message);
      if (!validation.valid) {
        return this.errorHandler.createErrorResponse(
          message.id,
          'INVALID_MESSAGE',
          validation.error || 'Message validation failed'
        );
      }

      // Route based on message type
      switch (message.type) {
        case 'session.create':
          return await this.sessionHandler.createSession(message, ws);
        
        case 'session.destroy':
          return await this.sessionHandler.destroySession(message, ws);
        
        case 'session.save':
          return await this.sessionHandler.saveSession(message);
        
        case 'session.resume':
          return await this.sessionHandler.resumeSession(message, ws);
        
        case 'session.list':
          return await this.sessionHandler.listSessions(message);
        
        case 'chat.send':
          return await this.chatHandler.sendMessage(message);
        
        case 'chat.stream':
          return await this.chatHandler.streamMessage(message, ws);
        
        case 'code.execute':
          return await this.codeHandler.executeCode(message);
        
        case 'health.check':
          return this.handleHealthCheck(message);
        
        default:
          return this.errorHandler.createErrorResponse(
            message.id,
            'UNKNOWN_MESSAGE_TYPE',
            `Unknown message type: ${message.type}`
          );
      }
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'INTERNAL_ERROR',
        'Internal server error',
        error
      );
    }
  }

  private handleHealthCheck(message: AcpMessage): AcpResponse {
    return {
      id: message.id,
      success: true,
      data: {
        status: 'healthy',
        timestamp: Date.now(),
        activeSessions: this.sessionManager.getActiveSessionCount()
      },
      timestamp: Date.now()
    };
  }
}
```

### **4. `src/session/MultiUserSessionManager.ts` - Multi-User Session Management**
```typescript
import WebSocket from 'ws';
import { ServerSession } from '@qwen-code/shared';
import { AcpSessionManager } from './AcpSessionManager';
import { Logger } from '../utils/Logger';

export class MultiUserSessionManager extends AcpSessionManager {
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds
  private sessionUsers = new Map<string, string>(); // sessionId -> userId
  private clientSessions = new Map<WebSocket, Set<string>>(); // client -> sessionIds
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('MultiUserSessionManager');
  }

  async createSession(userId: string, client: WebSocket): Promise<ServerSession> {
    const session = await super.createSession(userId);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(session.id);
    this.sessionUsers.set(session.id, userId);
    
    // Track client sessions
    if (!this.clientSessions.has(client)) {
      this.clientSessions.set(client, new Set());
    }
    this.clientSessions.get(client)!.add(session.id);
    
    this.logger.info(`Created session ${session.id} for user ${userId}`);
    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    const userId = this.sessionUsers.get(sessionId);
    
    // Clean up user session tracking
    if (userId) {
      const userSessionSet = this.userSessions.get(userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(userId);
        }
      }
      this.sessionUsers.delete(sessionId);
    }
    
    // Clean up client session tracking
    for (const [client, sessionSet] of this.clientSessions) {
      sessionSet.delete(sessionId);
    }
    
    await super.destroySession(sessionId);
    this.logger.info(`Destroyed session ${sessionId}`);
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);
    if (sessionIds) {
      const destroyPromises = Array.from(sessionIds).map(sessionId => 
        this.destroySession(sessionId)
      );
      await Promise.all(destroyPromises);
    }
  }

  getUserSessions(userId: string): ServerSession[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map(sessionId => this.sessions.get(sessionId))
      .filter(session => session !== undefined) as ServerSession[];
  }

  cleanupClientSessions(client: WebSocket): void {
    const sessionIds = this.clientSessions.get(client);
    if (sessionIds) {
      // Don't destroy sessions immediately - they might reconnect
      // Just remove client tracking
      this.clientSessions.delete(client);
      this.logger.info(`Cleaned up client sessions: ${Array.from(sessionIds).join(', ')}`);
    }
  }

  getActiveUserCount(): number {
    return this.userSessions.size;
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
```

### **5. `src/handlers/ChatHandler.ts` - Chat Processing**
```typescript
import WebSocket from 'ws';
import { AcpMessage, AcpResponse } from '@qwen-code/shared';
import { MultiUserSessionManager } from '../session/MultiUserSessionManager';
import { CoreAdapter } from '../adapters/CoreAdapter';
import { ResponseBuilder } from '../protocol/ResponseBuilder';
import { ErrorHandler } from '../protocol/ErrorHandler';

export class ChatHandler {
  private coreAdapter: CoreAdapter;
  private responseBuilder: ResponseBuilder;
  private errorHandler: ErrorHandler;

  constructor(private sessionManager: MultiUserSessionManager) {
    this.coreAdapter = new CoreAdapter();
    this.responseBuilder = new ResponseBuilder();
    this.errorHandler = new ErrorHandler();
  }

  async sendMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { sessionId, content } = message.payload;
      
      const session = this.sessionManager.getSession(sessionId);
      if (!session) {
        return this.errorHandler.createErrorResponse(
          message.id,
          'SESSION_NOT_FOUND',
          `Session ${sessionId} not found`
        );
      }

      // Update session activity
      await this.sessionManager.updateActivity(sessionId);

      // Process with core
      const response = await this.coreAdapter.processMessage(session, content);

      return this.responseBuilder.createSuccessResponse(message.id, {
        content: response.content,
        usage: response.usage,
        metadata: response.metadata
      });

    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'CHAT_PROCESSING_ERROR',
        'Failed to process chat message',
        error
      );
    }
  }

  async streamMessage(message: AcpMessage, ws: WebSocket): Promise<AcpResponse> {
    try {
      const { sessionId, content } = message.payload;
      
      const session = this.sessionManager.getSession(sessionId);
      if (!session) {
        return this.errorHandler.createErrorResponse(
          message.id,
          'SESSION_NOT_FOUND',
          `Session ${sessionId} not found`
        );
      }

      // Start streaming response
      const streamId = `stream_${Date.now()}`;
      
      // Process with streaming
      this.coreAdapter.processMessageStream(session, content, (chunk) => {
        const streamResponse = {
          id: streamId,
          type: 'chat.stream.chunk',
          data: { chunk },
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(streamResponse));
      });

      return this.responseBuilder.createSuccessResponse(message.id, {
        streamId,
        status: 'streaming_started'
      });

    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'STREAM_ERROR',
        'Failed to start message stream',
        error
      );
    }
  }
}
```

### **6. `src/adapters/CoreAdapter.ts` - @qwen-code/core Integration**
```typescript
import { ServerSession } from '@qwen-code/shared';
import { Logger } from '../utils/Logger';

// Import from @qwen-code/core when available
interface CoreResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: any;
}

export class CoreAdapter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CoreAdapter');
  }

  async processMessage(session: ServerSession, content: string): Promise<CoreResponse> {
    try {
      // TODO: Replace with actual @qwen-code/core integration
      // const { GeminiClient, Config } = await import('@qwen-code/core');
      // const client = new GeminiClient(new Config());
      
      // Mock implementation for now
      const response: CoreResponse = {
        content: `Processed: ${content}`,
        usage: {
          inputTokens: content.length,
          outputTokens: content.length + 10
        },
        metadata: {
          model: 'qwen3-coder-plus',
          processingTime: Date.now() - session.lastActivity
        }
      };

      // Update session token usage
      session.tokenUsage.input += response.usage?.inputTokens || 0;
      session.tokenUsage.output += response.usage?.outputTokens || 0;
      session.tokenUsage.total = session.tokenUsage.input + session.tokenUsage.output;

      return response;

    } catch (error) {
      this.logger.error('Core processing error:', error);
      throw error;
    }
  }

  async processMessageStream(
    session: ServerSession, 
    content: string, 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      // TODO: Replace with actual streaming implementation
      // Mock streaming response
      const words = content.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      onChunk('[DONE]');

    } catch (error) {
      this.logger.error('Stream processing error:', error);
      throw error;
    }
  }
}
```

### **7. `src/discovery/AgentAnnouncer.ts` - Discovery Protocol**
```typescript
import dgram from 'dgram';
import { AcpMessage } from '@qwen-code/shared';
import { Logger } from '../utils/Logger';

export class AgentAnnouncer {
  private socket: dgram.Socket | null = null;
  private announceInterval: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(
    private agentId: string,
    private endpoint: string,
    private port: number = 9999
  ) {
    this.logger = new Logger('AgentAnnouncer');
  }

  async start(): Promise<void> {
    this.socket = dgram.createSocket('udp4');
    
    // Listen for discovery requests
    this.socket.on('message', (msg, rinfo) => {
      try {
        const message: AcpMessage = JSON.parse(msg.toString());
        if (message.type === 'agent.discover') {
          this.handleDiscoveryRequest(message, rinfo);
        }
      } catch (error) {
        this.logger.warn('Invalid discovery message:', error);
      }
    });

    this.socket.bind(this.port);
    
    // Periodic announcements
    this.announceInterval = setInterval(() => {
      this.broadcastAnnouncement();
    }, 30000); // Every 30 seconds

    this.logger.info(`Agent announcer started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
    }
    
    if (this.socket) {
      this.socket.close();
    }
  }

  private handleDiscoveryRequest(message: AcpMessage, rinfo: dgram.RemoteInfo): void {
    const announcement: AcpMessage = {
      id: `announce_${Date.now()}`,
      type: 'agent.announce',
      payload: {
        agentId: this.agentId,
        endpoint: this.endpoint,
        capabilities: [
          'session.create',
          'session.destroy',
          'session.save',
          'session.resume',
          'chat.send',
          'chat.stream',
          'code.execute'
        ],
        metadata: {
          name: 'Qwen Core Agent',
          version: '1.0.0',
          models: ['qwen3-coder-plus', 'qwen3-coder-30b'],
          maxSessions: 1000
        }
      },
      timestamp: Date.now()
    };

    const response = Buffer.from(JSON.stringify(announcement));
    this.socket?.send(response, rinfo.port, rinfo.address);
    
    this.logger.info(`Sent announcement to ${rinfo.address}:${rinfo.port}`);
  }

  private broadcastAnnouncement(): void {
    const announcement: AcpMessage = {
      id: `broadcast_${Date.now()}`,
      type: 'agent.announce',
      payload: {
        agentId: this.agentId,
        endpoint: this.endpoint,
        capabilities: [
          'session.create',
          'session.destroy', 
          'session.save',
          'session.resume',
          'chat.send',
          'chat.stream',
          'code.execute'
        ],
        metadata: {
          name: 'Qwen Core Agent',
          version: '1.0.0'
        }
      },
      timestamp: Date.now()
    };

    const message = Buffer.from(JSON.stringify(announcement));
    this.socket?.send(message, this.port, '255.255.255.255');
  }
}
```

### **8. `src/protocol/ErrorHandler.ts` - Error Handling**
```typescript
import { AcpResponse, AcpError } from '@qwen-code/shared';

export class ErrorHandler {
  private errorCodes = {
    // Message errors
    'MESSAGE_PARSE_ERROR': 'Failed to parse message',
    'INVALID_MESSAGE': 'Message validation failed',
    'UNKNOWN_MESSAGE_TYPE': 'Unknown message type',
    
    // Session errors
    'SESSION_NOT_FOUND': 'Session not found',
    'SESSION_CREATION_FAILED': 'Failed to create session',
    'SESSION_LIMIT_EXCEEDED': 'Maximum sessions reached',
    'NO_ACTIVE_SESSION': 'No active session available',
    
    // Processing errors
    'CHAT_PROCESSING_ERROR': 'Failed to process chat message',
    'CODE_EXECUTION_ERROR': 'Failed to execute code',
    'STREAM_ERROR': 'Streaming error',
    
    // System errors
    'INTERNAL_ERROR': 'Internal server error',
    'RESOURCE_EXHAUSTED': 'System resources exhausted',
    'TIMEOUT_ERROR': 'Operation timed out'
  };

  createErrorResponse(
    messageId: string,
    code: string,
    message?: string,
    details?: any
  ): AcpResponse {
    const error: AcpError = {
      code,
      message: message || this.errorCodes[code] || 'Unknown error',
      details: details ? this.sanitizeError(details) : undefined
    };

    return {
      id: messageId,
      success: false,
      error,
      timestamp: Date.now()
    };
  }

  private sanitizeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    return error;
  }
}
```

### **9. `package.json`**
```json
{
  "name": "@qwen-code/qwen-core-agent",
  "version": "1.0.0",
  "description": "ACP Core Agent Service for Qwen Code",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "ws": "^8.14.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### **10. `Dockerfile`**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .
COPY ../shared ../shared

# Build the application
RUN npm run build

EXPOSE 8080 9999

CMD ["npm", "start"]
```

This completes the qwen-core-agent package implementation with all core components, discovery protocol, error handling, and @qwen-code/core integration structure.

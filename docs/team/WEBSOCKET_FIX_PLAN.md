# WebSocket Architecture Production Fix Plan

## Executive Summary

The current system has **catastrophic architectural flaws** requiring complete restructuring for production deployment. This plan provides detailed implementation fixes for all identified issues.

## Production-Ready Solution: Proper Layered Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-ui/client  │    │ team-ui/server  │    │  team-backend   │    │ team-core-agent │
│                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ HTTP/REST API   │◄──►│ Native WebSocket│
│ Client          │    │ Server          │    │ + WebSocket     │    │ Server          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8000)     │    │ (Port 8001)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Phase 1: Critical Production Fixes (P0) - IMMEDIATE

### 1.1 Fix team-ui/client WebSocket Connection

**File**: `packages/team-ui/client/src/hooks/useWebSocket.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url?: string) {
  // PRODUCTION FIX: Use environment variable with fallback
  const socketUrl = url || import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:8002';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[WebSocket] Connecting to: ${socketUrl}`);
    
    socketRef.current = io(socketUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10, // Production: Limited attempts
      timeout: 10000, // Production: Connection timeout
      transports: ['websocket', 'polling'], // Production: Fallback transport
    });

    socketRef.current.on('connect', () => {
      console.log(`[WebSocket] Connected to: ${socketUrl}`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Production: Server initiated disconnect, don't reconnect automatically
        setConnectionError('Server disconnected. Please refresh the page.');
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error(`[WebSocket] Connection error:`, error);
      setConnectionError(`Connection failed: ${error.message}`);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      setConnectionError('Unable to reconnect. Please refresh the page.');
    });

    return () => {
      console.log('[WebSocket] Cleaning up connection');
      socketRef.current?.disconnect();
    };
  }, [socketUrl]);

  return { 
    socket: socketRef.current, 
    isConnected, 
    connectionError,
    reconnect: () => socketRef.current?.connect()
  };
}
```

### 1.2 Fix team-ui/client Environment Configuration

**File**: `packages/team-ui/client/.env`

```bash
# PRODUCTION CONFIGURATION
VITE_API_BASE_URL=http://localhost:8002
VITE_WEBSOCKET_URL=http://localhost:8002
```

**File**: `packages/team-ui/client/.env.production`

```bash
# PRODUCTION ENVIRONMENT
VITE_API_BASE_URL=https://api.yourcompany.com
VITE_WEBSOCKET_URL=https://ws.yourcompany.com
```

### 1.3 Fix Vite Configuration for Production

**File**: `packages/team-ui/client/vite.config.ts`

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../../', '');
  
  // PRODUCTION FIX: Use correct server port
  const serverPort = parseInt(env.WEBUI_SERVER_PORT || '8002');
  const clientPort = parseInt(env.WEBUI_CLIENT_PORT || '8003');
  
  console.log(`[Vite] Mode: ${mode}`);
  console.log(`[Vite] Client port: ${clientPort}`);
  console.log(`[Vite] Server port: ${serverPort}`);

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          team: resolve(__dirname, 'team.html'),
        },
      },
      // Production optimizations
      minify: 'terser',
      sourcemap: mode === 'development',
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: clientPort,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('[Vite Proxy] Error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
          },
        },
        '/socket.io': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    define: {
      __API_BASE_URL__: JSON.stringify(`http://localhost:${serverPort}`),
      __WEBSOCKET_URL__: JSON.stringify(`http://localhost:${serverPort}`),
    },
    // Production environment handling
    envPrefix: 'VITE_',
  };
});
```

### 1.4 Production-Ready team-ui/server Configuration

**File**: `packages/team-ui/server/src/config.ts`

```typescript
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const findWorkspaceRoot = (startPath: string): string => {
  let currentPath = startPath;
  while (currentPath !== dirname(currentPath)) {
    const packageJsonPath = resolve(currentPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.workspaces) {
        return currentPath;
      }
    }
    currentPath = dirname(currentPath);
  }
  return startPath;
};

const workspaceRoot = findWorkspaceRoot(__dirname);
const configPath = resolve(workspaceRoot, '.env.team');

console.log(`[Config] Loading from: ${configPath}`);
console.log(`[Config] File exists: ${existsSync(configPath)}`);

config({ path: configPath });

// PRODUCTION CONFIGURATION
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.WEBUI_SERVER_PORT || '8002');
export const HOST = process.env.HOST || '0.0.0.0';
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Backend service configuration
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
export const BACKEND_TIMEOUT = parseInt(process.env.BACKEND_TIMEOUT || '30000');

// Security configuration
export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-secret-change-in-production';
})();

// OAuth configuration
export const QWEN_CLIENT_ID = process.env.QWEN_CLIENT_ID;
export const QWEN_CLIENT_SECRET = process.env.QWEN_CLIENT_SECRET;

// CORS configuration
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 
  (NODE_ENV === 'production' 
    ? ['https://yourcompany.com', 'https://app.yourcompany.com']
    : [`http://localhost:${process.env.WEBUI_CLIENT_PORT || '8003'}`]);

// Rate limiting
export const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes
export const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100');

// Session configuration
export const SESSION_TOKEN_LIMIT = parseInt(process.env.SESSION_TOKEN_LIMIT || '32000');
export const MESSAGE_WINDOW_SIZE = parseInt(process.env.MESSAGE_WINDOW_SIZE || '100');

// Logging
export const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

console.log(`[Config] Environment: ${NODE_ENV}`);
console.log(`[Config] Server: ${HOST}:${PORT}`);
console.log(`[Config] Backend: ${BACKEND_URL}`);
console.log(`[Config] CORS Origin: ${JSON.stringify(CORS_ORIGIN)}`);
```

## Phase 2: Production Architecture Restructure (P1) - HIGH PRIORITY

### 2.1 Production-Ready team-ui/server WebSocket Handler

**File**: `packages/team-ui/server/src/websocket.ts`

```typescript
import type { Server as SocketServer, Socket } from 'socket.io';
import { BACKEND_URL, BACKEND_TIMEOUT, LOG_LEVEL } from './config.js';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

interface BackendStreamResponse {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  message?: string;
}

class BackendApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = BACKEND_URL, timeout: number = BACKEND_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async authenticateUser(token: string): Promise<{ userId: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.error(`[Backend] Auth failed: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Backend] Auth error:', error);
      return null;
    }
  }

  async sendMessage(userId: string, sessionId: string, message: string, files?: any[]): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.generateUserToken(userId)}`,
      },
      body: JSON.stringify({
        message,
        sessionId,
        files,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async createSession(userId: string, workingDirectory?: string): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.generateUserToken(userId)}`,
      },
      body: JSON.stringify({ workingDirectory }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Session creation failed: ${response.status}`);
    }

    return await response.json();
  }

  private generateUserToken(userId: string): string {
    // Generate token for backend communication
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  }
}

export function setupWebSocket(io: SocketServer) {
  const backendClient = new BackendApiClient();
  const activeConnections = new Map<string, AuthenticatedSocket>();

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const user = await backendClient.authenticateUser(token);
      if (!user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.userId = user.userId;
      console.log(`[WebSocket] User authenticated: ${user.userId}`);
      next();
    } catch (error) {
      console.error('[WebSocket] Auth middleware error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`[WebSocket] Client connected: ${socket.id} (User: ${userId})`);
    
    activeConnections.set(socket.id, socket);

    // Handle chat messages
    socket.on('chat:message', async (data: {
      sessionId: string;
      message: string;
      files?: Array<{
        name: string;
        type: string;
        size: number;
        data: string;
      }>;
    }) => {
      console.log(`[WebSocket] Chat message from ${userId}:`, {
        sessionId: data.sessionId,
        messageLength: data.message.length,
        fileCount: data.files?.length || 0,
      });

      try {
        // Validate input
        if (!data.message?.trim()) {
          socket.emit('message:error', { message: 'Message cannot be empty' });
          return;
        }

        if (data.message.length > 50000) {
          socket.emit('message:error', { message: 'Message too long (max 50,000 characters)' });
          return;
        }

        // Process files if present
        let processedMessage = data.message;
        if (data.files && data.files.length > 0) {
          const fileContents: string[] = [];
          
          for (const file of data.files) {
            if (file.type === 'application/pdf') {
              try {
                const text = await extractTextFromPDF(file.data);
                if (text) {
                  fileContents.push(`\n--- Content from ${file.name} ---\n${text}\n--- End of ${file.name} ---\n`);
                }
              } catch (error) {
                console.error(`[WebSocket] PDF extraction failed for ${file.name}:`, error);
                socket.emit('message:error', { message: `Failed to process PDF: ${file.name}` });
                return;
              }
            }
          }

          if (fileContents.length > 0) {
            processedMessage = `${data.message}\n${fileContents.join('\n')}`;
          }
        }

        // Send to backend with streaming
        const response = await backendClient.sendMessage(userId, data.sessionId, processedMessage, data.files);
        
        if (!response.body) {
          throw new Error('No response body from backend');
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data: BackendStreamResponse = JSON.parse(line.slice(6));
                  
                  if (data.type === 'chunk' && data.content) {
                    socket.emit('message:chunk', { 
                      type: 'text', 
                      data: { text: data.content } 
                    });
                  } else if (data.type === 'complete') {
                    socket.emit('message:complete');
                    break;
                  } else if (data.type === 'error') {
                    socket.emit('message:error', { message: data.message || 'Processing error' });
                    break;
                  }
                } catch (parseError) {
                  console.error('[WebSocket] Failed to parse SSE data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

      } catch (error) {
        console.error(`[WebSocket] Chat message error for user ${userId}:`, error);
        socket.emit('message:error', { 
          message: error instanceof Error ? error.message : 'Failed to process message' 
        });
      }
    });

    // Handle session creation
    socket.on('session:create', async (data: { workingDirectory?: string }) => {
      try {
        const result = await backendClient.createSession(userId, data.workingDirectory);
        socket.sessionId = result.sessionId;
        socket.emit('session:created', result);
        console.log(`[WebSocket] Session created for ${userId}: ${result.sessionId}`);
      } catch (error) {
        console.error(`[WebSocket] Session creation error for ${userId}:`, error);
        socket.emit('session:error', { 
          message: error instanceof Error ? error.message : 'Failed to create session' 
        });
      }
    });

    // Handle cancellation
    socket.on('chat:cancel', () => {
      console.log(`[WebSocket] Chat cancelled by ${userId}`);
      // TODO: Implement cancellation logic with backend
      socket.emit('message:cancelled');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (User: ${userId}, Reason: ${reason})`);
      activeConnections.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for ${userId}:`, error);
    });
  });

  // Cleanup function
  const cleanup = () => {
    console.log(`[WebSocket] Cleaning up ${activeConnections.size} connections`);
    activeConnections.forEach((socket) => {
      socket.disconnect(true);
    });
    activeConnections.clear();
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  console.log('[WebSocket] Server setup complete');
}

async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data.includes(',') ? base64Data.split(',')[1] : base64Data, 'base64');
    const { default: pdf } = await import('pdf-parse');
    const result = await pdf(buffer);
    return result.text;
  } catch (error) {
    console.error('[PDF] Extraction error:', error);
    throw new Error('PDF processing failed');
  }
}
```

### 2.2 Remove Duplicate Session Management

**File**: `packages/team-ui/server/src/session/UserSessionManager.js`

```typescript
// COMPLETE REPLACEMENT - Remove all WebSocket logic, use backend API
import { BACKEND_URL, BACKEND_TIMEOUT } from '../config.js';
import jwt from 'jsonwebtoken';

export class UserSessionManager {
  private backendUrl: string;
  private timeout: number;

  constructor(backendUrl: string = BACKEND_URL, timeout: number = BACKEND_TIMEOUT) {
    this.backendUrl = backendUrl;
    this.timeout = timeout;
  }

  async createUserSession(userId: string, credentials?: any, workingDirectory?: string): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateToken(userId)}`,
        },
        body: JSON.stringify({
          userId,
          credentials,
          workingDirectory,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Backend session creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[SessionManager] Created session for ${userId}: ${result.sessionId}`);
      return result.sessionId;
    } catch (error) {
      console.error(`[SessionManager] Session creation failed for ${userId}:`, error);
      throw error;
    }
  }

  async getUserSession(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/sessions/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.generateToken(userId)}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Backend session fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[SessionManager] Get session failed for ${userId}:`, error);
      return null;
    }
  }

  async deleteUserSession(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/sessions/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.generateToken(userId)}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Backend session deletion failed: ${response.status}`);
      }

      console.log(`[SessionManager] Deleted session for ${userId}`);
    } catch (error) {
      console.error(`[SessionManager] Session deletion failed for ${userId}:`, error);
      throw error;
    }
  }

  getUserSessions(userId: string): any[] {
    // This method should be async and call backend, but keeping sync for compatibility
    console.warn('[SessionManager] getUserSessions should be replaced with async backend call');
    return [];
  }

  async getSessionStats(userId: string, sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/sessions/${sessionId}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.generateToken(userId)}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Backend stats fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[SessionManager] Get stats failed for ${userId}/${sessionId}:`, error);
      return null;
    }
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/sessions/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateSystemToken()}`,
        },
        body: JSON.stringify({ maxAge }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Backend cleanup failed: ${response.status}`);
      }

      console.log('[SessionManager] Cleanup completed');
    } catch (error) {
      console.error('[SessionManager] Cleanup failed:', error);
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  }

  private generateSystemToken(): string {
    return jwt.sign({ system: true }, process.env.JWT_SECRET!, { expiresIn: '5m' });
  }
}
```

### 2.3 Production-Ready team-ui/server Main Application

**File**: `packages/team-ui/server/src/index.ts`

```typescript
import './config.js';
import {
  PORT,
  HOST,
  BASE_URL,
  JWT_SECRET,
  QWEN_CLIENT_ID,
  QWEN_CLIENT_SECRET,
  CORS_ORIGIN,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  NODE_ENV,
  LOG_LEVEL,
  BACKEND_URL,
} from './config.js';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { Server as SocketServer } from 'socket.io';
import { setupWebSocket } from './websocket.js';
import { UserSessionManager } from './session/UserSessionManager.js';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// Initialize services
const userSessionManager = new UserSessionManager();

// Create Fastify instance with production settings
const app = Fastify({ 
  logger: {
    level: LOG_LEVEL,
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  trustProxy: NODE_ENV === 'production',
  disableRequestLogging: NODE_ENV === 'production',
});

// Security middleware
await app.register(helmet, {
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
});

// Rate limiting
await app.register(rateLimit, {
  max: RATE_LIMIT_MAX,
  timeWindow: RATE_LIMIT_WINDOW,
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
    expiresIn: Math.round(context.ttl / 1000),
  }),
});

// CORS configuration
await app.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});

// Cookie support
await app.register(cookie, {
  secret: JWT_SECRET,
  parseOptions: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
  },
});

// Utility functions
function verifyToken(token: string): {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: any;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    app.log.debug('Token verification failed:', error);
    return null;
  }
}

async function forwardToBackend(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;
  app.log.debug(`Forwarding to backend: ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000),
  });
  
  if (!response.ok) {
    app.log.error(`Backend request failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

// Health check
app.get('/health', async (request, reply) => {
  try {
    // Check backend connectivity
    const backendHealth = await forwardToBackend('/health');
    const backendStatus = backendHealth.ok ? 'healthy' : 'unhealthy';
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      backend: backendStatus,
      environment: NODE_ENV,
    };
  } catch (error) {
    app.log.error('Health check failed:', error);
    return reply.code(503).send({
      status: 'error',
      message: 'Service unhealthy',
      backend: 'unreachable',
    });
  }
});

// Authentication routes - Forward to backend
app.post('/api/auth/login', async (request, reply) => {
  try {
    const response = await forwardToBackend('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      reply.setCookie('auth_token', data.token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return reply.code(response.status).send(data);
  } catch (error) {
    app.log.error('Login forwarding failed:', error);
    return reply.code(500).send({ error: 'Authentication service unavailable' });
  }
});

app.post('/api/auth/login/openai', async (request, reply) => {
  const { apiKey, baseUrl, model } = request.body as {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };

  if (!apiKey?.trim()) {
    return reply.code(400).send({ error: 'API key is required' });
  }

  try {
    const response = await forwardToBackend('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'openai',
        apiKey: apiKey.trim(),
        baseUrl: baseUrl?.trim(),
        model: model?.trim(),
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      reply.setCookie('auth_token', data.token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return reply.code(response.status).send(data);
  } catch (error) {
    app.log.error('OpenAI login failed:', error);
    return reply.code(500).send({ error: 'Authentication service unavailable' });
  }
});

// OAuth routes (keep existing implementation but add error handling)
app.post('/api/auth/oauth/qwen/device', async (request, reply) => {
  const { code_challenge, code_challenge_method } = request.body as {
    code_challenge: string;
    code_challenge_method: string;
  };

  if (!QWEN_CLIENT_ID) {
    return reply.code(503).send({ error: 'OAuth not configured' });
  }

  try {
    const res = await fetch('https://chat.qwen.ai/api/v1/oauth2/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: QWEN_CLIENT_ID,
        scope: 'openid profile email model.completion',
        code_challenge,
        code_challenge_method,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`OAuth service error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    app.log.error('Device authorization error:', error);
    return reply.code(500).send({ error: 'OAuth service unavailable' });
  }
});

// Session management - Forward to backend
app.post('/api/sessions', async (request, reply) => {
  const token = request.cookies.auth_token;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const response = await forwardToBackend('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    return reply.code(response.status).send(data);
  } catch (error) {
    app.log.error('Session creation forwarding failed:', error);
    return reply.code(500).send({ error: 'Session service unavailable' });
  }
});

// Settings endpoint
app.get('/api/settings', async (request, reply) => {
  return {
    messageWindowSize: parseInt(process.env.MESSAGE_WINDOW_SIZE || '100'),
    sessionTokenLimit: parseInt(process.env.SESSION_TOKEN_LIMIT || '32000'),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  };
});

// Logout
app.post('/api/auth/logout', async (request, reply) => {
  reply.clearCookie('auth_token');
  return { success: true };
});

// WebSocket setup
const io = new SocketServer(app.server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupWebSocket(io);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await userSessionManager.cleanup();
    io.close();
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server running on ${HOST}:${PORT}`);
  app.log.info(`Environment: ${NODE_ENV}`);
  app.log.info(`Backend URL: ${BACKEND_URL}`);
} catch (err) {
  app.log.error('Failed to start server:', err);
  process.exit(1);
}
```

## Phase 3: Production Environment & Security (P1)

### 3.1 Production Environment Configuration

**File**: `/workdisk/hosting/my_qwen_code/qwen-team-work/.env.team` (Development)

```bash
# DEVELOPMENT ENVIRONMENT CONFIGURATION
NODE_ENV=development

# Service Ports (Development)
WEBUI_CLIENT_PORT=8003
WEBUI_SERVER_PORT=8002
SERVICE_BACKEND_PORT=8000
ACP_SERVER_PORT=8001

# Service URLs (Development)
BACKEND_URL=http://localhost:8000
BACKEND_TIMEOUT=30000

# Security Configuration (Development)
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGIN=http://localhost:8003

# Rate Limiting (Development - More Permissive)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# OAuth Configuration (Optional)
QWEN_CLIENT_ID=your-qwen-client-id
QWEN_CLIENT_SECRET=your-qwen-client-secret

# Logging (Development)
LOG_LEVEL=debug

# Session Configuration
SESSION_TOKEN_LIMIT=32000
MESSAGE_WINDOW_SIZE=100

# Database (Development)
MONGODB_URI=mongodb://localhost:27017/qwen-team-dev
NFS_BASE_PATH=./infrastructure/nfs-data

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_MODEL=gpt-3.5-turbo

# Embedding Configuration
EMBEDDING_BASE_URL=http://localhost:8080/v1
EMBEDDING_MODEL=text-embedding-ada-002
```

**File**: `.env.production`

```bash
# PRODUCTION ENVIRONMENT CONFIGURATION
NODE_ENV=production

# Service Ports (Production - Internal Docker Network)
WEBUI_CLIENT_PORT=8003
WEBUI_SERVER_PORT=8002
SERVICE_BACKEND_PORT=8000
ACP_SERVER_PORT=8001

# Service URLs (Internal Docker Network)
BACKEND_URL=http://team-backend:8000
BACKEND_TIMEOUT=30000
ACP_WEBSOCKET_URL=ws://team-core-agent:8001

# External URLs (Public)
BASE_URL=https://yourcompany.com
PUBLIC_API_URL=https://api.yourcompany.com
PUBLIC_WS_URL=wss://ws.yourcompany.com

# Security Configuration (REQUIRED IN PRODUCTION)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-change-this
CORS_ORIGIN=["https://yourcompany.com","https://app.yourcompany.com"]

# Database Configuration
MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/qwen-team?authSource=admin
MONGO_PASSWORD=your-secure-mongo-password-change-this

# NFS Configuration
NFS_BASE_PATH=/app/workspace

# Rate Limiting (Production - Restrictive)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# OAuth Configuration (Optional)
QWEN_CLIENT_ID=your-qwen-client-id
QWEN_CLIENT_SECRET=your-qwen-client-secret

# Logging (Production)
LOG_LEVEL=info

# Session Configuration
SESSION_TOKEN_LIMIT=32000
MESSAGE_WINDOW_SIZE=100

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Embedding Configuration
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-ada-002

# Sandbox Configuration (Production)
SANDBOX_ENABLED=true
SANDBOX_IMAGE=node:20-bookworm
SANDBOX_MEMORY=2g
SANDBOX_CPUS=2
SANDBOX_NETWORK=qwen-network
SANDBOX_IDLE_TIMEOUT=1800000
SANDBOX_CLEANUP_INTERVAL=300000

# SSL/TLS Configuration (if using HTTPS)
SSL_CERT_PATH=/etc/ssl/certs/yourcompany.crt
SSL_KEY_PATH=/etc/ssl/private/yourcompany.key

# Monitoring & Health Checks
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
```

**Important Notes**:
- `.env.production` should **never be committed** to version control
- Add `.env.production` to `.gitignore`
- Use secrets management systems in production (AWS Secrets Manager, HashiCorp Vault, etc.)
- Regularly rotate JWT_SECRET and database passwords

## Phase 4: Testing and Validation (P1)

### 4.1 Connection Tests

```bash
# Test 1: team-ui/client → team-ui/server
curl -I http://localhost:8002/api/auth/info

# Test 2: team-ui/server → team-backend  
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test"}'

# Test 3: team-backend → team-core-agent
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"test","sessionId":"test"}'
```

### 4.2 WebSocket Tests

```javascript
// Test Socket.IO connection from client
const socket = io('http://localhost:8002');
socket.on('connect', () => console.log('Connected to team-ui/server'));
socket.emit('chat:message', { message: 'test', sessionId: 'test' });
```

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Fix team-ui/client port configuration
- [ ] Fix Vite proxy settings
- [ ] Test basic connectivity

### Week 2: Architecture Changes
- [ ] Remove duplicate WebSocket connections
- [ ] Implement team-backend API integration
- [ ] Update authentication flow

### Week 3: Testing & Optimization
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements

## Success Criteria

✅ **team-ui/client connects to team-ui/server on port 8002**
✅ **team-ui/server communicates with team-backend via REST API**
✅ **Only team-backend connects to team-core-agent**
✅ **Streaming works end-to-end**
✅ **No duplicate session management**
✅ **No port conflicts**

## Risk Mitigation

### Backup Plan
If layered architecture proves complex, implement **Option 3: Direct UI Architecture**:
- Remove team-backend entirely
- Keep team-ui/server → team-core-agent connection
- Fix only the client-server connection issues

### Rollback Strategy
- Keep current code in separate branch
- Implement changes incrementally
- Test each phase before proceeding

## Conclusion

This fix plan addresses all critical issues identified in the analysis:
1. **Eliminates port conflicts** by proper port assignment
2. **Removes architectural bypass** by proper layering
3. **Eliminates resource competition** by single connection point
4. **Fixes protocol mismatches** by consistent Socket.IO usage
5. **Removes duplicate functionality** by centralized services

**Estimated effort**: 2-3 weeks for complete implementation
**Risk level**: Medium (requires coordination across multiple services)
**Impact**: High (restores full system functionality)

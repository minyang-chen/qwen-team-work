import './config.js';
import {
  uiServerLogger,
  fastifyErrorHandler
} from '@qwen-team/shared';
import {
  PORT,
  BASE_URL,
  JWT_SECRET,
  QWEN_CLIENT_ID,
  QWEN_CLIENT_SECRET,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  CORS_ORIGIN,
  MESSAGE_WINDOW_SIZE,
  SESSION_TOKEN_LIMIT,
  BACKEND_URL,
  ACP_WEBSOCKET_URL,
  NODE_ENV
} from './config.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { createAIService, getAIService } from './services/index.js';

// Configuration
const logger = uiServerLogger.child({ service: 'team-ui-server' });

logger.info('UI Server configuration loaded', {
  port: PORT,
  env: NODE_ENV,
  baseUrl: BASE_URL,
  corsOrigin: CORS_ORIGIN
});

// Initialize AI Service
const aiService = createAIService({
  apiKey: OPENAI_API_KEY || '',
  baseUrl: OPENAI_BASE_URL,
  model: OPENAI_MODEL,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxSessions: 1000,
});

logger.info('AI Service initialized', {
  model: OPENAI_MODEL,
  baseUrl: OPENAI_BASE_URL
});

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { Server as SocketServer } from 'socket.io';
import { UserSessionManager } from './session/UserSessionManager.js';
import { AgentConfigManager } from './discovery/AgentConfigManager.js';
import { setupWebSocket } from './websocket.js';
import { authenticateRequest } from './middleware/auth.js';
import { logRequestMiddleware, requestLogger } from './middleware/logging.js';
import { apiGateway } from './middleware/proxy.js';
import { registerRoutes } from './routes/index.js';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const app = Fastify({ 
  logger: {
    level: 'warn' // Only log warnings and errors, not info/debug
  }
});

console.log('🔥 INDEX.TS LOADED - TESTING COMPILATION');

// Initialize ACP components
const agentDiscovery = new AgentConfigManager();
await agentDiscovery.waitForInit();
const userSessionManager = new UserSessionManager(agentDiscovery);

// Middleware
await app.register(cors, {
  origin: NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://app.yourdomain.com'] 
    : CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
});
await app.register(cookie);

function verifyToken(token: string): {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: {
    type: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
} | null {
  try {
    const result = jwt.verify(token, JWT_SECRET!);
    if (typeof result === 'string') return null;
    return result as {
      userId: string;
      accessToken?: string;
      refreshToken?: string;
      credentials?: {
        type: string;
        apiKey?: string;
        baseUrl?: string;
        model?: string;
      };
    };
  } catch {
    return null;
  }
}

// Routes
app.post('/api/auth/oauth/qwen/device', async (request, reply) => {
  const { code_challenge, code_challenge_method } = request.body as {
    code_challenge: string;
    code_challenge_method: string;
  };

  try {
    const res = await fetch('https://chatqwenai/api/v1/oauth2/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: QWEN_CLIENT_ID!,
        scope: 'openid profile email modelcompletion',
        code_challenge,
        code_challenge_method,
      }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Device authorization error:', error);
    return reply
      .code(500)
      .send({ error: 'Failed to initiate device authorization' });
  }
});

app.post('/api/auth/oauth/qwen/token', async (request, reply) => {
  const { device_code, code_verifier } = request.body as {
    device_code: string;
    code_verifier: string;
  };

  try {
    const res = await fetch('https://chatqwenai/api/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: QWEN_CLIENT_ID!,
        device_code,
        code_verifier,
      }),
    });

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (data.access_token) {
      // Create session with OAuth token
      const userId = nanoid();
      const token = jwt.sign(
        {
          userId,
          credentials: {
            type: 'qwen-oauth',
            apiKey: data.access_token,
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            model: 'qwen-plus',
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          },
        },
        JWT_SECRET,
      );

      reply.setCookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return data;
  } catch (error) {
    console.error('Token exchange error:', error);
    return reply
      .code(500)
      .send({ error: 'Failed to exchange device code for token' });
  }
});

app.get('/api/auth/oauth/qwen', async (request, reply) => {
  const state = nanoid();
  const redirectUri = `${BASE_URL}/api/auth/oauth/callback`;
  const authUrl = `https://chat.qwen.ai/api/v1/oauth2/authorize?client_id=${QWEN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

  reply.setCookie('oauth_state', state, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return reply.redirect(authUrl);
});

app.get('/api/auth/oauth/callback', async (request, reply) => {
  const { code, state } = request.query as { code?: string; state?: string };
  const savedState = request.cookies['oauth_state'];

  if (!code || !state || state !== savedState) {
    return reply.code(400).send({ error: 'Invalid OAuth callback' });
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://chatqwenai/api/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: QWEN_CLIENT_ID,
        client_secret: QWEN_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/api/auth/oauth/callback`,
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');

    const { access_token, refresh_token } = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // Get user info
    const userRes = await fetch('https://api.qwen.ai/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) throw new Error('Failed to get user info');

    const user = (await userRes.json()) as { id: string };
    const userId = user.id;

    // Create session token
    const token = jwt.sign(
      { userId, accessToken: access_token, refreshToken: refresh_token },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    reply.clearCookie('oauth_state');

    return reply.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return reply.code(500).send({ error: 'OAuth authentication failed' });
  }
});

app.post('/api/auth/login', async (request, reply) => {
  try {
    // Proxy login request to team-storage
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body)
    });

    const data = await response.json();
    return reply.code(response.status).send(data);
  } catch (error) {
    logger.error('Login proxy failed', { error });
    return reply.code(500).send({ 
      error: { message: 'Login service unavailable' }
    });
  }
});

app.post('/api/auth/signup', async (request, reply) => {
  try {
    // Proxy signup request to team-storage
    const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body)
    });

    const data = await response.json();
    return reply.code(response.status).send(data);
  } catch (error) {
    logger.error('Signup proxy failed', { error });
    return reply.code(500).send({ 
      error: { message: 'Signup service unavailable' }
    });
  }
});

// TEST ROUTE - Remove after debugging
app.post('/api/test/signup', async (request, reply) => {
  console.log('🔥 TEST SIGNUP ROUTE HIT');
  return reply.code(200).send({ message: 'Test signup route works', body: request.body });
});

app.post('/api/auth/login/openai', async (request, reply) => {
  const { apiKey, baseUrl, model } = request.body as {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };

  if (!apiKey) {
    return reply.code(400).send({ error: 'API key is required' });
  }

  // Use hash of API key as userId for consistent workspace
  const crypto = await import('crypto');
  const userId = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
    .substring(0, 16);

  const credentials = {
    type: 'openai',
    apiKey,
    baseUrl: baseUrl || OPENAI_BASE_URL,
    model: model || OPENAI_MODEL,
  };

  const token = jwt.sign({ userId, credentials }, JWT_SECRET, {
    expiresIn: '7d',
  });

  console.log('OpenAI Login - Setting cookie with credentials:', {
    userId,
    type: credentials.type,
    baseUrl: credentials.baseUrl,
    model: credentials.model,
  });

  reply.setCookie('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return { userId, token };
});

// Config route moved to routes/system.ts to avoid duplicates

// Session stats route moved to routes/sessions.ts to avoid duplicates
// Settings route moved to routes/system.ts to avoid duplicates

app.get('/api/info', async () => {
  return {
    service: 'team-service',
    version: '0.3.0',
    status: 'running',
  };
});

app.get('/api/config', async () => {
  return {
    backendUrl: BACKEND_URL,
    acpWebsocketUrl: ACP_WEBSOCKET_URL,
  };
});

app.get('/api/auth/info', async (request, reply) => {
  const token = request.cookies['auth_token'];
  console.log(
    'Auth info - received cookie token (first 50 chars):',
    token?.substring(0, 50),
  );

  const user = token ? verifyToken(token) : null;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  console.log('Auth info - user object:', JSON.stringify(user, null, 2));

  const credentials = user.credentials as
    | { type: 'openai'; baseUrl?: string; model?: string }
    | undefined;

  const isQwenOAuth = !credentials || credentials.type !== 'openai';

  const result = {
    loginType: isQwenOAuth ? 'qwen-oauth' : 'openai',
    baseUrl: isQwenOAuth ? 'https://chat.qwen.ai/api/v1' : credentials?.baseUrl,
    model: isQwenOAuth ? null : credentials?.model,
  };

  console.log('Auth info - returning:', JSON.stringify(result, null, 2));

  return result;
});

app.post('/api/auth/logout', async (request, reply) => {
  console.log('Logout - clearing auth_token cookie');

  // Force expire the cookie by setting it to empty with past expiration
  reply.setCookie('auth_token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0), // Set to epoch time (Jan 1, 1970)
  });

  return { success: true };
});

// Session routes moved to routes/sessions.ts to support Bearer token authentication
// All session routes moved to routes/sessions.ts to avoid duplicates and support Bearer auth
// Health check moved to routes/system.ts to avoid duplicates

async function checkRedis() {
  try {
    // Redis is optional for team-ui server
    return { status: 'healthy', note: 'Redis not required for team-ui server' };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkBackend() {
  try {
    console.log('DEBUG: BACKEND_URL =', BACKEND_URL);
    if (!BACKEND_URL) {
      return { status: 'unhealthy', error: 'BACKEND_URL is not defined' };
    }
    const response = await fetch(`${BACKEND_URL}/health`, { timeout: 5000 } as any);
    return { status: response.ok ? 'healthy' : 'degraded', responseTime: Date.now() };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkCoreAgent() {
  try {
    console.log('DEBUG: ACP_WEBSOCKET_URL =', ACP_WEBSOCKET_URL);
    if (!ACP_WEBSOCKET_URL) {
      return { status: 'unhealthy', error: 'ACP_WEBSOCKET_URL is not defined' };
    }
    const healthUrl = ACP_WEBSOCKET_URL.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';
    const response = await fetch(healthUrl, { timeout: 5000 } as any);
    return { status: response.ok ? 'healthy' : 'degraded', responseTime: Date.now() };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Metrics endpoint moved to routes/system.ts to avoid duplicates

// Register routes that support Bearer token authentication BEFORE catch-all handler
console.log('📋 Registering routes...');
await registerRoutes(app, userSessionManager);
console.log('✅ Routes registered');

// API Gateway - Route all /api/* requests to backend (except existing routes)
app.addHook('preHandler', logRequestMiddleware);

const EXCLUDED_PATHS = [
  '/api/auth/oauth/qwen/device',
  '/api/auth/oauth/qwen/token', 
  '/api/auth/oauth/callback',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/info',
  '/api/config/',
  '/api/settings',
  '/api/sessions/',  // Fixed typo: was '/api/session.s/'
  '/metrics'
];

app.all('/api/*', async (request, reply) => {
  // Skip routes handled by this server
  const isExcluded = EXCLUDED_PATHS.some(path => 
    request.url.startsWith(path)
  );
  
  if (isExcluded) {
    // This route is handled by a specific handler, skip the catch-all
    return;
  }

  // Authenticate request for all other routes
  await authenticateRequest(request, reply);
  
  if (reply.sent) {
    return; // Authentication failed
  }

  // Proxy to backend
  await apiGateway.proxyRequest(request, reply);
});

// WebSocket
const io = new SocketServer(app.server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
});

console.log('🔌 Setting up WebSocket...');
setupWebSocket(io, userSessionManager);
console.log('✅ WebSocket setup complete');

// Cleanup old session.s every hour
setInterval(() => userSessionManager.cleanup(), 3600000);

// Start server
console.log('🚀 About to call app.listen()...');
try {
  console.log('🔌 Calling app.listen with port:', PORT);
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log('✅ app.listen() returned successfully');
  logger.info('UI Server started successfully', {
    port: PORT,
    host: '0.0.0.0'
  });
} catch (err) {
  console.error('❌ app.listen() threw error:', err);
  logger.error('Failed to start server', {}, err);
  process.exit(1);
}

// Graceful shutdown
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Increase timeout to 10 seconds for proper cleanup
  const forceExitTimer = setTimeout(() => {
    logger.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);
  
  // Shutdown all services properly
  Promise.all([
    // Close WebSocket server
    new Promise<void>((resolve) => {
      io.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    }),
    // Cleanup user sessions (ACP connections)
    userSessionManager.shutdown().catch((err) => {
      logger.error('UserSessionManager shutdown error', err);
    }),
    // Shutdown AI service
    aiService.shutdown(),
    // Close Fastify server
    app.close()
  ])
    .then(() => {
      clearTimeout(forceExitTimer);
      logger.info('Shutdown complete');
      process.exit(0);
    })
    .catch((error) => {
      clearTimeout(forceExitTimer);
      logger.error('Error during shutdown', error);
      process.exit(1);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));



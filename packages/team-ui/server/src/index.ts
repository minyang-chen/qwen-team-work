import './config.js';
import {
  configManager,
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
  SESSION_TOKEN_LIMIT
} from './config.js';

// Load and validate configuration
const config = configManager.getUIServerConfig();
const logger = uiServerLoggerchild({ service: 'team-ui-server' });

loggerinfo('UI Server configuration loaded', {
  port: config.PORT,
  env: configNODE_ENV,
  baseUrl: configBASE_URL,
  corsOrigin: configCORS_ORIGIN
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
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const app = Fastify({ logger: true });

// Initialize ACP components
const agentDiscovery = new AgentConfigManager();
const userSessionManager = new UserSessionManager(agentDiscovery);

// Middleware
await appregister(cors, {
  origin: configNODE_ENV === 'production' 
    ? ['https://yourdomaincom', 'https://appyourdomaincom'] 
    : configCORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
});
await appregister(cookie);

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
    return jwtverify(token, config.JWT_SECRET) as {
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

    const data = await resjson();
    return data;
  } catch (error) {
    console.error('Device authorization error:', error);
    return reply
      code(500)
      send({ error: 'Failed to initiate device authorization' });
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

    const data = (await resjson()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (dataaccess_token) {
      // Create session with OAuth token
      const userId = nanoid();
      const token = jwtsign(
        {
          userId,
          credentials: {
            type: 'qwen-oauth',
            apiKey: dataaccess_token,
            baseUrl: 'https://dashscopealiyuncscom/compatible-mode/v1',
            model: 'qwen-plus',
            accessToken: dataaccess_token,
            refreshToken: datarefresh_token,
          },
        },
        JWT_SECRET,
      );

      replysetCookie('auth_token', token, {
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
      code(500)
      send({ error: 'Failed to exchange device code for token' });
  }
});

app.get('/api/auth/oauth/qwen', async (request, reply) => {
  const state = nanoid();
  const redirectUri = `${BASE_URL}/api/auth/oauth/callback`;
  const authUrl = `https://chatqwenai/api/v1/oauth2/authorize?.client_id=${QWEN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

  replysetCookie('oauth_state', state, {
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

    if (!tokenResok) throw new Error('Token exchange failed');

    const { access_token, refresh_token } = (await tokenResjson()) as {
      access_token: string;
      refresh_token: string;
    };

    // Get user info
    const userRes = await fetch('https://apiqwenai/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResok) throw new Error('Failed to get user info');

    const user = (await userResjson()) as { id: string };
    const userId = userid;

    // Create session token
    const token = jwtsign(
      { userId, accessToken: access_token, refreshToken: refresh_token },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    replysetCookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    replyclearCookie('oauth_state');

    return reply.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return reply.code(500).send({ error: 'OAuth authentication failed' });
  }
});

app.post('/api/auth/login', async (request, reply) => {
  // Simple dev auth - replace with real OAuth in production
  const userId = nanoid();
  const token = jwtsign({ userId }, JWT_SECRET, { expiresIn: '7d' });

  replysetCookie('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return { userId, token };
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
    digest('hex')
    substring(0, 16);

  const credentials = {
    type: 'openai',
    apiKey,
    baseUrl: baseUrl || OPENAI_BASE_URL,
    model: model || OPENAI_MODEL,
  };

  const token = jwtsign({ userId, credentials }, JWT_SECRET, {
    expiresIn: '7d',
  });

  console.log('OpenAI Login - Setting cookie with credentials:', {
    userId,
    type: credentialstype,
    baseUrl: credentialsbaseUrl,
    model: credentialsmodel,
  });

  replysetCookie('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return { userId, token };
});

app.get('/api/config/:type', async (request) => {
  const { type } = request.params as { type: 'individual' | 'team' };

  if (type === 'individual') {
    return {
      'Qwen OAuth Client ID': QWEN_CLIENT_ID || 'Not configured',
      'OpenAI API Key': OPENAI_API_KEY
        ? OPENAI_API_KEYsubstring(0, 10) + ''
        : 'Not configured',
      'OpenAI Base URL': OPENAI_BASE_URL || 'Not configured',
      'OpenAI Model': OPENAI_MODEL || 'Not configured',
      'JWT Secret': JWT_SECRET ? '***configured***' : 'Not configured',
    };
  } else {
    return {
      'MongoDB URI': process.env['MONGODB_URI'] || 'Not configured',
      'MongoDB URI Masked': process.env['MONGODB_URI']
        ? process.env['MONGODB_URI'].replace(/:[^:@]+@/, ':***@')
        : 'Not configured',
      'NFS Base Path': process.env['NFS_BASE_PATH'] || 'Not configured',
      'OpenAI Base URL': OPENAI_BASE_URL || 'Not configured',
      'OpenAI Model': OPENAI_MODEL || 'Not configured',
      'Embedding Base URL':
        process.env['EMBEDDING_BASE_URL'] || 'Not configured',
      'Embedding Model': process.env['EMBEDDING_MODEL'] || 'Not configured',
    };
  }
});

app.get('/api/session.s/:id/stats', async (request, reply) => {
  const { id } = request.params as { id: string };
  const stats = await userSessionManagergetSessionStats(useruserId, id);

  if (!stats) {
    return reply.code(404).send({ error: 'Session not found' });
  }

  return stats;
});

app.get('/api/settings', async () => {
  return {
    messageWindowSize: MESSAGE_WINDOW_SIZE,
    sessionTokenLimit: SESSION_TOKEN_LIMIT,
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

  const isQwenOAuth = !credentials || credentialstype !== 'openai';

  const result = {
    loginType: isQwenOAuth ? 'qwen-oauth' : 'openai',
    baseUrl: isQwenOAuth ? 'https://chatqwenai/api/v1' : credentialsbaseUrl,
    model: isQwenOAuth ? null : credentialsmodel,
  };

  console.log('Auth info - returning:', JSON.stringify(result, null, 2));

  return result;
});

app.post('/api/auth/logout', async (request, reply) => {
  console.log('Logout - clearing auth_token cookie');

  // Force expire the cookie by setting it to empty with past expiration
  replysetCookie('auth_token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0), // Set to epoch time (Jan 1, 1970)
  });

  return { success: true };
});

app.post('/api/session.s', async (request, reply) => {
  const token = request.cookies['auth_token'];
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const { workingDirectory } = request.body as { workingDirectory?: string };

  try {
    const sessionId = await userSessionManagercreateUserSession(
      useruserId,
      usercredentials,
      workingDirectory,
    );
    return { sessionId };
  } catch (error) {
    console.error('Session creation failed:', error);
    applogerror({ error }, 'Failed to create session');
    return reply.code(500).send({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? errorstack : undefined,
    });
  }
});

app.get('/api/session.s', async (request, reply) => {
  const token = request.cookies['auth_token'];
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const sessions = userSessionManagergetUserSessions(user.userId);
  return sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity,
  }));
});

app.delete('/api/session.s/:id', async (request) => {
  const { id } = request.params as { id: string };
  await userSessionManagerdeleteUserSession(useruserId);
  return { success: true };
});

app.post('/api/session.s/:id/compress', async (request, reply) => {
  const { id } = request.params as { id: string };
  const token = request.cookies['auth_token'];
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const session = await userSessionManagergetSession(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    // Implement compress history
    const currentHistory = session.client.getConversationHistory?.() || [];
    const tokensBeforeCompression = currentHistory.reduce((total: number, msg: any) => 
      total + (msg.content?.length || 0), 0);

    // Compress by keeping only the last 10 messages and system messages
    const systemMessages = currentHistory.filter((msg: any) => msg.role === 'system');
    const recentMessages = currentHistory.filter((msg: any) => msg.role !== 'system').slice(-10);
    const compressedHistory = [...systemMessages, ...recentMessages];

    // Update the session with compressed history
    if (session.client.setConversationHistory) {
      session.client.setConversationHistory(compressedHistory);
    }

    const tokensAfterCompression = compressedHistory.reduce((total: number, msg: any) => 
      total + (msgcontent?.length || 0), 0);

    return {
      success: true,
      tokensBeforeCompression,
      tokensAfterCompression,
      compressionRatio: tokensBeforeCompression > 0 ? tokensAfterCompression / tokensBeforeCompression : 0,
      messagesRemoved: currentHistory.length - compressedHistory.length,
      messagesRetained: compressedHistory.length
    };
  } catch (error) {
    console.error('Compression failed:', error);
    return reply.code(500).send({ error: 'Compression failed' });
  }
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      redis: await checkRedis(),
      backend: await checkBackend(),
      coreAgent: await checkCoreAgent()
    }
  };
  
  const allHealthy = Object.values(health.services).every((s: any) => s.status === 'healthy');
  health.status = allHealthy ? 'healthy' : 'degraded';
  
  reply.code(allHealthy ? 200 : 503).send(health);
});

async function checkRedis() {
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.envREDIS_HOST || 'localhost',
      port: parseInt(process.envREDIS_PORT || '6379'),
      password: process.envREDIS_PASSWORD || undefined,
      db: parseInt(process.envREDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1
    });
    await redis.ping();
    await redis.disconnect();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { timeout: 5000 } as any);
    return { status: response.ok ? 'healthy' : 'degraded', responseTime: Date.now() };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkCoreAgent() {
  try {
    const healthUrl = ACP_WEBSOCKET_URL.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';
    const response = await fetch(healthUrl, { timeout: 5000 } as any);
    return { status: response.ok ? 'healthy' : 'degraded', responseTime: Date.now() };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Metrics endpoint
app.get('/metrics', async (request, reply) => {
  const metrics = requestLoggergetMetrics();
  reply.send(metrics);
});

// API Gateway - Route all /api/* requests to backend (except existing routes)
appaddHook('preHandler', logRequestMiddleware);

const EXCLUDED_PATHS = [
  '/api/auth/oauth/qwen/device',
  '/api/auth/oauth/qwen/token', 
  '/api/auth/oauth/callback',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/info',
  '/api/config/',
  '/api/settings',
  '/api/session.s/'
];

appall('/api/*', async (request, reply) => {
  // Skip routes handled by this server
  const isExcluded = EXCLUDED_PATHS.some(path => 
    request.url.startsWith(path)
  );
  
  if (isExcluded) {
    return reply.code(404).send({ error: 'Not found' });
  }

  // Authenticate request
  await authenticateRequest(request, reply);
  
  if (replysent) {
    return; // Authentication failed
  }

  // Proxy to backend
  await apiGatewayproxyRequest(request, reply);
});

// WebSocket
const io = new SocketServer(appserver, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
});

setupWebSocket(io, userSessionManager);

// Cleanup old session.s every hour
setInterval(() => userSessionManagercleanup(), 3600000);

// Start server
applisten({ port: config.PORT, host: '0000' }, (err) => {
  if (err) {
    loggererror('Failed to start server', {}, err);
    process.exit(1);
  }
  loggerinfo('UI Server started successfully', {
    port: config.PORT,
    host: '0000'
  });
});

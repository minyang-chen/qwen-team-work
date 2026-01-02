import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_SECRET, BACKEND_URL } from '../config.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  // OAuth Device Flow - Initiate
  app.post('/api/auth/oauth/qwen/device', async (request, reply) => {
    // Device flow implementation
    return reply.status(501).send({ error: 'Not implemented' });
  });

  // OAuth Device Flow - Poll for token
  app.post('/api/auth/oauth/qwen/token', async (request, reply) => {
    return reply.status(501).send({ error: 'Not implemented' });
  });

  // OAuth Authorization Code Flow
  app.get('/api/auth/oauth/qwen', async (request, reply) => {
    return reply.status(501).send({ error: 'Not implemented' });
  });

  app.get('/api/auth/oauth/callback', async (request, reply) => {
    return reply.status(501).send({ error: 'Not implemented' });
  });

  // Traditional login - proxy to team-storage
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });
      const data = await response.json();
      return reply.status(response.status).send(data);
    } catch (error) {
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Signup - proxy to team-storage
  app.post('/api/auth/signup', async (request, reply) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });
      const data = await response.json();
      return reply.status(response.status).send(data);
    } catch (error) {
      return reply.status(500).send({ error: 'Signup failed' });
    }
  });

  // OpenAI-compatible login
  app.post('/api/auth/login/openai', async (request, reply) => {
    const { apiKey, baseUrl, model } = request.body as any;

    if (!apiKey) {
      return reply.status(400).send({ error: 'API key required' });
    }

    const token = jwt.sign(
      {
        userId: 'openai-user',
        credentials: { type: 'openai', apiKey, baseUrl, model }
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return { success: true, token };
  });

  // Auth info
  app.get('/api/auth/info', async (request, reply) => {
    const token = (request.cookies as any)['auth_token'];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        authenticated: true,
        userId: decoded.userId,
        credentials: decoded.credentials
      };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Logout
  app.post('/api/auth/logout', async (request, reply) => {
    reply.setCookie('auth_token', '', {
      httpOnly: true,
      expires: new Date(0)
    });
    return { success: true };
  });
}

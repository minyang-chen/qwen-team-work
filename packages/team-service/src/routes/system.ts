import type { FastifyInstance } from 'fastify';
import { MESSAGE_WINDOW_SIZE, SESSION_TOKEN_LIMIT } from '../config.js';

export async function registerSystemRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'team-ui-server'
    };
  });

  // Metrics
  app.get('/metrics', async (request, reply) => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    };
  });

  // Config endpoint
  app.get('/api/config/:type', async (request) => {
    const { type } = request.params as { type: string };
    
    if (type === 'ui') {
      return {
        messageWindowSize: MESSAGE_WINDOW_SIZE,
        sessionTokenLimit: SESSION_TOKEN_LIMIT
      };
    }

    return { error: 'Unknown config type' };
  });

  // Settings
  app.get('/api/settings', async () => {
    return {
      sessionTokenLimit: SESSION_TOKEN_LIMIT,
      messageWindowSize: MESSAGE_WINDOW_SIZE
    };
  });
}

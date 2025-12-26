import type { FastifyInstance } from 'fastify';
import { configManager } from '@qwen-team/shared';

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
        messageWindowSize: configManager.get('MESSAGE_WINDOW_SIZE'),
        sessionTokenLimit: configManager.get('SESSION_TOKEN_LIMIT')
      };
    }

    return { error: 'Unknown config type' };
  });

  // Settings
  app.get('/api/settings', async () => {
    return {
      sessionTokenLimit: configManager.get('SESSION_TOKEN_LIMIT'),
      messageWindowSize: configManager.get('MESSAGE_WINDOW_SIZE')
    };
  });
}

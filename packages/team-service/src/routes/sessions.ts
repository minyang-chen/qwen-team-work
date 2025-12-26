import type { FastifyInstance } from 'fastify';
import type { UserSessionManager } from '../session/UserSessionManager.js';

export async function registerSessionRoutes(
  app: FastifyInstance,
  sessionManager: UserSessionManager
) {
  // Create session
  app.post('/api/sessions', async (request, reply) => {
    const token = (request.cookies as any)['auth_token'];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const sessionId = await sessionManager.createSession('user-id', undefined);
      return { sessionId };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to create session' });
    }
  });

  // List sessions
  app.get('/api/sessions', async (request, reply) => {
    const token = (request.cookies as any)['auth_token'];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    return { sessions: [] };
  });

  // Get session stats
  app.get('/api/sessions/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stats = sessionManager.getSessionStats(id, 'user-id');
    
    if (!stats) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return stats;
  });

  // Delete session
  app.delete('/api/sessions/:id', async (request) => {
    const { id } = request.params as { id: string };
    await sessionManager.deleteSession(id);
    return { success: true };
  });

  // Compress session history
  app.post('/api/sessions/:id/compress', async (request, reply) => {
    return { success: true, message: 'Compression not implemented' };
  });
}

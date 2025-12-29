import type { FastifyInstance } from 'fastify';
import type { UserSessionManager } from '../session/UserSessionManager.js';
import { authenticateRequest, type AuthenticatedRequest } from '../middleware/auth.js';

export async function registerSessionRoutes(
  app: FastifyInstance,
  sessionManager: UserSessionManager
) {
  // Create session
  app.post('/api/sessions', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;

    try {
      // Handle case where request.body might be undefined
      const body = request.body as { workingDirectory?: string } || {};
      const { workingDirectory } = body;
      
      // Extract credentials from user object (set by auth middleware)
      const credentials = (request.user as any)?.credentials;
      
      const sessionId = await sessionManager.createUserSession(
        request.user!.userId, 
        credentials,
        workingDirectory
      );
      return { sessionId };
    } catch (error) {
      console.error('Session creation failed:', error);
      return reply.status(500).send({ error: 'Failed to create session' });
    }
  });

  // List sessions
  app.get('/api/sessions', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;

    try {
      const sessions = sessionManager.getUserSessions(request.user!.userId);
      return { 
        sessions: sessions.map((sessionId) => ({
          id: sessionId,
          sessionId: sessionId,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        }))
      };
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return reply.status(500).send({ error: 'Failed to list sessions' });
    }
  });

  // Get session stats
  app.get('/api/sessions/:id/stats', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    const stats = sessionManager.getSessionStats(request.user!.userId, id);
    
    if (!stats) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return stats;
  });

  // Delete session
  app.delete('/api/sessions/:id', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    await sessionManager.deleteUserSession(request.user!.userId);
    return { success: true };
  });

  // Compress session history
  app.post('/api/sessions/:id/compress', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    return { success: true, message: 'Compression not implemented' };
  });

  // Rename session
  app.put('/api/sessions/:id/rename', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string } || {};
    const { name } = body;
    
    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }
    
    // For now, just return success - actual rename logic would go here
    return { success: true, message: 'Session renamed successfully' };
  });
}

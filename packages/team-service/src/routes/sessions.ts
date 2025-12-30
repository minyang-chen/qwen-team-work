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
      const { workingDirectory = '/workspace' } = body; // Default to user workspace
      
      console.log(`[SessionRoute] Creating session with workingDirectory: ${workingDirectory}`);
      
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

  // Get conversation history
  app.get('/api/sessions/:id/history', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    
    try {
      // Get history via ACP protocol
      const acpClient = sessionManager.getUserSession(request.user!.userId);
      if (acpClient) {
        const history = await acpClient.request('session.getHistory', { sessionId: id });
        return { history: history || [] };
      }
      return { history: [] };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get conversation history' });
    }
  });

  // Clear conversation history
  app.delete('/api/sessions/:id/history', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    
    try {
      const acpClient = sessionManager.getUserSession(request.user!.userId);
      if (acpClient) {
        await acpClient.request('session.clearHistory', { sessionId: id });
        return { success: true, message: 'Conversation history cleared' };
      }
      return reply.status(404).send({ error: 'Session not found' });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to clear conversation history' });
    }
  });

  // Compress conversation history
  app.post('/api/sessions/:id/compress', async (request: AuthenticatedRequest, reply) => {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    
    const { id } = request.params as { id: string };
    
    try {
      const acpClient = sessionManager.getUserSession(request.user!.userId);
      if (acpClient) {
        const result = await acpClient.request('session.compressHistory', { sessionId: id });
        return { 
          success: true, 
          message: 'Conversation history compressed',
          ...result
        };
      }
      return reply.status(404).send({ error: 'Session not found' });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to compress conversation history' });
    }
  });
}

import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.js';
import { registerSessionRoutes } from './sessions.js';
import { registerSystemRoutes } from './system.js';
import type { UserSessionManager } from '../session/UserSessionManager.js';

export async function registerRoutes(
  app: FastifyInstance,
  sessionManager: UserSessionManager
) {
  await registerAuthRoutes(app);
  await registerSessionRoutes(app, sessionManager);
  await registerSystemRoutes(app);
}

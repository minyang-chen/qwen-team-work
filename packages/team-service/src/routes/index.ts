import type { FastifyInstance } from 'fastify';
import { registerSessionRoutes } from './sessions.js';
import { registerSystemRoutes } from './system.js';
import type { UserSessionManager } from '../session/UserSessionManager.js';

export async function registerRoutes(
  app: FastifyInstance,
  sessionManager: UserSessionManager
) {
  // Auth routes are already defined in index.ts, skip to avoid duplicates
  await registerSessionRoutes(app, sessionManager);
  await registerSystemRoutes(app);
}

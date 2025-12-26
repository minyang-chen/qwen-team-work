import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    username?: string;
    exp?: number;
  };
}

export async function authenticateRequest(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract JWT token from Authorization header or cookie
    let token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token && request.cookies?.['token']) {
      token = request.cookies['token'];
    }
    
    if (!token) {
      reply.code(401).send({ 
        error: 'Authentication required',
        code: 'MISSING_TOKEN' 
      });
      return;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      request.user = {
        userId: decoded.userId || decoded.id,
        username: decoded.username,
        exp: decoded.exp
      };
    } catch (jwtError) {
      reply.code(401).send({ 
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN' 
      });
      return;
    }
  } catch (error) {
    reply.code(500).send({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR' 
    });
  }
}

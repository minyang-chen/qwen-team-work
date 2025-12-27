// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sessionService } from '../services/sessionService.js';
import { userService } from '../services/userService.js';
import { teamService } from '../services/teamService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'team-secret-key-change-in-production';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
      teamId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({
          error: { code: 'NO_TOKEN', message: 'Authentication required' },
        });
    }

    const token = authHeader.substring(7);
    
    // Decode JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    } catch (err) {
      return res
        .status(401)
        .json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
        });
    }

    const user = await userService.findById(decoded.userId);

    if (!user) {
      return res
        .status(401)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    req.user = {
      id: user._id?.toString() || user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res
      .status(401)
      .json({
        error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
      });
  }
};

export const requireTeamAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const activeTeamId = await sessionService.getActiveTeam(token);

    if (!activeTeamId) {
      return res.status(403).json({
        error: 'No team selected',
        redirectTo: '/team/select',
      });
    }

    const isMember = await teamService.isMember(activeTeamId, req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    req.teamId = activeTeamId;
    next();
  } catch (error) {
    console.error('Team access middleware error:', error);
    res.status(500).json({ error: 'Team access validation failed' });
  }
};

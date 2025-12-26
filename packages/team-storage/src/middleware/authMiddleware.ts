// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService.js';
import { userService } from '../services/userService.js';
import { teamService } from '../services/teamService.js';

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
    const userId = await sessionService.validateSession(token);

    if (!userId) {
      return res
        .status(401)
        .json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
        });
    }

    const user = await userService.findById(userId);

    if (!user) {
      return res
        .status(401)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    req.user = {
      id: user.id,
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

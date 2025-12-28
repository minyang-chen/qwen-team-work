import { Request, Response } from "express";
import { Team } from '../models/UnifiedModels.js';

export const listTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id; // Fixed: use .id not .userId
    
    // Get all active teams
    const allTeams = await Team.find({ isActive: true }).select('_id name specialization description members ownerId').lean();
    
    // Split into myTeams and availableTeams based on membership
    const myTeams = allTeams
      .filter(t => userId && t.members?.some((m: any) => m.userId.toString() === userId))
      .map(t => {
        const isOwner = t.ownerId?.toString() === userId;
        const member = t.members?.find((m: any) => m.userId.toString() === userId);
        return {
          id: t._id,
          name: t.name,
          specialization: t.specialization,
          description: t.description,
          role: isOwner ? 'Owner' : (member as any)?.role || 'Member',
          memberCount: t.members?.length || 0
        };
      });
    
    const availableTeams = allTeams
      .filter(t => !userId || !t.members?.some((m: any) => m.userId.toString() === userId))
      .map(t => ({
        id: t._id,
        name: t.name,
        specialization: t.specialization,
        description: t.description,
        memberCount: t.members?.length || 0
      }));
    
    res.json({ myTeams, availableTeams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list teams' });
  }
};

export const selectTeam = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const getActiveTeam = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };

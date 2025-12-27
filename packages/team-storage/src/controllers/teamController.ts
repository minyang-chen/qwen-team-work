import { Request, Response } from "express";
import { Team } from '../models/UnifiedModels.js';

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, specialization, description } = req.body;
    
    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const team = await Team.create({
      name,
      specialization,
      description,
      ownerId: req.user.id,
      nfsWorkspacePath: `/workspace/teams/${name}`,
      members: [{ userId: req.user.id, role: 'owner', status: 'active', joinedAt: new Date() }]
    });
    res.status(201).json({ team_id: team._id.toString(), name: team.name });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const getUserTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await Team.find({ 'members.userId': req.user?.id });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get teams' });
  }
};

export const getTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    res.json(team.members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
};

export const joinTeam = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const teamSignin = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const searchTeams = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const deleteTeam = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const updateTeam = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const addTeamMember = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const removeTeamMember = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const updateMemberStatus = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };

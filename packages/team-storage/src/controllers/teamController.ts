import { Request, Response } from "express";
import { Team } from '../models/UnifiedModels.js';

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { team_name, specialization, description } = req.body;
    const name = team_name;
    
    console.log('[DEBUG] Create team request:', { team_name, specialization, description, userId: req.user?.id });
    
    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const teamData = {
      name,
      specialization,
      description,
      ownerId: req.user.id,
      nfsWorkspacePath: `/workspace/teams/${name}`,
      members: [{ userId: req.user.id, role: 'owner', status: 'active', joinedAt: new Date() }]
    };
    
    console.log('[DEBUG] Creating team with data:', teamData);
    
    const team = await Team.create(teamData);
    
    console.log('[DEBUG] Team created successfully:', { id: team._id, name: team.name });
    
    res.status(201).json({ team_id: team._id.toString(), name: team.name });
  } catch (error: any) {
    console.error('[ERROR] Create team error:', error);
    
    // Handle duplicate team name
    if (error.code === 11000) {
      res.status(409).json({ error: 'Team name already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const getUserTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await Team.find({ 'members.userId': req.user?.id });
    res.json({ teams });
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

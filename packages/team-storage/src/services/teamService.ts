// @ts-nocheck
import { v4 as uuidv4 } from 'uuid';
import { Team } from '../models/UnifiedModels.js';
import mongoose from 'mongoose';

export const teamService = {
  async createTeam(teamData: { team_name: string; specialization?: string; description?: string; created_by: string }) {
    const team = new Team({
      name: teamData.team_name,
      ownerId: new mongoose.Types.ObjectId(teamData.created_by),
      members: [{ 
        userId: new mongoose.Types.ObjectId(teamData.created_by), 
        role: 'owner', 
        status: 'active',
        joinedAt: new Date() 
      }],
      nfsWorkspacePath: `/teams/${teamData.team_name.toLowerCase().replace(/\s+/g, '-')}`,
      specialization: teamData.specialization,
      description: teamData.description,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await team.save();
    return team;
  },

  async findByName(name: string) {
    return await Team.findOne({ name });
  },

  async findById(teamId: string) {
    return await Team.findById(teamId).populate('members.userId');
  },

  async getTeam(teamId: string) {
    return await this.findById(teamId);
  },

  async getUserTeams(userId: string) {
    return await Team.find({ 'members.userId': new mongoose.Types.ObjectId(userId) });
  },

  async getAllTeams() {
    return await Team.find();
  },

  async searchTeams(query: string) {
    return await Team.find({ name: { $regex: query, $options: 'i' } });
  },

  async isMember(teamId: string, userId: string) {
    const team = await Team.findById(teamId);
    if (!team) return false;
    return team.members.some(m => m.userId.toString() === userId);
  },

  async isAdmin(teamId: string, userId: string) {
    const team = await Team.findById(teamId);
    if (!team) return false;
    const member = team.members.find(m => m.userId.toString() === userId);
    return member && (member.role === 'owner' || member.role === 'admin');
  },

  async addMember(teamId: string, userId: string, role: string = 'member') {
    return await this.addTeamMember(teamId, userId, role);
  },

  async addMemberByEmail(teamId: string, email: string, role: string = 'member') {
    const { userService } = await import('./userService.js');
    const user = await userService.getUserByEmail(email);
    if (!user) throw new Error('User not found');
    return await this.addTeamMember(teamId, user._id.toString(), role);
  },

  async addTeamMember(teamId: string, userId: string, role: string = 'member') {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    
    // Check if user is already a member
    const existingMember = team.members.find(m => m.userId.toString() === userId);
    if (existingMember) throw new Error('User is already a team member');
    
    team.members.push({ 
      userId: new mongoose.Types.ObjectId(userId), 
      role, 
      status: 'active',
      joinedAt: new Date() 
    });
    team.updatedAt = new Date();
    
    await team.save();
    return team;
  },

  async removeMember(teamId: string, userId: string) {
    return await this.removeTeamMember(teamId, userId);
  },

  async removeTeamMember(teamId: string, userId: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    
    team.members = team.members.filter(m => m.userId.toString() !== userId);
    team.updatedAt = new Date();
    
    await team.save();
    return team;
  },

  async updateMemberStatus(teamId: string, userId: string, role: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    
    const member = team.members.find(m => m.userId.toString() === userId);
    if (!member) throw new Error('User is not a team member');
    
    member.role = role;
    team.updatedAt = new Date();
    
    await team.save();
    return team;
  },

  async updateTeam(teamId: string, updates: any) {
    const team = await Team.findByIdAndUpdate(
      teamId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return team;
  },

  async getTeamMembers(teamId: string) {
    const team = await Team.findById(teamId).populate('members.userId');
    return team ? team.members : [];
  },

  async deleteTeam(teamId: string) {
    await Team.findByIdAndDelete(teamId);
    return true;
  }
};

export interface TeamMember {
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
  lastActivity: number;
  isOnline: boolean;
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
  description?: string;
  files: string[];
  sharedMemory: Record<string, any>;
  toolApprovals: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface TeamContextData {
  teamId: string;
  teamName: string;
  description?: string;
  members: TeamMember[];
  projects: ProjectContext[];
  sharedSettings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export class TeamContextService {
  private teamContexts = new Map<string, TeamContextData>();
  private memberSessions = new Map<string, Set<string>>(); // userId -> sessionIds

  async getTeamContext(teamId: string): Promise<TeamContextData | null> {
    return this.teamContexts.get(teamId) || null;
  }

  async createTeamContext(
    teamId: string, 
    teamName: string, 
    ownerId: string
  ): Promise<TeamContextData> {
    const teamContext: TeamContextData = {
      teamId,
      teamName,
      members: [{
        userId: ownerId,
        username: `User ${ownerId}`,
        role: 'owner',
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true
      }],
      projects: [],
      sharedSettings: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.teamContexts.set(teamId, teamContext);
    console.log(`[TeamContextService] Created team context for ${teamId}`);
    
    return teamContext;
  }

  async addTeamMember(
    teamId: string, 
    userId: string, 
    username: string, 
    role: TeamMember['role'] = 'member'
  ): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    // Check if member already exists
    const existingMember = teamContext.members.find(m => m.userId === userId);
    if (existingMember) {
      existingMember.role = role;
      existingMember.lastActivity = Date.now();
      existingMember.isOnline = true;
    } else {
      teamContext.members.push({
        userId,
        username,
        role,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true
      });
    }

    teamContext.updatedAt = Date.now();
    console.log(`[TeamContextService] Added member ${userId} to team ${teamId}`);
    
    return true;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const memberIndex = teamContext.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) return false;

    teamContext.members.splice(memberIndex, 1);
    teamContext.updatedAt = Date.now();
    
    console.log(`[TeamContextService] Removed member ${userId} from team ${teamId}`);
    return true;
  }

  async updateMemberActivity(teamId: string, userId: string): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const member = teamContext.members.find(m => m.userId === userId);
    if (!member) return false;

    member.lastActivity = Date.now();
    member.isOnline = true;
    
    return true;
  }

  async setMemberOffline(teamId: string, userId: string): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const member = teamContext.members.find(m => m.userId === userId);
    if (!member) return false;

    member.isOnline = false;
    
    return true;
  }

  async addProject(
    teamId: string, 
    projectId: string, 
    projectName: string, 
    description?: string
  ): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const project: ProjectContext = {
      projectId,
      projectName,
      description,
      files: [],
      sharedMemory: {},
      toolApprovals: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    teamContext.projects.push(project);
    teamContext.updatedAt = Date.now();
    
    console.log(`[TeamContextService] Added project ${projectId} to team ${teamId}`);
    return true;
  }

  async updateProjectFiles(
    teamId: string, 
    projectId: string, 
    files: string[]
  ): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const project = teamContext.projects.find(p => p.projectId === projectId);
    if (!project) return false;

    project.files = files;
    project.updatedAt = Date.now();
    teamContext.updatedAt = Date.now();
    
    return true;
  }

  async updateSharedMemory(
    teamId: string, 
    projectId: string, 
    memory: Record<string, any>
  ): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const project = teamContext.projects.find(p => p.projectId === projectId);
    if (!project) return false;

    project.sharedMemory = { ...project.sharedMemory, ...memory };
    project.updatedAt = Date.now();
    teamContext.updatedAt = Date.now();
    
    return true;
  }

  async updateToolApprovals(
    teamId: string, 
    projectId: string, 
    approvals: Record<string, boolean>
  ): Promise<boolean> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return false;

    const project = teamContext.projects.find(p => p.projectId === projectId);
    if (!project) return false;

    project.toolApprovals = { ...project.toolApprovals, ...approvals };
    project.updatedAt = Date.now();
    teamContext.updatedAt = Date.now();
    
    return true;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const teamContext = this.teamContexts.get(teamId);
    return teamContext?.members || [];
  }

  async getOnlineMembers(teamId: string): Promise<TeamMember[]> {
    const teamContext = this.teamContexts.get(teamId);
    return teamContext?.members.filter(m => m.isOnline) || [];
  }

  async getProjectContext(teamId: string, projectId: string): Promise<ProjectContext | null> {
    const teamContext = this.teamContexts.get(teamId);
    if (!teamContext) return null;

    return teamContext.projects.find(p => p.projectId === projectId) || null;
  }

  async getAllTeams(): Promise<TeamContextData[]> {
    return Array.from(this.teamContexts.values());
  }

  async getTeamsByUser(userId: string): Promise<TeamContextData[]> {
    return Array.from(this.teamContexts.values()).filter(team =>
      team.members.some(member => member.userId === userId)
    );
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const deleted = this.teamContexts.delete(teamId);
    if (deleted) {
      console.log(`[TeamContextService] Deleted team ${teamId}`);
    }
    return deleted;
  }

  getActiveTeamCount(): number {
    return this.teamContexts.size;
  }

  getTotalMemberCount(): number {
    let total = 0;
    for (const team of this.teamContexts.values()) {
      total += team.members.length;
    }
    return total;
  }
}

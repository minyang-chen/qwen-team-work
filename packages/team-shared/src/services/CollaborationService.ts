import { TeamContextService, TeamMember } from './TeamContextService.js';
import { SessionService } from './SessionService.js';

export interface CollaborationEvent {
  type: 'cursor_update' | 'file_edit' | 'tool_execution' | 'message' | 'user_join' | 'user_leave';
  userId: string;
  teamId: string;
  projectId?: string;
  data: any;
  timestamp: number;
}

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

export interface FileEdit {
  file: string;
  changes: Array<{
    type: 'insert' | 'delete' | 'replace';
    position: { line: number; column: number };
    content: string;
    length?: number;
  }>;
}

export class CollaborationService {
  private eventListeners = new Map<string, Set<(event: CollaborationEvent) => void>>();
  private userCursors = new Map<string, CursorPosition>(); // userId -> cursor
  private activeEdits = new Map<string, FileEdit[]>(); // userId -> edits

  constructor(
    private teamContextService: TeamContextService,
    private sessionService: SessionService
  ) {}

  // Event subscription
  subscribe(teamId: string, callback: (event: CollaborationEvent) => void): () => void {
    if (!this.eventListeners.has(teamId)) {
      this.eventListeners.set(teamId, new Set());
    }
    
    this.eventListeners.get(teamId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(teamId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(teamId);
        }
      }
    };
  }

  // Emit events to team members
  private emit(event: CollaborationEvent): void {
    const listeners = this.eventListeners.get(event.teamId);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('[CollaborationService] Event callback error:', error);
        }
      }
    }
  }

  // User joins team collaboration
  async joinTeam(userId: string, teamId: string, projectId?: string): Promise<void> {
    await this.teamContextService.updateMemberActivity(teamId, userId);
    
    const event: CollaborationEvent = {
      type: 'user_join',
      userId,
      teamId,
      projectId,
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    };
    
    this.emit(event);
    console.log(`[CollaborationService] User ${userId} joined team ${teamId}`);
  }

  // User leaves team collaboration
  async leaveTeam(userId: string, teamId: string, projectId?: string): Promise<void> {
    await this.teamContextService.setMemberOffline(teamId, userId);
    
    // Clean up user data
    this.userCursors.delete(userId);
    this.activeEdits.delete(userId);
    
    const event: CollaborationEvent = {
      type: 'user_leave',
      userId,
      teamId,
      projectId,
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    };
    
    this.emit(event);
    console.log(`[CollaborationService] User ${userId} left team ${teamId}`);
  }

  // Update cursor position
  async updateCursor(
    userId: string, 
    teamId: string, 
    cursor: CursorPosition,
    projectId?: string
  ): Promise<void> {
    this.userCursors.set(userId, cursor);
    
    const event: CollaborationEvent = {
      type: 'cursor_update',
      userId,
      teamId,
      projectId,
      data: { cursor },
      timestamp: Date.now()
    };
    
    this.emit(event);
  }

  // Handle file edits
  async handleFileEdit(
    userId: string, 
    teamId: string, 
    edit: FileEdit,
    projectId?: string
  ): Promise<void> {
    // Store edit for conflict resolution
    if (!this.activeEdits.has(userId)) {
      this.activeEdits.set(userId, []);
    }
    this.activeEdits.get(userId)!.push(edit);
    
    const event: CollaborationEvent = {
      type: 'file_edit',
      userId,
      teamId,
      projectId,
      data: { edit },
      timestamp: Date.now()
    };
    
    this.emit(event);
    
    // Update project files if projectId provided
    if (projectId) {
      const projectContext = await this.teamContextService.getProjectContext(teamId, projectId);
      if (projectContext && !projectContext.files.includes(edit.file)) {
        const updatedFiles = [...projectContext.files, edit.file];
        await this.teamContextService.updateProjectFiles(teamId, projectId, updatedFiles);
      }
    }
  }

  // Handle tool execution
  async handleToolExecution(
    userId: string, 
    teamId: string, 
    toolName: string, 
    status: 'started' | 'completed' | 'failed',
    result?: any,
    projectId?: string
  ): Promise<void> {
    const event: CollaborationEvent = {
      type: 'tool_execution',
      userId,
      teamId,
      projectId,
      data: { toolName, status, result },
      timestamp: Date.now()
    };
    
    this.emit(event);
    
    // Update tool approvals if needed
    if (projectId && status === 'completed') {
      await this.teamContextService.updateToolApprovals(teamId, projectId, {
        [toolName]: true
      });
    }
  }

  // Send message to team
  async sendMessage(
    userId: string, 
    teamId: string, 
    message: string,
    projectId?: string
  ): Promise<void> {
    const event: CollaborationEvent = {
      type: 'message',
      userId,
      teamId,
      projectId,
      data: { message },
      timestamp: Date.now()
    };
    
    this.emit(event);
  }

  // Get current team state
  async getTeamState(teamId: string, projectId?: string): Promise<{
    members: TeamMember[];
    cursors: Record<string, CursorPosition>;
    activeEdits: Record<string, FileEdit[]>;
    projectContext?: any;
  }> {
    const members = await this.teamContextService.getOnlineMembers(teamId);
    
    // Filter cursors for online members
    const cursors: Record<string, CursorPosition> = {};
    for (const member of members) {
      const cursor = this.userCursors.get(member.userId);
      if (cursor) {
        cursors[member.userId] = cursor;
      }
    }
    
    // Filter active edits for online members
    const activeEdits: Record<string, FileEdit[]> = {};
    for (const member of members) {
      const edits = this.activeEdits.get(member.userId);
      if (edits && edits.length > 0) {
        activeEdits[member.userId] = edits;
      }
    }
    
    let projectContext;
    if (projectId) {
      projectContext = await this.teamContextService.getProjectContext(teamId, projectId);
    }
    
    return {
      members,
      cursors,
      activeEdits,
      projectContext
    };
  }

  // Get user's cursor position
  getUserCursor(userId: string): CursorPosition | null {
    return this.userCursors.get(userId) || null;
  }

  // Get active edits for user
  getUserEdits(userId: string): FileEdit[] {
    return this.activeEdits.get(userId) || [];
  }

  // Clear user's active edits
  clearUserEdits(userId: string): void {
    this.activeEdits.delete(userId);
  }

  // Get collaboration statistics
  getStats(): {
    activeTeams: number;
    totalUsers: number;
    activeCursors: number;
    activeEdits: number;
  } {
    return {
      activeTeams: this.eventListeners.size,
      totalUsers: this.userCursors.size,
      activeCursors: this.userCursors.size,
      activeEdits: Array.from(this.activeEdits.values()).reduce((sum, edits) => sum + edits.length, 0)
    };
  }

  // Cleanup inactive data
  cleanup(): void {
    // Clear old edits (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [userId, edits] of this.activeEdits) {
      const recentEdits = edits.filter(edit => 
        edit.changes.some(change => Date.now() - oneHourAgo < 60 * 60 * 1000)
      );
      
      if (recentEdits.length === 0) {
        this.activeEdits.delete(userId);
      } else {
        this.activeEdits.set(userId, recentEdits);
      }
    }
    
    console.log('[CollaborationService] Cleanup completed');
  }
}

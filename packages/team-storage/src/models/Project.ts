// @ts-nocheck
export interface Project {
  _id?: string;
  teamId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface ProjectSection {
  _id?: string;
  projectId: string;
  teamId: string;
  type: 'requirements' | 'architecture' | 'design' | 'implementation' | 'tasks' | 'code' | 'issues' | 'meetings';
  title: string;
  content: any;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectStats {
  _id?: string;
  projectId: string;
  teamId: string;
  totalTasks: number;
  completedTasks: number;
  totalIssues: number;
  openIssues: number;
  totalMeetings: number;
  lastActivity: Date;
  created_at: Date;
  updated_at: Date;
}

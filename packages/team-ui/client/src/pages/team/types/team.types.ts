export type TabType = 'dashboard' | 'task-assistant' | 'projects' | 'knowledge' | 'team' | 'profile';
export type DashboardSubTab = 'notifications' | 'todo-list' | 'calendar';
export type ProjectSubTab = 'project' | 'plan' | 'deliverable' | 'requirements' | 'analysis' | 'architecture' | 'design' | 'implementation' | 'tasks' | 'code' | 'issues' | 'testing' | 'meetings' | 'documents' | 'notes' | 'research' | 'report' | 'support' | 'configuration' | 'members' | 'files';
export type TeamSubTab = 'my-teams' | 'all-teams' | 'notifications';
export type TeamActionTab = 'create' | 'join';
export type WorkspaceType = 'private' | 'team';

export interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  editing?: boolean;
}

export interface Team {
  id: string;
  name: string;
  specialization?: string;
  description?: string;
}

export interface TeamMember {
  _id: string;
  username: string;
  email: string;
  role?: string;
}

export interface ProfileData {
  username: string;
  email: string;
  full_name: string;
  phone: string;
  api_key: string;
}

export interface Notification {
  _id: string;
  type: string;
  message: string;
  from_user?: string;
  team_id?: string;
  team_name?: string;
  read: boolean;
  created_at: string;
  replies?: any[];
}

export interface CalendarEvent {
  _id: string;
  title: string;
  date: string;
  time: string;
  description: string;
}

export interface EventForm {
  title: string;
  date: string;
  time: string;
  description: string;
}

export interface Requirement {
  _id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  editing?: boolean;
}

export interface Architecture {
  _id: string;
  title: string;
  description: string;
  diagram_url: string;
  editing?: boolean;
}

export interface Design {
  _id: string;
  title: string;
  description: string;
  mockup_url: string;
  editing?: boolean;
}

export interface Implementation {
  _id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  editing?: boolean;
}

export interface ProjectTask {
  _id: string;
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
  editing?: boolean;
}

export interface CodeRepo {
  _id: string;
  name: string;
  url: string;
  branch: string;
  description: string;
  editing?: boolean;
}

export interface Issue {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignee: string;
  editing?: boolean;
}

export interface Meeting {
  _id: string;
  title: string;
  date: string;
  time: string;
  agenda: string;
  notes: string;
  editing?: boolean;
}

export interface FileItem {
  _id: string;
  filename: string;
  size: number;
  uploadDate: string;
}

export interface RequirementForm {
  title: string;
  description: string;
  priority: string;
  status: string;
}

export interface ArchitectureForm {
  title: string;
  description: string;
  diagram_url: string;
}

export interface DesignForm {
  title: string;
  description: string;
  mockup_url: string;
}

export interface ImplementationForm {
  title: string;
  description: string;
  status: string;
  progress: number;
}

export interface TaskForm {
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
}

export interface RepoForm {
  name: string;
  url: string;
  branch: string;
  description: string;
}

export interface IssueForm {
  title: string;
  description: string;
  severity: string;
  status: string;
  assignee: string;
}

export interface MeetingForm {
  title: string;
  date: string;
  time: string;
  agenda: string;
  notes: string;
}

export interface TestCase {
  _id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  editing?: boolean;
}

export interface TestCaseForm {
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Project {
  id: string;
  projectId?: string; // For backward compatibility
  name: string;
  description: string;
  status: string;
  createdAt: string;
  sectionConfig?: Record<string, boolean>;
  members?: ProjectMember[];
  nfsFolders?: string[];
  nfsPath?: string;
}

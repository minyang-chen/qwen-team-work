import { UserCredentials, ExecutionResult, AgentConfig } from '../types/AcpTypes';

// Session service interface for dependency injection
export interface ISessionService {
  createSession(userId: string, credentials?: UserCredentials, workingDirectory?: string): Promise<string>;
  getSession(sessionId: string): Promise<any | null>;
  updateSession(sessionId: string, data: any): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getUserSessions(userId: string): Promise<string[]>;
  updateTokenUsage(sessionId: string, inputTokens: number, outputTokens: number): Promise<void>;
  getSessionStats(sessionId: string): Promise<any>;
  sendMessage(sessionId: string, message: string): Promise<any>;
  executeCode(sessionId: string, code: string, language: string): Promise<ExecutionResult>;
}

// Agent discovery interface
export interface IAgentDiscovery {
  discoverAgents(timeout?: number): Promise<any[]>;
  selectBestAgent(capabilities: string | string[]): Promise<AgentConfig | null>;
  getAvailableAgents(): any[];
}

// Session manager interface
export interface ISessionManager {
  createUserSession(userId: string, credentials?: UserCredentials, workingDirectory?: string): Promise<string>;
  getUserSession(userId: string): any | null;
  deleteUserSession(userId: string): Promise<void>;
  getUserSessions(userId: string): string[];
  updateTokenUsage(userId: string, sessionId: string, inputTokens: number, outputTokens: number): Promise<void>;
  getSessionStats(userId: string, sessionId: string): Promise<any>;
  sendMessage(userId: string, sessionId: string, message: string): Promise<any>;
  executeCode(userId: string, sessionId: string, code: string, language: string): Promise<any>;
  cleanup(maxAge?: number): Promise<void>;
}

// Database service interfaces
export interface IUserService {
  findById(userId: string): Promise<any | null>;
  findByUsername(username: string): Promise<any | null>;
  createUser(userData: any): Promise<any>;
  updateUser(userId: string, data: any): Promise<void>;
}

export interface ITeamService {
  findById(teamId: string): Promise<any | null>;
  findByName(teamName: string): Promise<any | null>;
  createTeam(teamData: any): Promise<any>;
  addMember(teamId: string, userId: string, role?: string): Promise<void>;
  removeMember(teamId: string, userId: string): Promise<void>;
}

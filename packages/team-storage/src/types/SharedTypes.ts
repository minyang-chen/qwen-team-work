// @ts-nocheck
// Local copy of shared types to avoid workspace linking issues

export interface UserCredentials {
  username: string;
  password?: string;
  apiKey?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface ISessionService {
  createSession(userId: string, credentials?: UserCredentials, workingDirectory?: string): Promise<string>;
  getSession(sessionId: string): Promise<any>;
  validateSession(sessionId: string): Promise<string | null>;
  executeCommand(sessionId: string, command: string): Promise<ExecutionResult>;
  terminateSession(sessionId: string): Promise<void>;
}

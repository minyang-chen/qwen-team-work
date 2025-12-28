// Session Service Interface
export interface ISessionService {
  createSession(userId: string): Promise<string>;
  getSession(sessionId: string): Promise<any>;
  deleteSession(sessionId: string): Promise<void>;
}

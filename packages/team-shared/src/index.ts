// Export all types
export * from './types/AcpTypes';

// Export all interfaces
export * from './interfaces/ISessionService';

// Re-export commonly used types for convenience
export type {
  AcpMessage,
  AcpResponse,
  AcpError,
  MessageType,
  AgentConfig,
  DiscoveredAgent,
  ConnectOptions,
  ClientSession,
  ServerSession,
  ChatMessage,
  SessionPreferences,
  ExecutionResult,
  ToolCall,
  UserCredentials
} from './types/AcpTypes';

export type {
  ISessionService,
  IAgentDiscovery,
  ISessionManager,
  IUserService,
  ITeamService
} from './interfaces/ISessionService';

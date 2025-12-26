// Export all types
export * from './types/AcpTypes';

// Export all interfaces
export * from './interfaces/ISessionService';

// Export error handling
export * from './errors/StandardError';

// Export config management
export * from './config/ConfigManager';

// Export utilities
export * from './utils/logger';
export * from './utils/errorHandler';

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
  ConversationMessage,
  SessionMetadata,
  EnhancedSessionData,
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
export { StandardError as AppError } from './errors/StandardError';

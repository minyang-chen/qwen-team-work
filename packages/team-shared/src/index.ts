// Export all types
export * from './types/AcpTypes.js';

// Export all interfaces
export * from './interfaces/ISessionService.js';

// Export error handling
export * from './errors/StandardError.js';

// Export config management
export * from './config/ConfigManager.js';

// Export utilities
export * from './utils/logger.js';
export * from './utils/errorHandler.js';

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
export { StandardError as AppError } from './errors/StandardError.js';

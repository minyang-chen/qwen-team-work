// Export all types
export * from './types/AcpTypes.js';

// Export all interfaces
export * from './interfaces/ISessionService.js';

// Export error handling
export * from './errors/StandardError.js';

// Export utilities
export * from './utils/logger.js';
export * from './utils/errorHandler.js';

// Export Docker sandbox functionality
export * from './docker/DockerSandboxConfig.js';
export * from './docker/DockerSandbox.js';
export * from './docker/SandboxedToolExecutor.js';

// Export enhanced services
export * from './services/SessionService.js';
export * from './services/TeamContextService.js';
export * from './services/CollaborationService.js';

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

// Storage-specific types
export interface CreateUserData {
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  password: string;
}

export interface UserUpdateData {
  fullName?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface UserDocument {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  passwordHash: string;
  nfsWorkspacePath: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export type SanitizedMessage = string | Record<string, unknown> | unknown[] | unknown;

export interface EmbeddingQuery {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface MongoMatchStage {
  $match: Record<string, unknown>;
}

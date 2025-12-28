import { Request } from 'express';
import { ObjectId } from 'mongoose';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  nfsWorkspacePath: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  password: string;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string;
}

export interface UserDocument extends User {
  passwordHash: string;
}

export interface AuthenticatedUser {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: UserCredentials;
}

export interface UserCredentials {
  type: 'openai' | 'qwen-oauth';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accessToken?: string;
  refreshToken?: string;
}

// Team types
export interface TeamMember {
  userId: ObjectId;
  role: string;
  status: 'active' | 'disabled';
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  specialization?: string;
  description?: string;
  nfsWorkspacePath: string;
  ownerId: ObjectId;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Session types
export interface SessionStats {
  messageCount: number;
  tokenUsage?: TokenUsage;
  createdAt: Date;
  lastActivity: Date;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// API Request/Response types
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  query?: string;
  filters?: Record<string, unknown>;
}

// File types
export interface FileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  contentHash: string;
  filePath?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface FileUploadRequest {
  file: Express.Multer.File;
  metadata?: Record<string, unknown>;
}

// Project types
export interface Project {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Configuration types
export interface DatabaseConfig {
  uri: string;
  options?: Record<string, unknown>;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  jwtSecret: string;
}

export interface ServiceConfig {
  openai?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  qwen?: {
    clientId: string;
    clientSecret: string;
  };
  nfs?: {
    basePath: string;
  };
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Embedding and search types
export interface EmbeddingQuery {
  workspaceType: 'private' | 'team';
  ownerId: string;
  teamId?: string;
}

export interface MongoMatchStage {
  workspaceType: string;
  ownerId: ObjectId;
  teamId?: ObjectId;
  isImage?: boolean;
  imageEmbedding?: { $exists: boolean };
}

export interface SanitizedMessage {
  [key: string]: unknown;
}

// Environment types
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  QWEN_CLIENT_ID?: string;
  QWEN_CLIENT_SECRET?: string;
  NFS_BASE_PATH?: string;
  CORS_ORIGIN?: string;
  LOG_LEVEL?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
}

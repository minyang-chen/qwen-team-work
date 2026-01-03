// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

// User model for MongoDB
export interface IUser extends Document {
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

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  nfsWorkspacePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Team model with embedded members
export interface ITeamMember {
  userId: mongoose.Types.ObjectId;
  role: string;
  status: 'active' | 'disabled';
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string; // Changed from teamName to name
  specialization?: string;
  description?: string;
  nfsWorkspacePath: string;
  ownerId: mongoose.Types.ObjectId; // Changed from createdBy to ownerId
  members: ITeamMember[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const teamSchema = new Schema<ITeam>({
  name: { type: String, required: true, unique: true }, // Changed from teamName
  specialization: { type: String },
  description: { type: String },
  nfsWorkspacePath: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Changed from createdBy
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'member' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// API Keys model
export interface IApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  apiKey: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

const apiKeySchema = new Schema<IApiKey>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  apiKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }
});

// File embeddings with vector search
export interface IFileEmbedding extends Document {
  filePath: string;
  fileName: string;
  content: string; // File content for full-text search
  fileType: string; // MIME type (e.g., 'image/jpeg', 'text/plain')
  isImage: boolean; // Flag for image files
  workspaceType: 'private' | 'team';
  ownerId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  contentHash: string;
  embedding: number[]; // Vector array for MongoDB Vector Search
  imageEmbedding?: number[]; // Separate embedding for images
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const fileEmbeddingSchema = new Schema<IFileEmbedding>({
  filePath: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  content: { type: String, required: true }, // Full-text searchable content
  fileType: { type: String, required: true }, // MIME type
  isImage: { type: Boolean, default: false }, // Image flag
  workspaceType: { type: String, enum: ['private', 'team'], required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  contentHash: { type: String, required: true },
  embedding: [{ type: Number }], // Text/code embedding
  imageEmbedding: [{ type: Number }], // Image embedding
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auth Sessions (separate from conversations)
export interface IAuthSession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  workspacePath: string;
  status: 'active' | 'expired';
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

const authSessionSchema = new Schema<IAuthSession>({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  workspacePath: { type: String, required: true },
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
});

// ACP Sessions (conversations only)
export interface ISession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  status: 'active' | 'saved' | 'terminated';
  workspacePath: string;
  conversationHistory: {
    messageId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    attachments?: {
      fileName: string;
      fileType: string;
      filePath: string;
      contentHash: string;
    }[];
    toolCalls?: {
      callId: string;
      name: string;
      args: any;
      status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
      result?: any;
      error?: string;
    }[];
    metadata: {
      correlationId: string;
      tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
      processingTime?: number;
      version: string;
    };
    timestamp: Date;
    embedding?: number[];
  }[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
}

const sessionSchema = new Schema<ISession>({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  status: { type: String, enum: ['active', 'saved', 'terminated'], default: 'active' },
  workspacePath: { type: String, required: true },
  conversationHistory: [{
    messageId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    attachments: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      filename: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      path: { type: String, required: true },
      url: { type: String, required: true }
    }],
    toolCalls: [{
      callId: { type: String, required: true },
      name: { type: String, required: true },
      args: { type: Schema.Types.Mixed, required: true },
      status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'failed'], default: 'pending' },
      result: { type: Schema.Types.Mixed },
      error: { type: String }
    }],
    metadata: {
      correlationId: { type: String, required: true },
      tokenUsage: {
        inputTokens: { type: Number, default: 0 },
        outputTokens: { type: Number, default: 0 },
        totalTokens: { type: Number, default: 0 }
      },
      processingTime: { type: Number },
      version: { type: String, default: '1.0' }
    },
    timestamp: { type: Date, default: Date.now },
    embedding: [{ type: Number }]
  }],
  tokenUsage: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

// Projects (existing MongoDB collections - keep as is)
export interface IProject extends Document {
  teamId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>({
  teamId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Create indexes (only for non-unique fields)
teamSchema.index({ teamName: 1 });
teamSchema.index({ 'members.userId': 1 });
sessionSchema.index({ status: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Export models
// Todo model
export interface ITodo extends Document {
  userId: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<ITodo>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

todoSchema.index({ userId: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
export const Team = mongoose.model<ITeam>('Team', teamSchema);
export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
export const FileEmbedding = mongoose.model<IFileEmbedding>('FileEmbedding', fileEmbeddingSchema);
export const AuthSession = mongoose.model<IAuthSession>('AuthSession', authSessionSchema);
export const Session = mongoose.model<ISession>('Session', sessionSchema);
export const Project = mongoose.model<IProject>('Project', projectSchema);
export const Todo = mongoose.model<ITodo>('Todo', todoSchema);

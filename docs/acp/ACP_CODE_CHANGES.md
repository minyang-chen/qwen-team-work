# ACP Implementation - Detailed Code Changes

## Overview

This document details all code changes required in each package to implement the ACP integration with session persistence.

---

## Package: `packages/shared`

### New Files

#### **1. `src/types/AcpTypes.ts`**
```typescript
// Core ACP message types
export interface AcpMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  version?: string;
  source?: string;
  target?: string;
  correlation?: string;
}

export interface AcpResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: AcpError;
  timestamp: number;
  duration?: number;
}

export interface AcpError {
  code: string;
  message: string;
  details?: any;
}

export type MessageType = 
  | 'session.create'
  | 'session.destroy'
  | 'session.save'
  | 'session.resume'
  | 'session.list'
  | 'chat.send'
  | 'chat.stream'
  | 'code.execute'
  | 'file.read'
  | 'file.write';
```

#### **2. `src/types/SessionTypes.ts`**
```typescript
export interface ServerSession {
  id: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  state: 'active' | 'idle' | 'terminated';
  workspaceDir?: string;
  sandbox?: any;
}

export interface SavedSession {
  sessionId: string;
  userId: string;
  workspacePath: string;
  conversationHistory: Buffer;
  metadata?: {
    projectName?: string;
    description?: string;
    tags?: string[];
  };
  createdAt: Date;
  lastSaved: Date;
}

export interface SessionPreferences {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}
```

#### **3. `src/types/WorkspaceTypes.ts`**
```typescript
export interface WorkspacePaths {
  active: string;
  saved: string;
  temp: string;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  resourceUsage?: {
    memory: number;
    cpu: number;
  };
}
```

### Modified Files

#### **`package.json`**
```json
{
  "name": "@qwen-code/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### **`src/index.ts`**
```typescript
// Export all types
export * from './types/AcpTypes';
export * from './types/SessionTypes';
export * from './types/WorkspaceTypes';
```

---

## Package: `packages/backend`

### New Files

#### **1. `src/models/AcpSession.ts`**
```typescript
import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['active', 'idle', 'terminated'], default: 'active' },
  dockerContainerId: String,
  workspacePath: String,
  resourceUsage: {
    memory: { type: Number, default: 0 },
    cpu: { type: Number, default: 0 },
    tokenUsage: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  }
});

const savedSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  workspacePath: { type: String, required: true },
  conversationHistory: Buffer,
  metadata: {
    projectName: String,
    description: String,
    tags: [String]
  },
  createdAt: { type: Date, required: true },
  lastSaved: { type: Date, default: Date.now, index: true }
});

const conversationHistorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [{
    role: String,
    content: String,
    timestamp: Date,
    tokenUsage: { input: Number, output: Number }
  }],
  compressed: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

export const ActiveSession = mongoose.model('ActiveSession', activeSessionSchema);
export const SavedSession = mongoose.model('SavedSession', savedSessionSchema);
export const ConversationHistory = mongoose.model('ConversationHistory', conversationHistorySchema);
```

#### **2. `src/services/acpSessionService.ts`**
```typescript
import { ActiveSession, SavedSession } from '../models/AcpSession';

export const acpSessionService = {
  async createActiveSession(userId: string, sessionId: string, workspacePath: string) {
    return await ActiveSession.create({
      sessionId,
      userId,
      workspacePath,
      createdAt: new Date(),
      lastActivity: new Date()
    });
  },

  async updateLastActivity(sessionId: string) {
    return await ActiveSession.findOneAndUpdate(
      { sessionId },
      { lastActivity: new Date() },
      { new: true }
    );
  },

  async getActiveSession(sessionId: string) {
    return await ActiveSession.findOne({ sessionId });
  },

  async getUserActiveSessions(userId: string) {
    return await ActiveSession.find({ userId, status: 'active' });
  },

  async terminateSession(sessionId: string) {
    return await ActiveSession.findOneAndUpdate(
      { sessionId },
      { status: 'terminated' },
      { new: true }
    );
  },

  async saveSession(sessionId: string, userId: string, workspacePath: string, conversationHistory: Buffer, metadata?: any) {
    return await SavedSession.create({
      sessionId,
      userId,
      workspacePath,
      conversationHistory,
      metadata,
      createdAt: new Date(),
      lastSaved: new Date()
    });
  },

  async getSavedSession(userId: string, sessionId: string) {
    return await SavedSession.findOne({ userId, sessionId });
  },

  async listUserSavedSessions(userId: string) {
    return await SavedSession.find({ userId }).sort({ lastSaved: -1 });
  },

  async deleteSavedSession(userId: string, sessionId: string) {
    return await SavedSession.deleteOne({ userId, sessionId });
  }
};
```

### Modified Files

#### **`src/config/database.ts`**
```typescript
import { Pool } from 'pg';
import mongoose from 'mongoose';
import { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, MONGODB_URI } from './env';

export const pool = new Pool({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    
    // Create indexes for ACP sessions
    await createAcpIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

async function createAcpIndexes() {
  const { ActiveSession, SavedSession } = await import('../models/AcpSession');
  
  await ActiveSession.collection.createIndex({ userId: 1, status: 1 });
  await ActiveSession.collection.createIndex({ lastActivity: 1 });
  await SavedSession.collection.createIndex({ userId: 1, lastSaved: -1 });
}

export const testPostgresConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};
```

#### **`src/config/env.ts`**
```typescript
import dotenv from 'dotenv';
dotenv.config();

// Existing exports...
export const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
export const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432');
export const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || '';
export const POSTGRES_DB = process.env.POSTGRES_DB || 'qwen_db';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_acp_sessions';
export const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
export const NFS_BASE_PATH = process.env.NFS_BASE_PATH || '/nfs';
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// New ACP-specific config
export const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '1800000'); // 30 min
export const SESSION_WARNING_TIMEOUT = parseInt(process.env.SESSION_WARNING_TIMEOUT || '1500000'); // 25 min
export const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');
```

---

## Package: `packages/web-ui`

### New Files

#### **1. `server/src/storage/NFSWorkspaceManager.ts`**
```typescript
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WorkspacePaths } from '@qwen-code/shared';

export class NFSWorkspaceManager {
  private nfsBasePath: string;
  private execAsync = promisify(exec);

  constructor(nfsBasePath: string = process.env.NFS_BASE_PATH || '/nfs') {
    this.nfsBasePath = nfsBasePath;
  }

  getWorkspacePaths(userId: string, sessionId: string): WorkspacePaths {
    return {
      active: path.join(this.nfsBasePath, 'private', userId, 'active', sessionId),
      saved: path.join(this.nfsBasePath, 'private', userId, 'saved', sessionId),
      temp: path.join(this.nfsBasePath, 'private', userId, 'temp', sessionId)
    };
  }

  async createWorkspace(workspacePath: string): Promise<void> {
    await fs.mkdir(workspacePath, { recursive: true, mode: 0o700 });
  }

  async copyWorkspace(source: string, destination: string): Promise<void> {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await this.execAsync(`cp -r "${source}" "${destination}"`);
  }

  async restoreWorkspace(source: string, destination: string): Promise<void> {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await this.execAsync(`cp -r "${source}" "${destination}"`);
  }

  async cleanupWorkspace(workspacePath: string): Promise<void> {
    try {
      await fs.access(workspacePath);
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      // Workspace doesn't exist, ignore
    }
  }

  async workspaceExists(workspacePath: string): Promise<boolean> {
    try {
      await fs.access(workspacePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### **2. `server/src/utils/ConversationCompressor.ts`**
```typescript
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class ConversationCompressor {
  async compress(data: any): Promise<Buffer> {
    const jsonString = JSON.stringify(data);
    return await gzip(Buffer.from(jsonString, 'utf-8'));
  }

  async decompress(buffer: Buffer): Promise<any> {
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString('utf-8'));
  }

  getCompressionRatio(original: any, compressed: Buffer): number {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = compressed.length;
    return 1 - (compressedSize / originalSize);
  }
}
```

#### **3. `server/src/session/HybridSessionManager.ts`**
```typescript
import { ServerSession } from '@qwen-code/shared';
import { SandboxManager } from '../SandboxManager';
import { NFSWorkspaceManager } from '../storage/NFSWorkspaceManager';
import { acpSessionService } from '../../../backend/src/services/acpSessionService';
import { nanoid } from 'nanoid';

export class HybridSessionManager {
  private activeSessions = new Map<string, ServerSession>();
  private sandboxManager: SandboxManager;
  private nfsManager: NFSWorkspaceManager;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.sandboxManager = new SandboxManager();
    this.nfsManager = new NFSWorkspaceManager();
    this.startCleanupProcess();
  }

  async createSession(userId: string): Promise<ServerSession> {
    const sessionId = nanoid();
    const workspacePaths = this.nfsManager.getWorkspacePaths(userId, sessionId);

    // Create workspace directory
    await this.nfsManager.createWorkspace(workspacePaths.active);

    // Create Docker sandbox
    const sandbox = await this.sandboxManager.getSandbox(userId, workspacePaths.active);

    // Create in-memory session
    const session: ServerSession = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      state: 'active',
      workspaceDir: workspacePaths.active,
      sandbox
    };

    this.activeSessions.set(sessionId, session);

    // Backup to MongoDB
    await acpSessionService.createActiveSession(userId, sessionId, workspacePaths.active);

    return session;
  }

  getActiveSession(sessionId: string): ServerSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.state = 'active';
      await acpSessionService.updateLastActivity(sessionId);
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Stop Docker container
    if (session.sandbox) {
      await session.sandbox.stop();
    }

    // Clean up workspace
    if (session.workspaceDir) {
      await this.nfsManager.cleanupWorkspace(session.workspaceDir);
    }

    // Update MongoDB
    await acpSessionService.terminateSession(sessionId);

    // Remove from memory
    this.activeSessions.delete(sessionId);
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupIdleSessions();
    }, 60000); // Every minute
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const timeout = parseInt(process.env.SESSION_TIMEOUT || '1800000');

    for (const [sessionId, session] of this.activeSessions) {
      const idleTime = now - session.lastActivity;
      if (idleTime > timeout) {
        await this.terminateSession(sessionId);
      }
    }
  }
}
```

Continue in next file...

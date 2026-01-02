# User Session Management & Onboarding

**Version:** 1.1.4  
**Date:** January 2, 2026

---

## Table of Contents

1. [User Registration & Onboarding](#user-registration--onboarding)
2. [Session Management](#session-management)
3. [NFS Workspace Provisioning](#nfs-workspace-provisioning)
4. [Docker Sandbox Initialization](#docker-sandbox-initialization)
5. [Authentication Flow](#authentication-flow)
6. [Session Lifecycle](#session-lifecycle)

---

## User Registration & Onboarding

### Registration Flow

```
User submits registration form
  ↓
team-web → POST /api/auth/register
  ↓
team-storage (authController.register)
  ↓
┌─────────────────────────────────────────┐
│ 1. Validate Input                       │
│    - Username uniqueness                │
│    - Email format & uniqueness          │
│    - Password strength                  │
│    - Required fields                    │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 2. Create NFS Workspace                 │
│    - Generate unique path               │
│    - Create directory structure         │
│    - Set permissions                    │
│    - Initialize workspace files         │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 3. Create MongoDB User Document         │
│    - Hash password (bcrypt)             │
│    - Store user profile                 │
│    - Save NFS workspace path            │
│    - Set default preferences            │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 4. Initialize Docker Sandbox            │
│    - Create user-specific container     │
│    - Mount NFS workspace                │
│    - Set resource limits                │
│    - Install dependencies               │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 5. Generate JWT Token                   │
│    - Create access token                │
│    - Create refresh token               │
│    - Store session in MongoDB           │
└─────────────────────────────────────────┘
  ↓
Return { token, user, workspacePath }
  ↓
team-web stores token & redirects to dashboard
```

### Registration Endpoint

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "nfsWorkspacePath": "/nfs/users/john_doe_507f1f77",
    "createdAt": "2026-01-02T12:00:00.000Z"
  }
}
```

### Implementation Details

#### 1. Input Validation

**File:** `packages/team-storage/src/controllers/authController.ts`

```typescript
// Validation rules
- Username: 3-30 characters, alphanumeric + underscore
- Email: Valid email format, unique in database
- Password: Min 8 characters, must include uppercase, lowercase, number
- Full Name: Required, 2-100 characters
- Phone: Optional, valid phone format
```

#### 2. Password Hashing

```typescript
import bcrypt from 'bcrypt';

const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);
```

---

## NFS Workspace Provisioning

### Workspace Structure

Each user gets an isolated NFS workspace:

```
/nfs/users/
├── john_doe_507f1f77/              # User workspace
│   ├── projects/                   # User projects
│   ├── uploads/                    # Uploaded files
│   ├── temp/                       # Temporary files
│   ├── .config/                    # User configuration
│   │   ├── agent.json              # Agent preferences
│   │   └── settings.json           # User settings
│   └── .workspace_metadata.json    # Workspace metadata
```

### NFS Service Implementation

**File:** `packages/team-storage/src/services/nfsService.ts`

```typescript
export class NFSService {
  private baseNFSPath = process.env.NFS_BASE_PATH || '/nfs/users';

  async createUserWorkspace(userId: string, username: string): Promise<string> {
    // Generate unique workspace path
    const workspacePath = path.join(
      this.baseNFSPath,
      `${username}_${userId}`
    );

    // Create directory structure
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'projects'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'uploads'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'temp'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, '.config'), { recursive: true });

    // Set permissions (user read/write/execute)
    await fs.chmod(workspacePath, 0o700);

    // Create workspace metadata
    const metadata = {
      userId,
      username,
      createdAt: new Date().toISOString(),
      version: '1.0',
      quotaGB: 10
    };
    await fs.writeFile(
      path.join(workspacePath, '.workspace_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Initialize default config files
    await this.initializeDefaultConfigs(workspacePath);

    return workspacePath;
  }

  private async initializeDefaultConfigs(workspacePath: string): Promise<void> {
    // Copy default agent.json
    const defaultAgentConfig = {
      activeAgent: 'default',
      preferences: {
        autoSave: true,
        theme: 'light'
      }
    };
    await fs.writeFile(
      path.join(workspacePath, '.config', 'agent.json'),
      JSON.stringify(defaultAgentConfig, null, 2)
    );

    // Create default settings
    const defaultSettings = {
      language: 'en',
      timezone: 'UTC',
      notifications: true
    };
    await fs.writeFile(
      path.join(workspacePath, '.config', 'settings.json'),
      JSON.stringify(defaultSettings, null, 2)
    );
  }

  async deleteUserWorkspace(workspacePath: string): Promise<void> {
    // Backup before deletion
    await this.backupWorkspace(workspacePath);
    
    // Delete workspace
    await fs.rm(workspacePath, { recursive: true, force: true });
  }

  async getWorkspaceUsage(workspacePath: string): Promise<number> {
    // Calculate directory size in bytes
    const { stdout } = await exec(`du -sb ${workspacePath}`);
    return parseInt(stdout.split('\t')[0]);
  }
}
```

### NFS Configuration

**Environment Variables:**
```bash
NFS_BASE_PATH=/nfs/users
NFS_QUOTA_GB=10
NFS_BACKUP_PATH=/nfs/backups
```

**NFS Mount Options:**
```bash
# /etc/fstab
nfs-server:/export/users /nfs/users nfs4 rw,sync,hard,intr 0 0
```

---

## MongoDB User Schema

### User Document Structure

**Collection:** `users`

```typescript
interface IUser {
  _id: ObjectId;                    // MongoDB auto-generated
  username: string;                 // Unique, indexed
  email: string;                    // Unique, indexed
  fullName: string;
  phone?: string;
  passwordHash: string;             // bcrypt hashed
  nfsWorkspacePath: string;         // NFS workspace location
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  
  // Additional fields
  preferences?: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    notifications: boolean;
  };
  
  quotaGB: number;                  // Storage quota
  usageGB: number;                  // Current usage
  
  lastLogin?: Date;
  loginCount: number;
  
  // Security
  failedLoginAttempts: number;
  lockedUntil?: Date;
  
  // Metadata
  metadata: Record<string, any>;
}
```

**Schema Definition:**

**File:** `packages/team-storage/src/models/UnifiedModels.ts`

```typescript
const userSchema = new Schema<IUser>({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    lowercase: true
  },
  fullName: { 
    type: String, 
    required: true,
    minlength: 2,
    maxlength: 100
  },
  phone: { type: String },
  passwordHash: { 
    type: String, 
    required: true 
  },
  nfsWorkspacePath: { 
    type: String, 
    required: true,
    unique: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    notifications: { type: Boolean, default: true }
  },
  quotaGB: { type: Number, default: 10 },
  usageGB: { type: Number, default: 0 },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  metadata: { type: Schema.Types.Mixed, default: {} }
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
```

---

## Docker Sandbox Initialization

### Container Creation on User Registration

**File:** `packages/team-shared/src/docker/DockerSandbox.ts`

```typescript
export class DockerSandbox {
  async createUserSandbox(
    userId: string, 
    workspacePath: string
  ): Promise<string> {
    const containerName = `qwen-sandbox-${userId}`;
    
    // Container configuration
    const containerConfig = {
      Image: 'node:20-bookworm',
      name: containerName,
      Hostname: containerName,
      
      // Mount NFS workspace
      HostConfig: {
        Binds: [
          `${workspacePath}:/workspace:rw`
        ],
        
        // Resource limits
        Memory: 2 * 1024 * 1024 * 1024,      // 2GB RAM
        MemorySwap: 2 * 1024 * 1024 * 1024,  // 2GB Swap
        NanoCpus: 2 * 1000000000,            // 2 CPU cores
        
        // Security
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: false,
        
        // Network
        NetworkMode: 'bridge',
        
        // Auto-remove on stop
        AutoRemove: false
      },
      
      // Working directory
      WorkingDir: '/workspace',
      
      // Environment variables
      Env: [
        `USER_ID=${userId}`,
        'NODE_ENV=production',
        'PYTHONUNBUFFERED=1'
      ],
      
      // Keep container running
      Cmd: ['tail', '-f', '/dev/null'],
      
      // Labels for identification
      Labels: {
        'qwen.user_id': userId,
        'qwen.type': 'user-sandbox',
        'qwen.created': new Date().toISOString()
      }
    };
    
    // Create container
    const container = await this.docker.createContainer(containerConfig);
    
    // Start container
    await container.start();
    
    // Initialize container environment
    await this.initializeContainer(container);
    
    return container.id;
  }
  
  private async initializeContainer(container: Docker.Container): Promise<void> {
    // Create python symlink (python3 → python)
    await container.exec({
      Cmd: ['ln', '-sf', '/usr/bin/python3', '/usr/local/bin/python'],
      User: 'root',
      AttachStdout: true,
      AttachStderr: true
    });
    
    // Install common tools
    await container.exec({
      Cmd: ['apt-get', 'update'],
      User: 'root'
    });
    
    await container.exec({
      Cmd: ['apt-get', 'install', '-y', 'git', 'curl', 'vim'],
      User: 'root'
    });
    
    // Create workspace directories
    await container.exec({
      Cmd: ['mkdir', '-p', '/workspace/projects', '/workspace/temp'],
      AttachStdout: true,
      AttachStderr: true
    });
  }
  
  async stopUserSandbox(userId: string): Promise<void> {
    const containerName = `qwen-sandbox-${userId}`;
    const container = this.docker.getContainer(containerName);
    
    try {
      await container.stop({ t: 10 }); // 10 second grace period
      await container.remove();
    } catch (error) {
      console.error(`Failed to stop sandbox for user ${userId}:`, error);
    }
  }
}
```

### Container Lifecycle

```
User Registration
  ↓
Create Container
  ↓
Start Container
  ↓
Initialize Environment
  ↓
Container Running (idle)
  ↓
User Sends Message
  ↓
Execute Tools in Container
  ↓
Return Results
  ↓
Container Idle Again
  ↓
User Logout / Session Timeout
  ↓
Stop Container
  ↓
Remove Container
```

### Container Resource Limits

```typescript
const RESOURCE_LIMITS = {
  memory: 2 * 1024 * 1024 * 1024,      // 2GB RAM
  memorySwap: 2 * 1024 * 1024 * 1024,  // 2GB Swap
  cpus: 2,                              // 2 CPU cores
  diskQuota: 10 * 1024 * 1024 * 1024,  // 10GB disk
  networkBandwidth: 100 * 1024 * 1024, // 100 Mbps
  maxProcesses: 100,                    // Max processes
  maxOpenFiles: 1024                    // Max open files
};
```

---

## Authentication Flow

### Login Flow

```
User submits login form
  ↓
team-web → POST /api/auth/login
  ↓
team-storage (authController.login)
  ↓
┌─────────────────────────────────────────┐
│ 1. Find User by Username/Email          │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 2. Check Account Status                 │
│    - Is active?                         │
│    - Is locked?                         │
│    - Failed attempts < 5?               │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 3. Verify Password                      │
│    - bcrypt.compare()                   │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 4. Create Auth Session                  │
│    - Generate session ID                │
│    - Store in MongoDB                   │
│    - Set expiration (24h)               │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 5. Generate JWT Token                   │
│    - Include userId, sessionId          │
│    - Sign with secret                   │
│    - Set expiration                     │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 6. Update User Stats                    │
│    - lastLogin = now                    │
│    - loginCount++                       │
│    - failedLoginAttempts = 0            │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ 7. Start/Resume Docker Sandbox          │
│    - Check if container exists          │
│    - Start if stopped                   │
│    - Create if not exists               │
└─────────────────────────────────────────┘
  ↓
Return { token, user, sessionId }
  ↓
team-web stores token & redirects to chat
```

### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  sessionId: string;
  username: string;
  email: string;
  workspacePath: string;
  iat: number;  // Issued at
  exp: number;  // Expiration
}
```

**Token Generation:**
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    userId: user._id.toString(),
    sessionId: session.sessionId,
    username: user.username,
    email: user.email,
    workspacePath: user.nfsWorkspacePath
  },
  process.env.JWT_SECRET!,
  { expiresIn: '24h' }
);
```

---

## Session Management

### Auth Session Schema

**Collection:** `authsessions`

```typescript
interface IAuthSession {
  _id: ObjectId;
  sessionId: string;              // Unique session identifier
  userId: ObjectId;               // Reference to User
  teamId?: ObjectId;              // Optional team context
  workspacePath: string;          // NFS workspace path
  status: 'active' | 'expired';
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  
  // Connection info
  ipAddress?: string;
  userAgent?: string;
  
  // Docker info
  containerId?: string;
  containerStatus?: 'running' | 'stopped';
}
```

### Session Lifecycle

```
Login
  ↓
Create AuthSession (status: active)
  ↓
Store in MongoDB
  ↓
User Activity
  ↓
Update lastActivity timestamp
  ↓
Check expiration (24h)
  ↓
If expired → status: expired
  ↓
Logout / Timeout
  ↓
Delete AuthSession
  ↓
Stop Docker Container
```

### Session Cleanup

**Automatic Cleanup Job:**

```typescript
// Run every 5 minutes
setInterval(async () => {
  const now = new Date();
  
  // Find expired sessions
  const expiredSessions = await AuthSession.find({
    status: 'active',
    expiresAt: { $lt: now }
  });
  
  for (const session of expiredSessions) {
    // Update status
    session.status = 'expired';
    await session.save();
    
    // Stop Docker container
    await dockerSandbox.stopUserSandbox(session.userId.toString());
    
    console.log(`Cleaned up expired session: ${session.sessionId}`);
  }
}, 5 * 60 * 1000);
```

---

## Complete Onboarding Sequence Diagram

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐     ┌────────┐
│Client│     │team-web  │     │team-     │     │MongoDB  │     │NFS/    │
│      │     │          │     │storage   │     │         │     │Docker  │
└──┬───┘     └────┬─────┘     └────┬─────┘     └────┬────┘     └───┬────┘
   │              │                 │                │              │
   │ Register     │                 │                │              │
   ├─────────────>│                 │                │              │
   │              │ POST /register  │                │              │
   │              ├────────────────>│                │              │
   │              │                 │ Validate       │              │
   │              │                 ├───────────┐    │              │
   │              │                 │           │    │              │
   │              │                 │<──────────┘    │              │
   │              │                 │                │              │
   │              │                 │ Create NFS     │              │
   │              │                 │ Workspace      │              │
   │              │                 ├───────────────────────────────>│
   │              │                 │                │              │
   │              │                 │<───────────────────────────────┤
   │              │                 │ Workspace Path │              │
   │              │                 │                │              │
   │              │                 │ Create User    │              │
   │              │                 ├───────────────>│              │
   │              │                 │                │              │
   │              │                 │<───────────────┤              │
   │              │                 │ User Document  │              │
   │              │                 │                │              │
   │              │                 │ Create Docker  │              │
   │              │                 │ Sandbox        │              │
   │              │                 ├───────────────────────────────>│
   │              │                 │                │              │
   │              │                 │<───────────────────────────────┤
   │              │                 │ Container ID   │              │
   │              │                 │                │              │
   │              │                 │ Create Session │              │
   │              │                 ├───────────────>│              │
   │              │                 │                │              │
   │              │                 │<───────────────┤              │
   │              │                 │ Session ID     │              │
   │              │                 │                │              │
   │              │                 │ Generate JWT   │              │
   │              │                 ├───────────┐    │              │
   │              │                 │           │    │              │
   │              │                 │<──────────┘    │              │
   │              │                 │                │              │
   │              │<────────────────┤                │              │
   │              │ { token, user } │                │              │
   │<─────────────┤                 │                │              │
   │ Success      │                 │                │              │
   │              │                 │                │              │
   │ Redirect to  │                 │                │              │
   │ Dashboard    │                 │                │              │
   ├─────────────>│                 │                │              │
   │              │                 │                │              │
```

---

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/qwen-team-work
MONGODB_DB_NAME=qwen-team-work

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# NFS
NFS_BASE_PATH=/nfs/users
NFS_QUOTA_GB=10
NFS_BACKUP_PATH=/nfs/backups

# Docker
DOCKER_IMAGE=node:20-bookworm
DOCKER_MEMORY_LIMIT=2g
DOCKER_CPU_LIMIT=2
DOCKER_NETWORK=bridge

# Session
SESSION_TIMEOUT_HOURS=24
SESSION_CLEANUP_INTERVAL_MINUTES=5
```

---

## Security Considerations

### Password Security
- Minimum 8 characters
- Must include uppercase, lowercase, number
- Hashed with bcrypt (10 rounds)
- Never stored in plain text

### Account Lockout
- 5 failed login attempts → lock for 15 minutes
- Reset counter on successful login

### Session Security
- JWT tokens expire after 24 hours
- Tokens include session ID for revocation
- HTTPS required in production

### Workspace Isolation
- Each user has isolated NFS directory
- Permissions set to 700 (owner only)
- Docker containers run with limited privileges
- Network isolation between containers

### Rate Limiting
- Login: 5 attempts per 15 minutes
- Registration: 3 attempts per hour
- API calls: 100 requests per minute per user

---

## Monitoring & Logging

### User Registration Metrics
- Total registrations per day
- Registration success/failure rate
- Average onboarding time
- NFS workspace creation time
- Docker container creation time

### Session Metrics
- Active sessions count
- Average session duration
- Session timeout rate
- Concurrent users

### Resource Usage
- NFS storage per user
- Docker container resource usage
- MongoDB document count
- API request rate

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026

# ACP Code Changes - Fixed Import Structure

## **NPM Workspace Setup**

### **Root `package.json`**
```json
{
  "name": "qwen-code-workspace",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/backend",
    "packages/web-ui", 
    "packages/qwen-core-agent"
  ],
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## **Package: `packages/shared`**

### **`package.json`**
```json
{
  "name": "@qwen-code/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./interfaces": "./dist/interfaces/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### **`src/interfaces/ISessionService.ts`**
```typescript
export interface ISessionService {
  createSession(userId: string, options?: any): Promise<string>;
  getSession(sessionId: string): Promise<any | null>;
  updateSession(sessionId: string, data: any): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface IAgentDiscovery {
  discoverAgents(): Promise<any[]>;
  selectBestAgent(capabilities: string[]): Promise<any | null>;
}
```

### **`src/index.ts`**
```typescript
// Types
export * from './types/AcpTypes';
export * from './types/SessionTypes';

// Interfaces  
export * from './interfaces/ISessionService';
export * from './interfaces/IAgentDiscovery';
```

---

## **Package: `packages/backend`**

### **`package.json`**
```json
{
  "name": "@qwen-code/backend",
  "version": "1.0.0",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "mongoose": "^8.0.0"
  }
}
```

### **`src/services/AcpSessionService.ts`**
```typescript
import { ISessionService } from '@qwen-code/shared';
import { ActiveSession, SavedSession } from '../models/AcpSession';

export class AcpSessionService implements ISessionService {
  async createSession(userId: string, options?: any): Promise<string> {
    const session = await ActiveSession.create({
      userId,
      workspacePath: options?.workspacePath,
      createdAt: new Date()
    });
    return session.sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await ActiveSession.findOne({ sessionId });
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    await ActiveSession.findOneAndUpdate({ sessionId }, data);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await ActiveSession.deleteOne({ sessionId });
  }
}
```

---

## **Package: `packages/web-ui`**

### **`package.json`**
```json
{
  "name": "@qwen-code/web-ui",
  "version": "1.0.0",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "inversify": "^6.0.0",
    "reflect-metadata": "^0.1.13"
  }
}
```

### **`server/src/di/Container.ts`**
```typescript
import { Container } from 'inversify';
import { ISessionService, IAgentDiscovery } from '@qwen-code/shared';
import { RemoteSessionService } from '../services/RemoteSessionService';
import { ConfigBasedDiscovery } from '../discovery/ConfigBasedDiscovery';

const container = new Container();

// Service bindings
container.bind<ISessionService>('SessionService').to(RemoteSessionService);
container.bind<IAgentDiscovery>('AgentDiscovery').to(ConfigBasedDiscovery);

export { container };
```

### **`server/src/services/RemoteSessionService.ts`**
```typescript
import { ISessionService } from '@qwen-code/shared';

export class RemoteSessionService implements ISessionService {
  constructor(private acpClient: any) {}

  async createSession(userId: string, options?: any): Promise<string> {
    return await this.acpClient.request('session.create', { userId, options });
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await this.acpClient.request('session.get', { sessionId });
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    await this.acpClient.request('session.update', { sessionId, data });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.acpClient.request('session.delete', { sessionId });
  }
}
```

### **`server/src/SessionManager.ts` (Updated)**
```typescript
import { inject, injectable } from 'inversify';
import { ISessionService, IAgentDiscovery } from '@qwen-code/shared';

@injectable()
export class SessionManager {
  constructor(
    @inject('SessionService') private sessionService: ISessionService,
    @inject('AgentDiscovery') private agentDiscovery: IAgentDiscovery
  ) {}

  async createSession(userId: string, options?: any): Promise<string> {
    // Use injected service instead of direct imports
    return await this.sessionService.createSession(userId, options);
  }

  // ... rest of methods using injected services
}
```

---

## **Package: `packages/qwen-core-agent`**

### **`package.json`**
```json
{
  "name": "@qwen-code/qwen-core-agent",
  "version": "1.0.0",
  "dependencies": {
    "@qwen-code/shared": "workspace:*",
    "@qwen-code/core": "workspace:*",
    "ws": "^8.0.0"
  }
}
```

### **`src/services/CoreSessionService.ts`**
```typescript
import { ISessionService } from '@qwen-code/shared';
import { GeminiClient, Config } from '@qwen-code/core';

export class CoreSessionService implements ISessionService {
  private sessions = new Map<string, any>();

  async createSession(userId: string, options?: any): Promise<string> {
    const sessionId = this.generateId();
    const client = new GeminiClient(new Config());
    
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      client,
      createdAt: Date.now()
    });
    
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    return this.sessions.get(sessionId) || null;
  }

  // ... other methods
}
```

---

## **Benefits of Fixed Structure**

### **✅ Resolved Issues**
- **No cross-package relative imports** - Uses proper workspace dependencies
- **Clear dependency hierarchy** - Shared types at base, implementations in packages
- **Dependency injection** - Loose coupling between components
- **Proper TypeScript exports** - Clean module boundaries

### **✅ Improved Maintainability**
- **Single source of truth** for interfaces in @qwen-code/shared
- **Testable components** with dependency injection
- **Version management** through workspace dependencies
- **Build optimization** with proper exports

This structure eliminates import path conflicts and creates a maintainable, scalable architecture.

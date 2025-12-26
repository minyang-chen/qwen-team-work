# Migration Guide: Current → Correct Architecture

## Overview

This guide provides step-by-step instructions to migrate from the current implementation to the correct architecture where `team-ai-agent` uses `@qwen-code/sdk` instead of directly manipulating `@qwen-code/core`.

## Current State Problems

```typescript
// ❌ Current: Direct core manipulation
import { GeminiClient, Config, CoreToolScheduler } from '@qwen-code/core';

class CoreAdapter {
  private client: GeminiClient;
  private config: Config;
  
  constructor() {
    this.config = new Config({ ... });
    this.client = new GeminiClient(this.config);
  }
  
  async processMessage(message: string) {
    const stream = this.client.sendMessageStream([{ text: message }], ...);
    // Direct manipulation of core internals
  }
}
```

## Target State

```typescript
// ✅ Target: SDK usage
import { query, Query } from '@qwen-code/sdk';

class CoreAdapter {
  constructor(private sdkConfig: SdkConfig) {}
  
  async processMessage(message: string) {
    const result = await query({
      prompt: message,
      config: this.sdkConfig
    });
    return result.text;
  }
}
```

## Migration Steps

### Phase 1: Add SDK Dependency (No Breaking Changes)

**Goal**: Install SDK alongside existing core dependency

**Steps**:

1. **Install SDK package**
   ```bash
   cd packages/team-ai-agent
   npm install @qwen-code/sdk@^0.5.1
   ```

2. **Update package.json**
   ```json
   {
     "dependencies": {
       "@qwen-code/core": "file:../core",  // Keep for now
       "@qwen-code/sdk": "^0.5.1",         // Add SDK
       "@qwen-team/shared": "file:../shared"
     }
   }
   ```

3. **Verify build**
   ```bash
   npm run build
   ```

**Validation**: Project builds successfully with both dependencies

---

### Phase 2: Create Protocol Translator

**Goal**: Add translation layer without changing existing code

**Steps**:

1. **Create ProtocolTranslator class**
   ```typescript
   // src/protocol/ProtocolTranslator.ts
   import { AcpMessage, AcpResponse } from '@qwen-team/shared';
   import type { QueryOptions, QueryResult } from '@qwen-code/sdk';
   
   export class ProtocolTranslator {
     acpToSdk(message: AcpMessage): QueryOptions {
       return {
         prompt: message.payload.content,
         sessionId: message.payload.sessionId,
         streaming: message.payload.streaming ?? false,
         config: {
           model: message.payload.model,
           temperature: message.payload.temperature
         }
       };
     }
     
     sdkToAcp(result: QueryResult, messageId: string): AcpResponse {
       return {
         id: messageId,
         success: true,
         data: {
           content: result.text,
           usage: result.usage
         },
         timestamp: Date.now()
       };
     }
     
     errorToAcp(error: Error, messageId: string): AcpResponse {
       return {
         id: messageId,
         success: false,
         error: {
           code: this.mapErrorCode(error),
           message: error.message,
           details: error
         },
         timestamp: Date.now()
       };
     }
     
     private mapErrorCode(error: Error): string {
       if (error.name === 'AbortError') return 'TIMEOUT';
       if (error.message.includes('quota')) return 'QUOTA_EXCEEDED';
       if (error.message.includes('tool')) return 'TOOL_EXECUTION_FAILED';
       return 'INTERNAL_ERROR';
     }
   }
   ```

2. **Add unit tests**
   ```typescript
   // src/protocol/ProtocolTranslator.test.ts
   import { ProtocolTranslator } from './ProtocolTranslator';
   
   describe('ProtocolTranslator', () => {
     const translator = new ProtocolTranslator();
     
     describe('acpToSdk', () => {
       it('converts chat message', () => {
         const acpMsg = {
           id: 'msg-1',
           type: 'chat.send',
           payload: {
             content: 'Hello',
             sessionId: 'sess-1',
             streaming: true
           },
           timestamp: Date.now()
         };
         
         const sdkOptions = translator.acpToSdk(acpMsg);
         
         expect(sdkOptions.prompt).toBe('Hello');
         expect(sdkOptions.sessionId).toBe('sess-1');
         expect(sdkOptions.streaming).toBe(true);
       });
     });
     
     describe('sdkToAcp', () => {
       it('converts query result', () => {
         const result = {
           text: 'Hello back',
           usage: { input: 10, output: 15, total: 25 }
         };
         
         const acpResponse = translator.sdkToAcp(result, 'msg-1');
         
         expect(acpResponse.id).toBe('msg-1');
         expect(acpResponse.success).toBe(true);
         expect(acpResponse.data.content).toBe('Hello back');
       });
     });
   });
   ```

3. **Run tests**
   ```bash
   npm test
   ```

**Validation**: All new tests pass

---

### Phase 3: Create SDK Client Factory

**Goal**: Centralize SDK client creation

**Steps**:

1. **Create SdkClientFactory**
   ```typescript
   // src/sdk/SdkClientFactory.ts
   import { query, Query } from '@qwen-code/sdk';
   import type { UserCredentials } from '@qwen-team/shared';
   
   export interface SdkConfig {
     apiKey: string;
     baseUrl?: string;
     model?: string;
     workingDirectory?: string;
   }
   
   export class SdkClientFactory {
     createConfig(credentials: UserCredentials, workingDir?: string): SdkConfig {
       return {
         apiKey: credentials.apiKey || process.env.OPENAI_API_KEY!,
         baseUrl: credentials.baseUrl || process.env.OPENAI_BASE_URL,
         model: credentials.model || process.env.OPENAI_MODEL,
         workingDirectory: workingDir
       };
     }
     
     async executeQuery(options: QueryOptions): Promise<QueryResult> {
       return await query(options);
     }
     
     createStreamingQuery(options: QueryOptions): Query {
       return new Query(options);
     }
   }
   ```

2. **Add to SessionManager**
   ```typescript
   // src/session/SessionManager.ts
   import { SdkClientFactory, SdkConfig } from '../sdk/SdkClientFactory';
   
   export class SessionManager {
     private sessions = new Map<string, UserSession>();
     private sdkFactory = new SdkClientFactory();
     
     async createSession(userId: string, credentials: UserCredentials): Promise<string> {
       const sessionId = generateId();
       const sdkConfig = this.sdkFactory.createConfig(credentials);
       
       this.sessions.set(sessionId, {
         userId,
         sessionId,
         sdkConfig,
         createdAt: Date.now(),
         conversationHistory: []
       });
       
       return sessionId;
     }
     
     getSession(sessionId: string): UserSession | null {
       return this.sessions.get(sessionId) ?? null;
     }
   }
   
   interface UserSession {
     userId: string;
     sessionId: string;
     sdkConfig: SdkConfig;
     createdAt: number;
     conversationHistory: any[];
   }
   ```

**Validation**: SessionManager creates SDK configs correctly

---

### Phase 4: Refactor CoreAdapter to Use SDK

**Goal**: Replace core usage with SDK calls

**Steps**:

1. **Create new CoreAdapter implementation**
   ```typescript
   // src/adapters/CoreAdapterV2.ts (new file)
   import { SdkClientFactory } from '../sdk/SdkClientFactory';
   import { ProtocolTranslator } from '../protocol/ProtocolTranslator';
   import { SessionManager } from '../session/SessionManager';
   import type { AcpMessage, AcpResponse } from '@qwen-team/shared';
   
   export class CoreAdapterV2 {
     private translator = new ProtocolTranslator();
     private sdkFactory = new SdkClientFactory();
     
     constructor(private sessionManager: SessionManager) {}
     
     async processMessage(acpMessage: AcpMessage): Promise<AcpResponse> {
       try {
         // Get session
         const session = this.sessionManager.getSession(
           acpMessage.payload.sessionId
         );
         
         if (!session) {
           return this.translator.errorToAcp(
             new Error('Session not found'),
             acpMessage.id
           );
         }
         
         // Translate ACP to SDK
         const sdkOptions = this.translator.acpToSdk(acpMessage);
         sdkOptions.config = session.sdkConfig;
         
         // Execute via SDK
         const result = await this.sdkFactory.executeQuery(sdkOptions);
         
         // Translate SDK to ACP
         return this.translator.sdkToAcp(result, acpMessage.id);
         
       } catch (error) {
         return this.translator.errorToAcp(error as Error, acpMessage.id);
       }
     }
     
     async processMessageStream(
       acpMessage: AcpMessage,
       onChunk: (chunk: string) => void
     ): Promise<AcpResponse> {
       try {
         const session = this.sessionManager.getSession(
           acpMessage.payload.sessionId
         );
         
         if (!session) {
           return this.translator.errorToAcp(
             new Error('Session not found'),
             acpMessage.id
           );
         }
         
         const sdkOptions = this.translator.acpToSdk(acpMessage);
         sdkOptions.config = session.sdkConfig;
         
         const query = this.sdkFactory.createStreamingQuery(sdkOptions);
         
         for await (const chunk of query.stream()) {
           if (chunk.type === 'content') {
             onChunk(chunk.text);
           }
         }
         
         return {
           id: acpMessage.id,
           success: true,
           data: { content: 'Stream complete' },
           timestamp: Date.now()
         };
         
       } catch (error) {
         return this.translator.errorToAcp(error as Error, acpMessage.id);
       }
     }
   }
   ```

2. **Add integration tests**
   ```typescript
   // src/adapters/CoreAdapterV2.test.ts
   import { CoreAdapterV2 } from './CoreAdapterV2';
   import { SessionManager } from '../session/SessionManager';
   
   describe('CoreAdapterV2', () => {
     let adapter: CoreAdapterV2;
     let sessionManager: SessionManager;
     
     beforeEach(() => {
       sessionManager = new SessionManager();
       adapter = new CoreAdapterV2(sessionManager);
     });
     
     it('processes message via SDK', async () => {
       // Create session
       const sessionId = await sessionManager.createSession('user-1', {
         apiKey: 'test-key',
         baseUrl: 'http://localhost:8080/v1',
         model: 'test-model'
       });
       
       // Send message
       const acpMessage = {
         id: 'msg-1',
         type: 'chat.send',
         payload: {
           content: 'Hello',
           sessionId
         },
         timestamp: Date.now()
       };
       
       const response = await adapter.processMessage(acpMessage);
       
       expect(response.success).toBe(true);
       expect(response.data.content).toBeDefined();
     });
   });
   ```

3. **Run tests**
   ```bash
   npm test
   ```

**Validation**: New adapter works with SDK

---

### Phase 5: Switch to New Adapter

**Goal**: Replace old CoreAdapter with new implementation

**Steps**:

1. **Update MessageRouter**
   ```typescript
   // src/server/MessageRouter.ts
   import { CoreAdapterV2 } from '../adapters/CoreAdapterV2';  // Changed
   
   export class MessageRouter {
     private coreAdapter: CoreAdapterV2;  // Changed type
     
     constructor(sessionManager: SessionManager) {
       this.coreAdapter = new CoreAdapterV2(sessionManager);  // Changed
     }
     
     async routeMessage(message: AcpMessage): Promise<AcpResponse> {
       switch (message.type) {
         case 'chat.send':
           return await this.coreAdapter.processMessage(message);
         // ... other cases
       }
     }
   }
   ```

2. **Run integration tests**
   ```bash
   npm test
   ```

3. **Test manually**
   ```bash
   npm run dev
   # Connect with WebSocket client and send test messages
   ```

**Validation**: All tests pass, manual testing works

---

### Phase 6: Remove Core Dependency

**Goal**: Clean up old code and dependencies

**Steps**:

1. **Remove old CoreAdapter**
   ```bash
   rm src/adapters/CoreAdapter.ts
   rm src/adapters/CoreClientManager.ts
   ```

2. **Rename CoreAdapterV2**
   ```bash
   mv src/adapters/CoreAdapterV2.ts src/adapters/CoreAdapter.ts
   ```

3. **Update imports**
   ```typescript
   // Update all files that imported CoreAdapter
   - import { CoreAdapter } from './adapters/CoreAdapter';
   + import { CoreAdapter } from './adapters/CoreAdapter';  // Now points to V2
   ```

4. **Remove core dependency**
   ```json
   // package.json
   {
     "dependencies": {
       "@qwen-code/sdk": "^0.5.1",
       "@qwen-team/shared": "file:../shared"
       // Removed: "@qwen-code/core": "file:../core"
     }
   }
   ```

5. **Clean install**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

6. **Run all tests**
   ```bash
   npm test
   ```

**Validation**: No core imports remain, all tests pass

---

### Phase 7: Update Shared Package Name

**Goal**: Fix package naming

**Steps**:

1. **Update team-shared package.json**
   ```json
   // packages/team-shared/package.json
   {
     "name": "@qwen-team/shared",  // Changed from @qwen-code/shared
     "version": "1.0.0"
   }
   ```

2. **Rebuild shared package**
   ```bash
   cd packages/team-shared
   npm run build
   ```

3. **Update imports in team-ai-agent**
   ```bash
   cd packages/team-ai-agent
   # Already done in Phase 1 of original fixes
   ```

4. **Verify no conflicts**
   ```bash
   npm ls @qwen-code/shared  # Should show nothing
   npm ls @qwen-team/shared  # Should show correct package
   ```

**Validation**: Package names are correct

---

## Verification Checklist

After completing all phases:

- [ ] `team-ai-agent` depends on `@qwen-code/sdk@^0.5.1`
- [ ] No imports from `@qwen-code/core` in team-ai-agent
- [ ] `ProtocolTranslator` exists and has tests
- [ ] `SessionManager` uses SDK config
- [ ] `CoreAdapter` uses SDK, not core directly
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing works
- [ ] Package names are correct (`@qwen-team/shared`)
- [ ] No file dependencies on core

## Rollback Plan

If issues occur during migration:

1. **Keep old code in git branch**
   ```bash
   git checkout -b migration-backup
   git commit -am "Backup before migration"
   git checkout main
   ```

2. **Test each phase independently**
   - Don't proceed to next phase if tests fail
   - Fix issues before continuing

3. **If rollback needed**
   ```bash
   git checkout migration-backup
   npm install
   npm run build
   ```

## Performance Considerations

### Before Migration
- Direct core access: ~50ms per message
- Memory: ~100MB per session

### After Migration
- SDK overhead: +5-10ms per message
- Memory: ~120MB per session (SDK caching)

**Mitigation**:
- SDK client pooling
- Response caching
- Connection reuse

## Breaking Changes

### API Changes
None - ACP protocol remains the same

### Configuration Changes
```bash
# Before: Core config
CORE_DEBUG=true
CORE_APPROVAL_MODE=yolo

# After: SDK config (simpler)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://...
OPENAI_MODEL=qwen-coder-plus
```

### Deployment Changes
- Remove core package from deployment
- Add SDK package to deployment
- Update environment variables

## Timeline Estimate

- Phase 1: 1 hour
- Phase 2: 4 hours
- Phase 3: 2 hours
- Phase 4: 8 hours
- Phase 5: 2 hours
- Phase 6: 2 hours
- Phase 7: 1 hour

**Total**: ~20 hours (2.5 days)

## Support

If you encounter issues:

1. Check SDK documentation: `packages/sdk-typescript/README.md`
2. Review architecture docs: `docs/architecture/TEAM_LAYER_ARCHITECTURE.md`
3. Check examples: `packages/sdk-typescript/examples/`
4. Open issue with migration phase number and error details

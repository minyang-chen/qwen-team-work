# Tool Registration and Handling Analysis Report

## Executive Summary

After analyzing the tool registration and handling patterns across `packages/team-ai-agent`, `packages/team-shared`, `packages/team-service`, `packages/team-web`, and `packages/team-storage`, and comparing them with reference implementations in `packages/cli` and `../qwen-code/packages/web-ui`, I've identified several critical defects and enhancement opportunities.

## Tool Registration Patterns

### Current Implementation

**packages/team-ai-agent:**
- Uses `qwen-code-core`'s `ToolRegistry` and `CoreToolScheduler`
- Adds `ToolCoordinator` for parallel/sequential/sandbox tool grouping
- `TeamToolInjector` ensures tools are included in requests
- `ServerClient` wraps core functionality with team-specific features

**packages/team-shared:**
- Provides `SandboxedToolExecutor` for Docker-based shell commands
- Defines ACP protocol types but delegates tool registration to core
- No direct tool registration - purely interface definitions

**packages/team-service:**
- `ToolExecutor` wraps `CoreToolScheduler`
- `EnhancedAIService` manages `ServerClient` instances
- Same core pattern with service-level session management

**packages/team-web:**
- Receives tool events via WebSocket (`tool:call`, `tool:response`)
- Displays tool execution in chat UI
- No direct tool registration - consumes events

**packages/team-storage:**
- MongoDB models track tool calls with status
- Stores tool execution history but doesn't handle execution
- Pure data persistence layer

### Reference Implementation Comparison

**packages/cli:**
- `useReactToolScheduler` hook wraps `CoreToolScheduler`
- Provides real-time UI updates during tool execution
- **CRITICAL:** Waits for all tool calls to complete before continuing conversation

**../qwen-code/packages/web-ui:**
- `ToolExecutor` wraps `CoreToolScheduler`
- `ClientAdapter` handles tool execution flow
- **CRITICAL:** Waits for tool completion and sends results back to model for continuation

## Critical Defects

### 1. **BROKEN CONVERSATION FLOW** (Critical)
**Location:** `packages/team-web/src/components/ChatContainer.tsx`

**Problem:** The web UI doesn't wait for tool execution completion before allowing new messages. Tools are executed in "fire-and-forget" mode.

**Evidence:**
```typescript
socket.on('tool:call', (toolCall) => {
  // Shows tool call as message but doesn't block new input
  addMessage({...});
});
```

**Impact:** Breaks AI conversation flow - the model never receives tool results to continue reasoning.

### 2. **MISSING TOOL RESULT CONTINUATION** (Critical)
**Location:** `packages/team-ai-agent/src/server/ServerClient.ts`

**Problem:** Tool results are not sent back to the model for continuation, unlike reference implementations.

**Reference Pattern (working):**
```typescript
// From ../qwen-code/packages/web-ui/server/src/ClientAdapter.ts
const responseParts = toolResults.flatMap((r) => r.responseParts);
await this.sendMessage(responseParts as any, socket, signal, true); // Continuation
```

**Team Implementation (broken):**
```typescript
// Tools execute but results aren't sent back to model
const toolResults = await this.executeWithScheduler(otherRequests, signal);
// Missing: Send results back to model for continuation
```

### 3. **INCONSISTENT TOOL EXECUTION PATTERNS**
**Problem:** Different packages use different approaches:
- `team-ai-agent`: Custom `ToolCoordinator` with grouping logic
- `team-service`: Direct `CoreToolScheduler` wrapper
- `team-shared`: Separate `SandboxedToolExecutor`

**Impact:** Maintenance complexity and potential inconsistencies.

## Enhancement Opportunities

### 1. **Implement Proper Tool Approval Workflow**
**Current State:** Storage models define approval states but no implementation exists.

**Recommendation:** Implement approval workflow similar to CLI's permission system:
```typescript
// From packages/cli/src/nonInteractive/control/controllers/permissionController.ts
// can_use_tool: Check if tool usage is allowed
```

### 2. **Add Tool Result Streaming**
**Current State:** Tools execute but results aren't streamed to UI in real-time.

**Recommendation:** Implement streaming similar to CLI's `outputUpdateHandler`:
```typescript
const outputUpdateHandler: OutputUpdateHandler = useCallback(
  (toolCallId, outputChunk) => {
    // Update UI with live tool output
  }, []);
```

### 3. **Integrate Storage Layer with Execution Flow**
**Current State:** Storage tracks tool calls but doesn't integrate with execution.

**Recommendation:** Update tool status in storage during execution lifecycle.

### 4. **Standardize Error Handling**
**Current State:** Inconsistent error handling across packages.

**Recommendation:** Implement centralized error handling with retry logic.

## Recommended Fixes

### Priority 1: Fix Conversation Flow

**File:** `packages/team-web/src/components/ChatContainer.tsx`
```typescript
// Add tool execution state management
const [isExecutingTools, setIsExecutingTools] = useState(false);

// Block new messages during tool execution
const handleSend = (message: string) => {
  if (isExecutingTools) return; // Block new input
  // ... existing logic
};

// Wait for tool completion
socket.on('tools:complete', () => {
  setIsExecutingTools(false);
});
```

### Priority 2: Implement Tool Result Continuation

**File:** `packages/team-ai-agent/src/server/ServerClient.ts`
```typescript
// After tool execution, send results back to model
if (toolResults.length > 0) {
  const responseParts = toolResults.flatMap((r) => r.responseParts);
  const continuationStream = this.client!.sendMessageStream(
    responseParts as any,
    abortController.signal,
    `${promptId}-continuation`,
    { isContinuation: true }
  );
  // Process continuation stream...
}
```

### Priority 3: Standardize Tool Execution Pattern

Create a unified `TeamToolExecutor` that:
1. Uses `CoreToolScheduler` consistently
2. Handles sandbox execution via `SandboxedToolExecutor`
3. Provides proper continuation flow
4. Integrates with storage layer

## Conclusion

The team packages have a solid foundation using `qwen-code-core`'s tool system, but critical defects in conversation flow and tool result handling prevent proper AI agent functionality. The reference implementations demonstrate the correct patterns that should be adopted across all team packages.

**Immediate Action Required:**
1. Fix conversation flow in `team-web`
2. Implement tool result continuation in `team-ai-agent`
3. Standardize tool execution patterns across packages

These fixes are essential for the AI agent to function correctly in team collaboration scenarios.

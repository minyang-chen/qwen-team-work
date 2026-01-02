# Tool Registration and Handling Analysis

## Executive Summary

This document analyzes tool registration and handling across team packages (team-ai-agent, team-shared, team-service, team-web, team-storage) compared to reference implementations (qwen-code CLI and web-ui). The analysis identifies critical defects in the tool execution flow and proposes enhancements.

---

## Architecture Comparison

### Reference Implementation (qwen-code)

#### CLI Package Flow
```
User Input → gemini.tsx
  ↓
CoreToolScheduler.schedule(requests, signal)
  ↓
Tool Validation & Approval
  ↓
Tool Execution (with live output streaming)
  ↓
onAllToolCallsComplete(completedCalls)
  ↓
Send tool results back to LLM for continuation
  ↓
Final response to user
```

**Key Components:**
1. **CoreToolScheduler** - Central orchestrator for tool lifecycle
2. **ToolRegistry** - Manages available tools and their declarations
3. **useReactToolScheduler** - React hook wrapping CoreToolScheduler
4. **Tool Execution Flow**:
   - Validates tool requests
   - Handles approval (YOLO/manual)
   - Executes tools with output streaming
   - Waits for ALL tools to complete
   - Returns results to LLM for continuation
   - LLM generates final summary

#### Web-UI Package Flow
```
Client WebSocket → server/index.ts
  ↓
SessionManager.createSession(userId, credentials)
  ↓
Client.sendMessageStream(prompt, signal)
  ↓
Stream events (content, tool_call_request, finished)
  ↓
CoreToolScheduler.schedule(toolRequests, signal)
  ↓
Wait for onAllToolCallsComplete callback
  ↓
Send tool results back to LLM
  ↓
Stream continuation response to client
```

**Key Characteristics:**
- Uses **SessionManager** to manage per-user Client instances
- Client wraps qwen-code-core functionality
- WebSocket streams events to UI in real-time
- **Waits for tool completion before continuation**

---

### Team Implementation (Current)

#### Team-AI-Agent Flow
```
ACP Request → AcpServer
  ↓
EnhancedChatHandler.handleChat()
  ↓
OpenAIClient.sendMessageStream(request, signal)
  ↓
Yields tool_call_request events
  ↓
ServerClient.executeTools(requests, signal)
  ↓
Returns tool results
  ↓
??? (No continuation mechanism)
```

#### Team-Service Flow
```
WebSocket ai_chat event → OptimizedWebSocket
  ↓
EnhancedAIService.processMessageStream(userId, message)
  ↓
AIServiceClient.streamMessage() via ACP
  ↓
Stream chunks to client
  ↓
??? (Tool execution happens but results not sent back to LLM)
```

---

## Critical Defects

### 1. **Missing Tool Completion Wait Mechanism** ⚠️ CRITICAL

**Problem:**
- Team implementation does NOT wait for all tools to complete before sending continuation
- Reference implementation uses `onAllToolCallsComplete` callback
- Team code yields tool results immediately without coordination

**Impact:**
- LLM receives incomplete tool results
- Continuation happens before tools finish
- Race conditions in tool execution
- Inconsistent final responses

**Evidence:**
```typescript
// Reference (qwen-code/packages/cli/src/ui/hooks/useReactToolScheduler.ts)
const allToolCallsCompleteHandler: AllToolCallsCompleteHandler = useCallback(
  async (completedToolCalls) => {
    await onComplete(completedToolCalls);  // ✅ Waits for ALL tools
  },
  [onComplete],
);

// Team (packages/team-ai-agent/src/server/ServerClient.ts)
async *queryStream(prompt: string, options?: {...}): AsyncGenerator<EnhancedStreamChunk> {
  // ... process stream events
  for await (const event of stream) {
    if (event.type === 'tool_call_request') {
      toolRequests.push(event.value);
      yield { type: 'tool', toolName: event.value.name };  // ❌ Yields immediately
    }
  }
  
  // Execute tools AFTER stream ends
  if (toolRequests.length > 0) {
    const toolResults = await new Promise<ToolCallResponseInfo[]>((resolve) => {
      // ... scheduler setup
      scheduler.schedule(toolRequests, abortController.signal);  // ❌ No wait for completion
    });
  }
}
```

**Root Cause:**
- Team code treats tool execution as fire-and-forget
- No synchronization between tool completion and continuation request
- Missing `onAllToolCallsComplete` callback pattern

---

### 2. **Incorrect Tool Result Flow** ⚠️ CRITICAL

**Problem:**
- Tool results are NOT sent back to LLM for continuation
- Reference implementation sends `responseParts` back to LLM
- Team code displays results to user but doesn't inform LLM

**Impact:**
- LLM generates responses without knowing tool execution results
- Cannot provide accurate summaries of what was done
- Breaks the tool → result → summary loop

**Evidence:**
```typescript
// Reference (qwen-code/packages/web-ui/server/src/websocket.ts - conceptual)
// After tools complete:
const responseParts = toolResults.flatMap((r) => r.responseParts);
if (responseParts.length > 0) {
  const continuationStream = client.sendMessageStream(
    responseParts,  // ✅ Send results back to LLM
    signal,
    `${promptId}-continuation`
  );
}

// Team (packages/team-ai-agent/src/server/ServerClient.ts)
for (const result of toolResults) {
  yield {
    type: 'tool_result',
    toolName: toolRequest?.name || 'unknown',
    result: resultText  // ❌ Only yields to UI, not sent to LLM
  };
}

// Continuation happens but WITHOUT tool results
const continuationStream = this.client!.sendMessageStream(
  responseParts as any,  // ❌ responseParts may be empty or malformed
  abortController.signal,
  `${promptId}-continuation`
);
```

**Root Cause:**
- Missing proper `responseParts` construction from tool results
- Continuation request doesn't include tool execution outcomes
- OpenAIClient expects `functionResponse` format but doesn't receive it

---

### 3. **Tool Registry Not Properly Initialized** ⚠️ HIGH

**Problem:**
- OpenAIClient gets tools from config but doesn't validate availability
- No verification that tools are actually registered
- Missing tool parameter validation

**Evidence:**
```typescript
// Team (packages/team-ai-agent/src/server/OpenAIClient.ts)
const toolRegistry = (this as any).config.getToolRegistry();
const allToolDeclarations = toolRegistry.getFunctionDeclarations();
const toolDeclarations = allToolDeclarations;  // ❌ No validation

// Hardcoded parameter fixes
if (tool.name === 'write_file') {
  parameters = {
    type: "object",
    properties: {
      file_path: { type: "string", description: "..." },
      content: { type: "string", description: "..." }
    },
    required: ["file_path", "content"]
  };  // ❌ Should come from tool declaration
}
```

**Root Cause:**
- Tool declarations incomplete or missing parameters
- Manual parameter injection instead of proper tool registration
- No tool availability check before offering to LLM

---

### 4. **Conversation History Management Issues** ⚠️ MEDIUM

**Problem:**
- `currentCycleHistory` tracks messages but doesn't properly handle multi-turn tool execution
- System prompt injection in continuation may confuse LLM
- No proper message role management

**Evidence:**
```typescript
// Team (packages/team-ai-agent/src/server/OpenAIClient.ts)
this.currentCycleHistory.push({
  role: 'system',
  content: `The following tools have been executed successfully:...`  // ❌ System message in continuation
});

// Should be:
// 1. assistant message with tool_calls
// 2. tool messages with results
// 3. NO additional system messages
```

**Impact:**
- LLM may ignore tool results due to improper message structure
- Continuation responses may be inconsistent
- Token usage increases unnecessarily

---

### 5. **Docker Sandbox Tool Execution Mismatch** ⚠️ MEDIUM

**Problem:**
- SandboxedToolExecutor expects `args.command` but receives `parameters.command`
- Inconsistent tool request format between scheduler and executor

**Evidence:**
```typescript
// Team (packages/team-shared/src/docker/SandboxedToolExecutor.ts)
private extractCommand(request: ToolCallRequestInfo): string | null {
  const args = (request as any).args;
  return args?.command || args?.cmd || null;  // ❌ Looks for 'args'
}

// But CoreToolScheduler sends:
{
  callId: "...",
  name: "run_shell_command",
  parameters: { command: "ls -la" }  // ❌ Uses 'parameters'
}
```

**Root Cause:**
- Inconsistent interface between core and team packages
- Missing adapter layer to normalize tool request format

---

### 6. **No Tool Output Truncation** ⚠️ LOW

**Problem:**
- Reference implementation truncates large tool outputs and saves to file
- Team implementation sends full output, risking context overflow

**Evidence:**
```typescript
// Reference (qwen-code/packages/core/src/core/coreToolScheduler.ts)
export async function truncateAndSaveToFile(
  content: string,
  callId: string,
  projectTempDir: string,
  threshold: number,
  truncateLines: number,
): Promise<{ content: string; outputFile?: string }> {
  // ... truncation logic
}

// Team: No equivalent functionality
```

**Impact:**
- Large command outputs (e.g., `npm install`) overflow context
- Increased token costs
- Potential API errors from oversized requests

---

## Enhancements

### 1. **Implement Proper Tool Completion Coordination** 🎯 PRIORITY 1

**Proposal:**
Add proper `onAllToolCallsComplete` callback pattern to team implementation.

**Implementation:**
```typescript
// packages/team-ai-agent/src/server/ServerClient.ts

async *queryStream(prompt: string, options?: {...}): AsyncGenerator<EnhancedStreamChunk> {
  const abortController = new AbortController();
  const promptId = `stream-${Date.now()}`;
  
  const stream = this.client!.sendMessageStream(
    [{ text: prompt }],
    abortController.signal,
    promptId
  );

  const toolRequests: ToolCallRequestInfo[] = [];
  
  // Collect tool requests from stream
  for await (const event of stream) {
    if (event.type === 'tool_call_request') {
      toolRequests.push(event.value);
      yield { type: 'tool', toolName: event.value.name };
    } else if (event.type === 'content') {
      yield { type: 'content', text: event.value };
    }
  }

  // ✅ NEW: Wait for ALL tools to complete using proper callback
  if (toolRequests.length > 0) {
    const toolResults = await this.executeToolsAndWait(toolRequests, abortController.signal);
    
    // Emit tool results to UI
    for (const result of toolResults) {
      const toolRequest = toolRequests.find(r => r.callId === result.callId);
      yield {
        type: 'tool_result',
        toolName: toolRequest?.name || 'unknown',
        result: result.resultDisplay || 'Tool completed'
      };
    }

    // ✅ NEW: Send tool results back to LLM for continuation
    const responseParts = toolResults.flatMap(r => r.responseParts);
    if (responseParts.length > 0) {
      const continuationStream = this.client!.sendMessageStream(
        responseParts,
        abortController.signal,
        `${promptId}-continuation`
      );

      for await (const event of continuationStream) {
        if (event.type === 'content') {
          yield { type: 'content', text: event.value };
        } else if (event.type === 'finished') {
          break;
        }
      }
    }
  }

  yield { type: 'finished' };
}

// ✅ NEW: Proper tool execution with completion wait
private async executeToolsAndWait(
  requests: ToolCallRequestInfo[],
  signal: AbortSignal
): Promise<ToolCallResponseInfo[]> {
  return new Promise((resolve, reject) => {
    const results: ToolCallResponseInfo[] = [];
    
    const scheduler = new CoreToolScheduler({
      config: this.config,
      chatRecordingService: this.config.getChatRecordingService(),
      outputUpdateHandler: (callId, output) => {
        // Optional: stream live output
      },
      onAllToolCallsComplete: async (completedCalls) => {
        // ✅ This callback fires when ALL tools are done
        for (const call of completedCalls) {
          if (call.response) {
            results.push(call.response);
          }
        }
        resolve(results);
      },
      onToolCallsUpdate: (toolCalls) => {
        // Optional: track tool status changes
      },
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
    });

    scheduler.schedule(requests, signal);
  });
}
```

**Benefits:**
- Ensures all tools complete before continuation
- Proper synchronization between tool execution and LLM response
- Matches reference implementation behavior

---

### 2. **Fix Tool Result to LLM Flow** 🎯 PRIORITY 1

**Proposal:**
Ensure tool results are properly formatted and sent back to LLM.

**Implementation:**
```typescript
// packages/team-ai-agent/src/server/OpenAIClient.ts

async *sendMessageStream(
  request: any,
  signal: AbortSignal,
  prompt_id: string
): AsyncGenerator<ServerGeminiStreamEvent, any> {
  const isContinuation = Array.isArray(request) && request.some(part => part.functionResponse);
  
  if (isContinuation) {
    // ✅ FIXED: Properly append tool results to history
    console.log('[OpenAIClient] Continuation - appending tool results');
    
    for (const part of request) {
      if (part.functionResponse) {
        this.currentCycleHistory.push({
          role: 'tool',
          tool_call_id: part.functionResponse.id,
          content: JSON.stringify(part.functionResponse.response)
        });
      }
    }
    
    // ✅ REMOVED: Don't add system message, let LLM naturally summarize
    messages = this.currentCycleHistory;
  }
  
  const requestData = {
    model: (this as any).config.getModel(),
    messages: messages,
    // ✅ FIXED: Don't send tools in continuation
    tools: isContinuation ? undefined : (tools.length > 0 ? tools : undefined),
    tool_choice: isContinuation ? "none" : (tools.length > 0 ? "auto" : undefined)
  };
  
  // ... rest of implementation
}
```

**Benefits:**
- LLM receives proper tool execution results
- Can generate accurate summaries
- Follows OpenAI API conversation format

---

### 3. **Normalize Tool Request Format** 🎯 PRIORITY 2

**Proposal:**
Create adapter layer to normalize tool requests between core and team packages.

**Implementation:**
```typescript
// packages/team-shared/src/docker/ToolRequestAdapter.ts

export class ToolRequestAdapter {
  /**
   * Normalize tool request from CoreToolScheduler format to SandboxedToolExecutor format
   */
  static normalize(request: ToolCallRequestInfo): NormalizedToolRequest {
    return {
      id: request.callId,
      callId: request.callId,
      name: request.name,
      // ✅ Provide both 'parameters' and 'args' for compatibility
      parameters: request.args,
      args: request.args
    };
  }
  
  /**
   * Normalize batch of requests
   */
  static normalizeBatch(requests: ToolCallRequestInfo[]): NormalizedToolRequest[] {
    return requests.map(r => this.normalize(r));
  }
}

// packages/team-shared/src/docker/SandboxedToolExecutor.ts

async executeTools(
  toolRequests: ToolCallRequestInfo[],
  signal: AbortSignal,
): Promise<ToolCallResponseInfo[]> {
  // ✅ Normalize requests before processing
  const normalizedRequests = ToolRequestAdapter.normalizeBatch(toolRequests);
  
  const results: ToolCallResponseInfo[] = [];

  for (const request of normalizedRequests) {
    if (this.isShellCommand(request.name)) {
      // ✅ Now works with both 'args' and 'parameters'
      const command = request.args?.command || request.parameters?.command;
      // ... rest of execution
    }
  }
  
  return results;
}
```

**Benefits:**
- Consistent tool request format across packages
- Easier to maintain and debug
- Supports both core and team tool execution paths

---

### 4. **Add Tool Output Truncation** 🎯 PRIORITY 3

**Proposal:**
Implement output truncation for large tool results.

**Implementation:**
```typescript
// packages/team-shared/src/utils/ToolOutputTruncator.ts

export interface TruncationConfig {
  threshold: number;        // Character count threshold
  truncateLines: number;    // Number of lines to keep
  outputDir: string;        // Directory to save full output
}

export class ToolOutputTruncator {
  constructor(private config: TruncationConfig) {}
  
  async truncateIfNeeded(
    content: string,
    callId: string
  ): Promise<{ content: string; outputFile?: string }> {
    if (content.length <= this.config.threshold) {
      return { content };
    }

    const lines = content.split('\n');
    const head = Math.floor(this.config.truncateLines / 5);
    const beginning = lines.slice(0, head);
    const end = lines.slice(-(this.config.truncateLines - head));
    
    const truncatedContent =
      beginning.join('\n') + 
      '\n... [CONTENT TRUNCATED] ...\n' + 
      end.join('\n');

    // Save full output to file
    const outputFile = path.join(this.config.outputDir, `${callId}.output`);
    await fs.writeFile(outputFile, content);

    return {
      content: `Tool output was too large and has been truncated.
Full output saved to: ${outputFile}
Use read_file tool to view complete output.

Truncated output:
${truncatedContent}`,
      outputFile
    };
  }
}

// Usage in SandboxedToolExecutor
const truncator = new ToolOutputTruncator({
  threshold: 10000,
  truncateLines: 100,
  outputDir: '/workspace/.tool-outputs'
});

const result = await this.sandbox.execute(command, signal);
const { content, outputFile } = await truncator.truncateIfNeeded(
  result.stdout || result.stderr,
  request.callId
);

results.push({
  // ... other fields
  resultDisplay: content,
  metadata: { fullOutputFile: outputFile }
});
```

**Benefits:**
- Prevents context overflow from large outputs
- Reduces token costs
- Maintains full output availability via file

---

### 5. **Improve Tool Registry Initialization** 🎯 PRIORITY 2

**Proposal:**
Validate and properly initialize tool registry with complete declarations.

**Implementation:**
```typescript
// packages/team-ai-agent/src/server/ToolRegistryValidator.ts

export class ToolRegistryValidator {
  static validate(toolRegistry: ToolRegistry): ValidationResult {
    const tools = toolRegistry.getAllTools();
    const issues: string[] = [];
    
    for (const tool of tools) {
      const declaration = tool.getFunctionDeclaration();
      
      // Check required fields
      if (!declaration.name) {
        issues.push(`Tool missing name: ${JSON.stringify(declaration)}`);
      }
      
      if (!declaration.description) {
        issues.push(`Tool ${declaration.name} missing description`);
      }
      
      // Check parameters
      if (!declaration.parameters || !declaration.parameters.properties) {
        issues.push(`Tool ${declaration.name} missing parameter definitions`);
      }
      
      // Validate parameter types
      const params = declaration.parameters?.properties || {};
      for (const [paramName, paramDef] of Object.entries(params)) {
        if (!paramDef.type) {
          issues.push(`Tool ${declaration.name} parameter ${paramName} missing type`);
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      toolCount: tools.length
    };
  }
  
  static fixCommonIssues(toolRegistry: ToolRegistry): void {
    // Add missing parameters for known tools
    const tools = toolRegistry.getAllTools();
    
    for (const tool of tools) {
      const declaration = tool.getFunctionDeclaration();
      
      if (declaration.name === 'write_file' && !declaration.parameters?.properties) {
        // Fix write_file parameters
        declaration.parameters = {
          type: "object",
          properties: {
            file_path: { 
              type: "string", 
              description: "Absolute path to the file" 
            },
            content: { 
              type: "string", 
              description: "Content to write" 
            }
          },
          required: ["file_path", "content"]
        };
      }
      
      // Add fixes for other tools...
    }
  }
}

// Usage in ServerClient
constructor(config: EnhancedServerConfig) {
  // ... existing initialization
  
  // ✅ Validate and fix tool registry
  const validation = ToolRegistryValidator.validate(this.toolRegistry);
  if (!validation.valid) {
    console.warn('[ServerClient] Tool registry issues:', validation.issues);
    ToolRegistryValidator.fixCommonIssues(this.toolRegistry);
  }
  
  console.log(`[ServerClient] Initialized with ${validation.toolCount} validated tools`);
}
```

**Benefits:**
- Ensures all tools have proper declarations
- Catches configuration issues early
- Reduces runtime errors from malformed tool requests

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Implement proper tool completion coordination
2. ✅ Fix tool result to LLM flow
3. ✅ Add tool request format normalization

### Phase 2: Quality Improvements (Week 2)
4. ✅ Improve tool registry validation
5. ✅ Add tool output truncation
6. ✅ Fix conversation history management

### Phase 3: Enhancements (Week 3)
7. Add tool execution metrics and monitoring
8. Implement tool execution caching
9. Add tool execution retry logic
10. Improve error messages and debugging

---

## Testing Strategy

### Unit Tests
```typescript
describe('ServerClient Tool Execution', () => {
  it('should wait for all tools to complete before continuation', async () => {
    const client = new ServerClient(config);
    const results = [];
    
    for await (const chunk of client.queryStream('create file and list directory')) {
      results.push(chunk);
    }
    
    // Verify order: content → tool → tool_result → content (continuation) → finished
    expect(results[0].type).toBe('content');
    expect(results[1].type).toBe('tool');
    expect(results[2].type).toBe('tool_result');
    expect(results[3].type).toBe('content'); // Continuation after tools
    expect(results[4].type).toBe('finished');
  });
  
  it('should send tool results back to LLM', async () => {
    const mockClient = jest.spyOn(OpenAIClient.prototype, 'sendMessageStream');
    
    const client = new ServerClient(config);
    await client.query('run ls command');
    
    // Verify continuation call includes tool results
    expect(mockClient).toHaveBeenCalledTimes(2); // Initial + continuation
    const continuationCall = mockClient.mock.calls[1];
    expect(continuationCall[0]).toHaveProperty('functionResponse');
  });
});
```

### Integration Tests
```typescript
describe('End-to-End Tool Execution', () => {
  it('should execute shell command and return summary', async () => {
    const response = await fetch('http://localhost:8002/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'create a file called test.txt with content "hello"',
        sessionId: 'test-session'
      })
    });
    
    const result = await response.json();
    
    // Verify tool was executed
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0].name).toBe('write_file');
    
    // Verify LLM provided summary
    expect(result.text).toContain('created');
    expect(result.text).toContain('test.txt');
  });
});
```

---

## Metrics and Monitoring

### Key Metrics to Track
1. **Tool Execution Time**: Time from request to completion
2. **Tool Success Rate**: Percentage of successful tool executions
3. **Continuation Latency**: Time between tool completion and continuation response
4. **Token Usage**: Input/output tokens per request cycle
5. **Tool Output Size**: Distribution of tool output sizes

### Monitoring Dashboard
```typescript
interface ToolExecutionMetrics {
  toolName: string;
  executionTimeMs: number;
  success: boolean;
  outputSize: number;
  truncated: boolean;
  timestamp: Date;
}

class ToolMetricsCollector {
  private metrics: ToolExecutionMetrics[] = [];
  
  record(metric: ToolExecutionMetrics) {
    this.metrics.push(metric);
  }
  
  getStats(toolName?: string) {
    const filtered = toolName 
      ? this.metrics.filter(m => m.toolName === toolName)
      : this.metrics;
      
    return {
      totalExecutions: filtered.length,
      successRate: filtered.filter(m => m.success).length / filtered.length,
      avgExecutionTime: filtered.reduce((sum, m) => sum + m.executionTimeMs, 0) / filtered.length,
      truncationRate: filtered.filter(m => m.truncated).length / filtered.length
    };
  }
}
```

---

## Conclusion

The team implementation has a solid foundation but lacks critical coordination mechanisms present in the reference implementation. The primary issues are:

1. **No wait for tool completion** - Tools execute but continuation happens prematurely
2. **Tool results not sent to LLM** - LLM generates responses without knowing outcomes
3. **Inconsistent tool request formats** - Causes execution failures

Implementing the proposed fixes in priority order will bring the team implementation to parity with the reference implementation and enable reliable tool execution with proper LLM integration.

**Estimated Effort:**
- Phase 1 (Critical): 3-5 days
- Phase 2 (Quality): 3-4 days  
- Phase 3 (Enhancement): 5-7 days
- **Total: 11-16 days**

**Risk Assessment:**
- **Low Risk**: Changes are isolated to tool execution flow
- **High Impact**: Fixes critical user-facing issues
- **Backward Compatible**: Existing functionality preserved

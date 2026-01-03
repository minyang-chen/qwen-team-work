# Team Packages Execution Flow Examples

This document traces the complete execution flow for different types of user prompts through the team packages architecture.

## Architecture Quick Reference

```
team-web (React UI)
    ↓ WebSocket (Socket.IO)
team-service (Express + Socket.IO)
    ↓ ACP Protocol (WebSocket)
team-ai-agent (ACP Server)
    ↓ OpenAI API
OpenAI GPT-4 / Qwen Models
    ↓ Tool Calls
packages/core (Tool Registry)
    ↓ Docker Sandbox
User's NFS Workspace
```

## Response Structure with Tools

**IMPORTANT**: When tools are used, the final response contains **THREE parts**:

1. **Before Tool Text**: AI's explanation of what it will do
2. **Tool Results**: Raw output from tool execution
3. **After Tool Text**: AI's interpretation/summary of tool results

```typescript
{
  text: "beforeText\n\nafterText",  // AI interpretation (before + after)
  toolResults: [                     // Raw tool outputs
    { name: "execute_bash", result: "..." }
  ]
}
```

## Prompt 1: "hello"

**Type**: Simple conversational message (no tools)

### Execution Flow

#### 1. User Input (team-web)
```typescript
// TaskAgent.tsx
socket.emit('ai_chat', {
  message: "hello",
  sessionId: currentSessionId,
  messageId: nanoid(),
  userId: user.id,
  workingDirectory: `/workspace/${user.id}`
});
```

#### 2. WebSocket Reception (team-service)
```typescript
// OptimizedWebSocket.ts
socket.on('ai_chat', async (data) => {
  const { message, userId } = data;
  
  // Not a slash command
  // Not a shell command (!)
  
  // Process as AI chat via ACP
  const streamGenerator = aiService.processMessageStream(
    userId, "hello", context, workingDirectory
  );
  
  for await (const chunk of streamGenerator) {
    socket.emit('ai_stream_chunk', {
      type: 'chunk',
      content: chunk.text
    });
  }
});
```

#### 3. ACP Protocol (team-service → team-ai-agent)
```typescript
// AIServiceClient.ts → AcpClient.ts
const acpMessage = {
  id: nanoid(),
  type: 'chat',
  data: {
    action: 'send',
    message: "hello",
    sessionId: "user-123-team-456-project-789",
    userId: "user-123",
    workingDirectory: "/workspace/user-123"
  },
  timestamp: Date.now()
};

// Send via WebSocket to ws://localhost:8001
ws.send(JSON.stringify(acpMessage));
```

#### 4. OpenAI API Call (team-ai-agent)
```typescript
// ServerClient.ts → OpenAIClient.ts
const stream = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "hello" }
  ],
  stream: true
});

// Stream response
for await (const chunk of stream) {
  yield { type: 'content', value: chunk.choices[0]?.delta?.content };
}
```

**Final Response**: 
```
"Hello! How can I help you today?"
```

---

## Prompt 2: "ls -all"

**Type**: Natural language request (AI interprets, uses execute_bash tool)

### Execution Flow

#### 1-3. Same as Prompt 1 (up to ACP)

#### 4. OpenAI Decides to Use Tool
```typescript
// OpenAI response includes tool call
const stream = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "ls -all" }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "execute_bash",
        description: "Execute bash commands",
        parameters: { command: { type: "string" } }
      }
    }
  ],
  stream: true
});

// Stream yields:
// 1. Content: "I'll list the files in the current directory."
// 2. Tool call: { name: "execute_bash", arguments: '{"command":"ls -la"}' }
```

#### 5. Tool Execution (team-ai-agent)
```typescript
// ServerClient.ts
async *queryStream(prompt) {
  let beforeToolsText = '';
  let afterToolsText = '';
  
  // First stream: AI response + tool call
  for await (const event of stream) {
    if (event.type === 'content') {
      beforeToolsText += event.value; // "I'll list the files..."
    }
    if (event.type === 'tool_call_request') {
      toolRequests.push(event.value);
    }
  }
  
  // Execute tool via CoreToolScheduler
  const toolResults = await scheduler.schedule(toolRequests);
  
  // Tool executes in Docker sandbox
  const result = await dockerSandbox.exec({
    command: ['bash', '-c', 'ls -la'],
    workingDir: '/workspace/user-123'
  });
  
  yield { 
    type: 'tool_result',
    toolName: 'execute_bash',
    result: result.stdout
  };
  
  // Send tool results back to OpenAI for interpretation
  const continuationStream = openai.chat.completions.create({
    messages: [
      ...previousMessages,
      { role: "tool", content: result.stdout }
    ]
  });
  
  // AI generates interpretation
  for await (const event of continuationStream) {
    if (event.type === 'content') {
      afterToolsText += event.value; // "The directory contains..."
    }
  }
}
```

#### 6. Docker Sandbox Execution
```typescript
// packages/core/src/tools/execute-bash.ts
const output = `total 48
drwxr-xr-x 5 user user 4096 Jan  2 17:00 .
drwxr-xr-x 3 root root 4096 Jan  1 10:00 ..
-rw-r--r-- 1 user user 1234 Jan  2 16:30 README.md
drwxr-xr-x 2 user user 4096 Jan  2 15:00 src`;
```

**Final Response Structure**:
```typescript
{
  text: "I'll list the files in the current directory.\n\nThe directory contains a README.md file and a src directory.",
  toolResults: [
    {
      name: "execute_bash",
      result: "total 48\ndrwxr-xr-x 5 user user 4096 Jan  2 17:00 .\n..."
    }
  ]
}
```

**UI Display**:
```
🤖 I'll list the files in the current directory.

🔧 Tool: execute_bash
$ ls -la
total 48
drwxr-xr-x 5 user user 4096 Jan  2 17:00 .
-rw-r--r-- 1 user user 1234 Jan  2 16:30 README.md
drwxr-xr-x 2 user user 4096 Jan  2 15:00 src

🤖 The directory contains a README.md file and a src directory.
```

---

## Prompt 3: "pwd"

**Type**: Natural language request (AI uses execute_bash tool)

### Execution Flow

Same as Prompt 2, but with different command:

```typescript
// Tool call
{ name: "execute_bash", arguments: '{"command":"pwd"}' }

// Docker execution
result.stdout = "/workspace/user-123"

// Final response
{
  text: "The current working directory is:\n\n/workspace/user-123",
  toolResults: [
    { name: "execute_bash", result: "/workspace/user-123" }
  ]
}
```

---

## Prompt 4: "!ls -all"

**Type**: Direct shell command (bypasses AI, executes immediately)

### Execution Flow

#### 1. User Input (team-web)
```typescript
socket.emit('ai_chat', {
  message: "!ls -all",
  sessionId: currentSessionId,
  userId: user.id
});
```

#### 2. Direct Execution (team-service)
```typescript
// OptimizedWebSocket.ts
socket.on('ai_chat', async (data) => {
  const { message } = data;
  
  // Check if direct shell command - YES!
  if (message.startsWith('!')) {
    const command = message.substring(1).trim(); // "ls -all"
    
    // Use direct AIService (NOT ACP)
    const { getAIService } = await import('../services/aiService.js');
    const directAIService = getAIService();
    const client = await directAIService.getClient(userId, workingDirectory);
    
    // Execute directly in Docker sandbox
    const result = await client.executeShellCommand(command);
    
    // Send result immediately (no AI interpretation)
    socket.emit('ai_stream_chunk', { 
      type: 'chunk',
      content: `\`\`\`bash\n$ ${command}\n${result}\`\`\``
    });
    socket.emit('ai_stream_chunk', { type: 'complete' });
    
    return; // Skip AI processing entirely
  }
});
```

#### 3. Docker Execution
```typescript
// Direct sandbox execution (no OpenAI API call)
const result = await dockerSandbox.exec({
  command: ['bash', '-c', 'ls -all'],
  workingDir: '/workspace/user-123'
});
```

**Final Response**:
```bash
$ ls -all
total 48
drwxr-xr-x 5 user user 4096 Jan  2 17:00 .
drwxr-xr-x 3 root root 4096 Jan  1 10:00 ..
-rw-r--r-- 1 user user 1234 Jan  2 16:30 README.md
drwxr-xr-x 2 user user 4096 Jan  2 15:00 src
```

**Key Difference**: 
- ❌ No AI interpretation
- ❌ No ACP protocol
- ✅ Instant execution (~0.5s vs ~3-5s)
- ✅ Raw output only

---

## Prompt 5: "write a short happy holiday letter"

**Type**: Pure text generation (no tools)

### Execution Flow

Same as Prompt 1 (simple conversation):

```typescript
// OpenAI generates creative content (no tools)
const response = "Dear Friends and Family,\n\nAs the year comes to a close...";
```

**Final Response**:
```
Dear Friends and Family,

As the year comes to a close, I wanted to take a moment to send you warm 
holiday wishes! This year has been filled with wonderful memories, and I'm 
grateful for all the joy and laughter we've shared.

May your holidays be filled with love, peace, and happiness. Here's to a 
bright and prosperous New Year ahead!

With warmest regards,
[Your Name]
```

---

## Prompt 6: "write a quick sort in python"

**Type**: Code generation with file creation (uses fs_write tool)

### Execution Flow

#### 1-3. Same as Prompt 1 (up to ACP)

#### 4. OpenAI Tool Call
```typescript
// AI decides to create a file
{
  tool_calls: [{
    function: {
      name: "fs_write",
      arguments: JSON.stringify({
        command: "create",
        path: "/workspace/user-123/quicksort.py",
        file_text: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Example usage
arr = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(arr))
`
      })
    }
  }]
}
```

#### 5. Tool Execution
```typescript
// packages/core/src/tools/fs-write.ts
await dockerSandbox.writeFile(
  "/workspace/user-123/quicksort.py",
  fileContent
);

return {
  success: true,
  message: "File created: quicksort.py"
};
```

**Final Response Structure**:
```typescript
{
  text: "I've created a quicksort implementation in Python.\n\nThe implementation uses the classic divide-and-conquer approach with pivot partitioning. You can run it with: python quicksort.py",
  toolResults: [
    {
      name: "fs_write",
      result: "File created: /workspace/user-123/quicksort.py"
    }
  ]
}
```

---

## Prompt 7: "view current directory file content of README.MD"

**Type**: File reading (uses fs_read tool)

### Execution Flow

#### 1-3. Same as Prompt 1 (up to ACP)

#### 4. OpenAI Tool Call
```typescript
{
  tool_calls: [{
    function: {
      name: "fs_read",
      arguments: JSON.stringify({
        operations: [{
          mode: "Line",
          path: "/workspace/user-123/README.md"
        }]
      })
    }
  }]
}
```

#### 5. Tool Execution
```typescript
// packages/core/src/tools/fs-read.ts
const content = await dockerSandbox.readFile("/workspace/user-123/README.md");

return {
  success: true,
  content: "# My Project\n\nThis is a sample project...",
  path: "/workspace/user-123/README.md"
};
```

**Final Response Structure**:
```typescript
{
  text: "Here's the content of README.md:\n\nThe README contains project documentation with setup instructions and feature descriptions.",
  toolResults: [
    {
      name: "fs_read",
      result: "# My Project\n\nThis is a sample project demonstrating..."
    }
  ]
}
```

---

## Prompt 8: "get this url: https://ca.news.yahoo.com/no-job-losses-under-recycling-213432122.html and provide a quick summary of key points"

**Type**: Web content fetching (uses web_fetch tool)

### Execution Flow

#### 1-3. Same as Prompt 1 (up to ACP)

#### 4. OpenAI Tool Call
```typescript
{
  tool_calls: [{
    function: {
      name: "web_fetch",
      arguments: JSON.stringify({
        url: "https://ca.news.yahoo.com/no-job-losses-under-recycling-213432122.html",
        mode: "selective"
      })
    }
  }]
}
```

#### 5. Tool Execution
```typescript
// packages/core/src/tools/web-fetch.ts
const response = await fetch(url);
const html = await response.text();
const content = extractMainContent(html);

return {
  success: true,
  url: url,
  content: "Article content...",
  title: "No Job Losses Under Recycling Program"
};
```

#### 6. AI Summarization
```typescript
// OpenAI receives tool result and generates summary
const continuationStream = openai.chat.completions.create({
  messages: [
    { role: "user", content: "get this url... and provide summary" },
    { role: "tool", content: articleContent },
    // AI generates summary based on article
  ]
});
```

**Final Response Structure**:
```typescript
{
  text: "I've fetched and analyzed the article. Here's a summary of the key points:\n\n**Key Points:**\n1. Program Overview: The new recycling initiative...\n2. Job Security: Officials confirm no workers will lose jobs...\n3. Training Programs: Employees will receive training...",
  toolResults: [
    {
      name: "web_fetch",
      result: "Title: No Job Losses Under Recycling Program\n\nFull article content..."
    }
  ]
}
```

---

## Execution Flow Comparison Table

| Prompt | Type | AI Involved? | Tools Used | Sandbox Access | Response Time |
|--------|------|--------------|------------|----------------|---------------|
| 1. "hello" | Conversation | ✅ Yes | None | ❌ No | ~1-2s |
| 2. "ls -all" | Natural language | ✅ Yes | execute_bash | ✅ Yes | ~3-5s |
| 3. "pwd" | Natural language | ✅ Yes | execute_bash | ✅ Yes | ~3-5s |
| 4. "!ls -all" | Direct shell | ❌ No | None (direct) | ✅ Yes | ~0.5-1s |
| 5. "holiday letter" | Text generation | ✅ Yes | None | ❌ No | ~2-4s |
| 6. "quicksort" | Code generation | ✅ Yes | fs_write | ✅ Yes | ~4-6s |
| 7. "view README" | File reading | ✅ Yes | fs_read | ✅ Yes | ~3-5s |
| 8. "fetch URL" | Web scraping | ✅ Yes | web_fetch | ❌ No | ~5-8s |

---

## Key Architectural Patterns

### 1. Command Routing (team-service)
```typescript
if (message.startsWith('/')) {
  // Slash command → CommandHandler (local processing)
  return commandHandler.execute(message, userId);
}

if (message.startsWith('!')) {
  // Direct shell → Docker sandbox (no AI)
  return directAIService.executeShellCommand(command);
}

// Regular message → AI via ACP
return aiService.processMessageStream(userId, message, context);
```

### 2. Tool Decision Flow (team-ai-agent)
```typescript
User Prompt → OpenAI API
    ↓
OpenAI decides: Text response OR Tool call?
    ↓
If Tool Call:
    → CoreToolScheduler.executeTool()
    → Docker Sandbox (if file/shell tool)
    → External API (if web_fetch)
    → Return result to OpenAI
    → OpenAI generates interpretation (afterToolsText)
    ↓
Final Response = beforeText + afterText + toolResults
```

### 3. Response Structure with Tools
```typescript
// ServerClient.ts
async query(prompt: string) {
  let beforeToolsText = '';  // AI explanation before tool
  let afterToolsText = '';   // AI interpretation after tool
  let toolResults = [];      // Raw tool outputs
  
  for await (const chunk of this.queryStream(prompt)) {
    if (chunk.type === 'content') {
      if (hasTools) {
        afterToolsText += chunk.text;  // After tool execution
      } else {
        beforeToolsText += chunk.text; // Before tool execution
      }
    }
    if (chunk.type === 'tool_result') {
      toolResults.push(chunk);
    }
  }
  
  return {
    text: beforeToolsText + '\n\n' + afterToolsText,  // Combined AI text
    toolResults: toolResults                          // Separate tool outputs
  };
}
```

### 4. Session Isolation
```typescript
// Each user gets isolated:
- Docker container: /workspace/user-{userId}
- NFS mount: /nfs-data/individual/user-{userId}
- ServerClient instance: Per-user OpenAI client
- Session context: Separate conversation history
```

### 5. Streaming Architecture
```typescript
OpenAI API (SSE stream)
    ↓
team-ai-agent (AsyncGenerator)
    ↓
ACP Protocol (WebSocket chunks)
    ↓
team-service (AsyncIterator)
    ↓
Socket.IO (ai_stream_chunk events)
    ↓
team-web (React state updates)
```

---

## Tool Call Continuation Flow

**Critical Implementation Detail**: After tool execution, results are sent back to OpenAI for interpretation.

```typescript
// ServerClient.ts - Lines 255-275
if (toolResults.length > 0) {
  // Send tool results back to OpenAI
  const continuationStream = this.client!.sendMessageStream(
    responseParts,  // Tool results as message parts
    abortController.signal,
    `${promptId}-continuation`
  );

  // OpenAI generates interpretation/summary
  for await (const event of continuationStream) {
    if (event.type === 'content') {
      yield { type: 'content', text: event.value }; // afterToolsText
    }
  }
}
```

This ensures users get:
1. **Context**: What the AI is doing
2. **Transparency**: Raw tool output
3. **Understanding**: AI's interpretation of results

---

## Performance Optimizations

1. **Direct Shell Commands**: `!` prefix bypasses AI for instant execution
2. **Slash Commands**: Local processing without API calls
3. **Streaming**: Progressive rendering improves perceived performance
4. **Session Reuse**: Persistent Docker containers avoid startup overhead
5. **Tool Batching**: Multiple tool calls in single AI turn
6. **Chunked Responses**: 20-character chunks for smooth streaming

---

## Error Handling Examples

### Network Error
```typescript
// ACP connection lost
try {
  await acpClient.request('chat.send', payload);
} catch (error) {
  // Automatic reconnection with exponential backoff
  await acpClient.reconnect();
}
```

### Tool Execution Error
```typescript
// File not found
{
  tool_calls: [{ name: "fs_read", arguments: { path: "/nonexistent.txt" } }]
}

// Tool returns error
{
  success: false,
  error: "File not found: /nonexistent.txt"
}

// OpenAI handles gracefully in afterToolsText
"I couldn't find that file. Please check the path and try again."
```

### Timeout Handling
```typescript
// Request timeout (120s default)
setTimeout(() => {
  if (pendingRequests.has(messageId)) {
    reject(new Error('Request timeout'));
    socket.emit('message:error', { message: 'Request timed out' });
  }
}, 120000);
```

---

## Related Documentation

- [ACP Integration](./ACP_INTEGRATION.md) - Detailed ACP protocol documentation
- [Communication Protocols](./COMMUNICATION_PROTOCOLS.md) - WebSocket and REST API specs
- [User Session Management](./USER_SESSION_MANAGEMENT.md) - Session lifecycle and isolation

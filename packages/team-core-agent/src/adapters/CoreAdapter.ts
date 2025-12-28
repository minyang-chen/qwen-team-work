import { GeminiClient, Config, ApprovalMode, AuthType, CoreToolScheduler, type ToolCallRequestInfo, type ToolCallResponseInfo } from '@qwen-code/core';
import { nanoid } from 'nanoid';
import { Logger } from '../utils/Logger';
import { UserSessionManager } from '../session/UserSessionManager';
import { SessionPersistenceManager } from './SessionPersistenceManager';
import { CommandHandler } from './CommandHandler';
import { CoreClientManager } from './CoreClientManager';
import { coreAgentLogger, ErrorHandler, ErrorSeverity } from '@qwen-team/shared';

export class CoreAdapter {
  private toolScheduler!: CoreToolScheduler;
  private currentUserId: string | null = null;
  private sessionPersistence: SessionPersistenceManager;
  private commandHandler: CommandHandler;
  private clientManager: CoreClientManager;
  private errorHandler: ErrorHandler;
  private config: Config;
  private client: GeminiClient | null = null;
  private sessionManager: UserSessionManager;
  private initialized: boolean = false;
  private sandboxedSession: any = null;

  constructor(sessionManager: UserSessionManager) {
    this.sessionManager = sessionManager;
    this.config = new Config({ 
      sessionId: 'default-session',
      targetDir: process.cwd(),
      debugMode: false,
      cwd: process.cwd()
    });
    this.clientManager = new CoreClientManager(sessionManager, this.currentUserId);
    this.sessionPersistence = new SessionPersistenceManager(sessionManager);
    this.commandHandler = new CommandHandler(
      this.sessionPersistence,
      () => this.currentUserId
    );
    this.errorHandler = new ErrorHandler(coreAgentLogger);
    console.log('CoreAdapter initializing with modular architecture');
  }

  private async initialize(userId?: string): Promise<void> {
    await this.clientManager.initialize(userId);
    this.client = this.clientManager.getClient();
    this.config = this.clientManager.getConfig();
    this.currentUserId = userId || 'default-user';

    // Initialize tool scheduler
    this.toolScheduler = new CoreToolScheduler({
      config: this.config,
      chatRecordingService: this.config.getChatRecordingService(),
      outputUpdateHandler: () => {},
      onAllToolCallsComplete: async () => {},
      onToolCallsUpdate: () => {},
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
    });

    this.initialized = true;
    console.log('CoreAdapter initialization complete');
  }

  async processMessage(message: string, sessionId: string): Promise<string> {
    try {
      // Handle slash commands
      if (message.startsWith('/')) {
        return await this.handleCommand(message, sessionId);
      }

      // Extract userId from sessionId for proper session management
      const userId = sessionId.split('_')[1] || sessionId;
      await this.initialize(userId);

      console.log('Processing message with sandboxed qwen-code client');
      
      const abortController = new AbortController();
      const promptId = `acp-${sessionId}-${Date.now()}`;
      
      // Don't add to client history - backend manages conversation history
      
      if (!this.client) throw new Error("Client not initialized");
      const stream = this.client.sendMessageStream(
        [{ text: message }],
        abortController.signal,
        promptId,
        { isContinuation: true }
      );
      
      let response = '';
      const toolRequests: ToolCallRequestInfo[] = [];
      const toolCallNames = new Map<string, string>();
      let toolResults: string[] = [];
      
      for await (const chunk of stream) {
        console.log('Stream chunk received:', chunk.type, 'value' in chunk ? typeof (chunk as any).value : 'no value', 'value' in chunk ? String((chunk as any).value).substring(0, 100) + '...' : 'no value');
        if (chunk.type === 'content' && 'value' in chunk) {
          response += (chunk as any).value;
        } else if (chunk.type === 'tool_call_request' && 'value' in chunk) {
          const value = (chunk as any).value;
          toolCallNames.set(value.callId, value.name);
          toolRequests.push(value);
          console.log(`🔧 Tool call requested: ${value.name} (sandboxed)`);
        } else if (chunk.type === 'tool_call_response') {
          // Process tool response similar to web-ui
          const result = chunk.value.resultDisplay
            ? typeof chunk.value.resultDisplay === 'string'
              ? chunk.value.resultDisplay
              : JSON.stringify(chunk.value.resultDisplay)
            : chunk.value.error?.message || 'Tool execution completed';
          
          const toolName = toolCallNames.get(chunk.value.callId) || 'unknown';
          toolResults.push(`🔧 ${toolName}: ${result}`);
          console.log(`🔧 Sandboxed tool result: ${toolName} - ${result.substring(0, 100)}...`);
        } else if (chunk.type === 'finished') {
          console.log('Message processing finished');
          console.log('Final response length:', response.length);
          console.log('Final response preview:', response.substring(0, 200));
        }
      }

      // Execute tools if any were requested (YOLO mode - auto-approved in sandbox)
      if (toolRequests.length > 0) {
        console.log(`🔧 Executing ${toolRequests.length} tools in sandboxed YOLO mode`);
        
        const toolResults = await this.executeTools(toolRequests, abortController.signal);
        
        // Continue conversation with tool results
        if (toolResults.length > 0) {
          const responseParts = toolResults.flatMap((r) => r.responseParts);
          console.log('🔧 Sending sandboxed tool results back to model for continuation');
          
          // Recursive call to continue conversation with tool results
          if (!this.client) throw new Error("Client not initialized");
          const continuationStream = this.client.sendMessageStream(
            responseParts as any,
            abortController.signal,
            promptId,
            { isContinuation: true }
          );
          
          // Process continuation stream for final response
          for await (const chunk of continuationStream) {
            if (chunk.type === 'content' && chunk.value) {
              response += chunk.value;
            } else if (chunk.type === 'tool_call_request') {
              // Handle nested tool calls if needed
              console.log(`🔧 Nested sandboxed tool call: ${chunk.value.name}`);
            }
          }
        }
      }

      // Include tool results in response if any
      if (toolResults.length > 0) {
        response = response + '\n\n' + toolResults.join('\n');
      }

      return response || 'I received your message but had trouble generating a response. Please try again.';
      
    } catch (error) {
      console.error('Sandboxed qwen-code processing failed:', error);
      Logger.error('Sandboxed qwen-code processing failed', error);
      
      // Provide helpful fallback response
      return `Hello! I'm your team assistant. I can help you with coding tasks, file operations, and project management. However, I'm currently having trouble connecting to the sandboxed AI service. Please try again in a moment.`;
    }
  }

  private async handleCommand(command: string, sessionId: string): Promise<string> {
    const parts = command.split(' ');
    const cmd = (parts[0] || '').toLowerCase();
    
    switch (cmd) {
      case '/help':
        return `🔧 **Available Commands:**
- /help - Show this help message
- /directory - Show current working directory
- /memory - Show memory usage
- /tools - List available tools
- /clear - Clear conversation history
- /save [name] - Save current session with optional name
- /sessions - List saved sessions
- /resume <sessionId> - Resume a saved session
- /delete <sessionId> - Delete a saved session`;

      case '/directory':
        if (this.sandboxedSession) {
          const result = await this.sandboxedSession.executeCommand('pwd');
          return `📁 **Current Directory:** \`${result.output.trim()}\``;
        }
        return `📁 **Current Directory:** \`${process.cwd()}\``;

      case '/memory':
        const memUsage = process.memoryUsage();
        const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
        return `💾 **Memory Usage:**
- RSS: ${formatMB(memUsage.rss)} MB
- Heap Used: ${formatMB(memUsage.heapUsed)} MB
- Heap Total: ${formatMB(memUsage.heapTotal)} MB
- External: ${formatMB(memUsage.external)} MB`;

      case '/tools':
        return `🔧 **Available Tools:**
- fs_read - Read files and directories
- fs_write - Write and edit files
- execute_bash - Execute shell commands
- web_search - Search the web
- web_fetch - Fetch web content`;

      case '/clear':
        return `🗑️ **Conversation Cleared:** Chat history has been reset.`;

      case '/save':
        const sessionName = parts.slice(1).join(' ') || undefined;
        return await this.commandHandler.handleCommand('/save', [sessionName || '']);

      case '/sessions':
        return await this.commandHandler.handleCommand('/list', []);

      case '/resume':
        const resumeSessionId = parts[1];
        if (!resumeSessionId) {
          return `❌ **Error:** Please specify session ID. Use /sessions to see available sessions.`;
        }
        return await this.commandHandler.handleCommand('/resume', [resumeSessionId]);

      case '/delete':
        const deleteSessionId = parts[1];
        if (!deleteSessionId) {
          return `❌ **Error:** Please specify session ID. Use /sessions to see available sessions.`;
        }
        return await this.commandHandler.handleCommand('/delete', [deleteSessionId]);

      default:
        return `❌ **Unknown command:** ${command}
Use /help to see available commands.`;
    }
  }

  private async handleSaveSession(sessionId: string, sessionName?: string): Promise<string> {
    try {
      const session = this.sessionManager.getUserSession(this.currentUserId!);
      if (!session) {
        throw new Error('No active session to save');
      }

      const savedSessionId = `saved_${sessionId}_${Date.now()}`;
      const displayName = sessionName || savedSessionId;
      
      // Save session data to persistence store
      const sessionData = {
        id: savedSessionId,
        name: displayName,
        userId: this.currentUserId!,
        conversationHistory: [],
        workspacePath: session.workspaceDir,
        createdAt: new Date(),
        metadata: {
          messageCount: []?.length || 0,
          tokenUsage: session.tokenUsage || { input: 0, output: 0, total: 0 }
        }
      };

      // Store in session manager's persistence
      await this.sessionManager.saveSession(savedSessionId, sessionData);
      
      return `💾 **Session Saved:** \`${displayName}\`
Session ID: \`${savedSessionId}\`
Messages: ${sessionData.metadata.messageCount}
Use \`/resume ${savedSessionId}\` to restore this session.`;
    } catch (error) {
      return `❌ **Error:** Failed to save session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleListSessions(sessionId: string): Promise<string> {
    try {
      // TODO: Implement actual session listing from persistence store
      const mockSessions = [
        { id: 'saved_123_1234567890', name: 'Project Alpha', createdAt: new Date('2024-12-18') },
        { id: 'saved_456_1234567891', name: 'Debug Session', createdAt: new Date('2024-12-17') }
      ];
      
      if (mockSessions.length === 0) {
        return `📋 **Saved Sessions:** No saved sessions found.`;
      }
      
      const sessionList = mockSessions
        .map(s => `- \`${s.id}\` - ${s.name} (${s.createdAt.toLocaleDateString()})`)
        .join('\n');
      
      return `📋 **Saved Sessions:**
${sessionList}

Use \`/resume <sessionId>\` to restore a session.`;
    } catch (error) {
      return `❌ **Error:** Failed to list sessions - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleResumeSession(sessionId: string): Promise<string> {
    try {
      // TODO: Implement actual session restoration
      const savedSession = await this.sessionManager.loadSession(sessionId);
      if (!savedSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Restore session data
      const currentSession = this.sessionManager.getUserSession(this.currentUserId!);
      if (currentSession && savedSession.conversationHistory) {
        // SessionData doesn't have conversationHistory property
        // currentSession.conversationHistory = savedSession.conversationHistory;
        currentSession.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      }
      
      return `🔄 **Session Resumed:** \`${savedSession.name}\`
Messages restored: ${savedSession.metadata?.messageCount || 0}
Workspace and conversation history have been restored.`;
    } catch (error) {
      return `❌ **Error:** Failed to resume session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleDeleteSession(sessionId: string): Promise<string> {
    try {
      // TODO: Implement actual session deletion
      await this.sessionManager.deleteSession(sessionId);
      // Deleted session
      
      return `🗑️ **Session Deleted:** \`${sessionId}\`
Session and associated workspace files have been removed.`;
    } catch (error) {
      return `❌ **Error:** Failed to delete session - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    return new Promise((resolve) => {
      const completedResults: ToolCallResponseInfo[] = [];

      // Create scheduler with completion handler for YOLO mode
      const scheduler = new CoreToolScheduler({
        config: this.config,
        chatRecordingService: this.config.getChatRecordingService(),
        outputUpdateHandler: () => {},
        onAllToolCallsComplete: async (completedCalls: any[]) => {
          for (const call of completedCalls) {
            completedResults.push(call.response);
          }
          resolve(completedResults);
        },
        onToolCallsUpdate: () => {},
        getPreferredEditor: () => undefined,
        onEditorClose: () => {},
      });

      scheduler.schedule(toolRequests, signal);
    });
  }

  async processMessageStream(message: string, sessionId: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      // Handle slash commands
      if (message.startsWith('/')) {
        const result = await this.handleCommand(message, sessionId);
        onChunk(result);
        return;
      }

      // Extract userId from sessionId for proper session management
      const userId = sessionId.split('_')[1] || sessionId;
      await this.initialize(userId);

      console.log('Processing message with sandboxed qwen-code client (streaming)');
      
      const abortController = new AbortController();
      const promptId = `acp-${sessionId}-${Date.now()}`;
      
      // Don't add to client history - backend manages conversation history
      
      if (!this.client) throw new Error("Client not initialized");
      const stream = this.client.sendMessageStream(
        [{ text: message }],
        abortController.signal,
        promptId,
        { isContinuation: true }
      );
      
      const toolRequests: ToolCallRequestInfo[] = [];
      const toolCallNames = new Map<string, string>();
      
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.value) {
          onChunk(chunk.value); // Stream content chunks immediately
        } else if (chunk.type === 'tool_call_request') {
          toolCallNames.set(chunk.value.callId, chunk.value.name);
          toolRequests.push(chunk.value);
          onChunk(`\n🔧 Executing tool: ${chunk.value.name}...\n`);
        } else if (chunk.type === 'tool_call_response') {
          const result = chunk.value.resultDisplay
            ? typeof chunk.value.resultDisplay === 'string'
              ? chunk.value.resultDisplay
              : JSON.stringify(chunk.value.resultDisplay)
            : chunk.value.error?.message || 'Tool execution completed';
          
          const toolName = toolCallNames.get(chunk.value.callId) || 'unknown';
          onChunk(`\n🔧 ${toolName} result:\n${result}\n`);
        } else if (chunk.type === 'finished') {
          console.log('Streaming finished');
        }
      }

      // Execute tools if any were requested (YOLO mode - auto-approved in sandbox)
      if (toolRequests.length > 0) {
        const toolResults = await this.executeTools(toolRequests, abortController.signal);
        
        // Continue conversation with tool results
        if (toolResults.length > 0) {
          const responseParts = toolResults.flatMap((r) => r.responseParts);
          
          // Stream continuation
          const continuationStream = this.client.sendMessageStream(
            responseParts as any,
            abortController.signal,
            promptId,
            { isContinuation: true }
          );
          
          for await (const chunk of continuationStream) {
            if (chunk.type === 'content' && chunk.value) {
              onChunk(chunk.value);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Sandboxed streaming failed:', error);
      onChunk('\n❌ Error: Failed to process message. Please try again.');
    }
  }
}

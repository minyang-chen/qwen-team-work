import { UserSessionManager } from '../session/UserSessionManager.js';
import { Logger } from '../utils/Logger.js';
import { CommandHandler } from './CommandHandler.js';
import { SessionPersistenceManager } from './SessionPersistenceManager.js';

export class CoreAdapter {
  private currentUserId: string | null = null;
  private sessionManager: UserSessionManager;
  private commandHandler: CommandHandler;

  constructor(sessionManager: UserSessionManager) {
    this.sessionManager = sessionManager;
    const sessionPersistence = new SessionPersistenceManager(sessionManager);
    this.commandHandler = new CommandHandler(
      sessionPersistence,
      () => this.currentUserId
    );
    console.log('CoreAdapter initialized with server-sdk');
  }

  async processMessage(message: string, sessionId: string): Promise<string> {
    try {
      // Handle slash commands
      if (message.startsWith('/')) {
        return await this.handleCommand(message, sessionId);
      }

      // Extract userId from sessionId
      const userId = sessionId.split('_')[1] || sessionId;
      this.currentUserId = userId;

      // Get session
      const session = this.sessionManager.getUserSession(userId);
      if (!session || !session.client) {
        throw new Error('Session not found or not initialized');
      }

      console.log('Processing message with server-sdk');
      
      // Use ServerClient
      const result = await session.client.query(message);
      
      // Update session metadata
      session.metadata.messageCount++;
      session.metadata.lastActivity = new Date();
      if (result.usage) {
        session.tokenUsage.inputTokens += result.usage.input;
        session.tokenUsage.outputTokens += result.usage.output;
        session.tokenUsage.totalTokens += result.usage.total;
      }

      return result.text || 'No response generated';
      
    } catch (error) {
      console.error('Message processing failed:', error);
      Logger.error('Message processing failed', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async processMessageStream(message: string, sessionId: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      // Handle slash commands
      if (message.startsWith('/')) {
        const result = await this.handleCommand(message, sessionId);
        onChunk(result);
        return;
      }

      // Extract userId from sessionId
      const userId = sessionId.split('_')[1] || sessionId;
      this.currentUserId = userId;

      // Get session
      const session = this.sessionManager.getUserSession(userId);
      if (!session || !session.client) {
        throw new Error('Session not found or not initialized');
      }

      console.log('Processing streaming message with server-sdk');
      
      // Use ServerClient streaming
      const stream = session.client.queryStream(message) as unknown as AsyncIterable<any>;
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.text) {
          onChunk(chunk.text);
        } else if (chunk.type === 'tool' && chunk.toolName) {
          onChunk(`\n🔧 Executing tool: ${chunk.toolName}...\n`);
        }
      }

      // Update session metadata
      session.metadata.messageCount++;
      session.metadata.lastActivity = new Date();
      
    } catch (error) {
      console.error('Streaming failed:', error);
      onChunk('\n❌ Error: Failed to process message. Please try again.');
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
}

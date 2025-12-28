import { SessionPersistenceManager } from './SessionPersistenceManager';

export class CommandHandler {
  constructor(
    private sessionPersistence: SessionPersistenceManager,
    private getCurrentUserId: () => string | null
  ) {}

  async handleCommand(command: string, args: string[]): Promise<string> {
    const userId = this.getCurrentUserId();
    
    switch (command) {
      case '/save':
        return this.sessionPersistence.saveSession(
          `session_${Date.now()}`,
          args[0],
          userId || undefined
        );
      
      case '/list':
        return this.sessionPersistence.listSessions(userId || undefined);
      
      case '/resume':
        if (!args[0]) {
          return '❌ **Error:** Please provide a session ID to resume';
        }
        return this.sessionPersistence.resumeSession(args[0], userId || undefined);
      
      case '/delete':
        if (!args[0]) {
          return '❌ **Error:** Please provide a session ID to delete';
        }
        return this.sessionPersistence.deleteSession(args[0]);
      
      case '/help':
        return this.getHelpMessage();
      
      default:
        return `❌ **Unknown Command:** \`${command}\`\n\nType \`/help\` for available commands.`;
    }
  }

  private getHelpMessage(): string {
    return `🔧 **Available Commands:**

**Session Management:**
• \`/save [name]\` - Save current session with optional name
• \`/list\` - List all saved sessions
• \`/resume <session-id>\` - Resume a saved session
• \`/delete <session-id>\` - Delete a saved session

**General:**
• \`/help\` - Show this help message

**Examples:**
\`/save "My Project Session"\`
\`/resume saved_123_1234567890\`
\`/delete saved_456_1234567891\``;
  }
}

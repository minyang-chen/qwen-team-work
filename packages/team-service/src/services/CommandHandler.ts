/**
 * Simple command handler for essential slash commands
 */

import { AgentConfigLoader } from '@qwen-team/shared';

interface SavedSession {
  name: string;
  userId: string;
  conversationHistory: any[];
  artifacts: any[];
  createdAt: Date;
  lastActivity: Date;
}

export class CommandHandler {
  private commands: Map<string, (args: string[], userId: string) => Promise<string>>;
  private storageUrl: string;
  private agentConfigLoader: AgentConfigLoader;

  constructor() {
    this.commands = new Map();
    this.storageUrl = process.env['STORAGE_URL'] || 'http://localhost:8000';
    this.agentConfigLoader = new AgentConfigLoader();
    this.registerCommands();
  }

  private registerCommands() {
    // Help command
    this.commands.set('help', async () => {
      return `Available commands:
/help - Show this help message
/clear - Clear conversation history
/stats - Show session statistics
/model - Show current model
/quit, /exit - Exit (not applicable in web)
/compress - Compress conversation history
/about - About this application
/save_session {name} - Save current session
/load_session {name} - Load saved session
/sessions - List all saved sessions
/delete_session {name} - Delete saved session
/agent - Show current agent
/agents - List all available agents
/switch_agent {id} - Switch to a different agent

Use ! prefix for direct shell commands (e.g., !ls -la)`;
    });

    // Clear command
    this.commands.set('clear', async () => {
      return 'Conversation history cleared. Starting fresh!';
    });

    // Stats command
    this.commands.set('stats', async () => {
      return 'Session statistics:\n- Messages: N/A\n- Tokens: N/A\n- Use web UI stats panel for detailed metrics';
    });

    // Model command
    this.commands.set('model', async () => {
      return `Current model: ${process.env['OPENAI_MODEL'] || 'qwen3-coder'}`;
    });

    // Compress command
    this.commands.set('compress', async () => {
      return 'Conversation history compression requested. This will be handled by the backend.';
    });

    // About command
    this.commands.set('about', async () => {
      return `Qwen Team Web Agent
Version: 1.0.0
Built with: Qwen Code + ACP Protocol
Features: Tool execution, Docker sandbox, Real-time streaming`;
    });

    // Quit/Exit (no-op in web)
    this.commands.set('quit', async () => {
      return 'Cannot quit from web interface. Close the browser tab to exit.';
    });
    this.commands.set('exit', async () => {
      return 'Cannot exit from web interface. Close the browser tab to exit.';
    });

    // Session management commands
    this.commands.set('save_session', async (args, userId) => {
      if (args.length === 0) {
        return 'Usage: /save_session {name}\nExample: /save_session my-project';
      }
      const name = args[0];
      
      try {
        const response = await fetch(`${this.storageUrl}/api/sessions/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name })
        });
        
        if (!response.ok) {
          const error = await response.json();
          return `Failed to save session: ${error.message || 'Unknown error'}`;
        }
        
        return `✅ Session "${name}" saved successfully!`;
      } catch (error) {
        return `Error saving session: ${(error as Error).message}`;
      }
    });

    this.commands.set('load_session', async (args, userId) => {
      if (args.length === 0) {
        return 'Usage: /load_session {name}\nExample: /load_session my-project';
      }
      const name = args[0];
      
      try {
        const response = await fetch(`${this.storageUrl}/api/sessions/load/${userId}/${name}`);
        
        if (!response.ok) {
          const error = await response.json();
          return `Failed to load session: ${error.message || 'Unknown error'}`;
        }
        
        const session = await response.json();
        return `✅ Session "${name}" loaded!\nMessages: ${session.conversationHistory?.length || 0}\nLast activity: ${new Date(session.lastActivity).toLocaleString()}`;
      } catch (error) {
        return `Error loading session: ${(error as Error).message}`;
      }
    });

    this.commands.set('sessions', async (args, userId) => {
      try {
        const response = await fetch(`${this.storageUrl}/api/sessions/list/${userId}`);
        
        if (!response.ok) {
          const error = await response.json();
          return `Failed to list sessions: ${error.message || 'Unknown error'}`;
        }
        
        const sessions = await response.json();
        
        if (sessions.length === 0) {
          return 'No saved sessions found. Use /save_session {name} to save current session.';
        }
        
        const list = sessions.map((s: any) => 
          `  • ${s.name} - ${s.conversationHistory?.length || 0} messages (${new Date(s.lastActivity).toLocaleDateString()})`
        ).join('\n');
        
        return `Saved sessions (${sessions.length}):\n${list}`;
      } catch (error) {
        return `Error listing sessions: ${(error as Error).message}`;
      }
    });

    this.commands.set('delete_session', async (args, userId) => {
      if (args.length === 0) {
        return 'Usage: /delete_session {name}\nExample: /delete_session my-project';
      }
      const name = args[0];
      
      try {
        const response = await fetch(`${this.storageUrl}/api/sessions/delete/${userId}/${name}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const error = await response.json();
          return `Failed to delete session: ${error.message || 'Unknown error'}`;
        }
        
        return `✅ Session "${name}" deleted successfully!`;
      } catch (error) {
        return `Error deleting session: ${(error as Error).message}`;
      }
    });

    // Agent commands
    this.commands.set('agent', async () => {
      const activeAgent = this.agentConfigLoader.getActiveAgent();
      return `🤖 Current Agent: ${activeAgent.name} (${activeAgent.id})
Description: ${activeAgent.description}
Tools: ${activeAgent.tools.length} available
Skills: ${activeAgent.skills.join(', ')}
Rules: ${activeAgent.rules.length} active`;
    });

    this.commands.set('agents', async () => {
      const agents = this.agentConfigLoader.getAllAgents();
      const list = agents.map((a: any) => 
        `  ${a.active ? '✓' : ' '} ${a.id} - ${a.name}\n    ${a.description}\n    Tools: ${a.tools.length}, Skills: ${a.skills.length}`
      ).join('\n\n');
      return `Available Agents:\n\n${list}\n\nUse /switch_agent {id} to switch agents`;
    });

    this.commands.set('switch_agent', async (args) => {
      if (args.length === 0) {
        return 'Usage: /switch_agent {id}\nExample: /switch_agent code_assistant\n\nUse /agents to see available agents';
      }
      const agentId = args[0];
      if (!agentId) {
        return 'Error: Agent ID is required';
      }
      const success = this.agentConfigLoader.setActiveAgent(agentId);
      
      if (success) {
        const agent = this.agentConfigLoader.getAgentById(agentId);
        return `✅ Switched to agent: ${agent?.name || agentId}\nTools: ${agent?.tools.join(', ') || 'none'}\n\n⚠️ Note: Restart the AI agent service for changes to take effect`;
      } else {
        return `❌ Agent "${agentId}" not found. Use /agents to see available agents`;
      }
    });
  }

  /**
   * Check if input is a slash command
   */
  isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * Execute slash command
   */
  async execute(input: string, userId: string): Promise<{ success: boolean; output: string; type: string }> {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      return { success: false, output: 'Not a command', type: 'error' };
    }

    // Parse command and args
    const parts = trimmed.slice(1).split(/\s+/).filter(Boolean);
    if (parts.length === 0 || !parts[0]) {
      return { success: false, output: 'Empty command', type: 'error' };
    }
    
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commandFn = this.commands.get(commandName);
    if (!commandFn) {
      return {
        success: false,
        output: `Unknown command: /${commandName}. Type /help for available commands.`,
        type: 'error'
      };
    }

    try {
      const output = await commandFn(args, userId);
      return {
        success: true,
        output,
        type: commandName
      };
    } catch (error) {
      return {
        success: false,
        output: `Command failed: ${(error as Error).message}`,
        type: 'error'
      };
    }
  }

  /**
   * Get list of available commands
   */
  getCommands(): string[] {
    return Array.from(this.commands.keys()).sort();
  }
}

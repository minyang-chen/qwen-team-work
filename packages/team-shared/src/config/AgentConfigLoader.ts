import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AgentPolicy {
  max_file_size: string;
  allowed_file_types: string[];
  require_approval: string[];
  auto_save: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  active: boolean;
  systemPrompt: string;
  tools: string[];
  skills: string[];
  knowledge: string[];
  rules: string[];
  policies: AgentPolicy;
  mcpServers: string[];
}

export interface AgentConfigFile {
  agents: AgentConfig[];
  default_agent: string;
}

export class AgentConfigLoader {
  private config: AgentConfigFile | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(__dirname, '../../agent.json');
  }

  load(): AgentConfigFile {
    if (this.config) {
      return this.config;
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      console.log('[AgentConfigLoader] Loaded agent configuration');
      return this.config!;
    } catch (error) {
      console.error('[AgentConfigLoader] Failed to load agent.json:', error);
      // Return default configuration
      return this.getDefaultConfig();
    }
  }

  getActiveAgent(): AgentConfig {
    const config = this.load();
    const activeAgent = config.agents.find(a => a.active);
    if (activeAgent) {
      return activeAgent;
    }
    
    // Fallback to default agent
    const defaultAgent = config.agents.find(a => a.id === config.default_agent);
    if (defaultAgent) {
      return defaultAgent;
    }
    
    // Last resort: return first agent or throw error
    const firstAgent = config.agents[0];
    if (firstAgent) {
      return firstAgent;
    }
    
    throw new Error('No agents configured');
  }

  getAgentById(id: string): AgentConfig | undefined {
    const config = this.load();
    return config.agents.find(a => a.id === id);
  }

  getAllAgents(): AgentConfig[] {
    const config = this.load();
    return config.agents;
  }

  setActiveAgent(id: string): boolean {
    const config = this.load();
    const agent = config.agents.find(a => a.id === id);
    
    if (!agent) {
      return false;
    }

    // Deactivate all agents
    config.agents.forEach(a => a.active = false);
    
    // Activate the selected agent
    agent.active = true;

    // Save configuration
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log(`[AgentConfigLoader] Activated agent: ${id}`);
      return true;
    } catch (error) {
      console.error('[AgentConfigLoader] Failed to save configuration:', error);
      return false;
    }
  }

  private getDefaultConfig(): AgentConfigFile {
    return {
      agents: [
        {
          id: 'default',
          name: 'Default Agent',
          description: 'General purpose agent with all available tools',
          active: true,
          systemPrompt: 'default',
          tools: [
            'task',
            'list_directory',
            'read_file',
            'grep_search',
            'glob',
            'edit',
            'write_file',
            'read_many_files',
            'run_shell_command',
            'save_memory',
            'todo_write',
            'exit_plan_mode',
            'web_fetch',
            'web_search'
          ],
          skills: [
            'code_generation',
            'code_review',
            'debugging',
            'refactoring',
            'testing',
            'documentation'
          ],
          knowledge: [],
          rules: [
            'Always follow project conventions',
            'Validate user input before execution'
          ],
          policies: {
            max_file_size: '10MB',
            allowed_file_types: ['*'],
            require_approval: ['run_shell_command'],
            auto_save: true
          },
          mcpServers: []
        }
      ],
      default_agent: 'default'
    };
  }
}

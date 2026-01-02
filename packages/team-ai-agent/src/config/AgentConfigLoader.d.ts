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
    tools: string[];
    skills: string[];
    knowledge: string[];
    rules: string[];
    policies: AgentPolicy;
}
export interface AgentConfigFile {
    agents: AgentConfig[];
    default_agent: string;
}
export declare class AgentConfigLoader {
    private config;
    private configPath;
    constructor(configPath?: string);
    load(): AgentConfigFile;
    getActiveAgent(): AgentConfig;
    getAgentById(id: string): AgentConfig | undefined;
    getAllAgents(): AgentConfig[];
    setActiveAgent(id: string): boolean;
    private getDefaultConfig;
}

// This file is deprecated - tool execution now handled by team-ai-agent via ACP
// Keeping minimal interface for backward compatibility

export class ToolExecutor {
  constructor(config: any) {
    console.warn('[DEPRECATED] ToolExecutor in team-service is deprecated. Tool execution now handled by team-ai-agent via ACP.');
  }

  async executeTools(toolRequests: any[], signal: AbortSignal): Promise<any[]> {
    throw new Error('Tool execution moved to team-ai-agent. Use AIServiceClient instead.');
  }
}

import { ServerClient, EnhancedServerConfig, EnhancedQueryResult } from '@qwen-team/server-sdk';
import { 
  Config
} from '@qwen-code/core';
import * as shared from '@qwen-team/shared';
const { uiServerLogger } = shared;

interface EnhancedClientSession {
  client: ServerClient;
  userId: string;
  teamId?: string;
  projectId?: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  capabilities: string[];
  teamContext?: TeamContext;
}

interface TeamContext {
  teamId: string;
  teamName: string;
  projectName: string;
  members: string[];
  sharedMemory: any;
  toolApprovals: any;
}

interface EnhancedMessageContext {
  teamId?: string;
  projectId?: string;
  projectFiles?: string[];
  teamMembers?: string[];
  sharedMemory?: any;
  toolApprovals?: any;
}

interface EnhancedAIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  sessionTimeout?: number;
  maxSessions?: number;
  enableTelemetry?: boolean;
  enableTeamFeatures?: boolean;
}

export class EnhancedAIService {
  private sessions = new Map<string, EnhancedClientSession>();
  private config: EnhancedAIServiceConfig;
  private cleanupInterval: NodeJS.Timeout;
  private telemetryService?: any;
  private authService?: any;

  constructor(config: EnhancedAIServiceConfig) {
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes default
      maxSessions: 1000,
      enableTelemetry: true,
      enableTeamFeatures: true,
      ...config,
    };

    // Initialize enhanced services
    this.setupEnhancedServices();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes

    uiServerLogger.info('EnhancedAIService initialized', {
      model: this.config.model,
      maxSessions: this.config.maxSessions,
      teamFeatures: this.config.enableTeamFeatures,
      telemetry: this.config.enableTelemetry,
    });
  }

  private setupEnhancedServices(): void {
    if (this.config.enableTelemetry) {
      // Initialize telemetry service
      // this.telemetryService = new TelemetryService();
    }

    if (this.config.enableTeamFeatures) {
      // Initialize authentication service
      // this.authService = new AuthenticationService();
    }
  }

  async getClient(
    userId: string, 
    teamId?: string, 
    projectId?: string,
    workingDirectory?: string
  ): Promise<ServerClient> {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    let session = this.sessions.get(sessionKey);

    if (!session) {
      // Check max sessions limit
      if (this.sessions.size >= this.config.maxSessions!) {
        throw new Error('Maximum number of sessions reached');
      }

      // Load team context if teamId provided
      const teamContext = teamId ? await this.loadTeamContext(teamId, projectId) : undefined;

      // Create enhanced client configuration
      const clientConfig: EnhancedServerConfig = {
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl,
        model: await this.getModelForTeam(teamId),
        sessionId: sessionKey,
        workingDirectory: workingDirectory || '/workspace',
        approvalMode: 'yolo',
        teamId,
        projectId,
        mcpServers: await this.getMCPServersForTeam(teamId),
        toolPreferences: await this.getToolPreferences(userId, teamId),
        collaborationMode: teamId ? 'shared' : 'individual',
      };

      const client = new ServerClient(clientConfig);

      try {
        await client.initialize();

        session = {
          client,
          userId,
          teamId,
          projectId,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          messageCount: 0,
          tokenUsage: {
            input: 0,
            output: 0,
            total: 0,
          },
          capabilities: ['compression', 'streaming', 'tools', 'collaboration'],
          teamContext,
        };

        this.sessions.set(sessionKey, session);
        uiServerLogger.info('Enhanced AI client created', { 
          userId, 
          teamId, 
          projectId,
          totalSessions: this.sessions.size 
        });
      } catch (error) {
        uiServerLogger.error('Failed to initialize enhanced AI client', { 
          userId, 
          teamId, 
          projectId 
        }, error as Error);
        throw error;
      }
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session.client;
  }

  async processMessage(
    userId: string,
    message: string,
    context: EnhancedMessageContext = {},
    workingDirectory?: string
  ): Promise<EnhancedQueryResult> {
    const client = await this.getClient(
      userId, 
      context.teamId, 
      context.projectId, 
      workingDirectory
    );
    
    const sessionKey = `${userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`;
    const session = this.sessions.get(sessionKey)!;

    try {
      // Enhanced processing with full context
      const result = await client.query(message, {
        sessionContext: session.teamContext ? [session.teamContext] : [],
        mcpServers: await this.getMCPServersForTeam(context.teamId),
        toolPreferences: await this.getToolPreferences(userId, context.teamId),
      });

      // Update session stats
      session.messageCount++;
      session.lastActivity = Date.now();
      if (result.usage) {
        session.tokenUsage.input += result.usage.input;
        session.tokenUsage.output += result.usage.output;
        session.tokenUsage.total += result.usage.total;
      }

      // Track telemetry if enabled
      if (this.telemetryService) {
        this.telemetryService.recordInteraction(userId, {
          messageLength: message.length,
          responseLength: result.text.length,
          tokenUsage: result.usage,
          teamId: context.teamId,
          projectId: context.projectId,
          toolsUsed: result.toolResults?.length || 0,
        });
      }

      uiServerLogger.info('Enhanced message processed', {
        userId,
        teamId: context.teamId,
        projectId: context.projectId,
        messageCount: session.messageCount,
        tokenUsage: session.tokenUsage,
        toolsUsed: result.toolResults?.length || 0,
      });

      return result;
    } catch (error) {
      uiServerLogger.error('Enhanced message processing failed', { 
        userId, 
        teamId: context.teamId,
        projectId: context.projectId 
      }, error as Error);
      throw error;
    }
  }

  async *processMessageStream(
    userId: string,
    message: string,
    context: EnhancedMessageContext = {},
    workingDirectory?: string
  ): AsyncIterator<any> {
    const client = await this.getClient(
      userId, 
      context.teamId, 
      context.projectId, 
      workingDirectory
    );
    
    const sessionKey = `${userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`;
    const session = this.sessions.get(sessionKey)!;

    try {
      session.messageCount++;
      session.lastActivity = Date.now();

      const stream = client.queryStream(message, {
        sessionContext: session.teamContext ? [session.teamContext] : [],
        mcpServers: await this.getMCPServersForTeam(context.teamId),
        toolPreferences: await this.getToolPreferences(userId, context.teamId),
      });

      for await (const chunk of stream) {
        session.lastActivity = Date.now();
        yield chunk;
      }

      uiServerLogger.info('Enhanced stream completed', {
        userId,
        teamId: context.teamId,
        projectId: context.projectId,
        messageCount: session.messageCount,
      });
    } catch (error) {
      uiServerLogger.error('Enhanced stream processing failed', { 
        userId, 
        teamId: context.teamId,
        projectId: context.projectId 
      }, error as Error);
      throw error;
    }
  }

  private async loadTeamContext(teamId: string, projectId?: string): Promise<TeamContext> {
    // TODO: Load from team storage service
    return {
      teamId,
      teamName: `Team ${teamId}`,
      projectName: projectId ? `Project ${projectId}` : 'Default Project',
      members: [], // Load from team service
      sharedMemory: {}, // Load shared context
      toolApprovals: {}, // Load approval settings
    };
  }

  private async getModelForTeam(teamId?: string): Promise<string> {
    if (!teamId) return this.config.model || 'qwen-coder-plus';
    
    // TODO: Load team-specific model preferences
    return this.config.model || 'qwen-coder-plus';
  }

  private async getMCPServersForTeam(teamId?: string): Promise<any> {
    if (!teamId) return {};
    
    // TODO: Load team-specific MCP server configurations
    return {};
  }

  private async getToolPreferences(userId: string, teamId?: string): Promise<any> {
    // TODO: Load user/team tool preferences
    return {
      preferredShell: 'bash',
      autoApproveTools: ['read_file', 'ls', 'grep'],
      requireApproval: ['write_file', 'shell'],
    };
  }

  getSessionStats(userId: string, teamId?: string, projectId?: string): EnhancedClientSession | null {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    return this.sessions.get(sessionKey) || null;
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getHealthStatus() {
    return {
      status: 'healthy',
      activeSessions: this.sessions.size,
      maxSessions: this.config.maxSessions,
      model: this.config.model,
      teamFeatures: this.config.enableTeamFeatures,
      telemetry: this.config.enableTelemetry,
      timestamp: new Date().toISOString(),
    };
  }

  async removeSession(userId: string, teamId?: string, projectId?: string): Promise<boolean> {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      try {
        await session.client.cleanup();
        this.sessions.delete(sessionKey);
        uiServerLogger.info('Enhanced session removed', { 
          userId, 
          teamId, 
          projectId,
          remainingSessions: this.sessions.size 
        });
        return true;
      } catch (error) {
        uiServerLogger.error('Failed to remove enhanced session', { 
          userId, 
          teamId, 
          projectId 
        }, error as Error);
        return false;
      }
    }
    return false;
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeout = this.config.sessionTimeout!;
    const toRemove: string[] = [];

    for (const [sessionKey, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        toRemove.push(sessionKey);
      }
    }

    if (toRemove.length > 0) {
      uiServerLogger.info('Cleaning up inactive enhanced sessions', { count: toRemove.length });

      for (const sessionKey of toRemove) {
        const session = this.sessions.get(sessionKey);
        if (session) {
          await this.removeSession(session.userId, session.teamId, session.projectId);
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);

    uiServerLogger.info('Shutting down EnhancedAIService', { activeSessions: this.sessions.size });

    const promises = Array.from(this.sessions.values()).map((session) => 
      this.removeSession(session.userId, session.teamId, session.projectId)
    );
    await Promise.all(promises);

    uiServerLogger.info('EnhancedAIService shutdown complete');
  }
}

// Create singleton instance
let enhancedAIServiceInstance: EnhancedAIService | null = null;

export function createEnhancedAIService(config: EnhancedAIServiceConfig): EnhancedAIService {
  if (!enhancedAIServiceInstance) {
    enhancedAIServiceInstance = new EnhancedAIService(config);
  }
  return enhancedAIServiceInstance;
}

export function getEnhancedAIService(): EnhancedAIService {
  if (!enhancedAIServiceInstance) {
    throw new Error('EnhancedAIService not initialized. Call createEnhancedAIService first.');
  }
  return enhancedAIServiceInstance;
}

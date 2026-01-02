import { AIServiceClient } from './AIServiceClient.js';
import * as shared from '@qwen-team/shared';
const { uiServerLogger } = shared;

interface EnhancedClientSession {
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
  agentEndpoint: string;
  sessionTimeout?: number;
  maxSessions?: number;
  enableTelemetry?: boolean;
  enableTeamFeatures?: boolean;
}

export class EnhancedAIService {
  private sessions = new Map<string, EnhancedClientSession>();
  private config: EnhancedAIServiceConfig;
  private cleanupInterval: NodeJS.Timeout;
  private aiClient: AIServiceClient;
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

    // Initialize AI service client
    this.aiClient = new AIServiceClient({
      agentEndpoint: this.config.agentEndpoint,
      timeout: 30000,
      retries: 3
    });

    // Initialize enhanced services
    this.setupEnhancedServices();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes

    uiServerLogger.info('EnhancedAIService initialized', {
      agentEndpoint: this.config.agentEndpoint,
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

  async getOrCreateSession(
    userId: string, 
    teamId?: string, 
    projectId?: string,
    workingDirectory?: string
  ): Promise<EnhancedClientSession> {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    let session = this.sessions.get(sessionKey);

    if (!session) {
      // Check max sessions limit
      if (this.sessions.size >= this.config.maxSessions!) {
        throw new Error('Maximum number of sessions reached');
      }

      // Load team context if teamId provided
      const teamContext = teamId ? await this.loadTeamContext(teamId, projectId) : undefined;

      session = {
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
      uiServerLogger.info('Enhanced AI session created', { 
        userId, 
        teamId, 
        projectId,
        totalSessions: this.sessions.size 
      });
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  async processMessage(
    userId: string,
    message: string,
    context: EnhancedMessageContext = {},
    workingDirectory?: string
  ): Promise<any> {
    const session = await this.getOrCreateSession(
      userId, 
      context.teamId, 
      context.projectId, 
      workingDirectory
    );

    try {
      // Send message to AI agent via ACP
      const result = await this.aiClient.sendMessage(message, {
        sessionId: `${userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`,
        userId,
        teamId: context.teamId,
        projectId: context.projectId,
        workingDirectory
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
          responseLength: result.text?.length || 0,
          tokenUsage: result.usage,
          teamId: context.teamId,
          projectId: context.projectId,
          toolsUsed: result.toolResults?.length || 0,
        });
      }

      uiServerLogger.info('Enhanced message processed via ACP', {
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
    const session = await this.getOrCreateSession(
      userId, 
      context.teamId, 
      context.projectId, 
      workingDirectory
    );

    try {
      session.messageCount++;
      session.lastActivity = Date.now();

      // Stream message via ACP
      const stream = this.aiClient.streamMessage(message, {
        sessionId: `${userId}-${context.teamId || 'individual'}-${context.projectId || 'default'}`,
        userId,
        teamId: context.teamId,
        projectId: context.projectId,
        workingDirectory
      });

      for await (const chunk of stream) {
        session.lastActivity = Date.now();
        yield chunk;
      }

      uiServerLogger.info('Enhanced stream completed via ACP', {
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

  getSessionStats(userId: string, teamId?: string, projectId?: string): EnhancedClientSession | null {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    return this.sessions.get(sessionKey) || null;
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  async getHealthStatus() {
    try {
      const agentHealth = await this.aiClient.getHealth();
      return {
        status: 'healthy',
        activeSessions: this.sessions.size,
        maxSessions: this.config.maxSessions,
        agentHealth,
        teamFeatures: this.config.enableTeamFeatures,
        telemetry: this.config.enableTelemetry,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        activeSessions: this.sessions.size,
        maxSessions: this.config.maxSessions,
        agentHealth: { status: 'unhealthy', error: (error as Error).message },
        teamFeatures: this.config.enableTeamFeatures,
        telemetry: this.config.enableTelemetry,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async removeSession(userId: string, teamId?: string, projectId?: string): Promise<boolean> {
    const sessionKey = `${userId}-${teamId || 'individual'}-${projectId || 'default'}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      this.sessions.delete(sessionKey);
      uiServerLogger.info('Enhanced session removed', { 
        userId, 
        teamId, 
        projectId,
        remainingSessions: this.sessions.size 
      });
      return true;
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

    await this.aiClient.disconnect();
    this.sessions.clear();

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

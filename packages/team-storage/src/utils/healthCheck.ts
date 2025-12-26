// @ts-nocheck
import { configManager, backendLogger } from '@qwen-team/shared';

const logger = backendLogger.child({ service: 'healthCheck' });
const config = configManager.getBackendConfig();

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: number;
  responseTime?: number;
  error?: string;
}

class HealthMonitor {
  private healthStatus = new Map<string, ServiceHealth>();
  private checkInterval = 30000; // 30 seconds

  constructor() {
    setInterval(() => this.performHealthChecks(), this.checkInterval);
  }

  async checkCoreAgent(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const coreAgentUrl = config.CORE_AGENT_URL || 'ws://localhost:8001';
      const healthUrl = coreAgentUrl.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';
      
      const response = await fetch(healthUrl, { 
        method: 'GET',
        timeout: 5000 
      });
      
      const responseTime = Date.now() - start;
      const status = response.ok ? 'healthy' : 'degraded';
      
      return {
        service: 'core-agent',
        status,
        lastCheck: Date.now(),
        responseTime
      };
    } catch (error) {
      return {
        service: 'core-agent',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(config.MONGODB_URI);
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      
      return {
        service: 'mongodb',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'mongodb',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1
      });
      
      await redis.ping();
      await redis.disconnect();
      
      return {
        service: 'redis',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkNFS(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const nfsPath = config.NFS_BASE_PATH || '/mnt/nfs';
      const { access, constants } = await import('fs/promises');
      
      // Check if NFS mount is accessible
      await access(nfsPath, constants.R_OK | constants.W_OK);
      
      return {
        service: 'nfs',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'nfs',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkDocker(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Check if Docker daemon is running
      await execAsync('docker info', { timeout: 5000 });
      
      return {
        service: 'docker',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'docker',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkTeamUIServer(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const uiServerUrl = config.TEAM_UI_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${uiServerUrl}/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      
      return {
        service: 'team-ui-server',
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'team-ui-server',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkTeamUIClient(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const clientUrl = config.TEAM_UI_CLIENT_URL || 'http://localhost:3000';
      const response = await fetch(clientUrl, { 
        method: 'HEAD',
        timeout: 5000 
      });
      
      return {
        service: 'team-ui-client',
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        service: 'team-ui-client',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkTeamBackend(): Promise<ServiceHealth> {
    // Self-check - always healthy if this code is running
    return {
      service: 'team-storage',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 1
    };
  }

  async checkLLMService(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const baseUrl = config.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const apiKey = config.OPENAI_API_KEY;
      
      if (!apiKey) {
        return {
          service: 'llm',
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime: Date.now() - start,
          error: 'No API key configured'
        };
      }

      // Test with a simple models list request
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return {
          service: 'llm',
          status: 'healthy',
          lastCheck: Date.now(),
          responseTime
        };
      } else {
        return {
          service: 'llm',
          status: 'degraded',
          lastCheck: Date.now(),
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        service: 'llm',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkEmbeddingService(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const baseUrl = config.EMBEDDING_BASE_URL || config.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const apiKey = config.OPENAI_API_KEY;
      
      if (!apiKey) {
        return {
          service: 'embedding',
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime: Date.now() - start,
          error: 'No API key configured'
        };
      }

      // Test with a simple embedding request
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.EMBEDDING_MODEL || 'text-embedding-ada-002',
          input: 'health check'
        }),
        timeout: 10000
      });

      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return {
          service: 'embedding',
          status: 'healthy',
          lastCheck: Date.now(),
          responseTime
        };
      } else {
        return {
          service: 'embedding',
          status: 'degraded',
          lastCheck: Date.now(),
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        service: 'embedding',
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  private async performHealthChecks() {
    const checks = [
      this.checkCoreAgent(),
      this.checkDatabase(),
      this.checkRedis(),
      this.checkNFS(),
      this.checkDocker(),
      this.checkTeamUIServer(),
      this.checkTeamUIClient(),
      this.checkTeamBackend(),
      this.checkLLMService(),
      this.checkEmbeddingService()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.healthStatus.set(result.value.service, result.value);
      }
    });
  }

  getHealthStatus(): Record<string, ServiceHealth> {
    return Object.fromEntries(this.healthStatus);
  }

  getGroupedHealthStatus() {
    const services = this.getHealthStatus();
    
    return {
      teamServices: {
        'team-storage': services['team-storage'],
        'team-ui-server': services['team-ui-server'],
        'team-ui-client': services['team-ui-client'],
        'core-agent': services['core-agent']
      },
      infrastructure: {
        'mongodb': services['mongodb'],
        'redis': services['redis'],
        'nfs': services['nfs'],
        'docker': services['docker']
      },
      aiServices: {
        'llm': services['llm'],
        'embedding': services['embedding']
      }
    };
  }

  isHealthy(): boolean {
    return Array.from(this.healthStatus.values()).every(
      health => health.status === 'healthy'
    );
  }
}

export const healthMonitor = new HealthMonitor();

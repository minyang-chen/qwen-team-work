import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { AcpMessage, AgentConfig } from '@qwen-team/shared';
import { ServerClient } from '@qwen-team/server-sdk';
import { MessageRouter } from './MessageRouter.js';
import { DiscoveryManager } from '../discovery/DiscoveryManager.js';
import { MessageValidator } from '../protocol/MessageValidator.js';
import { Logger } from '../utils/Logger.js';
import { UserSessionManager } from '../session/UserSessionManager.js';
import * as config from '../config/env.js';

export class AcpServer {
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private messageRouter: MessageRouter;
  private discoveryManager = new DiscoveryManager();
  private sessionManager: UserSessionManager;
  private serverClient?: ServerClient;

  constructor(port: number = 8001, agents: AgentConfig[] = []) {
    this.sessionManager = new UserSessionManager();
    
    // Don't create global ServerClient - UserSessionManager creates per-user instances
    this.messageRouter = new MessageRouter(this.sessionManager, null);
    this.discoveryManager.initialize(agents);
    
    // Create HTTP server for health checks
    this.httpServer = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        const health = await this.getHealthStatus();
        res.writeHead(health.status === 'healthy' ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    this.wss = new WebSocketServer({ 
      server: this.httpServer
    });
    
    this.httpServer.listen(port, '0.0.0.0');
    
    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data) => {
        try {
          const rawMessage = data.toString();
          let message;
          
          try {
            message = JSON.parse(rawMessage);
          } catch (parseError) {
            ws.send(JSON.stringify({
              id: 'parse-error',
              type: 'error',
              error: {
                code: 'INVALID_JSON',
                message: 'Invalid JSON format'
              }
            }));
            return;
          }
          
          if (!MessageValidator.validateMessage(message)) {
            ws.send(JSON.stringify({
              id: 'invalid',
              success: false,
              error: { code: 'INVALID_MESSAGE', message: 'Invalid message format' },
              timestamp: Date.now()
            }));
            return;
          }

          const response = await this.messageRouter.routeMessage(message);
          ws.send(JSON.stringify(response));
        } catch (error) {
          Logger.error('Message processing failed', error);
          ws.send(JSON.stringify({
            id: 'error',
            success: false,
            error: { code: 'PROCESSING_ERROR', message: 'Failed to process message' },
            timestamp: Date.now()
          }));
        }
      });
    });

    Logger.info(`ACP Server started on port ${port}`);
    
    // Initialize ServerClient after server is started
    this.initializeServerClient();
  }

  async start(): Promise<void> {
    // Wait for ServerClient initialization to complete
    await this.initializeServerClient();
    Logger.info('ACP Server fully initialized and ready');
  }

  private async initializeServerClient() {
    try {
      console.log('[AcpServer] Initializing ServerClient...');
      await this.serverClient.initialize();
      console.log('[AcpServer] ServerClient initialized with tool execution capabilities');
      
      // Log ServerClient configuration
      const config = (this.serverClient as any).config;
      console.log('[AcpServer] ServerClient config - approval mode:', config?.getApprovalMode?.());
      console.log('[AcpServer] ServerClient config - model:', config?.getModel?.());
      
    } catch (error) {
      console.error('[AcpServer] Failed to initialize ServerClient:', error);
    }
  }

  private async getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: await this.checkRedis(),
        websocket: { status: 'healthy', connections: this.wss.clients.size },
        sessions: { status: 'healthy', count: 0 }
      }
    };
  }

  private async checkRedis() {
    try {
      // Check if Redis is actually needed for this service
      if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
        return { status: 'healthy', note: 'Redis not configured, skipping check' };
      }

      const { default: Redis } = await import('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        lazyConnect: true
      });
      await redis.ping();
      await redis.disconnect();
      return { status: 'healthy' };
    } catch (error: any) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async getAvailableAgent(): Promise<AgentConfig | null> {
    return await this.discoveryManager.getAvailableAgent();
  }

  close(): void {
    this.wss.close();
    this.httpServer.close();
  }
}

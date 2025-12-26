import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { AcpMessage, AgentConfig, configManager } from '@qwen-team/shared';
import { ServerClient } from '@qwen-team/server-sdk';
import { MessageRouter } from './MessageRouter.js';
import { DiscoveryManager } from '../discovery/DiscoveryManager.js';
import { MessageValidator } from '../protocol/MessageValidator.js';
import { Logger } from '../utils/Logger.js';
import { UserSessionManager } from '../session/UserSessionManager.js';

export class AcpServer {
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private messageRouter: MessageRouter;
  private discoveryManager = new DiscoveryManager();
  private sessionManager: UserSessionManager;
  private serverClient: ServerClient;

  constructor(port: number = 8001, agents: AgentConfig[] = []) {
    this.sessionManager = new UserSessionManager();
    
    // Initialize ServerClient with config manager
    this.serverClient = new ServerClient({
      apiKey: configManager.get('OPENAI_API_KEY'),
      baseUrl: configManager.get('OPENAI_BASE_URL'),
      model: configManager.get('OPENAI_MODEL'),
      approvalMode: 'yolo',
    });
    
    this.messageRouter = new MessageRouter(this.sessionManager, this.serverClient);
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
          const message = JSON.parse(rawMessage);
          
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
      const Redis = require('ioredis');
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

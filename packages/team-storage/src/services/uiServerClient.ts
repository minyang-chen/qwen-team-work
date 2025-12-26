// @ts-nocheck
import WebSocket from 'ws';
import { nanoid } from 'nanoid';
import { coreAgentCircuitBreaker } from '../utils/circuitBreaker';
import { backendLogger, AppError, ErrorCode } from '@qwen-team/shared';

interface StreamHandler {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

interface AcpMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  correlationId?: string;
}

interface AcpResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
  timestamp: number;
  correlationId?: string;
}

class CoreAgentClient {
  private connectionPool = new Map<string, WebSocket[]>();
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private maxPoolSize = 5;
  private messageBatch = new Map<string, AcpMessage[]>();
  private batchTimeout = new Map<string, NodeJS.Timeout>();
  private batchSize = 10;
  private batchDelay = 100; // ms
  private logger = backendLogger.child({ component: 'CoreAgentClient' });

  async getConnection(userId: string): Promise<WebSocket> {
    const pool = this.connectionPool.get(userId) || [];
    
    // Find available connection
    const available = pool.find(ws => ws.readyState === WebSocket.OPEN);
    if (available) return available;

    // Create new connection if pool not full
    if (pool.length < this.maxPoolSize) {
      const newConnection = await this.createConnection(userId);
      pool.push(newConnection);
      this.connectionPool.set(userId, pool);
      return newConnection;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkAvailable = () => {
        const available = pool.find(ws => ws.readyState === WebSocket.OPEN);
        if (available) resolve(available);
        else setTimeout(checkAvailable, 100);
      };
      checkAvailable();
    });
  }

  private async createConnection(userId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const coreAgentUrl = process.env.CORE_AGENT_URL || 'ws://localhost:8001';
      const ws = new WebSocket(coreAgentUrl, { 
        perMessageDeflate: true // Enable compression
      });

      const connectionTimeout = setTimeout(() => {
        ws.close();
        reject(new AppError(ErrorCode.TIMEOUT_ERROR, 'Core Agent connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.logger.info('Connection established', { userId, url: coreAgentUrl });
        resolve(ws);
      });

      ws.on('close', () => {
        this.logger.info('Connection closed', { userId });
        this.removeFromPool(userId, ws);
      });

      ws.on('error', (error) => {
        this.logger.error('Connection error', { userId }, error);
        clearTimeout(connectionTimeout);
        this.removeFromPool(userId, ws);
        reject(new AppError(ErrorCode.CONNECTION_ERROR, 'Core Agent connection failed', 500, error.message));
      });

      ws.on('message', (data) => {
        try {
          const response: AcpResponse = JSON.parse(data.toString());
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            if (response.success) {
              pending.resolve(response);
            } else {
              pending.reject(new AppError(ErrorCode.OPERATION_FAILED, response.error?.message || 'ACP request failed'));
            }
          }
        } catch (error) {
          this.logger.error('Message parse error', { userId }, error as Error);
        }
      });
    });
  }

  private removeFromPool(userId: string, ws: WebSocket) {
    const pool = this.connectionPool.get(userId) || [];
    const index = pool.indexOf(ws);
    if (index > -1) {
      pool.splice(index, 1);
      if (pool.length === 0) {
        this.connectionPool.delete(userId);
      } else {
        this.connectionPool.set(userId, pool);
      }
    }
  }

  private async sendAcpMessage(userId: string, type: string, data: any, correlationId?: string): Promise<AcpResponse> {
    const messageId = nanoid();
    
    const message: AcpMessage = {
      id: messageId,
      type,
      data,
      timestamp: Date.now(),
      correlationId
    };

    // Add to batch
    const batch = this.messageBatch.get(userId) || [];
    batch.push(message);
    this.messageBatch.set(userId, batch);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('ACP request timeout'));
      }, 30000);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      // Send batch if full or start timer
      if (batch.length >= this.batchSize) {
        this.flushBatch(userId);
      } else if (!this.batchTimeout.has(userId)) {
        const timer = setTimeout(() => this.flushBatch(userId), this.batchDelay);
        this.batchTimeout.set(userId, timer);
      }
    });
  }

  private async flushBatch(userId: string) {
    const batch = this.messageBatch.get(userId);
    if (!batch || batch.length === 0) return;

    const timer = this.batchTimeout.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimeout.delete(userId);
    }

    this.messageBatch.set(userId, []);

    try {
      const ws = await this.getConnection(userId);
      
      if (batch.length === 1) {
        ws.send(JSON.stringify(batch[0]));
      } else {
        // Send as batch message
        ws.send(JSON.stringify({
          id: nanoid(),
          type: 'batch',
          data: { messages: batch },
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('[CoreAgent] Batch send error:', error);
      // Reject all pending requests in batch
      batch.forEach(msg => {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(msg.id);
          pending.reject(error);
        }
      });
    }
  }

  async sendMessageStream(
    userId: string,
    token: string,
    message: string,
    sessionId: string,
    streamHandler: StreamHandler
  ): Promise<void> {
    try {
      const correlationId = nanoid();
      
      // Use circuit breaker for core agent communication
      await coreAgentCircuitBreaker.execute(async () => {
        // Send chat message via ACP protocol
        const response = await this.sendAcpMessage(userId, 'chat.send', {
          sessionId,
          content: message,
          streaming: true
        }, correlationId);

        if (response.success && response.data?.content) {
          // Simulate streaming by chunking the response
          const content = response.data.content;
          const chunkSize = 50;
          
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            streamHandler.onChunk(chunk);
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
          }
          
          streamHandler.onComplete();
        } else {
          throw new Error(response.error?.message || 'Failed to send message');
        }
      });
    } catch (error) {
      console.error('[CoreAgent] Send stream error:', error);
      streamHandler.onError(error as Error);
      throw error;
    }
  }

  closeConnection(userId: string) {
    const pool = this.connectionPool.get(userId) || [];
    pool.forEach(ws => ws.close());
    this.connectionPool.delete(userId);
    console.log(`[CoreAgent] All connections closed for user ${userId} (logout)`);
  }
}

export const coreAgentClient = new CoreAgentClient();

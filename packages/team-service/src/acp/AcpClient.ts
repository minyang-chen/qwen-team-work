import WebSocket from 'ws';
import type { AcpMessage } from '@qwen-team/shared';
import type { AgentConfig, AcpResponse, IAgentDiscovery } from '@qwen-team/shared';
import type { ISessionService } from '@qwen-team/shared';
import { nanoid } from 'nanoid';

// Extended message type for internal ACP operations
type ExtendedAcpMessage = {
  id: string;
  type: 'session.create' | 'chat.send' | 'tool.execute' | 'tools.execute' | 'session.destroy' | 'session.updateTokens' | 'session.getStats' | 'health.check';
  data: any;
  timestamp: number;
};

export class AcpClient {
  private ws: WebSocket | null = null;
  public sessionId: string | null = null;
  public connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(private agentDiscovery: IAgentDiscovery) {}

  async connect(capabilities: string | string[]): Promise<void> {
    // Discover and connect to best agent (use first capability as primary)
    const capArray = Array.isArray(capabilities) ? capabilities : [capabilities];
    const capability = capArray[0] || 'session.create';
    const agent = await this.agentDiscovery.selectBestAgent(capability);
    if (!agent?.endpoint) {
      throw new Error('No compatible agents found or agent missing endpoint');
    }

    this.connectionState = 'connecting';
    this.ws = new WebSocket(agent.endpoint);

    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.setupMessageHandling();
        resolve();
      };

      this.ws!.onerror = (error) => {
        this.connectionState = 'error';
        reject(error);
      };

      this.ws!.onclose = () => {
        this.connectionState = 'disconnected';
        this.handleDisconnection();
      };

      // Connection timeout
      setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.connectionState = 'error';
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async request(type: 'chat.send' | 'tool.execute' | 'tools.execute' | 'session.create' | 'session.destroy' | 'session.updateTokens' | 'session.getStats' | 'health.check', payload: any): Promise<any> {
    if (this.connectionState !== 'connected') {
      await this.ensureConnection();
    }

    const id = nanoid();
    
    // Convert extended types to ACP protocol format
    let messageType: string;
    let messageData: any;
    
    if (type.startsWith('session.')) {
      messageType = 'session';
      const action = type.split('.')[1]; // 'create', 'destroy', 'updateTokens', 'getStats'
      messageData = { action, ...payload };
    } else if (type.startsWith('chat.')) {
      messageType = 'chat';
      const action = type.split('.')[1]; // 'send'
      messageData = { action, ...payload };
    } else if (type.startsWith('tool.') || type.startsWith('tools.')) {
      messageType = 'tool';
      const action = type.includes('.') ? type.split('.')[1] : 'execute';
      messageData = { action, ...payload };
    } else {
      messageType = type;
      messageData = payload;
    }
    
    const message: ExtendedAcpMessage = {
      id,
      type: messageType as any,
      data: messageData,
      timestamp: Date.now()
    };

    console.log('Sending ACP message:', JSON.stringify(message, null, 2));

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }

      // Request timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${type}`));
        }
      }, 30000);
    });
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionState === 'connected') return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      await this.reconnect();
    } else {
      throw new Error('Max reconnection attempts reached');
    }
  }

  private async reconnect(): Promise<void> {
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.reconnectAttempts) * 1000));
    
    try {
      await this.connect(['session.create', 'chatsend', 'toolsexecute']);
    } catch (error) {
      console.error('Reconnection failed:', error);
      throw error;
    }
  }

  private setupMessageHandling(): void {
    this.ws!.onmessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
        const response: AcpResponse = JSON.parse(data);
        this.handleResponse(response);
      } catch (error) {
        console.error('Failed to parse ACP response:', error);
      }
    };
  }

  private handleResponse(response: AcpResponse): void {
    console.log('ACP Response received:', JSON.stringify(response, null, 2));
    const pending = this.pendingRequests.get(response.id);
    
    if (pending) {
      if (response.success) {
        pending.resolve(response.data);
      } else {
        console.error('ACP Request failed - Response:', JSON.stringify(response, null, 2));
        pending.reject(new Error(
          typeof response.error === 'string' 
            ? response.error 
            : (response.error as any)?.message || 'Failed to handle session message'
        ));
      }
      this.pendingRequests.delete(response.id);
    }
  }

  private handleDisconnection(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Connection lost'));
    }
    this.pendingRequests.clear();

    // Attempt reconnection if not intentionally disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.ensureConnection().catch(console.error);
      }, 1000);
    }
  }

  async disconnect(): Promise<void> {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    
    if (this.sessionId) {
      try {
        await this.request('session.destroy', { sessionId: this.sessionId });
      } catch (error) {
        console.warn('Failed to properly destroy session:', error);
      }
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.sessionId = null;
  }

  getAgentUrl(): string {
    return this.ws?.url || '';
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

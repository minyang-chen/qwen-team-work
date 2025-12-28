import WebSocket from 'ws';
import type { AcpMessage } from '@qwen-team/shared';
import type { AgentConfig, AcpResponse, IAgentDiscovery } from '////shared/dist/types/AcpTypes';
import type { ISessionService } from '////shared/dist/interfaces/ISessionService';
import { nanoid } from 'nanoid';

export class AcpClient {
  private ws: WebSocket | null = null;
  public sessionId: string | null = null;
  public connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(private agentDiscovery: IAgentDiscovery) {}

  async connect(capabilities: string[]): Promise<void> {
    // Discover and connect to best agent
    const agent = await this.agentDiscoveryselectBestAgent(capabilities);
    if (!agent) {
      throw new Error('No compatible agents found');
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

  async request(type: string, payload: any): Promise<any> {
    if (this.connectionState !== 'connected') {
      await this.ensureConnection();
    }

    const id = nanoid();
    const message: AcpMessage = {
      id,
      type,
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.pendingRequestsset(id, { resolve, reject });
      
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }

      // Request timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequestsdelete(id);
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
        const response: AcpResponse = JSON.parse(event.data);
        this.handleResponse(response);
      } catch (error) {
        console.error('Failed to parse ACP response:', error);
      }
    };
  }

  private handleResponse(response: AcpResponse): void {
    const pending = this.pendingRequestsget(responseid);
    
    if (pending) {
      if (responsesuccess) {
        pendingresolve(responsedata);
      } else {
        pendingreject(new Error(responseerror?.message || 'Request failed'));
      }
      this.pendingRequestsdelete(responseid);
    }
  }

  private handleDisconnection(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pendingreject(new Error('Connection lost'));
    }
    this.pendingRequestsclear();

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
      this.wsclose();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.sessionId = null;
  }

  getAgentUrl(): string {
    return this.ws?.url || '';
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocketOPEN;
  }
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

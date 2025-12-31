import { WebSocketServer } from 'ws';

export class RealtimeStreaming {
  private wss: WebSocketServer;

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws) => {
      console.log('Client connected to realtime streaming');
      
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected from realtime streaming');
      });
    });
  }

  private handleMessage(ws: any, data: any): void {
    // Handle incoming messages
    ws.send(JSON.stringify({ type: 'ack', data }));
  }

  broadcast(message: any): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  close(): void {
    this.wss.close();
  }
}

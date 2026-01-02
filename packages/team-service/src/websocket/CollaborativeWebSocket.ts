import WebSocket from 'ws';
import { EnhancedStreamChunk } from '@qwen-team/ai-agent';

interface CollaborativeSession {
  sessionId: string;
  teamId: string;
  projectId: string;
  userId: string;
  ws: WebSocket;
  isActive: boolean;
  joinedAt: number;
  lastActivity: number;
  cursor?: { line: number; column: number; file?: string };
}

interface TeamRoom {
  teamId: string;
  projectId: string;
  sessions: Map<string, CollaborativeSession>;
  sharedState: any;
  createdAt: number;
}

export class CollaborativeWebSocket {
  private wsServer: WebSocket.Server;
  private teamRooms = new Map<string, TeamRoom>();
  private userSessions = new Map<string, CollaborativeSession>();

  constructor(port: number = 8003) {
    this.wsServer = new WebSocket.Server({ port });
    this.setupWebSocketServer();
    console.log(`[CollaborativeWebSocket] Server started on port ${port}`);
  }

  private setupWebSocketServer(): void {
    this.wsServer.on('connection', (ws: WebSocket, request) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const teamId = url.searchParams.get('teamId');
      const projectId = url.searchParams.get('projectId');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !teamId || !projectId || !userId) {
        ws.close(1008, 'Missing required parameters');
        return;
      }

      const session: CollaborativeSession = {
        sessionId,
        teamId,
        projectId,
        userId,
        ws,
        isActive: true,
        joinedAt: Date.now(),
        lastActivity: Date.now()
      };

      // Join team room
      this.joinTeamRoom(session);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleCollaborativeMessage(session, message);
        } catch (error) {
          console.error('[CollaborativeWebSocket] Invalid message format:', error);
        }
      });

      ws.on('close', () => {
        this.leaveTeamRoom(session);
      });

      ws.on('error', (error) => {
        console.error(`[CollaborativeWebSocket] Error for ${userId}:`, error);
        this.leaveTeamRoom(session);
      });
    });
  }

  private joinTeamRoom(session: CollaborativeSession): void {
    const roomKey = `${session.teamId}-${session.projectId}`;
    let room = this.teamRooms.get(roomKey);

    if (!room) {
      room = {
        teamId: session.teamId,
        projectId: session.projectId,
        sessions: new Map(),
        sharedState: {},
        createdAt: Date.now()
      };
      this.teamRooms.set(roomKey, room);
    }

    room.sessions.set(session.sessionId, session);
    this.userSessions.set(session.sessionId, session);

    console.log(`[CollaborativeWebSocket] ${session.userId} joined team room ${roomKey}`);

    // Notify other team members
    this.broadcastToTeam(session.teamId, session.projectId, {
      type: 'user_joined',
      data: {
        userId: session.userId,
        sessionId: session.sessionId,
        timestamp: Date.now()
      }
    }, session.sessionId);

    // Send current team state to new user
    this.sendToSession(session.sessionId, {
      type: 'team_state',
      data: {
        teamMembers: Array.from(room.sessions.values()).map(s => ({
          userId: s.userId,
          sessionId: s.sessionId,
          cursor: s.cursor,
          lastActivity: s.lastActivity
        })),
        sharedState: room.sharedState
      }
    });
  }

  private leaveTeamRoom(session: CollaborativeSession): void {
    const roomKey = `${session.teamId}-${session.projectId}`;
    const room = this.teamRooms.get(roomKey);

    if (room) {
      room.sessions.delete(session.sessionId);
      
      // Notify other team members
      this.broadcastToTeam(session.teamId, session.projectId, {
        type: 'user_left',
        data: {
          userId: session.userId,
          sessionId: session.sessionId,
          timestamp: Date.now()
        }
      });

      // Remove empty rooms
      if (room.sessions.size === 0) {
        this.teamRooms.delete(roomKey);
        console.log(`[CollaborativeWebSocket] Removed empty team room ${roomKey}`);
      }
    }

    this.userSessions.delete(session.sessionId);
    session.isActive = false;

    console.log(`[CollaborativeWebSocket] ${session.userId} left team room ${roomKey}`);
  }

  private handleCollaborativeMessage(session: CollaborativeSession, message: any): void {
    session.lastActivity = Date.now();

    switch (message.type) {
      case 'cursor_update':
        session.cursor = message.data.cursor;
        this.broadcastToTeam(session.teamId, session.projectId, {
          type: 'cursor_update',
          data: {
            userId: session.userId,
            cursor: session.cursor,
            timestamp: Date.now()
          }
        }, session.sessionId);
        break;

      case 'file_edit':
        this.broadcastToTeam(session.teamId, session.projectId, {
          type: 'file_edit',
          data: {
            userId: session.userId,
            file: message.data.file,
            changes: message.data.changes,
            timestamp: Date.now()
          }
        }, session.sessionId);
        break;

      case 'shared_state_update':
        const roomKey = `${session.teamId}-${session.projectId}`;
        const room = this.teamRooms.get(roomKey);
        if (room) {
          room.sharedState = { ...room.sharedState, ...message.data.state };
          this.broadcastToTeam(session.teamId, session.projectId, {
            type: 'shared_state_update',
            data: {
              userId: session.userId,
              state: message.data.state,
              timestamp: Date.now()
            }
          });
        }
        break;

      case 'tool_execution':
        this.broadcastToTeam(session.teamId, session.projectId, {
          type: 'tool_execution',
          data: {
            userId: session.userId,
            toolName: message.data.toolName,
            status: message.data.status,
            timestamp: Date.now()
          }
        }, session.sessionId);
        break;

      default:
        console.log(`[CollaborativeWebSocket] Unknown message type: ${message.type}`);
    }
  }

  async streamToTeam(
    teamId: string,
    projectId: string,
    userId: string,
    responseStream: AsyncGenerator<EnhancedStreamChunk>
  ): Promise<void> {
    try {
      console.log(`[CollaborativeWebSocket] Starting team stream for ${teamId}/${projectId}`);

      for await (const chunk of responseStream) {
        this.broadcastToTeam(teamId, projectId, {
          type: 'ai_stream_chunk',
          data: {
            userId,
            chunk,
            timestamp: Date.now()
          }
        });

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      this.broadcastToTeam(teamId, projectId, {
        type: 'ai_stream_complete',
        data: {
          userId,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error(`[CollaborativeWebSocket] Team stream error:`, error);
      this.broadcastToTeam(teamId, projectId, {
        type: 'ai_stream_error',
        data: {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      });
    }
  }

  private broadcastToTeam(
    teamId: string, 
    projectId: string, 
    message: any, 
    excludeSessionId?: string
  ): void {
    const roomKey = `${teamId}-${projectId}`;
    const room = this.teamRooms.get(roomKey);

    if (!room) return;

    let sentCount = 0;
    for (const session of room.sessions.values()) {
      if (session.sessionId !== excludeSessionId && session.isActive) {
        if (this.sendToSession(session.sessionId, message)) {
          sentCount++;
        }
      }
    }

    console.log(`[CollaborativeWebSocket] Broadcast to team ${teamId}: ${sentCount} recipients`);
  }

  private sendToSession(sessionId: string, message: any): boolean {
    const session = this.userSessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[CollaborativeWebSocket] Failed to send to ${sessionId}:`, error);
      session.isActive = false;
      this.leaveTeamRoom(session);
      return false;
    }
  }

  getTeamRoomStats(): any[] {
    return Array.from(this.teamRooms.values()).map(room => ({
      teamId: room.teamId,
      projectId: room.projectId,
      memberCount: room.sessions.size,
      createdAt: room.createdAt,
      members: Array.from(room.sessions.values()).map(s => ({
        userId: s.userId,
        sessionId: s.sessionId,
        joinedAt: s.joinedAt,
        lastActivity: s.lastActivity
      }))
    }));
  }

  getActiveSessionCount(): number {
    return this.userSessions.size;
  }

  async shutdown(): Promise<void> {
    console.log(`[CollaborativeWebSocket] Shutting down with ${this.userSessions.size} active sessions`);

    // Notify all clients
    for (const session of this.userSessions.values()) {
      this.sendToSession(session.sessionId, {
        type: 'server_shutdown',
        data: { message: 'Server is shutting down', timestamp: Date.now() }
      });
      session.ws.close(1001, 'Server shutdown');
    }

    this.wsServer.close();
    this.teamRooms.clear();
    this.userSessions.clear();

    console.log('[CollaborativeWebSocket] Shutdown complete');
  }
}

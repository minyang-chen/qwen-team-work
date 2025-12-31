import { useState, useEffect, useCallback } from 'react';
import { EnhancedStreamChunk } from '@qwen-team/server-sdk';

interface UseEnhancedWebSocketOptions {
  teamId?: string;
  projectId?: string;
  userId: string;
  sessionId: string;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export function useEnhancedWebSocket({
  teamId,
  projectId,
  userId,
  sessionId
}: UseEnhancedWebSocketOptions) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  // Connect to enhanced WebSocket
  const connect = useCallback(() => {
    try {
      const wsUrl = new URL('/ws/collaborative', window.location.origin);
      wsUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl.searchParams.set('sessionId', sessionId);
      wsUrl.searchParams.set('userId', userId);
      if (teamId) wsUrl.searchParams.set('teamId', teamId);
      if (projectId) wsUrl.searchParams.set('projectId', projectId);

      const websocket = new WebSocket(wsUrl.toString());

      websocket.onopen = () => {
        console.log('[EnhancedWebSocket] Connected to collaborative server');
        setIsConnected(true);
        setConnectionError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
        } catch (error) {
          console.error('[EnhancedWebSocket] Failed to parse message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('[EnhancedWebSocket] Disconnected from collaborative server');
        setIsConnected(false);
      };

      websocket.onerror = (error) => {
        console.error('[EnhancedWebSocket] Connection error:', error);
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
      };

      setWs(websocket);
    } catch (error) {
      console.error('[EnhancedWebSocket] Failed to create connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [sessionId, userId, teamId, projectId]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  // Send message
  const sendMessage = useCallback((type: string, data: any) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }, [ws, isConnected]);

  // Send cursor update
  const updateCursor = useCallback((cursor: { file: string; line: number; column: number }) => {
    sendMessage('cursor_update', { cursor });
  }, [sendMessage]);

  // Send file edit
  const sendFileEdit = useCallback((edit: { file: string; changes: any[] }) => {
    sendMessage('file_edit', edit);
  }, [sendMessage]);

  // Send tool execution status
  const sendToolExecution = useCallback((toolName: string, status: string, result?: any) => {
    sendMessage('tool_execution', { toolName, status, result });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Filter messages by type
  const getMessagesByType = useCallback((type: string) => {
    return messages.filter(msg => msg.type === type);
  }, [messages]);

  return {
    isConnected,
    connectionError,
    messages,
    connect,
    disconnect,
    sendMessage,
    updateCursor,
    sendFileEdit,
    sendToolExecution,
    getMessagesByType,
    // Specific message getters
    userJoinMessages: getMessagesByType('user_joined'),
    userLeaveMessages: getMessagesByType('user_left'),
    cursorUpdates: getMessagesByType('cursor_update'),
    fileEdits: getMessagesByType('file_edit'),
    toolExecutions: getMessagesByType('tool_execution'),
    aiStreamChunks: getMessagesByType('ai_stream_chunk'),
  };
}

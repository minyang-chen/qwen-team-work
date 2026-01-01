import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url?: string) {
  // Use environment variable or fallback to localhost
  const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:8002';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('team_session_token');
    
    socketRef.current = io(wsUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: {
        token: token
      }
    });

    socketRef.current.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    socketRef.current.on('error', (error) => {
      console.error('[WebSocket] Socket error:', error);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
    });

    socketRef.current.on('reconnect_error', (error) => {
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [wsUrl]);

  return { socket: socketRef.current, isConnected };
}

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url?: string) {
  // Use environment variable or fallback to localhost
  const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:8002';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(wsUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
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

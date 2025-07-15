import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketMessage {
  type: string;
  content?: string;
  metadata?: any;
  error?: string;
}

interface UseSocketOptions {
  onMessage?: (message: SocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

export function useSocketIO(token?: string, options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!token || isConnecting || socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    
    try {
      const socket = io({
        auth: {
          token: token
        },
        autoConnect: false
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
        setIsConnecting(false);
        options.onConnect?.();
      });

      socket.on('connected', (data) => {
        console.log('Socket.IO authenticated:', data.message);
      });

      socket.on('ai_response', (data) => {
        options.onMessage?.({
          type: 'ai_response',
          content: data.content,
          metadata: data.metadata
        });
      });

      socket.on('typing', (data) => {
        options.onMessage?.({
          type: 'typing',
          metadata: data
        });
      });

      socket.on('pong', () => {
        options.onMessage?.({ type: 'pong' });
      });

      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
        options.onMessage?.({
          type: 'error',
          error: error.error || 'Socket error'
        });
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        options.onDisconnect?.();
      });

      socket.connect();

    } catch (error) {
      console.error('Socket.IO connection error:', error);
      setIsConnecting(false);
    }
  }, [token, isConnecting, options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: SocketMessage) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(message.type, {
        content: message.content,
        metadata: message.metadata
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage
  };
}
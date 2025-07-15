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
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Socket already connected, skipping connection');
      return;
    }

    cleanup();

    console.log('Initializing Socket.IO connection...');
    
    const socket = io('/', {
      transports: ['polling'],
      upgrade: true,
      timeout: 10000,
      reconnection: false // We'll handle reconnection manually
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsConnected(true);
      options.onConnect?.();
    });

    socket.on('connected', (data) => {
      console.log('Socket.IO authenticated:', data);
      setIsConnected(true);
    });

    socket.on('ai_response', (data) => {
      console.log('Client received ai_response:', data);
      options.onMessage?.({
        type: 'ai_response',
        content: data.content,
        metadata: data.metadata
      });
    });

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      setIsConnected(false);
      options.onMessage?.({
        type: 'error',
        error: error.error || 'Socket error'
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
      
      // Retry connection after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Retrying Socket.IO connection...');
        connect();
      }, 3000);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
      options.onDisconnect?.();
      
      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Reconnecting Socket.IO...');
          connect();
        }, 2000);
      }
    });

  }, [cleanup]); // Remove options from dependency to prevent reconnections

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
  }, [cleanup]);

  const sendMessage = useCallback((message: SocketMessage) => {
    if (socketRef.current?.connected) {
      console.log('Sending message:', message.type);
      socketRef.current.emit(message.type, {
        content: message.content,
        metadata: message.metadata
      });
      return true;
    } else {
      console.warn('Socket not connected, cannot send message');
      return false;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      cleanup();
    };
  }, []); // Empty dependency array to prevent reconnections

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage
  };
}
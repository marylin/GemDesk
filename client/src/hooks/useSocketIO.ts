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
    if (isConnecting || socketRef.current?.connected) {
      return;
    }

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnecting(true);
    
    try {
      console.log('Connecting Socket.IO with token:', token?.substring(0, 10) + '...' || 'no token');
      
      const socket = io('/', {
        auth: {
          token: token || null
        },
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket.IO connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        options.onConnect?.();
      });

      socket.on('connected', (data) => {
        console.log('Socket.IO authenticated:', data.message);
        setIsConnected(true);
        setIsConnecting(false);
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
        setIsConnected(false);
        setIsConnecting(false);
        options.onMessage?.({
          type: 'error',
          error: error.error || 'Socket error'
        });
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setIsConnected(false);
        setIsConnecting(false);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        options.onDisconnect?.();
      });

      // socket.connect() is not needed since autoConnect is true

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
      console.log('Sending Socket.IO message:', message.type, message.content?.substring(0, 50) + '...');
      socketRef.current.emit(message.type, {
        content: message.content,
        metadata: message.metadata
      });
      return true;
    } else {
      console.error('Socket.IO not connected, cannot send message');
      return false;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage
  };
}
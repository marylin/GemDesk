import { useState, useEffect, useRef } from 'react';
import { socketManager, ConnectionStatus } from '@/lib/socketManager';

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
  onError?: (error: string) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(socketManager.isConnected());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(socketManager.getStatus());
  const cleanupRef = useRef<(() => void) | null>(null);
  const statusCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Register event handlers with the singleton socket manager
    cleanupRef.current = socketManager.addHandler({
      onMessage: options.onMessage,
      onConnect: () => {
        setIsConnected(true);
        options.onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        options.onDisconnect?.();
      },
      onError: options.onError
    });

    // Register status listener
    statusCleanupRef.current = socketManager.addStatusListener((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    });

    // Cleanup on unmount
    return () => {
      cleanupRef.current?.();
      statusCleanupRef.current?.();
    };
  }, [options.onMessage, options.onConnect, options.onDisconnect, options.onError]);

  const sendMessage = (message: SocketMessage) => {
    return socketManager.sendMessage(message);
  };

  const forceReconnect = () => {
    socketManager.forceReconnect();
  };

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    forceReconnect
  };
}
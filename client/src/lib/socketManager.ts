import { io, Socket } from 'socket.io-client';

interface SocketMessage {
  type: string;
  content?: string;
  metadata?: any;
  error?: string;
}

interface SocketEventHandlers {
  onMessage?: (message: SocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

class SocketManager {
  private socket: Socket | null = null;
  private handlers: Set<SocketEventHandlers> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  constructor() {
    this.connect();
  }

  private setStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  private connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected, skipping connection');
      return;
    }

    this.setStatus('connecting');
    this.clearReconnectTimeout();

    console.log('Initializing Socket.IO connection...');
    
    this.socket = io('/', {
      transports: ['polling'],
      upgrade: true,
      timeout: 10000,
      reconnection: false // We'll handle reconnection manually
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.notifyHandlers('onConnect');
    });

    this.socket.on('connected', (data) => {
      console.log('Socket.IO authenticated:', data);
      this.setStatus('connected');
    });

    this.socket.on('ai_response', (data) => {
      console.log('Client received ai_response:', data);
      this.notifyHandlers('onMessage', {
        type: 'ai_response',
        content: data.content,
        metadata: data.metadata
      });
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      this.setStatus('error');
      const errorMessage = error.error || 'Socket error';
      this.notifyHandlers('onError', errorMessage);
      this.notifyHandlers('onMessage', {
        type: 'error',
        error: errorMessage
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.setStatus('error');
      this.handleReconnection();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.setStatus('disconnected');
      this.notifyHandlers('onDisconnect');
      
      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setStatus('reconnecting');
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.setStatus('error');
    }
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private notifyHandlers(event: keyof SocketEventHandlers, data?: any) {
    this.handlers.forEach(handler => {
      if (handler[event]) {
        handler[event]!(data);
      }
    });
  }

  public addHandler(handler: SocketEventHandlers): () => void {
    this.handlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.handlers.delete(handler);
    };
  }

  public addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Immediately notify of current status
    listener(this.connectionStatus);
    
    // Return cleanup function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public sendMessage(message: SocketMessage): boolean {
    if (this.socket?.connected) {
      console.log('Sending message:', message.type);
      this.socket.emit(message.type, {
        content: message.content,
        metadata: message.metadata
      });
      return true;
    } else {
      console.warn('Socket not connected, cannot send message');
      return false;
    }
  }

  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public forceReconnect() {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  public disconnect() {
    this.clearReconnectTimeout();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setStatus('disconnected');
  }

  public destroy() {
    this.disconnect();
    this.handlers.clear();
    this.statusListeners.clear();
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

// Export for cleanup on app unmount
export { SocketManager };
export interface WebSocketMessage {
  type: 'chat_message' | 'ai_response' | 'typing' | 'ping' | 'pong' | 'connected' | 'error';
  content?: string;
  metadata?: any;
  error?: string;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private listeners: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  connect(token?: string): Promise<void> {
    if (token) {
      this.token = token;
      localStorage.setItem('auth_token', token);
    }

    if (!this.token || this.isConnecting) {
      return Promise.reject(new Error('No token available or already connecting'));
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${this.token}`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', { type: 'connected' });
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.emit(message.type, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        this.emit('disconnected', { type: 'error', error: 'Connection closed' });
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnecting = false;
  }

  send(message: WebSocketMessage): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  on(type: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    this.listeners.get(type)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(type: string, message: WebSocketMessage): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(message));
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(console.error);
    }, delay);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Disabled for now - using REST API instead
// export const websocketManager = new WebSocketManager();

// WebSocket functionality disabled - using REST API instead
export interface WebSocketMessage {
  type: string;
  content?: string;
  metadata?: any;
  error?: string;
}

export class WebSocketManager {
  connect() {
    return Promise.resolve();
  }
  
  disconnect() {}
  
  send() {
    return false;
  }
  
  on() {
    return () => {};
  }
  
  isConnected() {
    return false;
  }
}
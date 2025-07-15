// WebSocket functionality disabled - using REST API instead
export function useSocket() {
  return {
    isConnected: false,
    isConnecting: false,
    sendMessage: () => false,
    connect: () => {},
    disconnect: () => {}
  };
}
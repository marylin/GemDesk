import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConnectionStatusIndicator from '@/components/ui/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';

export default function SocketTest() {
  const [testMessage, setTestMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);

  const onMessage = useCallback((message: any) => {
    console.log('Test page received message:', message);
    setReceivedMessages(prev => [...prev, `${message.type}: ${message.content || message.error}`]);
  }, []);

  const onConnect = useCallback(() => {
    console.log('Test page socket connected');
    setReceivedMessages(prev => [...prev, 'Connected to server']);
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('Test page socket disconnected');
    setReceivedMessages(prev => [...prev, 'Disconnected from server']);
  }, []);

  const onError = useCallback((error: string) => {
    console.error('Test page socket error:', error);
    setReceivedMessages(prev => [...prev, `Error: ${error}`]);
  }, []);

  const { isConnected, connectionStatus, sendMessage, forceReconnect } = useSocket({
    onMessage,
    onConnect,
    onDisconnect,
    onError
  });

  const handleSendTest = () => {
    if (testMessage.trim()) {
      const success = sendMessage({
        type: 'chat_message',
        content: testMessage,
        metadata: { test: true }
      });
      
      if (success) {
        setReceivedMessages(prev => [...prev, `Sent: ${testMessage}`]);
        setTestMessage('');
      } else {
        setReceivedMessages(prev => [...prev, 'Failed to send message']);
      }
    }
  };

  const clearMessages = () => {
    setReceivedMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Socket.IO Connection Test</CardTitle>
              <ConnectionStatusIndicator 
                status={connectionStatus} 
                onReconnect={forceReconnect}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2">Connection Status</h3>
                <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Status: {connectionStatus}
                </p>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2">Actions</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={forceReconnect}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Force Reconnect
                  </Button>
                  <Button 
                    onClick={clearMessages}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Clear Messages
                  </Button>
                </div>
              </div>
            </div>

            {/* Message Testing */}
            <div className="space-y-4">
              <h3 className="font-semibold">Test Messages</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Type a test message..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendTest()}
                />
                <Button
                  onClick={handleSendTest}
                  disabled={!isConnected || !testMessage.trim()}
                >
                  Send Test
                </Button>
              </div>
            </div>

            {/* Message Log */}
            <div className="space-y-2">
              <h3 className="font-semibold">Message Log</h3>
              <div className="h-64 overflow-y-auto bg-gray-700 rounded-lg p-4">
                {receivedMessages.length === 0 ? (
                  <p className="text-gray-400 text-sm">No messages yet...</p>
                ) : (
                  receivedMessages.map((msg, index) => (
                    <div key={index} className="text-sm py-1 border-b border-gray-600 last:border-b-0">
                      <span className="text-gray-400">[{new Date().toLocaleTimeString()}]</span> {msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
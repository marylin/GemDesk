import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected, sendMessage } = useSocket({
    onMessage: (socketMessage) => {
      console.log('Test page received message:', socketMessage);
      if (socketMessage.type === 'ai_response') {
        setResponse(socketMessage.content || '');
        setIsLoading(false);
      } else if (socketMessage.type === 'error') {
        setResponse(`Error: ${socketMessage.error}`);
        setIsLoading(false);
      }
    },
    onConnect: () => {
      console.log('Test page Socket connected');
    },
    onDisconnect: () => {
      console.log('Test page Socket disconnected');
    }
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    console.log('Sending test message:', message);
    setIsLoading(true);
    setResponse('');
    
    sendMessage({
      type: 'chat_message',
      content: message.trim()
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Gemini CLI Test Page</CardTitle>
            <p className="text-gray-400">
              Socket Status: {isConnected ? (
                <span className="text-green-400">Connected</span>
              ) : (
                <span className="text-red-400">Disconnected</span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message to test Gemini CLI..."
                className="bg-gray-700 border-gray-600 text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!isConnected || isLoading || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Response:</h3>
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="text-yellow-400">Waiting for Gemini CLI response...</div>
                  ) : response ? (
                    <div className="text-gray-100 whitespace-pre-wrap">{response}</div>
                  ) : (
                    <div className="text-gray-400">No response yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 text-sm text-gray-400">
              <p>This page tests the Socket.IO → Gemini CLI communication flow directly.</p>
              <p>Check the browser console and server logs for detailed debugging information.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
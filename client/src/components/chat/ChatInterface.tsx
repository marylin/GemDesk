import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Paperclip, Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ConnectionStatusIndicator from '@/components/ui/ConnectionStatus';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/axios';
import ConversationHistory from '@/components/ai/ConversationHistory';
import type { ChatMessage } from '@shared/schema';

interface ChatInterfaceProps {
  selectedFile?: File | null;
}

export default function ChatInterface({ selectedFile }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/chat/messages'],
    queryFn: async () => {
      const response = await api.get<ChatMessage[]>('/chat/messages');
      return response.data;
    },
    refetchInterval: false, // Disable automatic polling - use Socket.IO for real-time updates
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  });

  // Define callback functions with consistent order
  const onMessage = useCallback((socketMessage: any) => {
    console.log('Chat interface received message:', socketMessage);
    if (socketMessage.type === 'ai_response') {
      setIsTyping(false);
      // Only refetch once when AI responds, then stop polling
      refetch();
    } else if (socketMessage.type === 'error') {
      console.error('Chat error:', socketMessage.error);
      setIsTyping(false);
    }
  }, [refetch]);

  const onConnect = useCallback(() => {
    console.log('Chat interface Socket connected');
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('Chat interface Socket disconnected');
  }, []);

  const onError = useCallback((error: string) => {
    console.error('Socket error in chat:', error);
    setIsTyping(false);
  }, []);

  // Use stable socket options to prevent re-renders
  const socketOptions = useMemo(() => ({
    onMessage,
    onConnect,
    onDisconnect,
    onError
  }), [onMessage, onConnect, onDisconnect, onError]);

  const { isConnected, connectionStatus, sendMessage: sendSocketMessage, forceReconnect } = useSocket(socketOptions);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageText = message;
    setMessage('');
    setIsTyping(true);

    try {
      const context = selectedFile ? {
        file: {
          name: selectedFile.name,
          path: selectedFile.path,
          type: selectedFile.type
        }
      } : undefined;

      // Only send message via Socket.IO - the server will handle saving both user and AI messages
      sendSocketMessage({
        type: 'chat_message',
        content: messageText,
        metadata: context
      });

      // Refresh to show the user message immediately
      refetch();

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
    }
  };

  const handleFileContext = () => {
    if (selectedFile) {
      const fileContext = `I'm working with the file: ${selectedFile.name} (${selectedFile.path}). `;
      setMessage(fileContext + message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      {/* Conversation History (collapsible) */}
      <div className="max-h-64 border-b border-gray-700">
        <ConversationHistory className="h-full" />
      </div>
      
      <Card className="flex-1 bg-gray-800 border-gray-700 rounded-none border-t-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Gemini AI Chat
            </CardTitle>
            <ConnectionStatusIndicator 
              status={connectionStatus} 
              onReconnect={forceReconnect}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col h-full p-0">
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-400">Loading messages...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg: ChatMessage) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t border-gray-700 p-4">
            {selectedFile && (
              <div className="mb-3 p-2 bg-blue-900/20 rounded-lg border border-blue-600/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <Paperclip className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <Button
                    onClick={handleFileContext}
                    variant="ghost"
                    size="sm"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    Add to message
                  </Button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Gemini AI anything..."
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
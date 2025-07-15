import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { Paperclip, Code, Mic, Send } from "lucide-react";
import type { ChatMessage, File } from "@shared/schema";

interface ChatInterfaceProps {
  onSendMessage: (message: string, context?: any) => void;
  selectedFile?: File | null;
}

export default function ChatInterface({ onSendMessage, selectedFile }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages'],
    queryFn: async () => {
      const response = await fetch('/api/chat/messages?limit=50', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: any }) => {
      const response = await apiRequest('POST', '/api/gemini/chat', {
        message: data.message,
        context: data.context
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    const messageText = message;
    const context = selectedFile ? {
      selectedFile: {
        id: selectedFile.id,
        name: selectedFile.name,
        path: selectedFile.path,
        content: selectedFile.content
      }
    } : undefined;

    setMessage("");
    setIsTyping(true);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await sendMessageMutation.mutateAsync({
        message: messageText,
        context
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  };

  const insertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + '```\n\n```' + message.slice(end);
    setMessage(newMessage);
    
    // Position cursor inside code block
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 4, start + 4);
    }, 0);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [message]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="chat-bubble">
            <MessageBubble
              message={{
                id: 0,
                content: "Hello! I'm your Gemini AI assistant. I can help you with code, answer questions, and assist with your project. What would you like to work on today?",
                sender: "ai",
                userId: 0,
                createdAt: new Date()
              }}
            />
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-bubble">
              <MessageBubble message={msg} />
            </div>
          ))
        )}
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-700 p-4">
        {selectedFile && (
          <div className="mb-3 p-2 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-sm text-blue-400">
              Context: {selectedFile.name}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {selectedFile.path}
            </div>
          </div>
        )}
        
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 focus-within:border-blue-500 transition-colors">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="w-full p-3 bg-transparent resize-none outline-none border-0 focus:ring-0 scrollbar-thin min-h-[44px]"
                rows={1}
              />
              <div className="flex items-center justify-between p-3 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Attach File"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Code Block"
                    onClick={insertCodeBlock}
                  >
                    <Code className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Voice Input"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span className="mr-2">Send</span>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

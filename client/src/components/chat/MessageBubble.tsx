import React from 'react';
import { User, Bot, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { ChatMessage } from '@shared/schema';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  const formatContent = (content: string) => {
    // Handle code blocks
    if (content.includes('```')) {
      return content.split('```').map((part, index) => {
        if (index % 2 === 1) {
          return (
            <pre key={index} className="bg-gray-900 p-3 rounded-lg my-2 overflow-x-auto">
              <code className="text-sm text-gray-300">{part}</code>
            </pre>
          );
        }
        return <span key={index}>{part}</span>;
      });
    }

    // Handle line breaks
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        <div className={`p-3 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-100'
        }`}>
          <div className="text-sm leading-relaxed">
            {formatContent(message.content)}
          </div>
        </div>
        
        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <Clock className="w-3 h-3" />
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}
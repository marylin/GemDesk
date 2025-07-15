import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      
      <div className="max-w-[70%]">
        <div className="bg-gray-700 text-gray-100 p-3 rounded-lg">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400">AI is typing</span>
            <div className="flex gap-1 ml-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
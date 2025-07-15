import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, Play, Check } from "lucide-react";
import { Bot, User } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const isAI = message.sender === "ai";
  
  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(`${message.id}-${index}`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const formatMessage = (content: string) => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // This is a code block
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split('\n');
        const language = lines[0].trim();
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-3">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              {language && (
                <div className="px-3 py-2 bg-gray-800 text-xs text-gray-300 border-b border-gray-700">
                  {language}
                </div>
              )}
              <div className="relative">
                <pre className="p-3 text-sm text-gray-300 overflow-x-auto scrollbar-thin">
                  <code>{code}</code>
                </pre>
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 bg-gray-800 hover:bg-gray-700 text-xs"
                    onClick={() => handleCopyCode(code, index)}
                  >
                    {copiedCode === `${message.id}-${index}` ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 bg-green-700 hover:bg-green-600 text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // Regular text - format it properly
        const textParts = part.split('\n');
        return (
          <div key={index} className="space-y-2">
            {textParts.map((line, lineIndex) => (
              <div key={lineIndex} className="leading-relaxed">
                {line.trim() === '' ? <br /> : formatTextLine(line)}
              </div>
            ))}
          </div>
        );
      }
    });
  };

  const formatTextLine = (line: string) => {
    // Format bold text **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = line.split(boldRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`flex items-start space-x-3 ${isAI ? '' : 'justify-end'}`}>
      {isAI && (
        <Avatar className="w-8 h-8 bg-blue-500">
          <AvatarFallback className="bg-blue-500 text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 ${isAI ? '' : 'flex justify-end'}`}>
        <div className={`max-w-3xl ${isAI ? '' : 'text-right'}`}>
          <div className="text-sm text-gray-400 mb-1">
            {isAI ? 'Gemini AI' : 'You'}
          </div>
          <div className={`rounded-lg p-3 ${
            isAI 
              ? 'bg-gray-800 text-white' 
              : 'bg-blue-600 text-white ml-auto'
          }`}>
            {formatMessage(message.content)}
          </div>
        </div>
      </div>

      {!isAI && (
        <Avatar className="w-8 h-8 bg-gray-500">
          <AvatarFallback className="bg-gray-500 text-white">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

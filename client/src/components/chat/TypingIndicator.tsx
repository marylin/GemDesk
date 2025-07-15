import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="chat-bubble">
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8 bg-blue-500">
          <AvatarFallback className="bg-blue-500 text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">Gemini AI</div>
          <div className="bg-dark-panel rounded-lg p-3 max-w-3xl">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-indicator"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-indicator" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-indicator" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ChatInterface from "@/components/chat/ChatInterface";
import FileExplorer from "@/components/file-explorer/FileExplorer";
import CodeEditor from "@/components/code-editor/CodeEditor";
import { Button } from "@/components/ui/button";
import { Code2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem in pixels
  const [editorWidth, setEditorWidth] = useState(384); // 24rem in pixels

  const token = localStorage.getItem('auth_token');
  
  const { isConnected, sendMessage } = useSocket(token || undefined, {
    onMessage: (message) => {
      console.log('WebSocket message:', message);
    },
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
    autoReconnect: true
  });

  const handleFileSelect = (file: any) => {
    setSelectedFile(file);
    if (file.type === 'file') {
      setShowCodeEditor(true);
    }
  };

  const handleSendMessage = (message: string, context?: any) => {
    if (sendMessage) {
      sendMessage({
        type: 'chat_message',
        content: message,
        metadata: context
      });
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header user={user} isConnected={isConnected} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer Sidebar */}
        <div style={{ width: sidebarWidth }} className="border-r border-gray-700">
          <FileExplorer onFileSelect={handleFileSelect} />
        </div>

        {/* Resizer for sidebar */}
        <div 
          className="resizer"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;

            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(500, startWidth + (e.clientX - startX)));
              setSidebarWidth(newWidth);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface 
            onSendMessage={handleSendMessage}
            selectedFile={selectedFile}
          />
        </div>

        {/* Code Editor Panel */}
        {showCodeEditor && (
          <>
            {/* Resizer for editor */}
            <div 
              className="resizer"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = editorWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = Math.max(300, Math.min(800, startWidth - (e.clientX - startX)));
                  setEditorWidth(newWidth);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            
            <div style={{ width: editorWidth }} className="border-l border-gray-700">
              <CodeEditor 
                file={selectedFile}
                onClose={() => setShowCodeEditor(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {!showCodeEditor && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setShowCodeEditor(true)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg transition-all transform hover:scale-105"
            size="icon"
          >
            <Code2 className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

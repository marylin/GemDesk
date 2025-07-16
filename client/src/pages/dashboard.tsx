import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChatInterface from "@/components/chat/ChatInterface";
import FileExplorer from "@/components/file-explorer/FileExplorer";
import TabbedCodeEditor from "@/components/code-editor/TabbedCodeEditor";
import WindowManager, { WindowPanel } from "@/components/window-manager/WindowManager";
import WorkspaceManager, { Workspace } from "@/components/window-manager/WorkspaceManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, User, MessageSquare, FolderOpen, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { File } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [panels, setPanels] = useState<WindowPanel[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Use the global function to open file in editor
    if ((window as any).openFileInEditor && file.type === 'file') {
      (window as any).openFileInEditor(file);
    }
  }, []);

  // Initialize default panels
  useEffect(() => {
    const defaultPanels: WindowPanel[] = [
      {
        id: 'file-explorer',
        title: 'File Explorer',
        icon: <FolderOpen className="w-4 h-4" />,
        component: <FileExplorer onFileSelect={handleFileSelect} />,
        defaultSize: 25,
        canClose: false
      },
      {
        id: 'chat-interface',
        title: 'Gemini Chat',
        icon: <MessageSquare className="w-4 h-4" />,
        component: <ChatInterface />,
        defaultSize: 40,
        canClose: false
      },
      {
        id: 'code-editor',
        title: 'Code Editor',
        icon: <Code className="w-4 h-4" />,
        component: <TabbedCodeEditor />,
        defaultSize: 35,
        canClose: false
      }
    ];

    setPanels(defaultPanels);
  }, [handleFileSelect]);

  const handlePanelClose = useCallback((panelId: string) => {
    setPanels(prev => prev.filter(panel => panel.id !== panelId));
    toast({
      title: "Panel Closed",
      description: `Panel removed from workspace`,
    });
  }, [toast]);

  const handlePanelMinimize = useCallback((panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    toast({
      title: "Panel Minimized",
      description: `${panel?.title} minimized to taskbar`,
    });
  }, [panels, toast]);

  const handlePanelMaximize = useCallback((panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    toast({
      title: "Panel Maximized",
      description: `${panel?.title} is now in fullscreen mode`,
    });
  }, [panels, toast]);

  const handleSaveWorkspace = useCallback((workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkspace: Workspace = {
      ...workspace,
      id: Date.now().toString(),
      panels: panels.map(panel => ({
        id: panel.id,
        title: panel.title,
        isMinimized: panel.isMinimized,
        isMaximized: panel.isMaximized,
        defaultSize: panel.defaultSize
      })),
      layout: {
        panelSizes: {},
        version: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setCurrentWorkspace(newWorkspace);
    toast({
      title: "Workspace Saved",
      description: `Workspace "${workspace.name}" saved successfully`,
    });
  }, [panels, toast]);

  const handleLoadWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    
    // Restore panel states if available
    if (workspace.panels && workspace.panels.length > 0) {
      setPanels(prev => prev.map(panel => {
        const savedPanel = workspace.panels.find((p: any) => p.id === panel.id);
        if (savedPanel) {
          return {
            ...panel,
            isMinimized: savedPanel.isMinimized,
            isMaximized: savedPanel.isMaximized,
            defaultSize: savedPanel.defaultSize
          };
        }
        return panel;
      }));
    }

    toast({
      title: "Workspace Loaded",
      description: `Workspace "${workspace.name}" loaded successfully`,
    });
  }, [toast]);

  const handleLogout = useCallback(() => {
    window.location.href = '/api/logout';
  }, []);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold mb-2">Loading Gemini CLI Desktop</h2>
          <p className="text-gray-400">Initializing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Desktop Header */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"></div>
            <span className="font-semibold">Gemini CLI Desktop</span>
          </div>
          
          <WorkspaceManager
            currentWorkspace={currentWorkspace}
            onSaveWorkspace={handleSaveWorkspace}
            onLoadWorkspace={handleLoadWorkspace}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Connected</span>
          </div>
          
          <div className="h-6 w-px bg-gray-600"></div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt={user.firstName || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
            <span className="text-sm text-gray-300">
              {user.firstName || user.email}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-300 hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Window Manager */}
      <div className="flex-1 overflow-hidden">
        <WindowManager
          panels={panels}
          onPanelClose={handlePanelClose}
          onPanelMinimize={handlePanelMinimize}
          onPanelMaximize={handlePanelMaximize}
          onSaveWorkspace={() => {
            // Trigger save dialog through WorkspaceManager
            document.querySelector('[data-state="open"]')?.dispatchEvent(new Event('click'));
          }}
          onLoadWorkspace={() => {
            // Trigger load dialog through WorkspaceManager
            document.querySelector('[data-state="open"]')?.dispatchEvent(new Event('click'));
          }}
        />
      </div>
    </div>
  );
}
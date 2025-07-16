import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Minimize2, 
  Maximize2, 
  X, 
  Save,
  FolderOpen,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WindowPanel {
  id: string;
  title: string;
  component: React.ReactNode;
  isMinimized?: boolean;
  isMaximized?: boolean;
  canClose?: boolean;
  icon?: React.ReactNode;
  defaultSize?: number;
}

interface WindowManagerProps {
  panels: WindowPanel[];
  onPanelClose?: (panelId: string) => void;
  onPanelMinimize?: (panelId: string) => void;
  onPanelMaximize?: (panelId: string) => void;
  onSaveWorkspace?: () => void;
  onLoadWorkspace?: () => void;
  className?: string;
}

export default function WindowManager({ 
  panels, 
  onPanelClose,
  onPanelMinimize,
  onPanelMaximize,
  onSaveWorkspace,
  onLoadWorkspace,
  className 
}: WindowManagerProps) {
  const [minimizedPanels, setMinimizedPanels] = useState<Set<string>>(new Set());
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [showTaskbar, setShowTaskbar] = useState(true);
  
  const panelGroupRef = useRef<any>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            onSaveWorkspace?.();
            break;
          case 'o':
            event.preventDefault();
            onLoadWorkspace?.();
            break;
          case 'm':
            event.preventDefault();
            setShowTaskbar(prev => !prev);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSaveWorkspace, onLoadWorkspace]);

  const togglePanelMinimize = useCallback((panelId: string) => {
    setMinimizedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
    
    // Clear maximized state if minimizing
    if (maximizedPanel === panelId) {
      setMaximizedPanel(null);
    }
    
    onPanelMinimize?.(panelId);
  }, [maximizedPanel, onPanelMinimize]);

  const togglePanelMaximize = useCallback((panelId: string) => {
    setMaximizedPanel(prev => prev === panelId ? null : panelId);
    
    // Clear minimized state if maximizing
    setMinimizedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
    
    onPanelMaximize?.(panelId);
  }, [onPanelMaximize]);

  const handleRestorePanel = useCallback((panelId: string) => {
    setMinimizedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
  }, []);

  const handlePanelClose = useCallback((panelId: string) => {
    setMinimizedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
    
    if (maximizedPanel === panelId) {
      setMaximizedPanel(null);
    }
    
    onPanelClose?.(panelId);
  }, [maximizedPanel, onPanelClose]);

  const visiblePanels = panels.filter(panel => !minimizedPanels.has(panel.id));
  const hasMaximizedPanel = maximizedPanel !== null;

  const renderPanelHeader = (panel: WindowPanel) => (
    <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        {panel.icon}
        <span className="font-medium">{panel.title}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-700"
          onClick={() => togglePanelMinimize(panel.id)}
          title="Minimize"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-700"
          onClick={() => togglePanelMaximize(panel.id)}
          title="Maximize"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        {panel.canClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-600"
            onClick={() => handlePanelClose(panel.id)}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderPanel = (panel: WindowPanel) => (
    <Card 
      key={panel.id}
      className="bg-gray-900 border-gray-700 rounded-none flex flex-col h-full"
    >
      {renderPanelHeader(panel)}
      <div className="flex-1 overflow-hidden">
        {panel.component}
      </div>
    </Card>
  );

  const renderTaskbar = () => (
    <div className="h-10 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        {Array.from(minimizedPanels).map(panelId => {
          const panel = panels.find(p => p.id === panelId);
          if (!panel) return null;
          
          return (
            <Button
              key={panelId}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs bg-gray-700 hover:bg-gray-600"
              onClick={() => handleRestorePanel(panelId)}
            >
              {panel.icon}
              <span className="ml-1 truncate max-w-20">{panel.title}</span>
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onSaveWorkspace}
          title="Save Workspace (Ctrl+S)"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onLoadWorkspace}
          title="Load Workspace (Ctrl+O)"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowTaskbar(prev => !prev)}
          title="Toggle Taskbar (Ctrl+M)"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Handle maximized panel
  if (hasMaximizedPanel) {
    const maximizedPanelData = panels.find(p => p.id === maximizedPanel);
    if (maximizedPanelData) {
      return (
        <div className={cn("h-full flex flex-col", className)}>
          {renderPanel(maximizedPanelData)}
          {showTaskbar && renderTaskbar()}
        </div>
      );
    }
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="flex-1 overflow-hidden">
        {visiblePanels.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🖥️</div>
              <h2 className="text-xl font-semibold mb-2">Desktop Environment</h2>
              <p>All panels are minimized. Click on taskbar items to restore them.</p>
            </div>
          </div>
        ) : visiblePanels.length === 1 ? (
          renderPanel(visiblePanels[0])
        ) : (
          <PanelGroup 
            ref={panelGroupRef}
            direction="horizontal" 
            className="h-full"
          >
            {visiblePanels.map((panel, index) => (
              <React.Fragment key={panel.id}>
                <Panel 
                  defaultSize={panel.defaultSize || 50}
                  minSize={20}
                  className="h-full"
                >
                  {renderPanel(panel)}
                </Panel>
                {index < visiblePanels.length - 1 && (
                  <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-gray-600 transition-colors" />
                )}
              </React.Fragment>
            ))}
          </PanelGroup>
        )}
      </div>
      
      {showTaskbar && renderTaskbar()}
    </div>
  );
}
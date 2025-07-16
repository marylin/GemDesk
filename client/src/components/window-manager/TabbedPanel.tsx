import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  title: string;
  component: React.ReactNode;
  isDirty?: boolean;
  canClose?: boolean;
  icon?: React.ReactNode;
}

interface TabbedPanelProps {
  tabs: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  emptyContent?: React.ReactNode;
}

export default function TabbedPanel({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
  className,
  title,
  icon,
  emptyContent
}: TabbedPanelProps) {
  const [currentTab, setCurrentTab] = useState(activeTabId || tabs[0]?.id || '');

  const handleTabChange = useCallback((tabId: string) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
  }, [onTabChange]);

  const handleTabClose = useCallback((tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTabClose?.(tabId);
    
    // If closing active tab, switch to next available tab
    if (tabId === currentTab) {
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const nextTab = tabs[currentIndex + 1] || tabs[currentIndex - 1];
      if (nextTab) {
        setCurrentTab(nextTab.id);
        onTabChange?.(nextTab.id);
      }
    }
  }, [currentTab, tabs, onTabChange, onTabClose]);

  if (tabs.length === 0) {
    return (
      <Card className={cn("bg-gray-900 border-gray-700 h-full flex flex-col", className)}>
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {icon}
            <span className="font-medium">{title || 'Panel'}</span>
          </div>
          {onTabAdd && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-700"
              onClick={onTabAdd}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex-1">
          {emptyContent || (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p>No tabs open</p>
                {onTabAdd && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={onTabAdd}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Tab
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gray-900 border-gray-700 h-full flex flex-col", className)}>
      {/* Panel header with tabs */}
      <div className="border-b border-gray-700">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {icon}
            <span className="font-medium">{title || 'Panel'}</span>
          </div>
          {onTabAdd && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-700"
              onClick={onTabAdd}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto p-0 bg-transparent justify-start rounded-none border-b-0 w-full">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-none border-b-2",
                    "data-[state=active]:border-blue-500 data-[state=inactive]:border-transparent",
                    "data-[state=active]:bg-gray-800 data-[state=inactive]:bg-transparent",
                    "hover:bg-gray-800 text-gray-300 data-[state=active]:text-white",
                    "min-w-fit whitespace-nowrap"
                  )}
                >
                  {tab.icon}
                  <span className="text-sm">{tab.title}</span>
                  {tab.isDirty && (
                    <Circle className="h-2 w-2 fill-current text-orange-400" />
                  )}
                  {tab.canClose && (
                    <div
                      onClick={(e) => handleTabClose(tab.id, e)}
                      className="ml-1 hover:bg-gray-600 rounded p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>
          
          {/* Tab contents */}
          <div className="flex-1 overflow-hidden">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full m-0 overflow-hidden"
              >
                {tab.component}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </Card>
  );
}
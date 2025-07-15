import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { X, Save, FileCode, FileText } from "lucide-react";
import type { File } from "@shared/schema";

interface CodeEditorProps {
  file?: File | null;
  onClose: () => void;
}

interface EditorTab {
  id: number;
  name: string;
  content: string;
  isDirty: boolean;
  file: File;
}

export default function CodeEditor({ file, onClose }: CodeEditorProps) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const queryClient = useQueryClient();

  const updateFileMutation = useMutation({
    mutationFn: async (data: { id: number; content: string }) => {
      const response = await apiRequest('PUT', `/api/files/${data.id}`, {
        content: data.content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      // Mark tab as clean
      setTabs(prev => prev.map(tab => 
        tab.id.toString() === activeTab 
          ? { ...tab, isDirty: false }
          : tab
      ));
    }
  });

  useEffect(() => {
    if (file && !tabs.find(tab => tab.id === file.id)) {
      const newTab: EditorTab = {
        id: file.id,
        name: file.name,
        content: file.content || "",
        isDirty: false,
        file
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTab(file.id.toString());
    }
  }, [file]);

  const handleContentChange = (content: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id.toString() === activeTab 
        ? { ...tab, content, isDirty: tab.content !== content }
        : tab
    ));
  };

  const handleSave = async () => {
    const activeTabData = tabs.find(tab => tab.id.toString() === activeTab);
    if (!activeTabData || !activeTabData.isDirty) return;

    try {
      await updateFileMutation.mutateAsync({
        id: activeTabData.id,
        content: activeTabData.content
      });
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleCloseTab = (tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (newTabs.length === 0) {
        onClose();
        return [];
      }
      
      if (activeTab === tabId.toString()) {
        setActiveTab(newTabs[0].id.toString());
      }
      
      return newTabs;
    });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
      case 'json':
        return <FileCode className="w-4 h-4 text-green-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'JavaScript';
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'py':
        return 'Python';
      case 'java':
        return 'Java';
      case 'cpp':
      case 'c':
        return 'C++';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'json':
        return 'JSON';
      default:
        return 'Text';
    }
  };

  const activeTabData = tabs.find(tab => tab.id.toString() === activeTab);

  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">CODE EDITOR</h2>
          <Button
            variant="ghost"
            size="icon"
            className="p-1 hover:bg-gray-700 text-gray-400"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>No files open</p>
            <p className="text-sm">Select a file from the explorer to edit</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">CODE EDITOR</h2>
          <Button
            variant="ghost"
            size="icon"
            className="p-1 hover:bg-gray-700 text-gray-400"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* File Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-gray-900 border-gray-700">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id.toString()}
                className="flex items-center space-x-2 px-3 py-1 data-[state=active]:bg-gray-700 text-sm"
              >
                {getFileIcon(tab.name)}
                <span>{tab.name}</span>
                {tab.isDirty && <div className="w-2 h-2 bg-blue-400 rounded-full" />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 p-0 ml-1 hover:bg-gray-900 rounded-full opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-gray-900 p-4 overflow-y-auto scrollbar-thin">
          <textarea
            value={activeTabData?.content || ""}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full bg-transparent text-gray-300 font-mono text-sm resize-none outline-none border-0"
            placeholder="Start typing..."
            spellCheck={false}
          />
        </div>
      </div>
      
      {/* Editor Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>{activeTabData ? getLanguage(activeTabData.name) : ''}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Ln 1, Col 1</span>
            <Button
              variant="ghost"
              size="icon"
              className="p-1 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={handleSave}
              disabled={!activeTabData?.isDirty || updateFileMutation.isPending}
              title="Save file"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

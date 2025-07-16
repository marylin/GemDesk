import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import TabbedPanel, { Tab } from '@/components/window-manager/TabbedPanel';
import { Button } from "@/components/ui/button";
import { 
  Code, 
  Save, 
  Download, 
  Share2,
  FileText,
  Image,
  Music,
  Video,
  Archive
} from 'lucide-react';
import type { File as FileType } from '@shared/schema';
import { cn } from '@/lib/utils';

interface TabbedCodeEditorProps {
  className?: string;
}

interface EditorTab extends Tab {
  file: FileType;
  content: string;
  originalContent: string;
}

export default function TabbedCodeEditor({ className }: TabbedCodeEditorProps) {
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateFileMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await api.put(`/files/${id}`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save file",
        variant: "destructive",
      });
    }
  });

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      editorTabs.forEach(tab => {
        if (tab.isDirty && tab.content !== tab.originalContent) {
          updateFileMutation.mutate({
            id: tab.file.id,
            content: tab.content
          });
          
          // Update tab to mark as saved
          setEditorTabs(prev => prev.map(t => 
            t.id === tab.id 
              ? { ...t, isDirty: false, originalContent: t.content }
              : t
          ));
        }
      });
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [editorTabs, updateFileMutation]);

  const getFileIcon = (file: FileType) => {
    if (file.type === 'folder') {
      return <div className="w-4 h-4 text-blue-400">📁</div>;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rs':
      case 'php':
      case 'rb':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'html':
      case 'css':
      case 'scss':
      case 'sass':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return <Code className="w-4 h-4 text-orange-400" />;
      case 'md':
      case 'txt':
      case 'readme':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="w-4 h-4 text-purple-400" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'ogg':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <Video className="w-4 h-4 text-red-400" />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z':
        return <Archive className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLanguageFromExtension = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      txt: 'plaintext',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell'
    };

    return languageMap[extension || ''] || 'plaintext';
  };

  const openFile = useCallback((file: FileType) => {
    // Check if file is already open
    const existingTab = editorTabs.find(tab => tab.file.id === file.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const newTab: EditorTab = {
      id: `file-${file.id}`,
      title: file.name,
      file,
      content: file.content || '',
      originalContent: file.content || '',
      isDirty: false,
      canClose: true,
      icon: getFileIcon(file),
      component: <div /> // Will be rendered by the editor
    };

    setEditorTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [editorTabs]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleTabClose = useCallback((tabId: string) => {
    const tab = editorTabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      const shouldClose = confirm(`File "${tab.file.name}" has unsaved changes. Close anyway?`);
      if (!shouldClose) return;
    }

    setEditorTabs(prev => prev.filter(t => t.id !== tabId));
    
    // Switch to another tab if closing active tab
    if (tabId === activeTabId) {
      const remainingTabs = editorTabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs[0]?.id || '');
    }
  }, [editorTabs, activeTabId]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (value === undefined || !activeTabId) return;

    setEditorTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          content: value,
          isDirty: value !== tab.originalContent
        };
      }
      return tab;
    }));
  }, [activeTabId]);

  const handleSaveFile = useCallback(() => {
    const activeTab = editorTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    updateFileMutation.mutate({
      id: activeTab.file.id,
      content: activeTab.content
    });

    // Mark as saved
    setEditorTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, isDirty: false, originalContent: tab.content }
        : tab
    ));
  }, [activeTabId, editorTabs, updateFileMutation]);

  const handleDownloadFile = useCallback(() => {
    const activeTab = editorTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    const blob = new Blob([activeTab.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `File "${activeTab.file.name}" downloaded`,
    });
  }, [activeTabId, editorTabs, toast]);

  const activeTab = editorTabs.find(tab => tab.id === activeTabId);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSaveFile();
            break;
          case 'w':
            event.preventDefault();
            if (activeTabId) {
              handleTabClose(activeTabId);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleSaveFile, handleTabClose]);

  // Expose openFile method globally for other components
  useEffect(() => {
    (window as any).openFileInEditor = openFile;
    return () => {
      delete (window as any).openFileInEditor;
    };
  }, [openFile]);

  return (
    <div className={cn("bg-gray-900 border-gray-700 h-full flex flex-col", className)}>
      {/* Panel Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Code className="w-4 h-4" />
          <span className="font-medium">Code Editor</span>
        </div>
      </div>

      {editorTabs.length === 0 ? (
        // Empty state
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">Code Editor</h3>
            <p>Select a file from the explorer to start editing</p>
            <p className="text-sm mt-2">Keyboard shortcuts: Ctrl+S (Save), Ctrl+W (Close Tab)</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
              {editorTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 border-b-2 cursor-pointer min-w-fit",
                    tab.id === activeTabId 
                      ? "border-blue-500 bg-gray-700 text-white" 
                      : "border-transparent bg-transparent text-gray-300 hover:bg-gray-700"
                  )}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.icon}
                  <span className="text-sm">{tab.title}</span>
                  {tab.isDirty && (
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                  )}
                  {tab.canClose && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(tab.id);
                      }}
                      className="ml-1 hover:bg-gray-600 rounded p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTabId && editorTabs.find(tab => tab.id === activeTabId) && (
            <div className="flex-1 flex flex-col">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>Language: {getLanguageFromExtension(editorTabs.find(tab => tab.id === activeTabId)?.file.name || '')}</span>
                  {editorTabs.find(tab => tab.id === activeTabId)?.isDirty && <span className="text-orange-400">• Unsaved</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveFile}
                    disabled={!editorTabs.find(tab => tab.id === activeTabId)?.isDirty || updateFileMutation.isPending}
                    title="Save (Ctrl+S)"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadFile}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Monaco Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguageFromExtension(editorTabs.find(tab => tab.id === activeTabId)?.file.name || '')}
                  value={editorTabs.find(tab => tab.id === activeTabId)?.content || ''}
                  onChange={handleContentChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true },
                    folding: true,
                    foldingStrategy: 'indentation',
                    showFoldingControls: 'always',
                    unfoldOnClickAfterEndOfLine: true,
                    cursorBlinking: 'blink',
                    cursorSmoothCaretAnimation: 'on'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
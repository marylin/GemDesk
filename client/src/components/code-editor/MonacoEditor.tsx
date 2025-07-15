import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { X, Save, FileCode, FileText, Maximize2, Minimize2 } from 'lucide-react';
import type { File } from '@shared/schema';

interface MonacoEditorProps {
  file?: File | null;
  onClose: () => void;
}

interface EditorTab {
  id: number;
  name: string;
  content: string;
  isDirty: boolean;
  file: File;
  language: string;
}

export default function MonacoEditor({ file, onClose }: MonacoEditorProps) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const queryClient = useQueryClient();
  const editorRef = useRef<any>(null);

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

  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      case 'cs':
        return 'csharp';
      case 'php':
        return 'php';
      case 'rb':
        return 'ruby';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'md':
        return 'markdown';
      case 'sql':
        return 'sql';
      case 'sh':
        return 'shell';
      default:
        return 'plaintext';
    }
  };

  useEffect(() => {
    if (file && !tabs.find(tab => tab.id === file.id)) {
      const language = getLanguageFromFilename(file.name);
      const newTab: EditorTab = {
        id: file.id,
        name: file.name,
        content: file.content || '',
        isDirty: false,
        file,
        language
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTab(file.id.toString());
    }
  }, [file, tabs]);

  const handleContentChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    setTabs(prev => prev.map(tab => 
      tab.id.toString() === activeTab 
        ? { ...tab, content: value, isDirty: tab.content !== value }
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

  const closeTab = (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id.toString() !== tabId));
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id.toString() !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTab(remainingTabs[0].id.toString());
      } else {
        onClose();
      }
    }
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
        return <FileCode className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800 text-gray-400">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files open</p>
          <p className="text-sm">Select a file to start editing</p>
        </div>
      </div>
    );
  }

  const activeTabData = tabs.find(tab => tab.id.toString() === activeTab);

  return (
    <div className={`bg-gray-800 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      <div className="border-b border-gray-700">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between p-2">
            <TabsList className="bg-gray-700">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id.toString()}
                  className="relative flex items-center gap-2 data-[state=active]:bg-gray-600"
                >
                  {getFileIcon(tab.name)}
                  <span className="text-sm">{tab.name}</span>
                  {tab.isDirty && <div className="w-2 h-2 bg-orange-400 rounded-full" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id.toString());
                    }}
                    className="p-0 h-auto hover:bg-gray-500 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!activeTabData?.isDirty || updateFileMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1" />
                {updateFileMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              {!isFullscreen && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id.toString()} className="m-0 h-full">
              <div className={`${isFullscreen ? 'h-screen' : 'h-96'}`}>
                <Editor
                  value={tab.content}
                  language={tab.language}
                  theme="vs-dark"
                  onChange={handleContentChange}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    wordWrap: 'on',
                    tabSize: 2,
                    insertSpaces: true,
                    detectIndentation: true,
                    folding: true,
                    foldingHighlight: true,
                    showFoldingControls: 'always',
                    bracketPairColorization: { enabled: true },
                    renderWhitespace: 'boundary',
                    cursorStyle: 'line',
                    cursorBlinking: 'blink',
                    smoothScrolling: true,
                    contextmenu: true,
                    mouseWheelZoom: true
                  }}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
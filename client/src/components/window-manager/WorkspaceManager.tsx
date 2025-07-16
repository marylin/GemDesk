import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, FolderOpen, Trash2, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  panels: any[];
  layout: any;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkspaceManagerProps {
  currentWorkspace?: Workspace;
  onSaveWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onLoadWorkspace: (workspace: Workspace) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
  onExportWorkspace?: (workspace: Workspace) => void;
  onImportWorkspace?: (workspaceData: string) => void;
}

export default function WorkspaceManager({
  currentWorkspace,
  onSaveWorkspace,
  onLoadWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onImportWorkspace
}: WorkspaceManagerProps) {
  const [savedWorkspaces, setSavedWorkspaces] = useState<Workspace[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const { toast } = useToast();

  // Load workspaces from localStorage on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('gemini-cli-workspaces');
    if (saved) {
      try {
        const workspaces = JSON.parse(saved);
        setSavedWorkspaces(workspaces);
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      }
    }
  }, []);

  // Save workspaces to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('gemini-cli-workspaces', JSON.stringify(savedWorkspaces));
  }, [savedWorkspaces]);

  const handleSaveWorkspace = useCallback(() => {
    if (!workspaceName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workspace name",
        variant: "destructive"
      });
      return;
    }

    const newWorkspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'> = {
      name: workspaceName,
      description: workspaceDescription,
      panels: currentWorkspace?.panels || [],
      layout: currentWorkspace?.layout || {}
    };

    const workspace: Workspace = {
      ...newWorkspace,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSavedWorkspaces(prev => [...prev, workspace]);
    onSaveWorkspace(newWorkspace);
    setShowSaveDialog(false);
    setWorkspaceName('');
    setWorkspaceDescription('');

    toast({
      title: "Success",
      description: `Workspace "${workspace.name}" saved successfully`
    });
  }, [workspaceName, workspaceDescription, currentWorkspace, onSaveWorkspace, toast]);

  const handleLoadWorkspace = useCallback((workspace: Workspace) => {
    onLoadWorkspace(workspace);
    setShowLoadDialog(false);
    toast({
      title: "Success",
      description: `Workspace "${workspace.name}" loaded successfully`
    });
  }, [onLoadWorkspace, toast]);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    const workspace = savedWorkspaces.find(w => w.id === workspaceId);
    setSavedWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    onDeleteWorkspace?.(workspaceId);
    
    toast({
      title: "Success",
      description: `Workspace "${workspace?.name}" deleted successfully`
    });
  }, [savedWorkspaces, onDeleteWorkspace, toast]);

  const handleExportWorkspace = useCallback((workspace: Workspace) => {
    const data = JSON.stringify(workspace, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.name.replace(/\s+/g, '_')}_workspace.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExportWorkspace?.(workspace);
    toast({
      title: "Success",
      description: `Workspace "${workspace.name}" exported successfully`
    });
  }, [onExportWorkspace, toast]);

  const handleImportWorkspace = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const workspace = JSON.parse(content);
            
            // Add imported workspace to saved workspaces
            const newWorkspace: Workspace = {
              ...workspace,
              id: Date.now().toString(),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            setSavedWorkspaces(prev => [...prev, newWorkspace]);
            onImportWorkspace?.(content);
            
            toast({
              title: "Success",
              description: `Workspace "${workspace.name}" imported successfully`
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to import workspace. Invalid file format.",
              variant: "destructive"
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [onImportWorkspace, toast]);

  return (
    <div className="flex gap-2">
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Save Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Name</label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Description (Optional)</label>
              <Input
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="Enter workspace description..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveWorkspace}>
                Save Workspace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-1" />
            Load
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Load Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {savedWorkspaces.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">💾</div>
                <p>No saved workspaces found</p>
                <p className="text-sm">Save your current workspace to get started</p>
              </div>
            ) : (
              savedWorkspaces.map((workspace) => (
                <Card key={workspace.id} className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      <span>{workspace.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportWorkspace(workspace)}
                          title="Export workspace"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                          title="Delete workspace"
                          className="hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workspace.description && (
                      <p className="text-gray-300 text-sm mb-2">{workspace.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        Updated: {new Date(workspace.updatedAt).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleLoadWorkspace(workspace)}
                      >
                        Load
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleImportWorkspace}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
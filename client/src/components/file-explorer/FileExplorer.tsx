import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import FileTree from "./FileTree";
import { FilePlus, FolderPlus, Upload, RefreshCw } from "lucide-react";
import type { File } from "@shared/schema";

interface FileExplorerProps {
  onFileSelect: (file: File) => void;
}

export default function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "folder">("file");
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>();
  
  const queryClient = useQueryClient();

  const { data: files = [], isLoading, refetch } = useQuery<File[]>({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await fetch('/api/files', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    }
  });

  const createFileMutation = useMutation({
    mutationFn: async (data: { name: string; type: "file" | "folder"; content?: string; parentPath?: string }) => {
      const response = await apiRequest('POST', '/api/files', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setShowCreateDialog(false);
      setNewFileName("");
    }
  });

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    try {
      await createFileMutation.mutateAsync({
        name: newFileName,
        type: newFileType,
        content: newFileType === "file" ? "" : undefined,
        parentPath: ""
      });
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        await createFileMutation.mutateAsync({
          name: file.name,
          type: "file",
          content,
          parentPath: ""
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">PROJECT EXPLORER</h2>
        <div className="flex space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
                title="New File"
              >
                <FilePlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Create New {newFileType}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fileType">Type</Label>
                  <Select value={newFileType} onValueChange={(value: "file" | "folder") => setNewFileType(value)}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="folder">Folder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fileName">Name</Label>
                  <Input
                    id="fileName"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder={`Enter ${newFileType} name`}
                    className="bg-gray-900 border-gray-700 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateFile}
                    disabled={!newFileName.trim() || createFileMutation.isPending}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
            title="New Folder"
            onClick={() => {
              setNewFileType("folder");
              setShowCreateDialog(true);
            }}
          >
            <FolderPlus className="w-4 h-4" />
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".js,.jsx,.ts,.tsx,.json,.md,.txt,.css,.html,.py,.java,.cpp,.c"
            />
            <Button
              variant="ghost"
              size="icon"
              className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
              title="Upload File"
              asChild
            >
              <div>
                <Upload className="w-4 h-4" />
              </div>
            </Button>
          </label>

          <Button
            variant="ghost"
            size="icon"
            className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
            title="Refresh"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {isLoading ? (
          <div className="text-gray-400 text-sm p-2">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-gray-400 text-sm p-2">No files yet. Create your first file or folder!</div>
        ) : (
          <FileTree files={files} onFileSelect={onFileSelect} />
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import FileTreeNode from './FileTreeNode';
import type { File as FileType } from '@shared/schema';

interface FileTreeProps {
  files: FileType[];
  onFileSelect: (file: FileType) => void;
}

interface FileHierarchy {
  [key: string]: {
    file: FileType;
    children: FileHierarchy;
  };
}

export default function FileTree({ files, onFileSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [renamingFile, setRenamingFile] = useState<FileType | null>(null);
  const [draggedFile, setDraggedFile] = useState<FileType | null>(null);
  const [dragOverFile, setDragOverFile] = useState<FileType | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build hierarchical structure from flat file list
  const fileHierarchy = useMemo(() => {
    const hierarchy: FileHierarchy = {};
    
    // Sort files: folders first, then by name
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    // Build hierarchy based on file paths
    sortedFiles.forEach(file => {
      const pathParts = file.path.split('/').filter(Boolean);
      let currentLevel = hierarchy;
      
      // Navigate to the correct level in hierarchy
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!currentLevel[part]) {
          // Create intermediate folder if it doesn't exist
          currentLevel[part] = {
            file: {
              id: Date.now() + Math.random(), // Temporary ID for virtual folders
              name: part,
              type: 'folder' as const,
              path: pathParts.slice(0, i + 1).join('/'),
              content: '',
              userId: file.userId,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            children: {}
          };
        }
        currentLevel = currentLevel[part].children;
      }
      
      // Add the file to its final location
      const fileName = pathParts[pathParts.length - 1] || file.name;
      currentLevel[fileName] = {
        file,
        children: {}
      };
    });

    return hierarchy;
  }, [files]);

  const updateFileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<FileType> }) => {
      const response = await api.put(`/files/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update file",
        variant: "destructive",
      });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  });

  const createFileMutation = useMutation({
    mutationFn: async (fileData: { name: string; type: 'file' | 'folder'; parentPath?: string }) => {
      const response = await api.post('/files', {
        ...fileData,
        path: fileData.parentPath ? `${fileData.parentPath}/${fileData.name}` : fileData.name
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create file",
        variant: "destructive",
      });
    }
  });

  const handleToggle = (file: FileType) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file.id)) {
        newSet.delete(file.id);
      } else {
        newSet.add(file.id);
      }
      return newSet;
    });
  };

  const handleRename = (file: FileType, newName: string) => {
    updateFileMutation.mutate({
      id: file.id,
      updates: { name: newName }
    });
    setRenamingFile(null);
  };

  const handleDelete = (file: FileType) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      deleteFileMutation.mutate(file.id);
    }
  };

  const handleCreateFile = (parentPath: string) => {
    const name = prompt('Enter file name:');
    if (name) {
      createFileMutation.mutate({
        name,
        type: 'file',
        parentPath
      });
    }
  };

  const handleCreateFolder = (parentPath: string) => {
    const name = prompt('Enter folder name:');
    if (name) {
      createFileMutation.mutate({
        name,
        type: 'folder',
        parentPath
      });
    }
  };

  const handleDownload = (file: FileType) => {
    // Create a blob with the file content and trigger download
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = (file: FileType) => {
    // This will be handled by the parent component to share with AI
    onFileSelect(file);
    toast({
      title: "File Shared",
      description: `${file.name} is now available in the chat context`,
    });
  };

  const handleDragStart = (file: FileType) => {
    setDraggedFile(file);
  };

  const handleDragOver = (e: React.DragEvent, file: FileType) => {
    if (file.type === 'folder') {
      setDragOverFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFile: FileType) => {
    e.preventDefault();
    setDragOverFile(null);
    
    if (draggedFile && targetFile.type === 'folder' && draggedFile.id !== targetFile.id) {
      // Move file to new location
      const newPath = `${targetFile.path}/${draggedFile.name}`;
      updateFileMutation.mutate({
        id: draggedFile.id,
        updates: { path: newPath }
      });
    }
    
    setDraggedFile(null);
  };

  const renderFileNode = (key: string, { file, children }: { file: FileType; children: FileHierarchy }, level: number = 0) => {
    return (
      <div key={file.id}>
        <FileTreeNode
          file={file}
          children={[]}
          level={level}
          isExpanded={expandedFolders.has(file.id)}
          onToggle={handleToggle}
          onFileSelect={onFileSelect}
          onRename={handleRename}
          onDelete={handleDelete}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDownload={handleDownload}
          onShare={handleShare}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isRenaming={renamingFile?.id === file.id}
          onStartRename={setRenamingFile}
          onFinishRename={() => setRenamingFile(null)}
          dragOverFile={dragOverFile}
        />
        {/* Render children if folder is expanded */}
        {file.type === 'folder' && expandedFolders.has(file.id) && Object.keys(children).length > 0 && (
          <div>
            {Object.entries(children).map(([childKey, childData]) => 
              renderFileNode(childKey, childData, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {Object.entries(fileHierarchy).map(([key, data]) => 
        renderFileNode(key, data, 0)
      )}
      
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="w-12 h-12 mx-auto mb-2 opacity-50">
            📁
          </div>
          <p>No files found</p>
          <p className="text-sm">Create a new file to get started</p>
        </div>
      )}
    </div>
  );
}
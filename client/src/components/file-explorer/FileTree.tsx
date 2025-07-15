import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { File, Folder, FileText, Code, Image, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { File as FileType } from "@shared/schema";

interface FileTreeProps {
  files: FileType[];
  onFileSelect: (file: FileType) => void;
}

interface FileItemProps {
  file: FileType;
  onFileSelect: (file: FileType) => void;
  level?: number;
}

function getFileIcon(file: FileType) {
  if (file.type === "folder") {
    return <Folder className="w-4 h-4 text-blue-400" />;
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
      return <Code className="w-4 h-4 text-green-400" />;
    case 'json':
    case 'html':
    case 'css':
      return <Code className="w-4 h-4 text-yellow-400" />;
    case 'md':
    case 'txt':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image className="w-4 h-4 text-purple-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}

function FileItem({ file, onFileSelect, level = 0 }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    }
  });

  const handleFileClick = () => {
    if (file.type === "folder") {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(file);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await deleteFileMutation.mutateAsync(file.id);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  return (
    <div>
      <div 
        className="flex items-center space-x-2 file-tree-item px-2 py-1 rounded cursor-pointer group"
        style={{ marginLeft: `${level * 16}px` }}
        onClick={handleFileClick}
      >
        {getFileIcon(file)}
        <span className="flex-1 text-sm truncate">{file.name}</span>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0 hover:bg-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                <Edit3 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-400 hover:bg-gray-700"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* TODO: Implement nested file rendering for folders */}
      {file.type === "folder" && isExpanded && (
        <div className="ml-4">
          {/* This would render child files in a real implementation */}
          <div className="text-gray-500 text-xs p-2">Folder contents would go here</div>
        </div>
      )}
    </div>
  );
}

export default function FileTree({ files, onFileSelect }: FileTreeProps) {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
}

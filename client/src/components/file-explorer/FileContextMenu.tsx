import React from 'react';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  File, 
  Folder, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  Share, 
  FolderPlus,
  FilePlus
} from 'lucide-react';
import type { File as FileType } from '@shared/schema';

interface FileContextMenuProps {
  file: FileType;
  onRename: (file: FileType) => void;
  onDelete: (file: FileType) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDownload: (file: FileType) => void;
  onShare: (file: FileType) => void;
  children: React.ReactNode;
}

export default function FileContextMenu({ 
  file, 
  onRename, 
  onDelete, 
  onCreateFile, 
  onCreateFolder, 
  onDownload, 
  onShare,
  children 
}: FileContextMenuProps) {
  const handleRename = () => {
    onRename(file);
  };

  const handleDelete = () => {
    onDelete(file);
  };

  const handleCreateFile = () => {
    onCreateFile(file.type === 'folder' ? file.path : file.path.split('/').slice(0, -1).join('/'));
  };

  const handleCreateFolder = () => {
    onCreateFolder(file.type === 'folder' ? file.path : file.path.split('/').slice(0, -1).join('/'));
  };

  const handleDownload = () => {
    onDownload(file);
  };

  const handleShare = () => {
    onShare(file);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-gray-800 border-gray-700 text-white">
        <ContextMenuItem onClick={handleRename} className="hover:bg-gray-700">
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-gray-700" />
        
        <ContextMenuItem onClick={handleCreateFile} className="hover:bg-gray-700">
          <FilePlus className="w-4 h-4 mr-2" />
          New File
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCreateFolder} className="hover:bg-gray-700">
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-gray-700" />
        
        <ContextMenuItem onClick={handleDownload} className="hover:bg-gray-700">
          <Download className="w-4 h-4 mr-2" />
          Download
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleShare} className="hover:bg-gray-700">
          <Share className="w-4 h-4 mr-2" />
          Share with AI
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-gray-700" />
        
        <ContextMenuItem 
          onClick={handleDelete} 
          className="hover:bg-red-600 text-red-400 hover:text-white"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
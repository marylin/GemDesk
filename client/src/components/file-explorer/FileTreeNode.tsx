import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Code,
  FileText,
  Image,
  Music,
  Video,
  Archive
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileContextMenu from './FileContextMenu';
import type { File as FileType } from '@shared/schema';

interface FileTreeNodeProps {
  file: FileType;
  children?: FileType[];
  level: number;
  isExpanded: boolean;
  onToggle: (file: FileType) => void;
  onFileSelect: (file: FileType) => void;
  onRename: (file: FileType, newName: string) => void;
  onDelete: (file: FileType) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDownload: (file: FileType) => void;
  onShare: (file: FileType) => void;
  onDragStart: (file: FileType) => void;
  onDragOver: (e: React.DragEvent, file: FileType) => void;
  onDrop: (e: React.DragEvent, targetFile: FileType) => void;
  isRenaming?: boolean;
  onStartRename: (file: FileType) => void;
  onFinishRename: () => void;
  dragOverFile?: FileType | null;
}

export default function FileTreeNode({
  file,
  children = [],
  level,
  isExpanded,
  onToggle,
  onFileSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onShare,
  onDragStart,
  onDragOver,
  onDrop,
  isRenaming,
  onStartRename,
  onFinishRename,
  dragOverFile
}: FileTreeNodeProps) {
  const [tempName, setTempName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const getFileIcon = (file: FileType) => {
    if (file.type === 'folder') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-400" />
      ) : (
        <Folder className="w-4 h-4 text-blue-400" />
      );
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
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleClick = () => {
    if (file.type === 'folder') {
      onToggle(file);
    } else {
      onFileSelect(file);
    }
  };

  const handleRenameComplete = () => {
    if (tempName.trim() && tempName !== file.name) {
      onRename(file, tempName.trim());
    }
    onFinishRename();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameComplete();
    } else if (e.key === 'Escape') {
      setTempName(file.name);
      onFinishRename();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', file.id.toString());
    onDragStart(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, file);
  };

  const isDropTarget = dragOverFile?.id === file.id;

  return (
    <div className="select-none">
      <FileContextMenu
        file={file}
        onRename={onStartRename}
        onDelete={onDelete}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onDownload={onDownload}
        onShare={onShare}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative
            ${isDropTarget ? 'bg-blue-600/20 border-2 border-blue-500 border-dashed' : ''}
          `}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className={`
              w-full justify-start text-left p-2 h-auto
              hover:bg-gray-700 text-gray-300 hover:text-white
              ${file.type === 'folder' ? 'font-medium' : ''}
              ${isDropTarget ? 'bg-blue-600/10' : ''}
            `}
            style={{ paddingLeft: `${(level * 16) + 8}px` }}
          >
            <div className="flex items-center gap-2 w-full">
              {file.type === 'folder' && (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </div>
              )}
              
              <div className="flex-shrink-0">
                {getFileIcon(file)}
              </div>
              
              {isRenaming ? (
                <Input
                  ref={inputRef}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleRenameComplete}
                  onKeyDown={handleKeyDown}
                  className="h-6 px-2 text-sm bg-gray-700 border-gray-600 text-white"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-sm">{file.name}</span>
              )}
            </div>
          </Button>
        </div>
      </FileContextMenu>
      
      {/* Children are now rendered by the parent FileTree component */}
    </div>
  );
}
import React, { useState } from 'react';
import { 
  File, 
  Folder, 
  ChevronRight, 
  ChevronDown,
  Code,
  FileText,
  Image,
  Music,
  Video,
  Archive
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { File as FileType } from '@shared/schema';

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
  if (file.type === 'folder') {
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
}

function FileItem({ file, onFileSelect, level = 0 }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (file.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(file);
    }
  };

  return (
    <div className="select-none">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`
          w-full justify-start text-left p-2 h-auto
          hover:bg-gray-700 text-gray-300 hover:text-white
          ${file.type === 'folder' ? 'font-medium' : ''}
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
          
          <span className="truncate text-sm">{file.name}</span>
        </div>
      </Button>
    </div>
  );
}

export default function FileTree({ files, onFileSelect }: FileTreeProps) {
  // Sort files: folders first, then files, both alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-1">
      {sortedFiles.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          onFileSelect={onFileSelect}
        />
      ))}
      
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No files found</p>
          <p className="text-sm">Create a new file to get started</p>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Folder, Search, Upload, Filter } from 'lucide-react';
import FileTree from './FileTree';
import FileUpload from '@/components/file-upload/FileUpload';
import type { File } from '@shared/schema';

interface FileExplorerProps {
  onFileSelect: (file: File) => void;
}

export default function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'modified'>('name');
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/files');
      return await response.json();
    }
  });

  const createFileMutation = useMutation({
    mutationFn: async (fileData: { name: string; type: 'file' | 'folder'; content?: string }) => {
      const response = await apiRequest('POST', '/api/files', fileData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setShowCreateDialog(false);
      setNewFileName('');
    }
  });

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    createFileMutation.mutate({
      name: newFileName,
      type: newFileType,
      content: newFileType === 'file' ? '' : undefined
    });
  };

  const filteredFiles = files
    .filter((file: File) => {
      // Text search filter
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = filterType === 'all' || 
        (filterType === 'files' && file.type === 'file') ||
        (filterType === 'folders' && file.type === 'folder');
      
      return matchesSearch && matchesType;
    })
    .sort((a: File, b: File) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'modified':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

  return (
    <Card className="h-full bg-gray-800 border-gray-700 rounded-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            Files
          </span>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowUploadDialog(true)}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full p-0">
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          
          <div className="flex space-x-2">
            <Select value={filterType} onValueChange={(value: 'all' | 'files' | 'folders') => setFilterType(value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="files">Files Only</SelectItem>
                <SelectItem value="folders">Folders Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'name' | 'type' | 'modified') => setSortBy(value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="type">Sort by Type</SelectItem>
                <SelectItem value="modified">Sort by Modified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showCreateDialog && (
          <div className="p-4 border-b border-gray-700 bg-gray-750">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={newFileType === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewFileType('file')}
                  className="flex-1"
                >
                  File
                </Button>
                <Button
                  variant={newFileType === 'folder' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewFileType('folder')}
                  className="flex-1"
                >
                  Folder
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={`${newFileType === 'file' ? 'File' : 'Folder'} name...`}
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
                />
                <Button
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim() || createFileMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {showUploadDialog && (
          <div className="p-4 border-b border-gray-700 bg-gray-750">
            <FileUpload 
              onUploadComplete={(files) => {
                setShowUploadDialog(false);
                queryClient.invalidateQueries({ queryKey: ['/api/files'] });
              }}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-400">Loading files...</div>
            </div>
          ) : (
            <FileTree files={filteredFiles} onFileSelect={onFileSelect} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
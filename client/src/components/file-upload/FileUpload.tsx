import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (files: any[]) => void;
  className?: string;
}

interface UploadFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  id: string;
}

export default function FileUpload({ onUploadComplete, className }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const response = await apiRequest('POST', '/api/files', {
        name,
        type: 'file',
        content,
        parentPath: ''
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    }
  });

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      const content = await readFileContent(uploadFile.file);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: Math.min(f.progress + 20, 80) }
            : f
        ));
      }, 200);

      await uploadMutation.mutateAsync({
        name: uploadFile.file.name,
        content
      });

      clearInterval(progressInterval);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));

    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploadFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    // Start uploading each file
    newUploadFiles.forEach(uploadFile => {
      uploadFile(uploadFile);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': [],
      'application/json': [],
      'application/javascript': [],
      'application/typescript': [],
      'application/xml': [],
      'application/yaml': [],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50/5'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-400">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-300 mb-2">
                  Drag & drop files here, or <span className="text-blue-400">click to select</span>
                </p>
                <p className="text-sm text-gray-500">
                  Supports text files, JSON, JavaScript, TypeScript, XML, YAML
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
          </div>

          {uploadFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-white font-medium">Uploading Files</h3>
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="w-full" />
                  )}
                  
                  {uploadFile.status === 'error' && (
                    <p className="text-red-400 text-sm mt-2">
                      {uploadFile.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
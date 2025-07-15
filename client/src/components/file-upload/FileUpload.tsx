import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadFile, uploadFiles } from '@/lib/axios';
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

  const singleUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await uploadFile(file, '');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    }
  });

  const multipleUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const response = await uploadFiles(files, '');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    }
  });

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: Math.min(f.progress + 20, 80) }
            : f
        ));
      }, 200);

      await singleUploadMutation.mutateAsync(uploadFile.file);

      clearInterval(progressInterval);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));

      if (onUploadComplete) {
        onUploadComplete([uploadFile.file]);
      }
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
      uploadSingleFile(uploadFile);
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
                <p className="text-gray-300 mb-2">Drag & drop files here, or click to select</p>
                <p className="text-gray-500 text-sm">
                  Supports: TXT, JS, TS, JSON, HTML, CSS, MD, PY, Java, C++, etc.
                </p>
                <p className="text-gray-500 text-sm">Max file size: 10MB</p>
              </div>
            )}
          </div>

          {uploadFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-white font-medium">Uploaded Files</h3>
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">{uploadFile.file.name}</p>
                        <p className="text-gray-400 text-sm">{formatFileSize(uploadFile.file.size)}</p>
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
                    <div className="mb-2">
                      <Progress value={uploadFile.progress} className="h-2" />
                      <p className="text-gray-400 text-sm mt-1">Uploading... {uploadFile.progress}%</p>
                    </div>
                  )}
                  
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-red-400 text-sm">{uploadFile.error}</p>
                  )}
                  
                  {uploadFile.status === 'success' && (
                    <p className="text-green-400 text-sm">Upload successful!</p>
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
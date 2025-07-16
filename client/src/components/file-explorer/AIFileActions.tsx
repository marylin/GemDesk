import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Search, 
  Code, 
  FileText, 
  Wrench, 
  ArrowRightLeft,
  Plus,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AIService from '@/services/aiService';
import type { File as FileType } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AIFileActionsProps {
  file?: FileType;
  onFileChange?: () => void;
}

export default function AIFileActions({ file, onFileChange }: AIFileActionsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRefactorDialog, setShowRefactorDialog] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [refactorInstructions, setRefactorInstructions] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeFileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected');
      return AIService.analyzeFile(file.id);
    },
    onSuccess: (result) => {
      toast({
        title: "File Analysis Complete",
        description: `Analysis completed for ${file?.name}. Check the chat for detailed insights.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze file",
        variant: "destructive"
      });
    }
  });

  const createFileMutation = useMutation({
    mutationFn: () => AIService.generateFileFromDescription(fileDescription, fileName),
    onSuccess: (result) => {
      toast({
        title: "File Created",
        description: `AI-generated file ${fileName} has been created successfully.`
      });
      setShowCreateDialog(false);
      setFileName('');
      setFileDescription('');
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      onFileChange?.();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create file",
        variant: "destructive"
      });
    }
  });

  const refactorFileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected');
      return AIService.refactorFile(file.id, refactorInstructions);
    },
    onSuccess: (result) => {
      toast({
        title: "Refactor Complete",
        description: `Refactoring suggestions for ${file?.name} are ready. Check the chat for details.`
      });
      setShowRefactorDialog(false);
      setRefactorInstructions('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Refactor Failed",
        description: error.message || "Failed to refactor file",
        variant: "destructive"
      });
    }
  });

  const fileActions = [
    {
      icon: Search,
      label: "Analyze",
      action: () => analyzeFileMutation.mutate(),
      disabled: !file || file.type !== 'file',
      description: "AI analysis of the selected file"
    },
    {
      icon: Wrench,
      label: "Refactor",
      action: () => setShowRefactorDialog(true),
      disabled: !file || file.type !== 'file',
      description: "Get AI refactoring suggestions"
    },
    {
      icon: Plus,
      label: "Create",
      action: () => setShowCreateDialog(true),
      disabled: false,
      description: "Generate new file with AI"
    }
  ];

  return (
    <>
      <div className="flex items-center gap-1 p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-1 mr-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-gray-300 font-medium">AI File Tools</span>
        </div>
        
        <div className="flex items-center gap-1">
          {fileActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={action.action}
              disabled={action.disabled || analyzeFileMutation.isPending || createFileMutation.isPending || refactorFileMutation.isPending}
              title={action.description}
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Create File Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create File with AI</DialogTitle>
            <DialogDescription className="text-gray-400">
              Describe what you want to create and AI will generate the file for you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName" className="text-gray-300">File Name</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., MyComponent.tsx, utils.js, README.md"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="fileDescription" className="text-gray-300">Description</Label>
              <Textarea
                id="fileDescription"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Describe what the file should do, include features, functionality, and any specific requirements..."
                className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createFileMutation.mutate()}
                disabled={!fileName.trim() || !fileDescription.trim() || createFileMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createFileMutation.isPending ? 'Creating...' : 'Create File'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refactor Dialog */}
      <Dialog open={showRefactorDialog} onOpenChange={setShowRefactorDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Refactor File</DialogTitle>
            <DialogDescription className="text-gray-400">
              Provide instructions for how you want to refactor {file?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="refactorInstructions" className="text-gray-300">Refactoring Instructions</Label>
              <Textarea
                id="refactorInstructions"
                value={refactorInstructions}
                onChange={(e) => setRefactorInstructions(e.target.value)}
                placeholder="e.g., Convert to TypeScript, extract reusable components, optimize performance, add error handling..."
                className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowRefactorDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => refactorFileMutation.mutate()}
                disabled={!refactorInstructions.trim() || refactorFileMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {refactorFileMutation.isPending ? 'Analyzing...' : 'Get Suggestions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
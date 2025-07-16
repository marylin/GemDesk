import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Code, 
  FileText, 
  Zap, 
  TestTube, 
  Wrench, 
  BookOpen, 
  ArrowRightLeft,
  Lightbulb,
  Search,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AIService from '@/services/aiService';

interface AIToolbarProps {
  code?: string;
  language?: string;
  fileName?: string;
  onResult?: (result: any) => void;
}

export default function AIToolbar({ code = '', language = 'javascript', fileName, onResult }: AIToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const aiMutation = useMutation({
    mutationFn: async (action: () => Promise<any>) => {
      setIsLoading(true);
      return await action();
    },
    onSuccess: (result) => {
      onResult?.(result);
      toast({
        title: "AI Analysis Complete",
        description: "Your request has been processed successfully."
      });
      // Invalidate chat messages to show new AI responses
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "AI Error",
        description: error.message || "Failed to process AI request",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleAnalyzeCode = () => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to analyze",
        variant: "destructive"
      });
      return;
    }

    aiMutation.mutate(() => AIService.analyzeCode({
      code,
      language,
      context: {
        fileName,
        projectStructure: { type: 'file' }
      }
    }));
  };

  const handleSuggestImprovements = () => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to improve",
        variant: "destructive"
      });
      return;
    }

    aiMutation.mutate(() => AIService.suggestImprovements(code, language, { fileName }));
  };

  const handleExplainCode = (complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate') => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to explain",
        variant: "destructive"
      });
      return;
    }

    aiMutation.mutate(() => AIService.explainCode(code, language, complexity));
  };

  const handleGenerateTests = () => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to generate tests for",
        variant: "destructive"
      });
      return;
    }

    const testFramework = language === 'javascript' || language === 'typescript' ? 'Jest' : undefined;
    aiMutation.mutate(() => AIService.generateTests(code, language, testFramework));
  };

  const handleOptimizeCode = (type: 'performance' | 'memory' | 'readability' | 'all' = 'all') => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to optimize",
        variant: "destructive"
      });
      return;
    }

    aiMutation.mutate(() => AIService.optimizeCode(code, language, type));
  };

  const handleGenerateDocumentation = (docType: 'api' | 'readme' | 'inline' = 'api') => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please select or write some code to document",
        variant: "destructive"
      });
      return;
    }

    aiMutation.mutate(() => AIService.generateDocumentation(code, language, docType));
  };

  const toolbarButtons = [
    {
      icon: Search,
      label: "Analyze Code",
      action: handleAnalyzeCode,
      description: "Get detailed code analysis with insights and suggestions"
    },
    {
      icon: Lightbulb,
      label: "Improve",
      action: handleSuggestImprovements,
      description: "Get smart suggestions for code improvements"
    },
    {
      icon: BookOpen,
      label: "Explain",
      action: () => handleExplainCode('intermediate'),
      description: "Get a detailed explanation of how the code works"
    },
    {
      icon: TestTube,
      label: "Tests",
      action: handleGenerateTests,
      description: "Generate comprehensive unit tests for the code"
    },
    {
      icon: Zap,
      label: "Optimize",
      action: () => handleOptimizeCode('all'),
      description: "Optimize code for performance, memory, and readability"
    },
    {
      icon: FileText,
      label: "Document",
      action: () => handleGenerateDocumentation('api'),
      description: "Generate professional documentation for the code"
    }
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-1 mr-2">
        <Bot className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-gray-300 font-medium">AI Tools</span>
      </div>
      
      <div className="flex items-center gap-1 flex-wrap">
        {toolbarButtons.map((button, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={button.action}
            disabled={isLoading}
            title={button.description}
          >
            <button.icon className="w-3 h-3 mr-1" />
            {button.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 ml-auto text-xs text-blue-400">
          <RotateCcw className="w-3 h-3 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
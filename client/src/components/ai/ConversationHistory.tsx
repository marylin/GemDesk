import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  History, 
  Trash2, 
  Filter, 
  Bot, 
  User, 
  Code, 
  TestTube, 
  Zap, 
  FileText,
  MessageSquare,
  ArrowRightLeft,
  Lightbulb,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIService from '@/services/aiService';
import { formatDistanceToNow } from 'date-fns';

interface ConversationHistoryProps {
  className?: string;
}

export default function ConversationHistory({ className }: ConversationHistoryProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['/api/gemini/history', selectedType],
    queryFn: async () => {
      try {
        return await AIService.getHistory(selectedType === 'all' ? undefined : selectedType, 100);
      } catch (error) {
        console.error('Failed to fetch AI history:', error);
        return [];
      }
    }
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => AIService.clearHistory(),
    onSuccess: () => {
      toast({
        title: "History Cleared",
        description: "AI conversation history has been cleared successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gemini/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear conversation history",
        variant: "destructive"
      });
    }
  });

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'code_analysis': Search,
      'code_generation': Code,
      'code_suggestions': Lightbulb,
      'code_explanation': MessageSquare,
      'test_generation': TestTube,
      'code_optimization': Zap,
      'documentation_generation': FileText,
      'code_conversion': ArrowRightLeft,
      'chat': Bot
    };
    return iconMap[type] || MessageSquare;
  };

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      'code_analysis': 'Code Analysis',
      'code_generation': 'Code Generation',
      'code_suggestions': 'Suggestions',
      'code_explanation': 'Code Explanation',
      'test_generation': 'Test Generation',
      'code_optimization': 'Code Optimization',
      'documentation_generation': 'Documentation',
      'code_conversion': 'Code Conversion',
      'chat': 'Chat'
    };
    return labelMap[type] || 'Unknown';
  };

  const filterTypes = [
    { value: 'all', label: 'All Types', icon: History },
    { value: 'code_analysis', label: 'Analysis', icon: Search },
    { value: 'code_generation', label: 'Generation', icon: Code },
    { value: 'code_suggestions', label: 'Suggestions', icon: Lightbulb },
    { value: 'test_generation', label: 'Tests', icon: TestTube },
    { value: 'code_optimization', label: 'Optimization', icon: Zap },
    { value: 'documentation_generation', label: 'Docs', icon: FileText },
    { value: 'chat', label: 'Chat', icon: MessageSquare }
  ];

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            AI History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearHistoryMutation.mutate()}
            disabled={clearHistoryMutation.isPending || history.length === 0}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1 mt-3">
          {filterTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs ${
                  selectedType === type.value 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                onClick={() => setSelectedType(type.value)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {type.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="max-h-96 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="text-center text-gray-400 py-4">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No AI interactions yet</p>
            <p className="text-xs mt-1">Start using AI tools to see history here</p>
          </div>
        ) : (
          Array.isArray(history) && history.map((item: any) => {
            const type = item.metadata?.type || 'chat';
            const TypeIcon = getTypeIcon(type);
            
            return (
              <div
                key={item.id}
                className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.sender === 'user' ? (
                      <User className="w-4 h-4 text-blue-400" />
                    ) : (
                      <TypeIcon className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {item.sender === 'user' ? 'You' : getTypeLabel(type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {item.content}
                    </p>
                    
                    {item.metadata?.language && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {item.metadata.language}
                        </span>
                        {item.metadata.description && (
                          <span className="text-xs text-gray-500 truncate">
                            {item.metadata.description}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }) || null
        )}
      </CardContent>
    </Card>
  );
}
import { apiRequest } from '@/lib/queryClient';

export interface AIResponse {
  message: string;
  metadata?: any;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  context?: {
    projectStructure?: any;
    fileName?: string;
    dependencies?: string[];
  };
}

export interface CodeGenerationRequest {
  description: string;
  language?: string;
  context?: {
    existingCode?: string;
    dependencies?: string[];
    framework?: string;
  };
}

export interface CodeConversionRequest {
  code: string;
  fromLanguage: string;
  toLanguage: string;
  context?: any;
}

export class AIService {
  // Enhanced Code Analysis
  static async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/analyze-code', request);
    return await response.json();
  }

  // Advanced Code Generation
  static async generateCode(request: CodeGenerationRequest): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/generate-code', request);
    return await response.json();
  }

  // Smart Code Suggestions
  static async suggestImprovements(code: string, language: string, context?: any): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/suggest-improvements', { code, language, context });
    return await response.json();
  }

  // Code Explanation
  static async explainCode(
    code: string, 
    language: string, 
    complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/explain-code', { code, language, complexity });
    return await response.json();
  }

  // Test Generation
  static async generateTests(
    code: string, 
    language: string, 
    testFramework?: string
  ): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/generate-tests', { code, language, testFramework });
    return await response.json();
  }

  // Code Optimization
  static async optimizeCode(
    code: string, 
    language: string, 
    optimizationType: 'performance' | 'memory' | 'readability' | 'all' = 'all'
  ): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/optimize-code', { code, language, optimizationType });
    return await response.json();
  }

  // Documentation Generation
  static async generateDocumentation(
    code: string, 
    language: string, 
    docType: 'api' | 'readme' | 'inline' = 'api'
  ): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/generate-docs', { code, language, docType });
    return await response.json();
  }

  // Code Conversion
  static async convertCode(request: CodeConversionRequest): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/convert-code', request);
    return await response.json();
  }

  // Chat with AI
  static async sendMessage(message: string, context?: any): Promise<AIResponse> {
    const response = await apiRequest('POST', '/api/gemini/chat', { message, context });
    return await response.json();
  }

  // Conversation History Management
  static async getHistory(type?: string, limit: number = 50): Promise<any[]> {
    let url = '/api/gemini/history?limit=' + limit;
    if (type) url += '&type=' + encodeURIComponent(type);
    
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }
    return await response.json();
  }

  static async clearHistory(): Promise<void> {
    const response = await apiRequest('DELETE', '/api/gemini/history');
    // No need to parse response for DELETE
  }

  // AI-Powered File Operations
  static async analyzeFile(fileId: number): Promise<AIResponse> {
    const response = await fetch(`/api/files/${fileId}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch file');
    const file = await response.json();
    
    const language = this.getLanguageFromExtension(file.name);
    
    return this.analyzeCode({
      code: file.content || '',
      language,
      context: {
        fileName: file.name,
        projectStructure: { type: file.type, path: file.path }
      }
    });
  }

  static async generateFileFromDescription(
    description: string, 
    fileName: string,
    parentPath: string = ''
  ): Promise<{ file: any; analysis: AIResponse }> {
    const language = this.getLanguageFromExtension(fileName);
    
    // Generate code
    const aiResponse = await this.generateCode({
      description,
      language,
      context: {
        dependencies: ['React', 'TypeScript', 'Tailwind CSS'] // Default dependencies
      }
    });

    // Create file
    const fileResponse = await apiRequest('POST', '/api/files', {
      name: fileName,
      parentPath,
      type: 'file',
      content: aiResponse.message
    });
    const file = await fileResponse.json();

    return {
      file,
      analysis: aiResponse
    };
  }

  static async refactorFile(fileId: number, instructions: string): Promise<AIResponse> {
    const response = await fetch(`/api/files/${fileId}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch file');
    const file = await response.json();
    
    const language = this.getLanguageFromExtension(file.name);
    
    // Get refactoring suggestions
    const refactorResponse = await this.sendMessage(
      `Refactor this ${language} code based on these instructions: ${instructions}
      
      Original code:
      \`\`\`${language}
      ${file.content || ''}
      \`\`\`
      
      Please provide the refactored code with explanations of changes made.`,
      {
        type: 'refactor',
        fileName: file.name,
        originalCode: file.content
      }
    );

    return refactorResponse;
  }

  private static getLanguageFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'ps1': 'powershell'
    };
    return languageMap[ext || ''] || 'text';
  }
}

export default AIService;
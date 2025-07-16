import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface GeminiCLIResponse {
  message: string;
  metadata?: any;
}

export class GeminiCLIService extends EventEmitter {
  private isReady = false;

  constructor() {
    super();
    this.initializeCLI();
  }

  private initializeCLI() {
    try {
      console.log('Initializing Gemini CLI (non-interactive mode)...');
      console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
      
      // Mark as ready - we'll use spawn for each request instead of persistent process
      this.isReady = true;
      console.log('Gemini CLI service is ready');
      this.emit('ready');

    } catch (error) {
      console.error('Failed to initialize Gemini CLI:', error);
      this.emit('error', 'Failed to initialize Gemini CLI');
    }
  }

  async sendMessage(message: string, context?: any): Promise<GeminiCLIResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Gemini CLI not ready'));
        return;
      }

      // Add context to the message if provided
      let fullMessage = message;
      if (context && context.file) {
        fullMessage = `Context: Working with file ${context.file.name} (${context.file.type})\n\n${message}`;
      }

      console.log('Sending message to Gemini CLI:', fullMessage);
      console.log('Using API key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

      // Spawn a new process for each request using -p flag
      const cliProcess = spawn('npx', ['@google/gemini-cli', '-p', fullMessage], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY
        }
      });

      let output = '';
      let errorOutput = '';

      // Handle stdout (AI responses)
      cliProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('Gemini CLI stdout chunk:', chunk);
        output += chunk;
      });

      // Handle stderr (errors and status messages)
      cliProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.log('Gemini CLI stderr chunk:', chunk);
        errorOutput += chunk;
      });

      let processCompleted = false;

      // Handle process completion
      cliProcess.on('close', (code) => {
        if (processCompleted) return;
        processCompleted = true;
        
        console.log(`Gemini CLI process finished with code ${code}`);
        console.log('Full stdout:', output);
        console.log('Full stderr:', errorOutput);

        if (code === 0 && output.trim()) {
          resolve({
            message: output.trim(),
            metadata: { timestamp: new Date().toISOString() }
          });
        } else {
          const error = errorOutput || `Process exited with code ${code}`;
          reject(new Error(error));
        }
      });

      // Handle process errors
      cliProcess.on('error', (error) => {
        if (processCompleted) return;
        processCompleted = true;
        
        console.error('Gemini CLI spawn error:', error);
        reject(error);
      });

      // Timeout after 60 seconds (only if process hasn't completed)
      setTimeout(() => {
        if (!processCompleted) {
          processCompleted = true;
          console.log('Gemini CLI timeout - killing process');
          cliProcess.kill();
          reject(new Error('Response timeout'));
        }
      }, 60000);
    });
  }

  async analyzeCode(code: string, language: string, context?: any): Promise<GeminiCLIResponse> {
    let prompt = `Analyze this ${language} code with detailed insights:

**Code Analysis Request:**
- Identify potential bugs, security vulnerabilities, and performance issues
- Suggest specific improvements and optimizations
- Check for best practices and code patterns
- Provide refactoring recommendations
- Rate code quality (1-10) with explanations

\`\`\`${language}
${code}
\`\`\``;

    if (context?.projectStructure) {
      prompt += `\n\n**Project Context:** ${JSON.stringify(context.projectStructure)}`;
    }
    
    return this.sendMessage(prompt, context);
  }

  async generateCode(description: string, language?: string, context?: any): Promise<GeminiCLIResponse> {
    let prompt = `Generate ${language || 'high-quality'} code for: ${description}

**Code Generation Requirements:**
- Include comprehensive comments and documentation
- Follow best practices and industry standards
- Add error handling and input validation
- Make code modular and reusable
- Include usage examples if applicable`;

    if (context?.existingCode) {
      prompt += `\n\n**Existing Code Context:**\n\`\`\`\n${context.existingCode}\n\`\`\``;
    }

    if (context?.dependencies) {
      prompt += `\n\n**Available Dependencies:** ${context.dependencies.join(', ')}`;
    }

    return this.sendMessage(prompt, context);
  }

  async suggestCodeImprovements(code: string, language: string, context?: any): Promise<GeminiCLIResponse> {
    const prompt = `Provide smart code suggestions for this ${language} code:

**Focus Areas:**
- Performance optimizations
- Code readability improvements
- Security enhancements
- Modern language features
- Architecture improvements

\`\`\`${language}
${code}
\`\`\`

**Format response as:**
1. **Critical Issues** (if any)
2. **Performance Improvements**
3. **Code Quality Enhancements**
4. **Modernization Suggestions**
5. **Alternative Approaches**`;

    return this.sendMessage(prompt, context);
  }

  async explainCode(code: string, language: string, complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'): Promise<GeminiCLIResponse> {
    const prompt = `Explain this ${language} code for a ${complexity} developer:

**Explanation Requirements:**
- Break down the code structure and logic
- Explain key concepts and patterns used
- Describe the flow of execution
- Highlight important design decisions
- Provide context for why certain approaches were used

\`\`\`${language}
${code}
\`\`\`

**Format as a clear, educational explanation.**`;

    return this.sendMessage(prompt);
  }

  async generateTests(code: string, language: string, testFramework?: string): Promise<GeminiCLIResponse> {
    const framework = testFramework || (language === 'javascript' || language === 'typescript' ? 'Jest' : 'appropriate framework');
    
    const prompt = `Generate comprehensive unit tests for this ${language} code using ${framework}:

**Test Requirements:**
- Cover all functions and edge cases
- Include positive and negative test scenarios
- Test error handling and boundary conditions
- Add meaningful test descriptions
- Follow testing best practices

\`\`\`${language}
${code}
\`\`\`

**Generate complete test suite with setup and teardown if needed.**`;

    return this.sendMessage(prompt);
  }

  async optimizeCode(code: string, language: string, optimizationType: 'performance' | 'memory' | 'readability' | 'all' = 'all'): Promise<GeminiCLIResponse> {
    const prompt = `Optimize this ${language} code focusing on ${optimizationType}:

**Optimization Goals:**
${optimizationType === 'performance' ? '- Improve execution speed and efficiency' : ''}
${optimizationType === 'memory' ? '- Reduce memory usage and prevent leaks' : ''}
${optimizationType === 'readability' ? '- Enhance code clarity and maintainability' : ''}
${optimizationType === 'all' ? '- Balance performance, memory usage, and readability' : ''}

\`\`\`${language}
${code}
\`\`\`

**Provide optimized code with detailed explanations of changes made.**`;

    return this.sendMessage(prompt);
  }

  async generateDocumentation(code: string, language: string, docType: 'api' | 'readme' | 'inline' = 'api'): Promise<GeminiCLIResponse> {
    const prompt = `Generate ${docType} documentation for this ${language} code:

**Documentation Requirements:**
- Clear and comprehensive descriptions
- Parameter and return value documentation
- Usage examples and code samples
- Error conditions and handling
- Best practices and guidelines

\`\`\`${language}
${code}
\`\`\`

**Format as professional, well-structured documentation.**`;

    return this.sendMessage(prompt);
  }

  async convertCode(code: string, fromLanguage: string, toLanguage: string, context?: any): Promise<GeminiCLIResponse> {
    const prompt = `Convert this ${fromLanguage} code to ${toLanguage}:

**Conversion Requirements:**
- Maintain functionality and logic
- Use ${toLanguage} best practices and idioms
- Update syntax and patterns appropriately
- Preserve code structure where possible
- Add ${toLanguage}-specific improvements

\`\`\`${fromLanguage}
${code}
\`\`\`

**Provide converted code with explanation of key changes made.**`;

    return this.sendMessage(prompt, context);
  }

  isCliReady(): boolean {
    return this.isReady;
  }

  destroy() {
    this.isReady = false;
  }
}

export const geminiCLIService = new GeminiCLIService();
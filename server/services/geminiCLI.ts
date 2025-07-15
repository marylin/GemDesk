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

  async analyzeCode(code: string, language: string): Promise<GeminiCLIResponse> {
    const prompt = `Please analyze the following ${language} code and provide insights:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    return this.sendMessage(prompt);
  }

  async generateCode(description: string, language?: string): Promise<GeminiCLIResponse> {
    const prompt = `Generate ${language || 'code'} based on this description: ${description}`;
    return this.sendMessage(prompt);
  }

  isCliReady(): boolean {
    return this.isReady;
  }

  destroy() {
    this.isReady = false;
  }
}

export const geminiCLIService = new GeminiCLIService();
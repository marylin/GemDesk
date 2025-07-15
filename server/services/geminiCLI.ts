import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface GeminiCLIResponse {
  message: string;
  metadata?: any;
}

export class GeminiCLIService extends EventEmitter {
  private cliProcess: ChildProcess | null = null;
  private isReady = false;
  private buffer = '';

  constructor() {
    super();
    this.initializeCLI();
  }

  private initializeCLI() {
    try {
      console.log('Initializing Gemini CLI subprocess...');
      
      // Spawn the Gemini CLI process in default mode (interactive by default)
      this.cliProcess = spawn('npx', ['@google/gemini-cli'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY
        }
      });

      if (!this.cliProcess.stdout || !this.cliProcess.stderr || !this.cliProcess.stdin) {
        throw new Error('Failed to initialize CLI streams');
      }

      // Handle stdout (AI responses)
      this.cliProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Gemini CLI stdout:', output);
        this.buffer += output;
        this.processBuffer();
      });

      // Handle stderr (errors and status messages)
      this.cliProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.log('Gemini CLI stderr:', error);
        
        // Don't treat all stderr as errors - CLI might send status messages there
        if (error.includes('Error') || error.includes('error')) {
          this.emit('error', error);
        }
      });

      // Handle process exit
      this.cliProcess.on('exit', (code) => {
        console.log(`Gemini CLI process exited with code ${code}`);
        this.isReady = false;
        this.cliProcess = null;
        
        // Attempt to restart after a delay
        setTimeout(() => {
          this.initializeCLI();
        }, 5000);
      });

      // Handle process errors
      this.cliProcess.on('error', (error) => {
        console.error('Gemini CLI spawn error:', error);
        this.emit('error', error.message);
      });

      // Mark as ready after initialization
      setTimeout(() => {
        this.isReady = true;
        console.log('Gemini CLI is ready');
        this.emit('ready');
      }, 3000);

    } catch (error) {
      console.error('Failed to initialize Gemini CLI:', error);
      this.emit('error', 'Failed to initialize Gemini CLI');
    }
  }

  private processBuffer() {
    // Process complete lines from the buffer
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('>') && !trimmedLine.includes('Enter your message:')) {
        console.log('Emitting response:', trimmedLine);
        this.emit('response', {
          message: trimmedLine,
          metadata: { timestamp: new Date().toISOString() }
        });
      }
    }
  }

  async sendMessage(message: string, context?: any): Promise<GeminiCLIResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isReady || !this.cliProcess || !this.cliProcess.stdin) {
        reject(new Error('Gemini CLI not ready'));
        return;
      }

      // Add context to the message if provided
      let fullMessage = message;
      if (context && context.file) {
        fullMessage = `Context: Working with file ${context.file.name} (${context.file.type})\n\n${message}`;
      }

      // Set up one-time response listener
      const responseHandler = (response: GeminiCLIResponse) => {
        this.removeListener('response', responseHandler);
        this.removeListener('error', errorHandler);
        resolve(response);
      };

      const errorHandler = (error: string) => {
        this.removeListener('response', responseHandler);
        this.removeListener('error', errorHandler);
        reject(new Error(error));
      };

      this.once('response', responseHandler);
      this.once('error', errorHandler);

      // Send message to CLI
      try {
        console.log('Sending message to Gemini CLI:', fullMessage);
        this.cliProcess.stdin.write(fullMessage + '\n');
        this.cliProcess.stdin.write('\n'); // Send extra newline to ensure processing
      } catch (error) {
        this.removeListener('response', responseHandler);
        this.removeListener('error', errorHandler);
        reject(error);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        this.removeListener('response', responseHandler);
        this.removeListener('error', errorHandler);
        reject(new Error('Response timeout'));
      }, 30000);
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
    if (this.cliProcess) {
      this.cliProcess.kill();
      this.cliProcess = null;
    }
    this.isReady = false;
  }
}

export const geminiCLIService = new GeminiCLIService();
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" 
});

export interface GeminiResponse {
  message: string;
  metadata?: any;
}

export class GeminiService {
  private conversationHistory: Array<{ role: string; content: string }> = [];

  async sendMessage(message: string, context?: any): Promise<GeminiResponse> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: "user", content: message });

      // Build prompt with context
      let prompt = message;
      if (context) {
        prompt = `Context: ${JSON.stringify(context)}\n\nUser message: ${message}`;
      }

      // Add conversation history for context
      if (this.conversationHistory.length > 1) {
        const historyContext = this.conversationHistory
          .slice(-10) // Keep last 10 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        prompt = `Previous conversation:\n${historyContext}\n\nCurrent message: ${message}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const aiMessage = response.text || "I'm sorry, I couldn't generate a response.";
      
      // Add AI response to history
      this.conversationHistory.push({ role: "assistant", content: aiMessage });

      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return {
        message: aiMessage,
        metadata: {
          model: "gemini-2.5-flash",
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to get AI response: ${error}`);
    }
  }

  async analyzeCode(code: string, language: string): Promise<GeminiResponse> {
    try {
      const prompt = `Analyze this ${language} code and provide insights, suggestions for improvement, and identify any potential issues:\n\n\`\`\`${language}\n${code}\n\`\`\``;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
      });

      return {
        message: response.text || "Could not analyze the code.",
        metadata: {
          type: "code_analysis",
          language,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Code analysis error:', error);
      throw new Error(`Failed to analyze code: ${error}`);
    }
  }

  async generateCode(description: string, language?: string): Promise<GeminiResponse> {
    try {
      const prompt = language 
        ? `Generate ${language} code for: ${description}`
        : `Generate code for: ${description}. Choose the most appropriate programming language.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
      });

      return {
        message: response.text || "Could not generate code.",
        metadata: {
          type: "code_generation",
          language,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Code generation error:', error);
      throw new Error(`Failed to generate code: ${error}`);
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }
}

export const geminiService = new GeminiService();

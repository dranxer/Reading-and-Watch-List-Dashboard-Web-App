'use client';

import * as webllm from '@mlc-ai/web-llm';

interface WebLLMEngine {
  reload: (modelId: string) => Promise<void>;
  generate: (prompt: string, progressCallback?: (step: number, message: string) => void) => Promise<string>;
  runtimeStatsText: () => string;
}

interface WebLLMModule {
  CreateMLCEngine: () => Promise<WebLLMEngine>;
}

declare global {
  interface Window {
    tvmjs?: any;
    webllm?: WebLLMModule;
  }
}

class WebLLMService {
  private engine: webllm.MLCEngine | null = null;
  private isLoading = false;
  private isLoaded = false;

  async initialize(): Promise<void> {
    if (this.isLoaded || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      console.log('🤖 Initializing WebLLM engine...');
      
      // Initialize the engine with a smaller, faster model
      this.engine = await webllm.CreateMLCEngine('Phi-3.5-mini-instruct-q4f16_1-MLC', {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          console.log(`Loading model: ${report.text} (${Math.round(report.progress * 100)}%)`);
        }
      });
      
      console.log('✅ WebLLM engine ready!');
      this.isLoaded = true;
    } catch (error) {
      console.error('❌ Failed to initialize WebLLM:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async generateSummary(
    title: string, 
    description: string, 
    contentType: string,
    onProgress?: (message: string) => void
  ): Promise<string> {
    if (!this.isLoaded || !this.engine) {
      throw new Error('WebLLM not initialized. Please call initialize() first.');
    }

    const prompt = `You are a helpful AI assistant that creates concise summaries of web content.

Please provide a 2-3 sentence summary of this ${contentType}:

Title: "${title}"
Description: "${description}"

Focus on the key insights, main topics, and why someone might find this valuable. Keep it professional and informative.

Summary:`;

    try {
      onProgress?.('Generating AI summary...');
      
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      });

      const summary = response.choices[0]?.message?.content?.trim() || 'Unable to generate summary at this time.';
      
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  isReady(): boolean {
    return this.isLoaded && this.engine !== null;
  }

  async getStats(): Promise<string> {
    if (!this.engine) return 'No stats available';
    
    try {
      const stats = await this.engine.runtimeStatsText();
      return stats;
    } catch (error) {
      return 'Stats unavailable';
    }
  }
}

// Singleton instance
export const webllmService = new WebLLMService(); 
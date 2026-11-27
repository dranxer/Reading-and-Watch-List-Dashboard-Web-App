'use client';

import * as webllm from '@mlc-ai/web-llm';

/**
 * Local AI summaries with WebLLM.
 *
 * Qwen2.5 0.5B (about 300 MB) instead of Phi-3.5 (about 2 GB): it downloads once, the browser keeps
 * it in Cache Storage, and later visits only load it from disk. The engine is a module-level
 * singleton, so it stays loaded while the dashboard is open.
 */
export const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export const MODEL_LABEL = 'Qwen2.5 0.5B';
export const MODEL_SIZE_MB = 300;

export interface AIProgress {
  phase: 'downloading' | 'loading';
  percent: number;
  text: string;
}

class WebLLMService {
  private engine: webllm.MLCEngine | null = null;
  private loading: Promise<void> | null = null;

  /** True when the model files are already in this browser, so loading needs no download. */
  async isCached(): Promise<boolean> {
    try {
      return await webllm.hasModelInCache(MODEL_ID);
    } catch {
      return false;
    }
  }

  /** WebGPU is required to run the model in the browser. */
  supported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async initialize(onProgress?: (p: AIProgress) => void): Promise<void> {
    if (this.engine) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const cached = await this.isCached();
      let shown = 0;   // WebLLM reports fetching and GPU loading as separate passes; keep the bar moving forward
      // Ask the browser to keep the model when storage gets tight (no prompt in Chrome or Brave)
      try { await navigator.storage?.persist?.(); } catch { /* optional */ }
      this.engine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          shown = Math.max(shown, Math.round(report.progress * 100));
          onProgress?.({ phase: cached ? 'loading' : 'downloading', percent: shown, text: report.text });
        },
      });
    })();

    try {
      await this.loading;
    } catch (error) {
      this.engine = null;
      throw error;
    } finally {
      this.loading = null;
    }
  }

  isReady(): boolean {
    return this.engine !== null;
  }

  async generateSummary(title: string, description: string, contentType: string): Promise<string> {
    if (!this.engine) throw new Error('The AI model is not loaded yet.');

    const prompt = `Summarize this ${contentType} in 2 short sentences for someone deciding whether to read it.
Title: ${title}
Description: ${description || '(none)'}
Summary:`;

    const response = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      frequency_penalty: 0.6,     // the small model otherwise tends to repeat phrases
      max_tokens: 120,
      stream: false,
    });
    return response.choices[0]?.message?.content?.trim() || '';
  }
}

export const webllmService = new WebLLMService();

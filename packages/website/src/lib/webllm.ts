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

    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'You write short, factual summaries. Reply with the summary only: one or two plain sentences, no title, no labels, no quotes.' },
        { role: 'user', content: `Summarize this ${contentType} for someone deciding whether to read it.\n\nTitle: ${title}\nText: ${description || title}` },
      ],
      temperature: 0.3,
      frequency_penalty: 0.6,     // the small model otherwise tends to repeat phrases
      max_tokens: 120,
      stream: false,
    });
    return cleanSummary(response.choices[0]?.message?.content || '', title);
  }
}

// Small models sometimes echo the prompt ("Title: ...", "Summary: ..."): keep only the summary text.
export function cleanSummary(raw: string, title: string): string {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !/^(title|content type)\s*:/i.test(l))
    .map(l => l.replace(/^(summary|description|text)\s*:\s*/i, ''));
  let text = lines.join(' ').replace(/^["“']|["”']$/g, '').replace(/\s+/g, ' ').trim();
  if (text.toLowerCase() === title.trim().toLowerCase()) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) text = sentences.slice(0, 2).map(x => x.trim()).join(' ');
  return text;
}

export const webllmService = new WebLLMService();

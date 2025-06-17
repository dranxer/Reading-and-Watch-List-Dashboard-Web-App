import { MLCEngine } from '@mlc-ai/web-llm';
import browser from 'webextension-polyfill';

let engine: any = null;

// Initialize the LLM
async function initializeLLM() {
  try {
    engine = new MLCEngine();
    await engine.reload("gemma-3b-it-q4f32_1", {
      model_list: [{
        model_url: "https://huggingface.co/mlc-ai/mlc-chat-Gemma-3b-it-q4f32_1/resolve/main/",
        local_id: "gemma-3b-it-q4f32_1",
        model_lib_url: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/gemma-3b-it/gemma-3b-it-q4f32_1-ctx4k_cs1k.wasm"
      }]
    });
    console.log("LLM initialized successfully");
  } catch (error) {
    console.error("Failed to initialize LLM:", error);
  }
}

// Initialize LLM when the extension starts
initializeLLM();

// Listen for navigation events
browser.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    try {
      if (!engine) {
        await initializeLLM();
      }

      // Get the page content
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await browser.tabs.sendMessage(tab.id, { type: "GET_CONTENT" });
      if (!response?.content) return;

      // Generate summary using LLM
      const summary = await engine.chatCompletion({
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes web content." },
          { role: "user", content: `Please summarize this content in 2-3 sentences: ${response.content.substring(0, 1000)}` }
        ]
      });

      // Store the content and summary
      const history = await browser.storage.local.get("history") || { history: [] };
      const newItem = {
        url: tab.url,
        title: tab.title,
        content: response.content.substring(0, 1000),
        summary: summary.choices[0].message.content,
        timestamp: Date.now()
      };

      history.history.unshift(newItem);
      if (history.history.length > 100) {
        history.history = history.history.slice(0, 100);
      }

      await browser.storage.local.set(history);
    } catch (error) {
      console.error("Error processing page:", error);
    }
  }
}, { url: [{ schemes: ["http", "https"] }] }); 
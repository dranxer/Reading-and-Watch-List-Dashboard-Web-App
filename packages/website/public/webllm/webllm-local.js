// Local WebLLM Distribution Loader
// This script loads WebLLM and makes it available globally

console.log('🔧 Loading WebLLM locally...');

// Load WebLLM from CDN and make it available globally
import('https://esm.run/@mlc-ai/web-llm@0.2.79')
  .then(webllm => {
    window.WebLLM = webllm;
    window.dispatchEvent(new CustomEvent('webllm-loaded', { detail: webllm }));
    console.log('✅ WebLLM loaded and available globally');
  })
  .catch(error => {
    console.error('❌ Failed to load WebLLM:', error);
    window.dispatchEvent(new CustomEvent('webllm-error', { detail: error }));
  }); 
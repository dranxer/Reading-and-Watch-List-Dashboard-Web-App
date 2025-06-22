# WebLLM Local Setup

This directory contains the local WebLLM distribution setup for your project.

## Files

- `webllm-local.js` - Local WebLLM loader script
- `test.html` - Test page to verify WebLLM functionality
- `README.md` - This documentation

## How It Works

### 1. Local Distribution Loading
The `webllm-local.js` script loads WebLLM from the CDN and makes it available globally as `window.WebLLM`. This approach:

- ✅ Avoids build-time import issues
- ✅ Works like a local distribution package
- ✅ Provides fallback loading mechanism
- ✅ Caches WebLLM in the browser

### 2. Integration with Your App
Your dashboard uses a dual-loading strategy:

1. **Primary**: Uses the installed npm package (`@mlc-ai/web-llm@0.2.79`)
2. **Fallback**: Loads from this local distribution if npm package fails

### 3. Testing
You can test the local setup by visiting:
```
http://localhost:3000/webllm/test.html
```

## Usage in Code

```javascript
// The dashboard automatically detects and uses WebLLM
// Priority: npm package > local distribution > error

async function initializeWebLLM() {
  try {
    // Try npm package first
    const webllm = await import('@mlc-ai/web-llm');
    return webllm;
  } catch {
    // Fallback to local distribution
    if (!window.WebLLM) {
      // Load local script
      const script = document.createElement('script');
      script.src = '/webllm/webllm-local.js';
      document.head.appendChild(script);
      
      // Wait for loading
      await new Promise((resolve) => {
        window.addEventListener('webllm-loaded', resolve);
      });
    }
    return window.WebLLM;
  }
}
```

## Available Models

The local setup provides access to 100+ models including:

- **SmolLM2-135M-Instruct-q0f32-MLC** (719MB) - Smallest
- **TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC** (839MB) - Fast
- **Qwen2.5-0.5B-Instruct-q4f32_1-MLC** (1060MB) - Efficient
- **Llama-3.2-1B-Instruct-q4f32_1-MLC** (1128MB) - Latest

## Browser Requirements

- Chrome 113+ or Firefox 117+ (with WebGPU enabled)
- 2GB+ RAM for model loading
- Modern JavaScript support

## Troubleshooting

### WebLLM Not Loading
1. Check browser console for errors
2. Verify WebGPU support: `chrome://gpu/`
3. Try the test page: `/webllm/test.html`

### Models Failing to Load
1. Check available memory (2GB+ recommended)
2. Try smaller models first (SmolLM2-135M)
3. Check network connection for model downloads

### Build Errors
The local setup avoids build-time imports, so you shouldn't see:
- "Cannot find module" errors
- "Unhandled scheme" errors
- CDN import issues during development 
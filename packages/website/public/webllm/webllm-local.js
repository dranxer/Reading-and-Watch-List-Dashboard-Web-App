// Local WebLLM Distribution Loader
// This script loads WebLLM and makes it available globally

console.log('🔧 Loading WebLLM locally...');

// Disable cache for WebLLM loading to prevent cache errors
const disableCache = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.log('🧹 Unregistering service worker to prevent cache conflicts');
        registration.unregister();
      });
    });
  }
};

// Try to disable problematic caching
disableCache();

// Load WebLLM from local file
const loadWebLLM = async () => {
  try {
    console.log('📦 Attempting to load WebLLM from local file...');
    const webllm = await import('/webllm/webllm.js');
    window.WebLLM = webllm;
    window.dispatchEvent(new CustomEvent('webllm-loaded', { detail: webllm }));
    console.log('✅ WebLLM loaded successfully from local file');
  } catch (error) {
    console.error('❌ Local WebLLM loading failed:', error);
    window.WebLLM = {
      CreateMLCEngine: null,
      prebuiltAppConfig: { model_list: [] }
    };
    window.dispatchEvent(new CustomEvent('webllm-error', {
      detail: {
        message: 'WebLLM unavailable - AI features disabled',
        error: error
      }
    }));
  }
};

// Load with a small delay to ensure DOM is ready
setTimeout(loadWebLLM, 100); 
// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Reading & Watch List Tracker installed');
});

// Track page visits
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Get the page content
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            title: document.title,
            content: document.body.innerText,
            url: window.location.href
          };
        }
      });

      // Store the page data
      const pageData = {
        url: result.url,
        title: result.title,
        timestamp: new Date().toISOString(),
        content: result.content.substring(0, 1000) // Limit content length
      };

      // Save to local storage
      const { pages = [] } = await chrome.storage.local.get('pages');
      pages.push(pageData);
      await chrome.storage.local.set({ pages });

      // TODO: Implement local LLM processing
      // This will be implemented when we add the Gemma-3-1b integration
    } catch (error) {
      console.error('Error processing page:', error);
    }
  }
}); 
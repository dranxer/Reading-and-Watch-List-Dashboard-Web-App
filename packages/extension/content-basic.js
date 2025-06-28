// Most basic content script
console.log('🚀 Basic content script loaded on:', window.location.href);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received:', request);
    
    if (request.action === 'ping') {
        sendResponse({ 
            status: 'working', 
            message: 'Basic content script works!',
            url: window.location.href,
            title: document.title
        });
    }
});

console.log('✅ Basic content script ready'); 
// Most basic background script
console.log('🚀 Basic background script loaded');

// Simple message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received:', request);
    
    if (request.action === 'ping') {
        sendResponse({ status: 'working', message: 'Basic extension works!' });
    }
});

// Installation handler
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Basic extension installed');
});

console.log('✅ Basic background ready'); 
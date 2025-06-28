// Minimal Background Script for Testing
console.log('🚀 Minimal background script starting...');

// Simple message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received:', request);
    
    switch (request.action) {
        case 'ping':
            console.log('🏓 Ping received, responding...');
            sendResponse({ 
                status: 'working', 
                timestamp: Date.now(),
                message: 'Background script is alive' 
            });
            break;
            
        case 'test':
            console.log('🧪 Test message received');
            sendResponse({ success: true, data: 'Test successful' });
            break;
            
        default:
            console.log('❓ Unknown action:', request.action);
            sendResponse({ error: 'Unknown action: ' + request.action });
    }
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🎉 Extension installed:', details.reason);
});

// Keep alive
setInterval(() => {
    console.log('💓 Background script heartbeat');
}, 30000);

console.log('✅ Minimal background script ready'); 
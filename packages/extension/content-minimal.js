// Minimal Content Script for Testing
console.log('🚀 Minimal content script loading on:', window.location.href);

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received:', request);
    
    switch (request.action) {
        case 'ping':
            console.log('🏓 Content script ping received');
            sendResponse({ 
                status: 'working', 
                url: window.location.href,
                title: document.title 
            });
            break;
            
        case 'extractNow':
            console.log('📄 Extract request received');
            const content = {
                url: window.location.href,
                title: document.title,
                textContent: document.body.textContent.substring(0, 1000) + '...',
                type: 'ARTICLE'
            };
            
            // Send to background for processing
            chrome.runtime.sendMessage({
                action: 'processContent',
                content: content
            });
            
            sendResponse({ success: true, extracted: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action: ' + request.action });
    }
});

// Simple auto-detection (just log for now)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 Page loaded, could extract content here');
    });
} else {
    console.log('📄 Page already loaded, could extract content here');
}

console.log('✅ Minimal content script ready'); 
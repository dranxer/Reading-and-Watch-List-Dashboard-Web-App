// Simple CurioLog Background Script
console.log('🚀 Simple CurioLog background script starting...');

// Global state
let isAuthenticated = false;
let apiUrl = 'http://localhost:3000';

// Initialize on startup
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed');
});

// Simple message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message.type);
    
    try {
        switch (message.type) {
            case 'PING':
                console.log('🏓 Ping received');
                sendResponse({ pong: true, status: 'ok' });
                break;
                
            case 'GET_STATUS':
                console.log('📊 Status requested');
                // Check authentication status with API
                checkAuthStatus().then(authenticated => {
                    sendResponse({
                        authenticated: authenticated,
                        apiUrl: apiUrl,
                        itemCount: 0
                    });
                }).catch(error => {
                    sendResponse({
                        authenticated: false,
                        apiUrl: apiUrl,
                        itemCount: 0,
                        error: error.message
                    });
                });
                return true; // Keep message channel open
                
            case 'AUTHENTICATE':
                console.log('🔐 Authentication requested');
                handleAuthentication().then(success => {
                    sendResponse({ success });
                }).catch(error => {
                    console.error('Auth error:', error);
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Keep message channel open
                
            case 'LOGOUT':
                console.log('🚪 Logout requested');
                isAuthenticated = false;
                // Open logout page to clear Clerk session
                chrome.tabs.create({
                    url: `${apiUrl}/sign-in`
                });
                sendResponse({ success: true });
                break;
                
            case 'SCRAPED_CONTENT':
                console.log('📄 Content scraped:', message.data?.title);
                handleScrapedContent(message.data);
                sendResponse({ success: true });
                break;
                
            default:
                console.log('❓ Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('❌ Message handler error:', error);
        sendResponse({ error: error.message });
    }
});

// Simple authentication function
async function handleAuthentication() {
    try {
        console.log('🔐 Opening sign-in page...');
        
        const tab = await chrome.tabs.create({
            url: `${apiUrl}/sign-in?extension=true`
        });
        
        console.log('✅ Tab opened:', tab.id);
        
        // Wait a moment for user to sign in, then check status
        setTimeout(async () => {
            const authenticated = await checkAuthStatus();
            if (authenticated) {
                console.log('✅ Authentication successful');
                isAuthenticated = true;
            }
        }, 3000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return false;
    }
}

// Check authentication status with the API
async function checkAuthStatus() {
    try {
        console.log('🔍 Checking auth status...');
        
        const response = await fetch(`${apiUrl}/api/auth-check`, {
            method: 'GET',
            credentials: 'include', // Include cookies for Clerk session
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Auth check successful:', data.authenticated);
            isAuthenticated = data.authenticated;
            return data.authenticated;
        } else {
            console.log('❌ Auth check failed:', response.status);
            isAuthenticated = false;
            return false;
        }
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        isAuthenticated = false;
        return false;
    }
}

// Handle scraped content from content script
async function handleScrapedContent(contentData) {
    try {
        if (!contentData || !contentData.url) {
            console.log('⚠️ Invalid content data received');
            return;
        }
        
        console.log('📋 Processing scraped content:', {
            title: contentData.title,
            url: contentData.url,
            wordCount: contentData.wordCount
        });
        
        // Check if user is authenticated before sending
        const authenticated = await checkAuthStatus();
        if (!authenticated) {
            console.log('⚠️ User not authenticated, skipping content submission');
            return;
        }
        
        // Send content to API
        const response = await fetch(`${apiUrl}/api/content`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: contentData.url,
                title: contentData.title,
                content: contentData.content,
                excerpt: contentData.excerpt,
                wordCount: contentData.wordCount,
                source: 'extension'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Content saved successfully:', result);
            
            // Show notification to user
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'CurioLog',
                    message: `📚 Saved: ${contentData.title}`
                });
            } catch (notificationError) {
                console.log('⚠️ Notification failed:', notificationError);
            }
        } else {
            console.error('❌ Failed to save content:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error handling scraped content:', error);
    }
}

console.log('✅ Simple background script ready'); 
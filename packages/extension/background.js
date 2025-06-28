// Simple CurioLog Background Script
console.log('🚀 Simple CurioLog background script starting...');
console.log('🚀 Background script timestamp:', new Date().toISOString());

// Test if we have access to chrome APIs
try {
    console.log('🧪 Testing chrome.runtime availability:', !!chrome.runtime);
    console.log('🧪 Testing chrome.storage availability:', !!chrome.storage);
    console.log('🧪 Extension ID:', chrome.runtime.id);
} catch (error) {
    console.error('❌ Chrome APIs not available:', error);
}

// Global state
let isAuthenticated = false;
let apiUrl = 'http://localhost:3000';

// Service Worker for ReadWatch Tracker Extension
const API_BASE = 'http://localhost:3000/api';

// Initialize on startup
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed/updated');
    console.log('✅ Background script initialized successfully');
});

// Add startup event for service workers
chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Extension startup event triggered');
});

// Test message handler registration
console.log('📨 Registering message handler...');

// Listen for content analysis requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Received message:', JSON.stringify(request));
    console.log('📨 Message type:', typeof request);
    console.log('📨 Message action:', request.action);
    console.log('📨 Message type field:', request.type);
    console.log('📨 Sender:', sender);
    
    try {
        if (request.action === 'analyzeContent') {
            console.log('🔍 Handling analyzeContent');
            handleContentAnalysis(request.data)
                .then(result => {
                    console.log('✅ Analysis complete, sending response');
                    sendResponse({ success: true, data: result });
                })
                .catch(error => {
                    console.error('❌ Analysis error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep message channel open
        }
        
        if (request.action === 'saveContent') {
            console.log('💾 Handling saveContent');
            saveContent(request.data)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'getStats') {
            console.log('📊 Handling getStats');
            getStats()
                .then(stats => {
                    console.log('✅ Stats retrieved:', stats);
                    sendResponse({ success: true, data: stats });
                })
                .catch(error => {
                    console.error('❌ Stats error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        if (request.action === 'checkAuth') {
            console.log('🔐 Handling checkAuth');
            checkAuthentication()
                .then(isAuth => sendResponse({ success: true, authenticated: isAuth }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'ping') {
            console.log('🏓 Handling ping');
            sendResponse({ success: true, message: 'pong', timestamp: new Date().toISOString() });
            return true;
        }

        // Handle old message format for backward compatibility
        if (request.type) {
            console.log('🔄 Handling legacy message type:', request.type);
            handleLegacyMessage(request, sender, sendResponse);
            return true;
        }
        
        // Unknown message
        console.log('❓ Unknown message:', JSON.stringify(request));
        const errorMsg = 'Unknown message type: ' + JSON.stringify(request);
        console.error('❌ Sending error response:', errorMsg);
        sendResponse({ success: false, error: errorMsg });
        return true; // Keep message channel open for debugging
    } catch (handlerError) {
        console.error('❌ Message handler crashed:', handlerError);
        sendResponse({ success: false, error: 'Message handler error: ' + handlerError.message });
        return true;
    }
});

console.log('✅ Message handler registered successfully');

// Handle legacy message format
function handleLegacyMessage(message, sender, sendResponse) {
    console.log('📨 Legacy message:', message.type);
    
    try {
        switch (message.type) {
            case 'PING':
                console.log('🏓 Ping received');
                sendResponse({ pong: true, status: 'ok' });
                break;
                
            case 'GET_STATUS':
                console.log('📊 Status requested');
                // Check authentication status with API
                checkAuthentication().then(authenticated => {
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
                console.log('❓ Unknown legacy message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('❌ Legacy message handler error:', error);
        sendResponse({ error: error.message });
    }
}

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
            const authenticated = await checkAuthentication();
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
        const authenticated = await checkAuthentication();
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
                    iconUrl: 'icon.svg',
                    title: 'ReadWatch Tracker',
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

async function handleContentAnalysis(contentData) {
    try {
        // First check if we can access the auth cookies
        const authCheck = await fetch(`${API_BASE}/auth-check`, {
            method: 'GET',
            credentials: 'include',
        });
        
        if (!authCheck.ok || !(await authCheck.json()).authenticated) {
            console.log('User not authenticated, skipping content analysis');
            return fallbackAnalysis(contentData);
        }

        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                url: contentData.url,
                title: contentData.title,
                description: contentData.text.substring(0, 500)
            })
        });

        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    } catch (error) {
        console.error('Content analysis failed:', error);
        return fallbackAnalysis(contentData);
    }
}

function fallbackAnalysis(contentData) {
    // Enhanced rule-based analysis for reputable domains
    const wordCount = contentData.text.split(' ').length;
    const domain = contentData.domain || new URL(contentData.url).hostname.replace('www.', '');
    
    // Base quality score from domain reputation
    let qualityScore = 50; // Start with moderate score
    
    // Domain-based scoring
    const domainCategories = {
        news: ['bbc.com', 'cnn.com', 'reuters.com', 'nytimes.com', 'theguardian.com', 'washingtonpost.com'],
        tech: ['techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com'],
        programming: ['stackoverflow.com', 'github.com', 'dev.to', 'medium.com'],
        science: ['nature.com', 'science.org', 'scientificamerican.com'],
        education: ['.edu', '.gov', 'ted.com', 'coursera.org', 'khanacademy.org']
    };
    
    for (const [category, domains] of Object.entries(domainCategories)) {
        if (domains.some(d => domain.includes(d) || d.includes(domain))) {
            qualityScore += 20; // Boost for reputable domains
            break;
        }
    }
    
    // Content length scoring
    if (wordCount >= 2000) {
        qualityScore += 15;
    } else if (wordCount >= 1000) {
        qualityScore += 10;
    } else if (wordCount >= 500) {
        qualityScore += 5;
    }
    
    // Content type detection
    let contentType = 'article';
    if (contentData.url.includes('youtube.com') || contentData.url.includes('vimeo.com') || contentData.url.includes('ted.com')) {
        contentType = 'video';
        qualityScore += 5; // Video content bonus
    } else if (contentData.url.includes('spotify.com') || contentData.url.includes('podcasts.apple.com')) {
        contentType = 'podcast';
        qualityScore += 5; // Podcast content bonus
    }
    
    // Content quality indicators
    const hasCode = contentData.text.includes('function') || contentData.text.includes('class') || contentData.text.includes('const ');
    const isNews = contentData.url.includes('news') || contentData.title.includes('Breaking');
    const hasStructure = contentData.text.includes('\n\n') || contentData.text.length > 1000;
    
    if (hasCode && contentType === 'article') qualityScore += 10;
    if (isNews && contentType === 'article') qualityScore += 5;
    if (hasStructure) qualityScore += 5;
    
    // Generate enhanced tags based on domain and content
    const tags = [];
    
    // Domain-based tags
    if (domain.includes('github.com')) tags.push('development', 'code');
    if (domain.includes('stackoverflow.com')) tags.push('programming', 'q&a');
    if (domain.includes('medium.com')) tags.push('article', 'blog');
    if (domain.includes('youtube.com')) tags.push('video', 'tutorial');
    if (domain.includes('ted.com')) tags.push('presentation', 'education');
    if (domainCategories.news.some(d => domain.includes(d))) tags.push('news');
    if (domainCategories.tech.some(d => domain.includes(d))) tags.push('technology');
    if (domainCategories.science.some(d => domain.includes(d))) tags.push('science');
    
    // Content-based tags
    if (hasCode) tags.push('programming');
    if (isNews) tags.push('news');
    if (contentData.title.toLowerCase().includes('tutorial')) tags.push('tutorial');
    if (contentData.title.toLowerCase().includes('guide')) tags.push('guide');
    if (contentData.title.toLowerCase().includes('review')) tags.push('review');
    
    // Default tag if none found
    if (tags.length === 0) tags.push('general');
    
    // Cap quality score
    qualityScore = Math.min(95, Math.max(40, qualityScore));
    
    return {
        title: contentData.title,
        description: contentData.text.substring(0, 300) + '...',
        url: contentData.url,
        type: contentType,
        tags: [...new Set(tags)], // Remove duplicates
        qualityScore: qualityScore,
        source: domain,
        readingTime: contentType === 'article' ? `${Math.ceil(wordCount / 200)} min read` : null,
        duration: contentType === 'video' ? 'Unknown duration' : null,
        analyzedAt: new Date().toISOString(),
        qualityFactors: contentData.qualityAssessment?.factors || ['Fallback analysis'],
        isReputable: true // Since we only track reputable domains now
    };
}

async function saveContent(contentData) {
    try {
        // First save locally as backup
        await saveToLocalStorage(contentData);

        // Check authentication before trying to save to backend
        const authCheck = await fetch(`${API_BASE}/auth-check`, {
            method: 'GET',
            credentials: 'include',
        });
        
        if (!authCheck.ok || !(await authCheck.json()).authenticated) {
            console.log('User not authenticated, content saved locally only');
            return; // Save locally but don't sync to backend
        }

        // Then sync with backend
        const response = await fetch(`${API_BASE}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(contentData)
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to save to backend');
        }

        console.log('Content saved successfully:', contentData.title);
    } catch (error) {
        console.error('Failed to save content:', error);
        // Don't throw error - content is still saved locally
        console.log('Content saved locally as fallback');
    }
}

async function saveToLocalStorage(contentItem) {
    try {
        const { items = [] } = await chrome.storage.local.get(['items']);
        
        // Check for duplicates
        const exists = items.some(item => item.url === contentItem.url);
        if (exists) {
            return; // Don't save duplicates
        }

        items.unshift({
            ...contentItem,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            savedLocally: true
        });

        // Keep only last 100 items locally
        if (items.length > 100) {
            items.splice(100);
        }

        await chrome.storage.local.set({ items });
    } catch (error) {
        console.error('Failed to save to local storage:', error);
    }
}

async function getStats() {
    try {
        // Try to get stats from backend first
        const response = await fetch(`${API_BASE}/content`, {
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const items = result.data || [];
                return calculateStats(items);
            }
        }

        // Fallback to local storage
        const { items = [] } = await chrome.storage.local.get(['items']);
        return calculateStats(items);
    } catch (error) {
        console.error('Failed to get stats:', error);
        // Final fallback
        const { items = [] } = await chrome.storage.local.get(['items']);
        return calculateStats(items);
    }
}

function calculateStats(items) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekItems = items.filter(item => 
        new Date(item.analyzedAt || item.timestamp) > oneWeekAgo
    );

    return {
        total: items.length,
        thisWeek: thisWeekItems.length,
        articles: items.filter(item => item.type === 'article').length,
        videos: items.filter(item => item.type === 'video').length,
        podcasts: items.filter(item => item.type === 'podcast').length
    };
}

async function checkAuthentication() {
    try {
        const response = await fetch(`${API_BASE}/auth-check`, {
            credentials: 'include'
        });

        const result = await response.json();
        return result.authenticated || false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

console.log('✅ Simple background script ready'); 
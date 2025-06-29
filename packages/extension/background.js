// ReadWatch Tracker Background Script
console.log('🚀 ReadWatch Tracker: Background script loaded');

// Configuration
const API_BASE = 'http://localhost:3000/api';

// Extension installation/startup
chrome.runtime.onInstalled.addListener(() => {
    console.log('📦 ReadWatch Tracker: Extension installed/updated');
    
    // Initialize storage
    chrome.storage.local.set({
        items: [],
        contentHistory: [],
        stats: { total: 0, thisWeek: 0 },
        isAuthenticated: false,
        userLists: []
    });
});

// Generate unique ID
function generateUniqueId(prefix = 'rw') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate domain-based tags
function generateDomainTags(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
        const tags = [];

        // Get clean site name
        let siteName = '';
        if (domain.includes('youtube.com')) {
            siteName = 'youtube';
        } else if (domain.includes('medium.com')) {
            siteName = 'medium';
        } else if (domain.includes('github.com')) {
            siteName = 'github';
        } else if (domain.includes('stackoverflow.com')) {
            siteName = 'stackoverflow';
        } else if (domain.includes('reddit.com')) {
            siteName = 'reddit';
        } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
            siteName = 'twitter';
        } else if (domain.includes('linkedin.com')) {
            siteName = 'linkedin';
        } else if (domain.includes('facebook.com')) {
            siteName = 'facebook';
        } else if (domain.includes('instagram.com')) {
            siteName = 'instagram';
        } else if (domain.includes('tiktok.com')) {
            siteName = 'tiktok';
        } else if (domain.includes('vimeo.com')) {
            siteName = 'vimeo';
        } else if (domain.includes('twitch.tv')) {
            siteName = 'twitch';
        } else if (domain.includes('spotify.com')) {
            siteName = 'spotify';
        } else if (domain.includes('dev.to')) {
            siteName = 'dev.to';
        } else if (domain.includes('news.ycombinator.com')) {
            siteName = 'hackernews';
        } else if (domain.includes('techcrunch.com')) {
            siteName = 'techcrunch';
        } else if (domain.includes('wired.com')) {
            siteName = 'wired';
        } else if (domain.includes('theverge.com')) {
            siteName = 'theverge';
        } else if (domain.includes('cnn.com')) {
            siteName = 'cnn';
        } else if (domain.includes('bbc.com')) {
            siteName = 'bbc';
        } else if (domain.includes('nytimes.com')) {
            siteName = 'nytimes';
        } else if (domain.includes('washingtonpost.com')) {
            siteName = 'washingtonpost';
        } else if (domain.includes('wikipedia.org')) {
            siteName = 'wikipedia';
        } else if (domain.includes('coursera.org')) {
            siteName = 'coursera';
        } else if (domain.includes('udemy.com')) {
            siteName = 'udemy';
        } else if (domain.includes('notion.so')) {
            siteName = 'notion';
        } else if (domain.includes('figma.com')) {
            siteName = 'figma';
        } else {
            // For unknown domains, extract the main part
            siteName = domain.replace(/\.(com|org|net|edu|gov|io|co|ai)$/, '');
        }

        // Add site name if we have one
        if (siteName) {
            tags.push(siteName);
        }

        // Determine and add content type
        let contentType = '';
        if (domain.includes('youtube.com') || domain.includes('vimeo.com') || domain.includes('twitch.tv')) {
            contentType = 'video';
        } else if (domain.includes('spotify.com') || domain.includes('podcasts.apple.com')) {
            contentType = 'podcast';
        } else {
            contentType = 'article';
        }

        tags.push(contentType);

        return tags;
    } catch (error) {
        console.error('❌ Error generating domain tags:', error);
        return ['unknown', 'article'];
    }
}

// Normalize URL for duplicate checking
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // For YouTube, keep only the video ID
        if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
        
        // For other sites, remove query parameters and fragments
        return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (error) {
        console.error('❌ Error normalizing URL:', error);
        return url;
    }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Received message:', request.action);
    
        if (request.action === 'analyzeContent') {
            handleContentAnalysis(request.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
        }
        
        if (request.action === 'saveContent') {
            saveContent(request.data)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }
    
    if (request.action === 'checkDuplicate') {
        checkDuplicateUrl(request.url)
            .then(exists => sendResponse({ success: true, exists }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.action === 'getStats') {
            getStats()
            .then(stats => sendResponse({ success: true, stats }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'getItems') {
        getItems()
            .then(items => sendResponse({ success: true, items }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'clearData') {
        clearData()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

    // New dashboard-related actions
        if (request.action === 'checkAuth') {
            checkAuthentication()
            .then(auth => sendResponse({ success: true, authenticated: auth.authenticated, user: auth.user }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'syncToDashboard') {
        syncItemToDashboard(request.itemId)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'generateSummary') {
        generateSummary(request.itemId)
            .then(summary => sendResponse({ success: true, summary }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

    if (request.action === 'getUserLists') {
        getUserLists()
            .then(lists => sendResponse({ success: true, lists }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

    if (request.action === 'addToList') {
        addToList(request.listId, request.itemId)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }
        
    if (request.action === 'createList') {
        createList(request.listData)
            .then(list => sendResponse({ success: true, list }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'signIn') {
        signInToDashboard()
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Analyze content
async function handleContentAnalysis(contentData) {
    try {
        console.log('🔍 Analyzing content:', contentData.title);
        
        // Basic content validation
        if (!contentData.title || contentData.title.length < 10) {
            throw new Error('Content title too short or missing');
        }
        
        if (!contentData.content || contentData.content.length < 100) {
            throw new Error('Content too short to be valuable');
        }
        
        // Calculate metrics
        const wordCount = contentData.content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
        
        // Determine content type
        let contentType = 'article';
        if (contentData.url.includes('youtube.com')) {
            contentType = 'video';
        } else if (contentData.url.includes('blog')) {
            contentType = 'blog';
        }
        
        // Generate domain-based tags
        const tags = generateDomainTags(contentData.url);
        
        // Calculate quality score (basic heuristic)
        let qualityScore = 50; // Base score
        
        if (wordCount > 500) qualityScore += 20;
        if (wordCount > 1000) qualityScore += 10;
        if (contentData.title.length > 30) qualityScore += 10;
        if (contentData.content.includes('http')) qualityScore += 5;
        
        qualityScore = Math.min(100, qualityScore);
        
        const analysis = {
            ...contentData,
            wordCount,
            readingTime,
            contentType,
            qualityScore,
            tags,
            analyzedAt: new Date().toISOString(),
            syncedToDashboard: false
        };
        
        console.log('✅ Content analysis complete:', analysis.title, `(${qualityScore}% quality)`);
        return analysis;
        
    } catch (error) {
        console.error('❌ Content analysis failed:', error);
        throw error;
    }
}

// Check for duplicate URL
async function checkDuplicateUrl(url) {
    try {
        const normalizedUrl = normalizeUrl(url);
        console.log('🔍 Checking duplicate for:', normalizedUrl);
        
        const { items = [], contentHistory = [] } = await chrome.storage.local.get(['items', 'contentHistory']);
        
        // Check items
        const existsInItems = items.some(item => normalizeUrl(item.url || '') === normalizedUrl);
        if (existsInItems) {
            console.log('🔍 Found duplicate in items');
            return true;
        }
        
        // Check history
        const existsInHistory = contentHistory.some(item => normalizeUrl(item.url || '') === normalizedUrl);
        if (existsInHistory) {
            console.log('🔍 Found duplicate in history');
            return true;
        }
        
        console.log('🔍 No duplicate found');
        return false;
        
    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
        return false;
    }
}

// Save content
async function saveContent(contentData) {
    try {
        console.log('💾 Saving content:', contentData.title);
        
        const normalizedUrl = normalizeUrl(contentData.url);
        
        // Check for duplicates one more time
        const isDuplicate = await checkDuplicateUrl(normalizedUrl);
        if (isDuplicate) {
            console.log('💾 ⚠️ Duplicate detected, skipping save');
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.svg',
                title: 'ReadWatch Tracker',
                message: `📚 Already saved: "${contentData.title.substring(0, 40)}..."`
            });
            
            return;
        }
        
        // Get current storage
        const { items = [], contentHistory = [] } = await chrome.storage.local.get(['items', 'contentHistory']);
        
        // Create enhanced item
        const enhancedItem = {
            ...contentData,
            id: generateUniqueId(),
            url: normalizedUrl,
            originalUrl: contentData.url,
            timestamp: new Date().toISOString(),
            dateAdded: new Date().toLocaleDateString(),
            timeAdded: new Date().toLocaleTimeString(),
            savedAt: Date.now(),
            syncedToDashboard: false,
            dashboardId: null,
            tags: []
        };
        
        // Add to storage
        items.unshift(enhancedItem);
        contentHistory.unshift({
            id: enhancedItem.id,
            url: normalizedUrl,
            title: contentData.title,
            timestamp: enhancedItem.timestamp
        });
        
        // Keep only last 100 items
        if (items.length > 100) items.splice(100);
        if (contentHistory.length > 500) contentHistory.splice(500);
        
        // Save to storage
        await chrome.storage.local.set({ items, contentHistory });
        
        console.log('✅ Content saved successfully');
        
        // Try to sync to dashboard if authenticated
        try {
            const authResult = await checkAuthentication();
            if (authResult.authenticated) {
                console.log('🔄 User authenticated, attempting to sync to dashboard...');
                await syncItemToDashboard(enhancedItem.id);
            }
        } catch (syncError) {
            console.log('⚠️ Dashboard sync failed, content saved locally only:', syncError.message);
        }
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.svg',
            title: 'ReadWatch Tracker',
            message: `🎉 Saved: "${contentData.title.substring(0, 40)}..." (${contentData.qualityScore || 'N/A'}%)`
        });
        
    } catch (error) {
        console.error('❌ Error saving content:', error);
        throw error;
    }
}

// Check authentication with dashboard
async function checkAuthentication() {
    try {
        // First check local storage for auth token
        const { authToken } = await chrome.storage.local.get(['authToken']);
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // If we have a token, use it
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${API_BASE}/auth-check`, {
            method: 'GET',
            headers,
            credentials: 'include',
            mode: 'cors'
        });
        
        if (!response.ok) {
            await chrome.storage.local.set({ isAuthenticated: false, authToken: null });
            return { authenticated: false, user: null };
        }
        
        const result = await response.json();
        const isAuth = result.authenticated || false;
        
        // Update local storage
        await chrome.storage.local.set({ 
            isAuthenticated: isAuth,
            userId: result.userId || null
        });
        
        if (!isAuth) {
            // Clear invalid token
            await chrome.storage.local.set({ authToken: null });
        }
        
        return {
            authenticated: isAuth,
            user: result.user || null,
            userId: result.userId || null
        };
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        await chrome.storage.local.set({ isAuthenticated: false, authToken: null });
        return { authenticated: false, user: null };
    }
}

// Sign in to dashboard
async function signInToDashboard() {
    try {
        // Open dashboard sign-in page in a new tab
        const signInUrl = `${DASHBOARD_BASE}/sign-in`;
        
        // Create tab and wait for auth completion
        const tab = await chrome.tabs.create({ url: signInUrl });
        
        // Listen for tab updates to detect when auth is complete
        return new Promise((resolve) => {
            const listener = (tabId, changeInfo, updatedTab) => {
                if (tabId === tab.id && changeInfo.url) {
                    // Check if redirected to dashboard (successful auth)
                    if (changeInfo.url.includes(DASHBOARD_BASE) && 
                        !changeInfo.url.includes('/sign-in') && 
                        !changeInfo.url.includes('/sign-up')) {
                        
                        // Auth completed, check status
                        chrome.tabs.onUpdated.removeListener(listener);
                        
                        // Small delay to ensure auth state is saved
                        setTimeout(async () => {
                            const authResult = await checkAuthentication();
                            resolve(authResult);
                        }, 1000);
                    }
                }
            };
            
            chrome.tabs.onUpdated.addListener(listener);
            
            // Timeout after 5 minutes
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve({ authenticated: false, user: null });
            }, 300000);
        });
        
    } catch (error) {
        console.error('❌ Sign-in failed:', error);
        return { authenticated: false, user: null };
    }
}

// Sync item to dashboard
async function syncItemToDashboard(itemId) {
    try {
        const { items = [] } = await chrome.storage.local.get(['items']);
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        if (item.syncedToDashboard && item.dashboardId) {
            console.log('📊 Item already synced to dashboard');
            return { synced: true, dashboardId: item.dashboardId };
        }
        
        // Prepare data for dashboard
        const dashboardData = {
            title: item.title,
            url: item.url,
            content: item.content,
            contentType: item.contentType,
            wordCount: item.wordCount,
            readingTime: item.readingTime,
            qualityScore: item.qualityScore,
            domain: item.domain,
            timestamp: item.timestamp,
            source: 'extension',
            tags: item.tags || []
        };
        
        // Save to dashboard
        const response = await fetch(`${API_BASE}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(dashboardData)
        });
        
        if (!response.ok) {
            throw new Error(`Dashboard sync failed: ${response.status}`);
        }
        
            const result = await response.json();
        
        if (result.success) {
            // Update local item to mark as synced
            const updatedItems = items.map(i => 
                i.id === itemId 
                ? { ...i, syncedToDashboard: true, dashboardId: result.data.id }
                : i
            );
            
            await chrome.storage.local.set({ items: updatedItems });
            
            console.log('✅ Item synced to dashboard:', result.data.id);
            return { synced: true, dashboardId: result.data.id };
        } else {
            throw new Error(result.error || 'Sync failed');
        }
        
    } catch (error) {
        console.error('❌ Dashboard sync failed:', error);
        throw error;
    }
}

// Generate summary for item
async function generateSummary(itemId) {
    try {
        const { items = [] } = await chrome.storage.local.get(['items']);
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        if (item.summary) {
            console.log('📄 Item already has summary');
            return item.summary;
        }
        
        // Generate summary via API
        const response = await fetch(`${API_BASE}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                title: item.title,
                description: item.content.substring(0, 500),
                contentType: item.contentType || 'article'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Summary generation failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Update local item with summary
            const updatedItems = items.map(i => 
                i.id === itemId 
                ? { ...i, summary: result.summary }
                : i
            );
            
            await chrome.storage.local.set({ items: updatedItems });
            
            console.log('✅ Summary generated for item:', itemId);
            return result.summary;
        } else {
            throw new Error(result.error || 'Summary generation failed');
        }
        
    } catch (error) {
        console.error('❌ Summary generation failed:', error);
        throw error;
    }
}

// Get user lists from dashboard
async function getUserLists() {
    try {
        const response = await fetch(`${API_BASE}/lists`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch lists: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Cache lists locally
            await chrome.storage.local.set({ userLists: result.data });
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to fetch lists');
        }
        
    } catch (error) {
        console.error('❌ Failed to get user lists:', error);
        // Return cached lists if API fails
        const { userLists = [] } = await chrome.storage.local.get(['userLists']);
        return userLists;
    }
}

// Create new list
async function createList(listData) {
    try {
        const response = await fetch(`${API_BASE}/lists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(listData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create list: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Refresh cached lists
            await getUserLists();
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to create list');
        }
        
    } catch (error) {
        console.error('❌ Failed to create list:', error);
        throw error;
    }
}

// Add item to list
async function addToList(listId, itemId) {
    try {
        const { items = [] } = await chrome.storage.local.get(['items']);
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        // Ensure item is synced to dashboard first
        let dashboardId = item.dashboardId;
        if (!item.syncedToDashboard) {
            const syncResult = await syncItemToDashboard(itemId);
            dashboardId = syncResult.dashboardId;
        }
        
        // Add to list
        const response = await fetch(`${API_BASE}/lists/${listId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ contentId: dashboardId })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to add to list: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Item added to list:', listId);
            return true;
        } else {
            throw new Error(result.error || 'Failed to add to list');
        }
        
    } catch (error) {
        console.error('❌ Failed to add to list:', error);
        throw error;
    }
}

// Get statistics
async function getStats() {
    try {
        const { items = [], isAuthenticated = false } = await chrome.storage.local.get(['items', 'isAuthenticated']);
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const thisWeek = items.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= weekAgo;
        }).length;
        
        const syncedCount = items.filter(item => item.syncedToDashboard).length;
        
        return {
            total: items.length,
            thisWeek,
            synced: syncedCount,
            lastSaved: items.length > 0 ? items[0].dateAdded : 'Never',
            isAuthenticated
        };
        
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return { total: 0, thisWeek: 0, synced: 0, lastSaved: 'Error', isAuthenticated: false };
    }
}

// Get items
async function getItems() {
    try {
        const { items = [] } = await chrome.storage.local.get(['items']);
        return items.slice(0, 10); // Return only first 10 for popup
    } catch (error) {
        console.error('❌ Error getting items:', error);
        return [];
    }
}

// Clear all data
async function clearData() {
    try {
        await chrome.storage.local.clear();
        console.log('🗑️ All data cleared');
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        throw error;
    }
}

console.log('✅ ReadWatch Tracker: Background script ready'); 
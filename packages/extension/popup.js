// Enhanced popup script for ReadWatch Tracker
console.log('📚 ReadWatch Tracker popup loaded');
console.log('📚 Popup timestamp:', new Date().toISOString());

// Test chrome APIs availability
try {
    console.log('🧪 Popup chrome.runtime available:', !!chrome.runtime);
    console.log('🧪 Popup chrome.storage available:', !!chrome.storage);
    console.log('🧪 Extension ID from popup:', chrome.runtime.id);
} catch (error) {
    console.error('❌ Chrome APIs not available in popup:', error);
}

let currentTab = 'overview';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📚 ReadWatch Tracker popup DOM loaded');
    
    // Add event listeners
    addEventListeners();
    
    // Test basic extension communication first
    await testBasicCommunication();
    
    // Initialize the popup
    await initializePopup();
    
    // Load settings into UI
    await loadSettingsUI();
});

function addEventListeners() {
    // Add click listeners for tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.textContent.toLowerCase().trim();
            switchTab(tabName);
        });
    });

    // Add click listener for refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAuth);
    }

    // Add click listener for view website button
    const viewBtn = document.getElementById('viewWebsiteBtn');
    if (viewBtn) {
        viewBtn.addEventListener('click', openWebsite);
    }

    // Add click listener for test connection button
    const testBtn = document.getElementById('testConnectionBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testConnection);
    }

    // Add change listeners for settings
    const settingsInputs = document.querySelectorAll('#settings-tab input');
    settingsInputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.addEventListener('change', function() {
                saveSetting(this.id, this.checked);
            });
        } else if (input.type === 'range') {
            input.addEventListener('change', function() {
                updateQualityThreshold(this.value);
            });
        }
    });
}

async function testBasicCommunication() {
    console.log('🧪 Testing basic extension communication...');
    
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Basic communication failed:', chrome.runtime.lastError);
                    // Show error in UI
                    const authMessage = document.getElementById('authMessage');
                    if (authMessage) {
                        authMessage.innerHTML = `❌ Extension communication failed: ${chrome.runtime.lastError.message}`;
                    }
                } else {
                    console.log('✅ Basic communication successful:', response);
                }
                resolve();
            });
        } catch (error) {
            console.error('❌ Failed to send test message:', error);
            resolve();
        }
    });
}

async function initializePopup() {
    try {
        // Check authentication status
        await checkAuthStatus();
        
        // Load stats if authenticated
        await loadStats();
        
        // Check connection to backend
        await checkConnection();
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        showError('Failed to initialize extension');
    }
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the clicked tab
    const targetTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
        tab.textContent.toLowerCase().trim() === tabName
    );
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
}

async function checkAuthStatus() {
    try {
        const authMessage = document.getElementById('authMessage');
        authMessage.textContent = 'Checking authentication...';
        
        // Check if user is authenticated
        const response = await fetch('http://localhost:3000/api/auth-check', {
            method: 'GET',
            credentials: 'include',
            mode: 'cors'
        });

        const result = await response.json();
        const authSection = document.getElementById('authStatus');
        
        if (result && result.authenticated) {
            authSection.className = 'section auth-section authenticated';
            authMessage.textContent = '✅ Signed in to ReadWatch Tracker';
            showMainInterface();
        } else {
            authSection.className = 'section auth-section';
            authMessage.innerHTML = `
                ⚠️ Please sign in to ReadWatch Tracker<br>
                <div style="margin-top: 8px;">
                  <a href="http://localhost:3000/sign-in" target="_blank" style="color: #d97706; text-decoration: underline;">1. Click here to sign in</a><br>
                  <span style="font-size: 12px; color: #6b7280;">2. After signing in, click "🔄 Refresh" below</span>
                </div>
            `;
            hideMainInterface();
            // Show refresh button even when not authenticated
            document.getElementById('refreshBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        const authSection = document.getElementById('authStatus');
        authSection.className = 'section auth-section';
        const authMessage = document.getElementById('authMessage');
        authMessage.innerHTML = `
            ❌ Cannot connect to ReadWatch Tracker<br>
            <div style="margin-top: 8px;">
              <span style="font-size: 12px; color: #6b7280;">Make sure the app is running on localhost:3000</span><br>
              <a href="http://localhost:3000" target="_blank" style="color: #d97706; text-decoration: underline;">Open ReadWatch Tracker</a>
            </div>
        `;
        hideMainInterface();
    }
}

async function loadStats() {
    try {
        console.log('📊 Loading stats...');
        
        // Send message to background script with debugging
        chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to get stats with new format:', chrome.runtime.lastError);
                
                // Try legacy format as fallback
                console.log('🔄 Trying legacy message format...');
                chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (legacyResponse) => {
                    if (chrome.runtime.lastError) {
                        console.error('Legacy format also failed:', chrome.runtime.lastError);
                        updateStatsDisplay({
                            total: 0,
                            thisWeek: 0,
                            articles: 0,
                            videos: 0,
                            podcasts: 0
                        });
                        return;
                    }
                    
                    if (legacyResponse) {
                        console.log('✅ Legacy stats response:', legacyResponse);
                        // Convert legacy response to new format
                        updateStatsDisplay({
                            total: legacyResponse.itemCount || 0,
                            thisWeek: 0,
                            articles: 0,
                            videos: 0,
                            podcasts: 0
                        });
                    }
                });
                return;
            }
            
            if (response && response.success) {
                console.log('✅ Stats loaded:', response.data);
                updateStatsDisplay(response.data);
            } else {
                console.error('Failed to load stats:', response?.error);
                // Try to get stats from local storage as final fallback
                getLocalStats();
            }
        });
    } catch (error) {
        console.error('Failed to load stats:', error);
        getLocalStats();
    }
}

// Fallback function to get stats from local storage
async function getLocalStats() {
    try {
        console.log('📦 Getting stats from local storage...');
        const result = await chrome.storage.local.get(['items']);
        const items = result.items || [];
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekItems = items.filter(item => 
            new Date(item.timestamp || item.analyzedAt) > oneWeekAgo
        );

        const stats = {
            total: items.length,
            thisWeek: thisWeekItems.length,
            articles: items.filter(item => item.type === 'article' || item.contentType === 'article').length,
            videos: items.filter(item => item.type === 'video' || item.contentType === 'video').length,
            podcasts: items.filter(item => item.type === 'podcast' || item.contentType === 'podcast').length
        };
        
        console.log('✅ Local stats:', stats);
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Failed to get local stats:', error);
        updateStatsDisplay({
            total: 0,
            thisWeek: 0,
            articles: 0,
            videos: 0,
            podcasts: 0
        });
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('totalCount').textContent = stats.total || 0;
    document.getElementById('weekCount').textContent = stats.thisWeek || 0;
    document.getElementById('articleCount').textContent = stats.articles || 0;
    document.getElementById('videoCount').textContent = stats.videos || 0;
}

async function checkConnection() {
    try {
        const response = await fetch('http://localhost:3000/api/test', {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('✅ Connection to backend successful');
    } catch (error) {
        console.log('⚠️ Backend connection failed:', error);
    }
}

function showMainInterface() {
    document.getElementById('statsSection').style.display = 'block';
}

function hideMainInterface() {
    document.getElementById('statsSection').style.display = 'none';
}

function refreshAuth() {
    checkAuthStatus();
    loadStats();
}

function openWebsite() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
}

// Settings Management
async function loadSettingsUI() {
    try {
        const settings = await getSettings();
        
        // Update checkboxes
        document.getElementById('autoTrack').checked = settings.autoTrack;
        document.getElementById('onlyReputableSites').checked = settings.onlyReputableSites;
        document.getElementById('trackArticles').checked = settings.trackArticles;
        document.getElementById('trackVideos').checked = settings.trackVideos;
        document.getElementById('trackPodcasts').checked = settings.trackPodcasts;
        
        // Update quality threshold
        document.getElementById('qualityThreshold').value = settings.qualityThreshold;
        document.getElementById('qualityValue').textContent = settings.qualityThreshold;
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            autoTrack: true,
            onlyReputableSites: true,
            trackArticles: true,
            trackVideos: true,
            trackPodcasts: true,
            qualityThreshold: 60,
            excludedDomains: []
        }, resolve);
    });
}

async function saveSetting(key, value) {
    try {
        await chrome.storage.sync.set({ [key]: value });
        console.log(`Setting saved: ${key} = ${value}`);
        
        // Show feedback
        showSettingsSaved();
    } catch (error) {
        console.error('Failed to save setting:', error);
    }
}

function updateQualityThreshold(value) {
    document.getElementById('qualityValue').textContent = value;
    saveSetting('qualityThreshold', parseInt(value));
}

function showSettingsSaved() {
    // Create temporary feedback
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #10b981;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 10000;
        transition: opacity 0.3s;
    `;
    feedback.textContent = '✅ Settings saved';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

function showError(message) {
    console.error('Error:', message);
}

// Debug function to test extension communication
async function testConnection() {
    const debugOutput = document.getElementById('debugOutput');
    debugOutput.innerHTML = 'Testing extension connection...<br>';
    
    try {
        // Test 1: Basic ping
        debugOutput.innerHTML += '1. Testing basic ping...<br>';
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                debugOutput.innerHTML += `❌ Ping failed: ${chrome.runtime.lastError.message}<br>`;
            } else {
                debugOutput.innerHTML += `✅ Ping response: ${JSON.stringify(response)}<br>`;
            }
            
            // Test 2: getStats
            debugOutput.innerHTML += '2. Testing getStats...<br>';
            chrome.runtime.sendMessage({ action: 'getStats' }, (statsResponse) => {
                if (chrome.runtime.lastError) {
                    debugOutput.innerHTML += `❌ getStats failed: ${chrome.runtime.lastError.message}<br>`;
                } else {
                    debugOutput.innerHTML += `✅ getStats response: ${JSON.stringify(statsResponse)}<br>`;
                }
                
                // Test 3: Legacy format
                debugOutput.innerHTML += '3. Testing legacy format...<br>';
                chrome.runtime.sendMessage({ type: 'PING' }, (legacyResponse) => {
                    if (chrome.runtime.lastError) {
                        debugOutput.innerHTML += `❌ Legacy ping failed: ${chrome.runtime.lastError.message}<br>`;
                    } else {
                        debugOutput.innerHTML += `✅ Legacy ping response: ${JSON.stringify(legacyResponse)}<br>`;
                    }
                    
                    debugOutput.innerHTML += 'Test completed. Check browser console for detailed logs.<br>';
                });
            });
        });
        
    } catch (error) {
        debugOutput.innerHTML += `❌ Test error: ${error.message}<br>`;
    }
}

// Global functions for HTML onclick handlers
window.switchTab = switchTab;
window.refreshAuth = refreshAuth;
window.openWebsite = openWebsite;
window.saveSetting = saveSetting;
window.updateQualityThreshold = updateQualityThreshold;
window.testConnection = testConnection; 
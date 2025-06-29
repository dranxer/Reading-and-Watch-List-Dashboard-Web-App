// ReadWatch Tracker Popup Script
console.log('🎨 ReadWatch Tracker: Popup script loaded');

// DOM Elements
let statsContainer, itemsContainer, clearButton, authStatus, authText, refreshAuthBtn;
let openDashboardBtn, listModal, listSelect, newListNameInput, confirmAddToListBtn, cancelAddToListBtn;

// State
let currentItemId = null;
let userLists = [];
let isAuthenticated = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Initializing popup...');
    
    // Get DOM elements
    statsContainer = document.getElementById('stats');
    itemsContainer = document.getElementById('items');
    clearButton = document.getElementById('clearData');
    authStatus = document.getElementById('authStatus');
    authText = document.getElementById('authText');
    refreshAuthBtn = document.getElementById('refreshAuth');
    openDashboardBtn = document.getElementById('openDashboard');
    listModal = document.getElementById('listModal');
    listSelect = document.getElementById('listSelect');
    newListNameInput = document.getElementById('newListName');
    confirmAddToListBtn = document.getElementById('confirmAddToList');
    cancelAddToListBtn = document.getElementById('cancelAddToList');
    
    // Set up event listeners
    if (clearButton) {
        clearButton.addEventListener('click', handleClearData);
    }
    
    if (refreshAuthBtn) {
        refreshAuthBtn.addEventListener('click', checkAuthenticationStatus);
    }
    
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', openDashboard);
    }
    
    if (confirmAddToListBtn) {
        confirmAddToListBtn.addEventListener('click', handleAddToList);
    }
    
    if (cancelAddToListBtn) {
        cancelAddToListBtn.addEventListener('click', closeListModal);
    }
    
    // Load data
    loadPopupData();
});

async function loadPopupData() {
    try {
        // Show loading state
        showLoading();
        
        // Check authentication first
        await checkAuthenticationStatus();
        
        // Load stats and items in parallel
        const [statsResult, itemsResult] = await Promise.all([
            getStats(),
            getItems()
        ]);
        
        // Update UI
        updateStats(statsResult.success ? statsResult.stats : null);
        updateItems(itemsResult.success ? itemsResult.items : []);
        
        // Load user lists if authenticated
        if (isAuthenticated) {
            await loadUserLists();
        }
        
    } catch (error) {
        console.error('🎨 Error loading popup data:', error);
        showError('Failed to load data');
    }
}

async function checkAuthenticationStatus() {
    try {
        const result = await checkAuth();
        
        if (result.success) {
            isAuthenticated = result.authenticated;
            
            if (result.authenticated) {
                authStatus.className = 'auth-status authenticated';
                authText.textContent = '✅ Connected to Dashboard';
                
                // Add sign out option
                if (!document.getElementById('signOutBtn')) {
                    const signOutBtn = document.createElement('button');
                    signOutBtn.id = 'signOutBtn';
                    signOutBtn.className = 'btn btn-warning';
                    signOutBtn.textContent = '🚪';
                    signOutBtn.title = 'Open Dashboard to sign out';
                    signOutBtn.addEventListener('click', openDashboard);
                    authStatus.querySelector('.auth-actions').appendChild(signOutBtn);
                }
            } else {
                authStatus.className = 'auth-status not-authenticated';
                authText.innerHTML = '⚠️ Not connected - <span id="signInLink" style="cursor: pointer; text-decoration: underline;">Sign in</span>';
                
                // Add sign-in click handler
                setTimeout(() => {
                    const signInLink = document.getElementById('signInLink');
                    if (signInLink) {
                        signInLink.addEventListener('click', handleSignIn);
                    }
                }, 100);
                
                // Remove sign out button if exists
                const signOutBtn = document.getElementById('signOutBtn');
                if (signOutBtn) signOutBtn.remove();
            }
        } else {
            authStatus.className = 'auth-status not-authenticated';
            authText.textContent = '❌ Dashboard offline';
        }
    } catch (error) {
        console.error('🎨 Auth check failed:', error);
        authStatus.className = 'auth-status not-authenticated';
        authText.textContent = '❌ Connection failed';
    }
}

async function loadUserLists() {
    try {
        const result = await getUserLists();
        if (result.success) {
            userLists = result.lists;
            updateListSelect();
        }
    } catch (error) {
        console.error('🎨 Failed to load user lists:', error);
    }
}

function updateListSelect() {
    if (!listSelect) return;
    
    // Clear existing options except the first one
    listSelect.innerHTML = '<option value="">Select a list...</option>';
    
    // Add user lists
    userLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
        listSelect.appendChild(option);
    });
}

function showLoading() {
    if (statsContainer) {
        statsContainer.innerHTML = '<div class="loading">Loading...</div>';
    }
    if (itemsContainer) {
        itemsContainer.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function showError(message) {
    if (statsContainer) {
        statsContainer.innerHTML = `<div class="error">${message}</div>`;
    }
    if (itemsContainer) {
        itemsContainer.innerHTML = `<div class="error">${message}</div>`;
    }
}

function updateStats(stats) {
    if (!statsContainer) return;
    
    if (!stats) {
        statsContainer.innerHTML = '<div class="error">Failed to load stats</div>';
                        return;
                    }
                    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total Items</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.thisWeek}</div>
            <div class="stat-label">This Week</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.synced || 0}</div>
            <div class="stat-label">Synced</div>
        </div>
    `;
}

function updateItems(items) {
    if (!itemsContainer) return;
    
    if (!items || items.length === 0) {
        itemsContainer.innerHTML = '<div class="empty-state">No items tracked yet</div>';
                return;
            }
    
    const itemsHTML = items.map(item => `
        <div class="item" data-item-id="${item.id}">
            <div class="sync-status ${item.syncedToDashboard ? 'synced' : ''}" 
                 title="${item.syncedToDashboard ? 'Synced to dashboard' : 'Local only'}"></div>
            
            <div class="item-header">
                <div class="item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                <div class="item-score">${item.qualityScore || 'N/A'}%</div>
            </div>
            
            <div class="item-meta">
                <span class="item-domain">${escapeHtml(item.domain || new URL(item.url).hostname)}</span>
                <span class="item-date">${formatDate(item.timestamp)}</span>
            </div>
            
            <div class="item-stats">
                <span class="stat">${item.wordCount || 0} words</span>
                <span class="stat">${item.readingTime || 1} min read</span>
                <span class="stat type-${item.contentType || 'article'}">${item.contentType || 'article'}</span>
            </div>
            
            ${item.summary ? `
                <div class="summary-box show">
                    📄 ${item.summary}
                </div>
            ` : ''}
            
            <div class="item-actions">
                ${!item.syncedToDashboard && isAuthenticated ? `
                    <button class="btn btn-success" onclick="syncItemToDashboard('${item.id}')">
                        📤 Sync
                    </button>
                ` : ''}
                
                ${isAuthenticated ? `
                    <button class="btn btn-secondary" onclick="generateSummaryForItem('${item.id}')">
                        📄 Summary
                    </button>
                    <button class="btn btn-warning" onclick="showAddToListModal('${item.id}')">
                        📋 Add to List
                    </button>
                ` : ''}
                
                <button class="btn btn-secondary" onclick="window.open('${item.url}', '_blank')">
                    🔗 Open
                </button>
            </div>
        </div>
    `).join('');
    
    itemsContainer.innerHTML = itemsHTML;
}

// Global functions for onclick handlers
window.syncItemToDashboard = async function(itemId) {
    try {
        const result = await syncToDashboard(itemId);
        if (result.success) {
            showNotification('✅ Item synced to dashboard!');
            await loadPopupData(); // Refresh data
        } else {
            showNotification('❌ Sync failed: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Sync error: ' + error.message, 'error');
    }
};

window.generateSummaryForItem = async function(itemId) {
    try {
        const result = await generateSummary(itemId);
        if (result.success) {
            showNotification('✅ Summary generated!');
            await loadPopupData(); // Refresh data to show summary
            } else {
            showNotification('❌ Summary failed: ' + result.error, 'error');
            }
    } catch (error) {
        showNotification('❌ Summary error: ' + error.message, 'error');
    }
};

window.showAddToListModal = function(itemId) {
    currentItemId = itemId;
    listModal.classList.add('show');
};

function closeListModal() {
    listModal.classList.remove('show');
    currentItemId = null;
    listSelect.value = '';
    newListNameInput.value = '';
}

async function handleAddToList() {
    try {
        if (!currentItemId) return;
        
        const selectedListId = listSelect.value;
        const newListName = newListNameInput.value.trim();
        
        let listId = selectedListId;
        
        // Create new list if name provided
        if (newListName) {
            const createResult = await createList({
                name: newListName,
                description: '',
                isPublic: false
            });
            
            if (createResult.success) {
                listId = createResult.list.id;
                await loadUserLists(); // Refresh lists
            } else {
                showNotification('❌ Failed to create list: ' + createResult.error, 'error');
                return;
            }
        }
        
        if (!listId) {
            showNotification('⚠️ Please select a list or create a new one', 'error');
            return;
        }
        
        // Add item to list
        const addResult = await addToList(listId, currentItemId);
        if (addResult.success) {
            showNotification('✅ Added to list!');
            closeListModal();
        } else {
            showNotification('❌ Failed to add to list: ' + addResult.error, 'error');
        }
        
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

function openDashboard() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
}

async function handleSignIn() {
    try {
        showNotification('Opening sign-in page...', 'info');
        
        const result = await signIn();
        if (result.success && result.authenticated) {
            showNotification('Successfully signed in!', 'success');
            // Reload the popup data to reflect new auth status
            await loadPopupData();
        } else {
            showNotification('Sign-in was cancelled or failed', 'warning');
        }
    } catch (error) {
        console.error('🎨 Sign-in failed:', error);
        showNotification('Sign-in failed', 'error');
    }
}

async function handleClearData() {
    if (!confirm('Are you sure you want to clear all tracked data? This cannot be undone.')) {
        return;
    }
    
    try {
        clearButton.disabled = true;
        clearButton.textContent = 'Clearing...';
        
        const result = await clearData();
        
        if (result.success) {
            // Reload popup data
            await loadPopupData();
            showNotification('All data cleared successfully');
        } else {
            showNotification('Failed to clear data', 'error');
        }
        
    } catch (error) {
        console.error('🎨 Error clearing data:', error);
        showNotification('Error clearing data', 'error');
    } finally {
        clearButton.disabled = false;
        clearButton.textContent = '🗑️ Clear';
    }
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to popup
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    } catch (error) {
        return 'Unknown';
    }
}

// Chrome extension API helpers
function checkAuth() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Auth check error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function getStats() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Stats error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function getItems() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getItems' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Items error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function syncToDashboard(itemId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'syncToDashboard', itemId }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Sync error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function generateSummary(itemId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'generateSummary', itemId }, (response) => {
                if (chrome.runtime.lastError) {
                console.error('🎨 Summary error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function getUserLists() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getUserLists' }, (response) => {
                    if (chrome.runtime.lastError) {
                console.error('🎨 Lists error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function createList(listData) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'createList', listData }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Create list error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
                });
            });
}

function addToList(listId, itemId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'addToList', listId, itemId }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Add to list error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function clearData() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'clearData' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Clear error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

function signIn() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'signIn' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🎨 Sign-in error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
}

console.log('✅ ReadWatch Tracker: Popup script ready');
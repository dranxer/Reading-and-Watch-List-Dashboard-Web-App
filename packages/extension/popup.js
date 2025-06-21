// Popup script for Reading Tracker Extension

class PopupManager {
    constructor() {
        this.elements = {
            modelStatus: document.getElementById('modelStatus'),
            modelText: document.getElementById('modelText'),
            authStatus: document.getElementById('authStatus'),
            authText: document.getElementById('authText'),
            authMessage: document.getElementById('authMessage'),
            signInBtn: document.getElementById('signInBtn'),
            signOutBtn: document.getElementById('signOutBtn'),
            extractBtn: document.getElementById('extractBtn'),
            openDashboardBtn: document.getElementById('openDashboardBtn'),
            progressContainer: document.getElementById('progressContainer'),
            progressFill: document.getElementById('progressFill'),
            notification: document.getElementById('notification')
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.updateStatus();
        this.startStatusPolling();
    }

    setupEventListeners() {
        // Sign in button
        this.elements.signInBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'http://localhost:3000/auth-token' });
        });

        // Sign out button
        this.elements.signOutBtn.addEventListener('click', async () => {
            await this.clearAuthToken();
            this.updateAuthStatus(false);
            this.showNotification('Signed out successfully', false);
        });

        // Extract current page button
        this.elements.extractBtn.addEventListener('click', async () => {
            await this.extractCurrentPage();
        });

        // Open dashboard button
        this.elements.openDashboardBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleBackgroundMessage(request);
        });
    }

    async updateStatus() {
        try {
            // Get model status
            const modelStatus = await this.getModelStatus();
            this.updateModelStatus(modelStatus);

            // Get auth status
            const authToken = await this.getAuthToken();
            this.updateAuthStatus(!!authToken);

        } catch (error) {
            console.error('Error updating status:', error);
            this.updateModelStatus({ isLoaded: false, isLoading: false });
            this.updateAuthStatus(false);
        }
    }

    async getModelStatus() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getModelStatus' }, (response) => {
                resolve(response || { isLoaded: false, isLoading: false });
            });
        });
    }

    async getAuthToken() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
                resolve(response?.token || null);
            });
        });
    }

    async clearAuthToken() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'clearAuthToken' }, (response) => {
                resolve(response);
            });
        });
    }

    updateModelStatus(status) {
        const { modelStatus, modelText, progressContainer, progressFill } = this.elements;

        if (status.isLoading) {
            modelStatus.className = 'status-indicator loading';
            modelText.textContent = 'Loading...';
            progressContainer.classList.remove('hidden');
        } else if (status.isLoaded) {
            modelStatus.className = 'status-indicator ready';
            modelText.textContent = 'Ready';
            progressContainer.classList.add('hidden');
        } else {
            modelStatus.className = 'status-indicator error';
            modelText.textContent = 'Error';
            progressContainer.classList.add('hidden');
        }
    }

    updateAuthStatus(isAuthenticated) {
        const { authStatus, authText, authMessage, signInBtn, signOutBtn, extractBtn } = this.elements;

        if (isAuthenticated) {
            authStatus.className = 'status-indicator ready';
            authText.textContent = 'Signed in';
            authMessage.textContent = 'You are signed in and ready to save articles.';
            authMessage.className = 'auth-status';
            signInBtn.classList.add('hidden');
            signOutBtn.classList.remove('hidden');
            extractBtn.disabled = false;
        } else {
            authStatus.className = 'status-indicator offline';
            authText.textContent = 'Not signed in';
            authMessage.textContent = 'Sign in to your account to save articles and summaries.';
            authMessage.className = 'auth-status error';
            signInBtn.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
            extractBtn.disabled = true;
        }
    }

    async extractCurrentPage() {
        try {
            this.elements.extractBtn.disabled = true;
            this.elements.extractBtn.textContent = 'Extracting...';

            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send message to content script to extract content
            await chrome.tabs.sendMessage(tab.id, { action: 'extractNow' });
            
            this.showNotification('Article extraction started!', false);

        } catch (error) {
            console.error('Error extracting current page:', error);
            this.showNotification('Failed to extract article. Make sure you are on an article page.', true);
        } finally {
            this.elements.extractBtn.disabled = false;
            this.elements.extractBtn.textContent = 'Extract Current Page';
        }
    }

    handleBackgroundMessage(request) {
        switch (request.action) {
            case 'modelProgress':
                this.updateProgress(request.progress);
                break;
                
            case 'modelReady':
                this.updateModelStatus({ isLoaded: true, isLoading: false });
                this.showNotification('Gemma-3-1b model loaded successfully!', false);
                break;
                
            case 'modelError':
                this.updateModelStatus({ isLoaded: false, isLoading: false });
                this.showNotification('Failed to load AI model', true);
                break;
                
            case 'summarizationComplete':
                const qualityText = request.qualityRating ? ` (Quality: ${request.qualityRating}/10)` : '';
                const publicText = request.isPublic ? ' - Added to public reading list!' : '';
                this.showNotification(`High-quality article "${request.title}" saved successfully!${qualityText}${publicText}`, false);
                break;
                
            case 'summarizationError':
                this.showNotification(`Failed to save article: ${request.error}`, true);
                break;
                
            case 'contentQualityLow':
                this.showNotification(`Content quality too low (${request.rating}/10): ${request.explanation}`, true);
                break;
                
            case 'authRequired':
                this.showNotification('Please sign in to save articles', true);
                break;
        }
    }

    updateProgress(progress) {
        const { progressContainer, progressFill } = this.elements;
        
        if (progress && progress.progress) {
            progressContainer.classList.remove('hidden');
            const percentage = Math.round(progress.progress * 100);
            progressFill.style.width = `${percentage}%`;
        } else {
            progressContainer.classList.add('hidden');
        }
    }

    showNotification(message, isError = false) {
        const { notification } = this.elements;
        
        notification.textContent = message;
        notification.className = `notification ${isError ? 'error' : ''}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    startStatusPolling() {
        // Update status every 5 seconds
        setInterval(() => {
            this.updateStatus();
        }, 5000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Handle authentication token from website
// This will be called when user signs in on the website
window.addEventListener('message', (event) => {
    if (event.origin !== 'http://localhost:3000') return;
    
    if (event.data.type === 'AUTH_TOKEN') {
        chrome.runtime.sendMessage({
            action: 'setAuthToken',
            token: event.data.token
        });
    }
}); 
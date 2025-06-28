// Simple popup script
console.log('🎮 Simple popup script loaded');

let statusDiv, resultDiv, authBtn, logoutBtn;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Popup DOM loaded');
    
    statusDiv = document.getElementById('status');
    resultDiv = document.getElementById('result');
    authBtn = document.getElementById('authBtn');
    logoutBtn = document.getElementById('logoutBtn');
    
    setupButtons();
    checkAuthAndUpdateUI();
});

function setupButtons() {
    document.getElementById('pingBtn').addEventListener('click', testPing);
    document.getElementById('statusBtn').addEventListener('click', getStatus);
    document.getElementById('authBtn').addEventListener('click', authenticate);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
}

function showResult(message, isError = false) {
    resultDiv.textContent = message;
    resultDiv.className = `status ${isError ? 'error' : 'success'}`;
    resultDiv.style.display = 'block';
}

async function checkAuthAndUpdateUI() {
    console.log('🔗 Checking authentication and updating UI...');
    
    if (!chrome.runtime) {
        showStatus('❌ Chrome runtime not available', true);
        return;
    }
    
    try {
        const response = await sendMessage({ type: 'GET_STATUS' });
        if (response) {
            if (response.authenticated) {
                showStatus('✅ Signed in and ready!');
                authBtn.style.display = 'none';
                logoutBtn.style.display = 'block';
            } else {
                showStatus('❌ Not signed in');
                authBtn.style.display = 'block';
                logoutBtn.style.display = 'none';
            }
        } else {
            showStatus('❌ Could not check status', true);
        }
    } catch (error) {
        showStatus(`❌ Connection failed: ${error.message}`, true);
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}

async function testConnection() {
    console.log('🔗 Testing connection...');
    
    if (!chrome.runtime) {
        showStatus('❌ Chrome runtime not available', true);
        return;
    }
    
    try {
        const response = await sendMessage({ type: 'PING' });
        if (response && response.pong) {
            showResult('✅ Connection OK');
        } else {
            showResult('❌ Invalid response', true);
        }
    } catch (error) {
        showResult(`❌ Connection failed: ${error.message}`, true);
    }
}

async function testPing() {
    console.log('🏓 Testing ping...');
    
    try {
        const response = await sendMessage({ type: 'PING' });
        showResult(`🏓 Ping: ${JSON.stringify(response)}`);
    } catch (error) {
        showResult(`❌ Ping failed: ${error.message}`, true);
    }
}

async function getStatus() {
    console.log('📊 Getting status...');
    
    try {
        const response = await sendMessage({ type: 'GET_STATUS' });
        showResult(`📊 Status: ${JSON.stringify(response, null, 2)}`);
        
        // Update UI based on auth status
        if (response && response.authenticated) {
            showStatus('✅ Signed in and ready!');
            authBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            showStatus('❌ Not signed in');
            authBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    } catch (error) {
        showResult(`❌ Status failed: ${error.message}`, true);
    }
}

async function authenticate() {
    console.log('🔐 Authenticating...');
    
    try {
        authBtn.disabled = true;
        authBtn.textContent = '🔓 Opening sign-in...';
        
        const response = await sendMessage({ type: 'AUTHENTICATE' });
        
        if (response.success) {
            showResult('✅ Sign-in page opened! Please sign in and then click "Get Status" to refresh.');
        } else {
            showResult(`❌ Auth failed: ${response.error}`, true);
        }
    } catch (error) {
        showResult(`❌ Auth error: ${error.message}`, true);
    } finally {
        authBtn.disabled = false;
        authBtn.textContent = '🔑 Sign In to Knowledge Tracker';
    }
}

async function logout() {
    console.log('🚪 Logging out...');
    
    try {
        const response = await sendMessage({ type: 'LOGOUT' });
        showResult('✅ Logged out - sign-in page opened');
        
        // Update UI to show signed out state
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        showStatus('❌ Not signed in');
    } catch (error) {
        showResult(`❌ Logout failed: ${error.message}`, true);
    }
}

// Simple message sending with timeout
function sendMessage(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout'));
        }, timeout);
        
        chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timer);
            
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
} 
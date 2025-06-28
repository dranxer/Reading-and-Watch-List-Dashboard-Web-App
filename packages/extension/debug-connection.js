function log(message, type = 'log') {
    const logs = document.getElementById('logs');
    const div = document.createElement('div');
    div.className = `log ${type}`;
    div.innerHTML = `<strong>[${new Date().toLocaleTimeString()}]</strong> ${message}`;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function updateExtensionStatus() {
    const indicator = document.getElementById('extensionDetected');
    const status = document.getElementById('extensionStatus');
    const idSpan = document.getElementById('extensionId');
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        indicator.className = 'status-indicator status-ok';
        status.textContent = 'Extension API Available';
        idSpan.textContent = chrome.runtime.id || 'Available';
        log('✅ Chrome extension API detected', 'success');
    } else {
        indicator.className = 'status-indicator status-error';
        status.textContent = 'Extension API Not Available';
        idSpan.textContent = 'Not Available';
        log('❌ Chrome extension API not available', 'error');
    }
}

async function testBasicConnection() {
    log('🔧 Testing basic connection...', 'log');
    
    if (!chrome.runtime) {
        log('❌ Chrome runtime not available', 'error');
        return;
    }

    try {
        // Try to check if the runtime is valid
        const id = chrome.runtime.id;
        log(`✅ Runtime ID: ${id}`, 'success');
        
        // Try a simple message with timeout
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout after 5 seconds'));
            }, 5000);
            
            chrome.runtime.sendMessage({ type: 'BASIC_TEST' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        log(`✅ Basic connection successful: ${JSON.stringify(response)}`, 'success');
        
    } catch (error) {
        log(`❌ Basic connection failed: ${error.message}`, 'error');
        
        // Suggest solutions
        if (error.message.includes('receiving end does not exist')) {
            log('💡 Solution: Background script might not be loaded. Try reloading the extension.', 'warning');
        } else if (error.message.includes('Timeout')) {
            log('💡 Solution: Background script might be stuck. Check background console for errors.', 'warning');
        }
    }
}

async function testPing() {
    log('🏓 Testing ping...', 'log');
    
    try {
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Ping timeout after 3 seconds'));
            }, 3000);
            
            chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        log(`🏓 Ping response: ${JSON.stringify(response)}`, 'success');
    } catch (error) {
        log(`❌ Ping failed: ${error.message}`, 'error');
    }
}

async function testGetStatus() {
    log('📊 Testing get status...', 'log');
    
    try {
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Status timeout after 3 seconds'));
            }, 3000);
            
            chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        log(`📊 Status response: ${JSON.stringify(response, null, 2)}`, 'success');
    } catch (error) {
        log(`❌ Get status failed: ${error.message}`, 'error');
    }
}

function clearLogs() {
    document.getElementById('logs').innerHTML = '';
}

function setupEventListeners() {
    document.getElementById('testBasicBtn').addEventListener('click', testBasicConnection);
    document.getElementById('testPingBtn').addEventListener('click', testPing);
    document.getElementById('testStatusBtn').addEventListener('click', testGetStatus);
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
    log('🚀 Diagnostic page loaded');
    setupEventListeners();
    updateExtensionStatus();
    
    // Auto-test basic connection after 1 second
    setTimeout(testBasicConnection, 1000);
});

// Listen for any messages from background
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        log(`📨 Received message: ${JSON.stringify(message)}`, 'warning');
        return true;
    });
} 
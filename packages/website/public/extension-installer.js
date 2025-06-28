/**
 * Advanced Chrome Extension Auto-Installer
 * Handles automatic installation of Chrome extensions using multiple methods
 */

class ExtensionInstaller {
  constructor(extensionInfo) {
    this.extensionInfo = extensionInfo;
    this.extensionId = null;
    this.installationCallbacks = [];
  }

  // Add callback for installation events
  onInstallation(callback) {
    this.installationCallbacks.push(callback);
  }

  // Trigger installation callbacks
  triggerCallbacks(success, data = {}) {
    this.installationCallbacks.forEach(callback => {
      try {
        callback(success, data);
      } catch (error) {
        console.error('Installation callback error:', error);
      }
    });
  }

  // Method 1: Try Chrome Web Store inline installation
  async tryWebStoreInstallation() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.webstore) {
        chrome.webstore.install(
          this.extensionInfo.webStoreUrl,
          () => {
            console.log('✅ Web Store installation successful');
            this.triggerCallbacks(true, { method: 'webstore' });
            resolve(true);
          },
          (error) => {
            console.log('❌ Web Store installation failed:', error);
            resolve(false);
          }
        );
      } else {
        resolve(false);
      }
    });
  }

  // Method 2: Try Chrome Extension Management API
  async tryManagementApiInstallation() {
    return new Promise(async (resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.management) {
          // Download extension package
          const response = await fetch('/reading-tracker-extension.zip');
          const blob = await response.blob();
          
          // Convert to CRX format (simplified approach)
          const reader = new FileReader();
          reader.onload = () => {
            const arrayBuffer = reader.result;
            
            chrome.management.install({
              'id': 'reading-tracker-extension',
              'data': arrayBuffer
            }, (result) => {
              if (chrome.runtime.lastError) {
                console.log('❌ Management API installation failed:', chrome.runtime.lastError);
                resolve(false);
              } else {
                console.log('✅ Management API installation successful');
                this.extensionId = result.id;
                this.triggerCallbacks(true, { method: 'management', extensionId: result.id });
                resolve(true);
              }
            });
          };
          reader.readAsArrayBuffer(blob);
        } else {
          resolve(false);
        }
      } catch (error) {
        console.log('❌ Management API installation error:', error);
        resolve(false);
      }
    });
  }

  // Method 3: Developer Mode auto-installation
  async tryDeveloperModeInstallation() {
    return new Promise(async (resolve) => {
      try {
        // Create a temporary installation URL
        const installationScript = `
          // Auto-installation script for developer mode
          (async () => {
            try {
              // Download and extract extension
              const response = await fetch('/reading-tracker-extension.zip');
              const blob = await response.blob();
              
              // Create a temporary download
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'reading-tracker-extension.zip';
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              // Open Chrome Extensions page
              window.open('chrome://extensions/', '_blank');
              
              // Show installation instructions
              const instructions = ${JSON.stringify(`
🎉 Extension package downloaded!

Follow these steps:
1. Enable "Developer mode" (toggle in top-right)
2. Click "Load unpacked"
3. Extract the ZIP file to a folder
4. Select the extracted folder
5. ✅ Extension installed!

The extension will start tracking your reading automatically.
              `)};
              
              alert(instructions);
              
              return true;
            } catch (error) {
              console.error('Developer mode installation failed:', error);
              return false;
            }
          })();
        `;
        
        // Execute the installation script
        eval(installationScript);
        
        // Start checking for installation
        this.startInstallationCheck();
        resolve(true);
        
      } catch (error) {
        console.log('❌ Developer mode installation error:', error);
        resolve(false);
      }
    });
  }

  // Start checking if extension was installed
  startInstallationCheck() {
    let checkCount = 0;
    const maxChecks = 30; // Check for 5 minutes
    
    const checkInterval = setInterval(() => {
      checkCount++;
      
      // Try to communicate with extension
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          'reading-tracker-extension-id', 
          { action: 'ping' }, 
          (response) => {
            if (response && response.installed) {
              console.log('✅ Extension installation confirmed!');
              clearInterval(checkInterval);
              this.extensionId = response.extensionId;
              this.triggerCallbacks(true, { 
                method: 'developer', 
                extensionId: response.extensionId,
                version: response.version 
              });
            }
          }
        );
      }
      
      // Stop checking after max attempts
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        console.log('⏰ Installation check timeout');
      }
    }, 10000); // Check every 10 seconds
  }

  // Main installation method - tries all approaches
  async install() {
    console.log('🚀 Starting extension installation...');
    
    // Method 1: Web Store (if available)
    if (await this.tryWebStoreInstallation()) {
      return true;
    }
    
    // Method 2: Management API (if available)
    if (await this.tryManagementApiInstallation()) {
      return true;
    }
    
    // Method 3: Developer Mode (fallback)
    console.log('📦 Using developer mode installation...');
    return await this.tryDeveloperModeInstallation();
  }

  // Check if extension is already installed
  async checkInstalled() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          'reading-tracker-extension-id',
          { action: 'checkInstallation' },
          (response) => {
            if (response && response.installed) {
              this.extensionId = response.extensionId;
              resolve(true);
            } else {
              resolve(false);
            }
          }
        );
      } else {
        resolve(false);
      }
    });
  }
}

// Export for use in website
window.ExtensionInstaller = ExtensionInstaller; 
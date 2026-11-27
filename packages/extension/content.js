// ReadWatch Tracker Content Script
console.log('📚 ReadWatch Tracker: Content script loaded on', window.location.href);

// On the dashboard itself: pass "refresh" pings from the extension to the page
if (['readwatch-dashboard.vercel.app', 'localhost', 'readwatch.test'].includes(window.location.hostname)) {
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'readwatchRefresh') {
            window.postMessage({ source: 'readwatch-extension', type: 'refresh' }, window.location.origin);
        }
    });
}

// Private sites the extension never reads (mail, meetings, chat, documents, sign-in, payments, consoles).
// manifest.json keeps the script off these sites; this check is a second line of defence.
const READWATCH_PRIVATE_HOSTS = [
    'mail.google.com', 'inbox.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com',
    'mail.proton.me', 'proton.me', 'mail.zoho.com', 'mail.zoho.in', 'icloud.com', 'fastmail.com',
    'mail.aol.com', 'meet.google.com', 'zoom.us', 'zoom.com', 'teams.microsoft.com', 'teams.live.com',
    'webex.com', 'whereby.com', 'meet.jit.si', 'gotomeeting.com', 'bluejeans.com', 'chime.aws',
    'app.chime.aws', 'around.co', 'skype.com', 'web.whatsapp.com', 'slack.com', 'app.slack.com',
    'discord.com', 'web.telegram.org', 'messenger.com', 'chat.google.com', 'messages.google.com', 'teams.cloud.microsoft',
    'calendar.google.com', 'docs.google.com', 'drive.google.com', 'sheets.google.com', 'keep.google.com', 'onedrive.live.com',
    'sharepoint.com', 'dropbox.com', 'notion.so', 'app.notion.com', 'figma.com', 'accounts.google.com',
    'myaccount.google.com', 'login.microsoftonline.com', 'account.microsoft.com', 'appleid.apple.com', '1password.com', 'lastpass.com',
    'bitwarden.com', 'paypal.com', 'pay.google.com', 'wallet.google.com', 'paytm.com', 'phonepe.com',
    'razorpay.com', 'stripe.com', 'console.aws.amazon.com', 'portal.azure.com', 'console.cloud.google.com', 'admin.google.com',
    'vercel.com', 'app.netlify.com'
];
function readwatchIsPrivateHost(hostname) {
    const h = hostname.toLowerCase().replace(/^www\./, '');
    return READWATCH_PRIVATE_HOSTS.some(p => h === p || h.endsWith('.' + p)) ||
        /(^|\.)(mail|webmail|meet|meeting|teams|chat|calendar|accounts?|login|signin|auth|sso|bank|banking|netbanking|pay|payments|wallet|admin|console)\./.test(h + '.');
}

// Prevent multiple executions
if (readwatchIsPrivateHost(window.location.hostname)) {
    console.log('📚 ReadWatch: private site, not reading this page');
} else if (window.readWatchTrackerLoaded) {
    console.log('📚 ReadWatch Tracker: Already loaded, skipping');
} else {
    window.readWatchTrackerLoaded = true;
    
    // Configuration
    const MIN_WORD_COUNT = 50;  // Reduced from 100
    const MIN_TITLE_LENGTH = 5;  // Reduced from 10
    
    // State management
    let hasAnalyzed = false;
    let statusElement = null;
    
    // Initialize
    init();
    
    function init() {
        console.log('📚 ReadWatch Tracker: Initializing...');
        
        // Special handling for YouTube - needs more time to load
        if (window.location.hostname.includes('youtube.com')) {
            console.log('📚 YouTube detected - using extended delay');
            console.log('📚 Current URL:', window.location.href);
            console.log('📚 Is watch page:', window.location.pathname === '/watch');
            setTimeout(startAnalysis, 3000); // 3 second delay for YouTube
            return;
        }
        
        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startAnalysis);
        } else {
            // Small delay to ensure page is fully rendered
            setTimeout(startAnalysis, 1000);
        }
    }
    
    function startAnalysis() {
        if (hasAnalyzed) return;
        
        console.log('📚 Starting content analysis...');
        
        // Check if page should be filtered out
        if (shouldFilterPage()) {
            console.log('📚 Page filtered out - skipping analysis');
    return;
  }

        createStatusElement();
        showStatus('🔍 Analyzing page content...', 'info');
        
        // Start analysis after a short delay
        setTimeout(analyzeCurrentPage, 500);
    }
    
    function shouldFilterPage() {
        const url = window.location.href;
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const title = document.title.toLowerCase();
        
        console.log('📚 Checking if page should be filtered...');
        console.log('📚 URL:', url);
        console.log('📚 Hostname:', hostname);
        console.log('📚 Title:', title);
        
        // Special exception for YouTube
        if (hostname.includes('youtube.com') && pathname === '/watch') {
            console.log('📚 YouTube video page - NOT filtering');
            return false;
        }
        
        // Never track the ReadWatch dashboard itself
        if (hostname === 'readwatch-dashboard.vercel.app') return true;

        // Filter localhost and development URLs
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.includes('localhost') ||
            hostname.endsWith('.local') ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
            console.log('📚 Filtering out localhost/development URL');
            return true;
        }
        
        // Filter common development and testing domains
        const devDomains = [
            'stackblitz.com',
            'codesandbox.io',
            'codepen.io',
            'jsfiddle.net',
            'repl.it',
            'glitch.com'
        ];
        
        if (devDomains.some(domain => hostname.includes(domain))) {
            console.log('📚 Filtering out development/coding platform');
            return true;
        }
        
        // Filter browser internal pages
        if (url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') ||
            url.startsWith('moz-extension://') ||
            url.startsWith('safari-extension://') ||
            url.startsWith('about:') ||
            url.startsWith('file://')) {
            console.log('📚 Filtering out browser internal page');
            return true;
        }
        
        // Filter common non-content pages
        const filterPaths = [
            '/login',
            '/signup',
            '/register',
            '/auth',
            '/checkout',
            '/cart',
            '/admin',
            '/dashboard',
            '/settings',
            '/profile',
            '/account',
            '/404',
            '/error',
            '/search'
        ];
        
        if (filterPaths.some(path => pathname.includes(path))) {
            console.log('📚 Filtering out non-content page:', pathname);
        return true;
      }
        
        // Filter by title patterns
        const filterTitles = [
            'test',
            'debug',
            'localhost',
            'error',
            '404',
            'not found',
            'login',
            'sign in',
            'register',
            'checkout',
            'cart',
            'admin',
            'dashboard'
        ];
        
        // whole words only, so "latest" or "developer" in a headline doesn't hide an article
        if (filterTitles.some(pattern => new RegExp(`\\b${pattern}\\b`).test(title))) {
            console.log('📚 Filtering out page by title pattern:', title);
            return true;
        }
        
        // Filter only root homepage, allow other short paths
        if (pathname === '/' && !url.includes('?') && !url.includes('#')) {
            console.log('📚 Filtering out root homepage');
      return true;
    }
    
    return false;
  }

    function isQualityContent(pageData) {
        const { title, content, url, contentType } = pageData;
        
        // Special handling for YouTube videos
        if (contentType === 'video' && url.includes('youtube.com')) {
            console.log('📚 Applying YouTube-specific quality checks');
            
            // More lenient checks for YouTube videos
            if (title.length < 3) {
                console.log('📚 YouTube title too short');
                return false;
            }
            
            // For YouTube, even short descriptions are valuable
            if (content.length < 20) {
                console.log('📚 YouTube content too short');
                return false;
            }
            
            // Skip other quality checks for YouTube videos
            return true;
        }
        
                // Check for spam indicators
        const spamIndicators = [
            'click here',
            'download now',
            'free trial',
            'limited time',
            'act now',
            'buy now',
            'order now',
            'sign up now',
            'get started',
            'lorem ipsum'
        ];
        
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // Too many spam indicators
        const spamCount = spamIndicators.filter(indicator => 
            titleLower.includes(indicator) || contentLower.includes(indicator)
        ).length;
        
        if (spamCount > 2) {
            console.log('📚 Too many spam indicators:', spamCount);
            return false;
        }
        
        // Check for excessive punctuation or caps
        const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
        if (capsRatio > 0.3) {
            console.log('📚 Too many capital letters in title');
            return false;
        }
        
        // Check for excessive repetition
        const words = content.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const repetitionRatio = words.length / uniqueWords.size;
        
        if (repetitionRatio > 5) {
            console.log('📚 Too much repetition in content');
            return false;
        }
        
        // Check content structure - should have some paragraphs
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
        if (sentences.length < 2) {  // Reduced from 3
            console.log('📚 Too few sentences for quality content');
            return false;
        }
        
        // Check for meaningful content (not just navigation/UI text)
        const meaningfulWords = content.split(/\s+/).filter(word => word.length > 2);  // Reduced from > 3
        if (meaningfulWords.length < 25) {  // Reduced from 50
            console.log('📚 Not enough meaningful words');
            return false;
        }
        
        return true;
    }
    
    function createStatusElement() {
        // Remove existing status element
        const existing = document.getElementById('readwatch-status');
        if (existing) existing.remove();
        
        // Create new status element
        statusElement = document.createElement('div');
        statusElement.id = 'readwatch-status';
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(statusElement);
        
        // Animate in
        setTimeout(() => {
            statusElement.style.transform = 'translateX(0)';
        }, 100);
    }
    
    function showStatus(message, type = 'info') {
        if (!statusElement) return;
        
        const colors = {
            info: '#2563eb',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626'
        };
        
        statusElement.textContent = message;
        statusElement.style.background = colors[type] || colors.info;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (statusElement) statusElement.remove();
                }, 300);
            }
        }, 5000);
  }

  async function analyzeCurrentPage() {
    if (hasAnalyzed) return;
        hasAnalyzed = true;
    
    try {
            console.log('📚 Extracting content...');
            
            // Get page data
            const pageData = extractPageContent();
      
            if (!pageData.title || pageData.title.length < MIN_TITLE_LENGTH) {
                showStatus('⚠️ Page title too short to track', 'warning');
        return;
      }

            if (!pageData.content || pageData.content.length < MIN_WORD_COUNT) {
                showStatus('⚠️ Page content too short to track', 'warning');
                return;
            }
            
            // Additional quality checks
            if (!isQualityContent(pageData)) {
                showStatus('⚠️ Low quality content - skipping', 'warning');
        return;
      }

            // Check for duplicates
            showStatus('🔍 Checking for duplicates...', 'info');
            const isDuplicate = await checkForDuplicates(pageData.url);
            
            if (isDuplicate) {
                showStatus('📚 Already tracked - skipping duplicate', 'warning');
        return;
      }

            // Analyze content
            showStatus('🤖 Analyzing content quality...', 'info');
            const analysisResult = await analyzeContent(pageData);
            
            if (!analysisResult.success) {
                showStatus('❌ Content analysis failed', 'error');
          return;
        }

            // Save content
            showStatus('💾 Saving content...', 'info');
            const saveResult = await saveContent(analysisResult.data);
            
            if (saveResult.success) {
                showStatus(`✅ Saved: ${analysisResult.data.title.substring(0, 30)}...`, 'success');
              } else {
                showStatus('❌ Failed to save content', 'error');
            }
            
        } catch (error) {
            console.error('📚 Analysis error:', error);
            showStatus('❌ Analysis failed', 'error');
        }
    }
    
    function extractYouTubeContent(title, url) {
        console.log('📚 Extracting YouTube video content...');
        console.log('📚 Raw title:', title);
        console.log('📚 URL:', url);
        
        // Clean up title (remove " - YouTube" suffix)
        let cleanTitle = title.replace(/ - YouTube$/, '').trim();
        console.log('📚 Clean title:', cleanTitle);
        
        // Extract video description
        let description = '';
        
        // Try multiple selectors for video description
        const descriptionSelectors = [
            '#description-text',
            '#description .content',
            '#meta-contents #description',
            'ytd-video-secondary-info-renderer #description',
            'ytd-expandable-video-description-body-renderer',
            '[id="description"]',
            '#watch-description-text',
            '#eow-description'
        ];
        
        for (const selector of descriptionSelectors) {
            const descElement = document.querySelector(selector);
            if (descElement) {
                description = descElement.innerText || descElement.textContent || '';
                console.log('📚 Found YouTube description using:', selector);
                break;
            }
        }
        
        // Extract channel information
        let channelName = '';
        const channelSelectors = [
            '#channel-name a',
            '#owner-name a',
            'ytd-video-owner-renderer a',
            '.ytd-channel-name a',
            '#upload-info .yt-user-info a'
        ];
        
        for (const selector of channelSelectors) {
            const channelElement = document.querySelector(selector);
            if (channelElement) {
                channelName = channelElement.innerText || channelElement.textContent || '';
                console.log('📚 Found YouTube channel using:', selector);
                break;
            }
        }
        
        // Extract video duration
        let duration = '';
        const durationSelectors = [
            '.ytp-time-duration',
            '#movie_player .ytp-time-duration',
            '.html5-main-video'
        ];
        
        for (const selector of durationSelectors) {
            const durationElement = document.querySelector(selector);
            if (durationElement) {
                duration = durationElement.innerText || durationElement.textContent || '';
                if (duration) {
                    console.log('📚 Found YouTube duration:', duration);
          break;
        }
      }
    }

        // If no duration found, try to get it from video element
        if (!duration) {
            const videoElement = document.querySelector('video');
            if (videoElement && videoElement.duration && !isNaN(videoElement.duration)) {
                const seconds = Math.floor(videoElement.duration);
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                duration = `${mins}:${secs.toString().padStart(2, '0')}`;
                console.log('📚 Calculated duration from video element:', duration);
            }
        }
        
        // Extract view count
        let viewCount = '';
        const viewSelectors = [
            '#count .view-count',
            '.view-count',
            'ytd-video-view-count-renderer',
            '#info-contents .view-count'
        ];
        
        for (const selector of viewSelectors) {
            const viewElement = document.querySelector(selector);
            if (viewElement) {
                viewCount = viewElement.innerText || viewElement.textContent || '';
                console.log('📚 Found YouTube views:', viewCount);
                break;
            }
        }
        
        // Create comprehensive content from all extracted information
        let content = `Video Title: ${cleanTitle}\n\n`;
        
        if (channelName) {
            content += `Channel: ${channelName}\n\n`;
        }
        
        if (description) {
            content += `Description: ${description}\n\n`;
        }
        
        if (duration) {
            content += `Duration: ${duration}\n\n`;
        }
        
        if (viewCount) {
            content += `Views: ${viewCount}\n\n`;
        }
        
        // Add video URL for reference
        content += `Video URL: ${url}`;
        
        console.log('📚 YouTube content extracted:');
        console.log('📚 - Title:', cleanTitle);
        console.log('📚 - Channel:', channelName);
        console.log('📚 - Duration:', duration);
        console.log('📚 - Description length:', description.length);
        console.log('📚 - Total content length:', content.length);
        
        return {
            title: cleanTitle,
            url: url,
            content: content,
            description: description,
            channel: channelName,
            duration: duration,
            viewCount: viewCount,
            domain: 'youtube.com',
            contentType: 'video',
            timestamp: new Date().toISOString()
        };
    }
    
    function extractPageContent() {
        const title = document.title || '';
        const url = window.location.href;
        const hostname = window.location.hostname;
        
        console.log('📚 Extracting content from:', url);
        console.log('📚 Page title:', title);
        
        // Special handling for YouTube
        if (hostname.includes('youtube.com') && url.includes('/watch')) {
            return extractYouTubeContent(title, url);
        }
        
        // Extract main content
        let content = '';
        
        // Try to find main content containers
        const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.article-body',
            '.post-body',
            '.story-body',
            '.news-content',
            '.blog-content',
            '.page-content',
            '#content',
            '#main-content',
            '.main-content',
            '.primary-content',
            '.single-post',
            '.post',
            '.story',
            '.article',
            '[itemtype*="Article"]',
            '[class*="content"]',
            '[class*="article"]',
            '[class*="post"]'
        ];
        
        let contentElement = null;
        let selectedSelector = null;
        for (const selector of contentSelectors) {
            contentElement = document.querySelector(selector);
            if (contentElement) {
                selectedSelector = selector;
                break;
            }
        }
        
        // Fallback to body if no main content found
        if (!contentElement) {
            contentElement = document.body;
            selectedSelector = 'body (fallback)';
        }
        
        console.log('📚 Using content selector:', selectedSelector);
        
        // Extract text content
        if (contentElement) {
            // Remove script and style elements
            const scripts = contentElement.querySelectorAll('script, style, nav, header, footer, aside');
            scripts.forEach(el => el.remove());
            
            content = contentElement.innerText || contentElement.textContent || '';
        }
        
        // Clean up content
        content = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        console.log('📚 Extracted content length:', content.length);
        console.log('📚 Content preview:', content.substring(0, 200) + '...');
        
        return {
            title: title.trim(),
            url: url,
            content: content,
            domain: new URL(url).hostname,
            timestamp: new Date().toISOString()
        };
    }
    
    async function checkForDuplicates(url) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'checkDuplicate',
                url: url
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('📚 Duplicate check error:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    resolve(response && response.success && response.exists);
                }
            });
        });
    }
    
    async function analyzeContent(pageData) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'analyzeContent',
                data: pageData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('📚 Analysis error:', chrome.runtime.lastError);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response || { success: false, error: 'No response' });
                }
            });
        });
    }
    
    async function saveContent(contentData) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'saveContent',
                data: contentData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('📚 Save error:', chrome.runtime.lastError);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response || { success: false, error: 'No response' });
                }
            });
        });
    }
    
    console.log('✅ ReadWatch Tracker: Content script ready');
} 
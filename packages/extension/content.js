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
    
    // ---- Asking before saving ------------------------------------------------------------------
    // Nothing is ever saved without a click. The first time, the page asks whether to turn ReadWatch on;
    // after that, every page that looks worth keeping gets a "Save to ReadWatch?" prompt.
    const ASK_AFTER_MS = 6000;      // how long the page has to be open (and visible) before asking
    const PROMPT_TIMEOUT_MS = 30000;

    async function getSettings() {
        const { trackingEnabled, skippedUrls = [], blockedSites = [] } =
            await chrome.storage.local.get(['trackingEnabled', 'skippedUrls', 'blockedSites']);
        return { trackingEnabled, skippedUrls, blockedSites };
    }
    const pageKey = () => location.href.split('#')[0];
    const siteKey = () => location.hostname.replace(/^www\./, '');

    function waitUntilRead(ms) {
        return new Promise(resolve => {
            let seen = 0, last = Date.now();
            const tick = setInterval(() => {
                const now = Date.now();
                if (document.visibilityState === 'visible') seen += now - last;
                last = now;
                if (seen >= ms) { clearInterval(tick); resolve(); }
            }, 250);
        });
    }

    async function startAnalysis() {
        if (hasAnalyzed) return;
        if (shouldFilterPage()) return;
        const settings = await getSettings();
        if (settings.trackingEnabled === false) return;              // turned off
        if (settings.blockedSites.includes(siteKey())) return;       // "Never on this site"
        await waitUntilRead(ASK_AFTER_MS);
        analyzeCurrentPage();
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
    
    // A small card in the corner of the page, isolated from the page's styles
    function showCard({ heading, body, meta, buttons, link }) {
        document.getElementById('readwatch-prompt')?.remove();
        const host = document.createElement('div');
        host.id = 'readwatch-prompt';
        host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;';
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = `
          <style>
            :host { all: initial; }
            .card { width: 320px; box-sizing: border-box; background: #fff; color: #1e293b; border: 1px solid #d5e3e1;
              border-radius: 12px; padding: 14px 16px 12px; box-shadow: 0 10px 30px rgba(15, 50, 46, .18);
              font: 14px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation: in .25s ease-out; }
            @keyframes in { from { transform: translateY(12px); opacity: 0; } }
            @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
            .brand { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #0F766E; margin-bottom: 6px; }
            .brand svg { width: 12px; height: 14px; }
            h2 { font-size: 15px; font-weight: 650; margin: 0 0 4px; color: #0f172a; }
            .body { margin: 0; color: #334155; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
            .meta { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
            button { font: inherit; font-size: 13px; font-weight: 600; border-radius: 8px; padding: 7px 14px; cursor: pointer;
              border: 1px solid #cbd5e1; background: #fff; color: #0f172a; }
            button.primary { background: #0F766E; border-color: #0F766E; color: #fff; }
            button:hover { filter: brightness(.96); }
            button:focus-visible, .link:focus-visible { outline: 2px solid #0F766E; outline-offset: 2px; }
            .link { margin-left: auto; background: none; border: none; padding: 4px 0; font-weight: 500; font-size: 12px; color: #64748b; }
            .link:hover { color: #0F766E; text-decoration: underline; }
          </style>
          <div class="card" role="dialog" aria-label="ReadWatch">
            <div class="brand"><svg viewBox="0 0 12 14" aria-hidden="true"><path d="M0 0h12v14L6 10 0 14z" fill="#0F766E"/></svg>ReadWatch</div>
            <h2></h2><p class="body"></p><p class="meta"></p><div class="row"></div>
          </div>`;
        const $ = sel => root.querySelector(sel);
        let settle;
        const done = new Promise(resolve => { settle = resolve; });
        const render = (h, b, m, btns, lnk) => {
            $('h2').textContent = h || '';
            $('.body').textContent = b || '';
            $('.body').hidden = !b;
            $('.meta').textContent = m || '';
            $('.meta').hidden = !m;
            const row = $('.row');
            row.innerHTML = '';
            (btns || []).forEach(btn => {
                const el = document.createElement('button');
                el.textContent = btn.label;
                if (btn.primary) el.className = 'primary';
                el.addEventListener('click', () => settle(btn.id));
                row.appendChild(el);
            });
            if (lnk) {
                const el = document.createElement('button');
                el.className = 'link';
                el.textContent = lnk.label;
                el.addEventListener('click', () => settle(lnk.id));
                row.appendChild(el);
            }
            row.hidden = !(btns || []).length && !lnk;
        };
        render(heading, body, meta, buttons, link);
        const onKey = e => { if (e.key === 'Escape') settle('dismiss'); };
        document.addEventListener('keydown', onKey);
        const timer = setTimeout(() => settle('timeout'), PROMPT_TIMEOUT_MS);
        document.documentElement.appendChild(host);
        const close = () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); host.remove(); };
        return {
            choice: done.then(c => { clearTimeout(timer); return c; }),
            // show a short message in the same card, then close it
            say(h, b, ms = 3500) { render(h, b, '', [], null); setTimeout(close, ms); },
            close,
        };
    }

    async function remember(key, value, cap = 300) {
        const { [key]: list = [] } = await chrome.storage.local.get([key]);
        if (!list.includes(value)) await chrome.storage.local.set({ [key]: [value, ...list].slice(0, cap) });
    }

    async function askToTurnOn() {
        const card = showCard({
            heading: 'Turn on ReadWatch?',
            body: 'It can offer to save the articles and videos you read to your library. It always asks before saving anything.',
            buttons: [{ id: 'on', label: 'Turn on', primary: true }, { id: 'off', label: 'No thanks' }],
        });
        const choice = await card.choice;
        if (choice === 'on') {
            await chrome.storage.local.set({ trackingEnabled: true });
            card.close();
            return true;
        }
        if (choice === 'off') {
            await chrome.storage.local.set({ trackingEnabled: false });
            card.say('ReadWatch is off', 'You can turn it on any time from the ReadWatch button in your toolbar.', 4500);
        } else {
            card.close();
        }
        return false;
    }

    async function analyzeCurrentPage() {
        if (hasAnalyzed) return;
        hasAnalyzed = true;
        try {
            const pageData = extractPageContent();
            if (!pageData.title || pageData.title.length < MIN_TITLE_LENGTH) return;
            if (!pageData.content || pageData.content.length < MIN_WORD_COUNT) return;
            if (!isQualityContent(pageData)) return;

            const settings = await getSettings();
            if (settings.trackingEnabled === false || settings.blockedSites.includes(siteKey())) return;
            if (settings.skippedUrls.includes(pageKey())) return;              // "Not now" on this page before
            if (await checkForDuplicates(pageData.url)) return;               // already in the library

            if (settings.trackingEnabled === undefined && !(await askToTurnOn())) return;

            const analysis = await analyzeContent(pageData);
            if (!analysis.success) return;
            const data = analysis.data;
            const rt = data.readingTime || data.duration;
            const bits = [siteKey(), /^\d+$/.test(String(rt || '')) ? `${rt} min read` : rt].filter(Boolean);
            const card = showCard({
                heading: 'Save to ReadWatch?',
                body: data.title,
                meta: bits.join(' · '),
                buttons: [{ id: 'save', label: 'Save', primary: true }, { id: 'skip', label: 'Not now' }],
                link: { id: 'never', label: 'Never on this site' },
            });
            const choice = await card.choice;
            if (choice === 'save') {
                const result = await saveContent(data);
                if (result.success) card.say('Saved to your library', data.title);
                else card.say('Could not save this page', 'Try again from the ReadWatch button in your toolbar.', 5000);
            } else if (choice === 'skip') {
                await remember('skippedUrls', pageKey());
                card.close();
            } else if (choice === 'never') {
                await remember('blockedSites', siteKey());
                card.say('Got it', `ReadWatch won't ask on ${siteKey()} again.`);
            } else {
                card.close();                                                   // Esc or no answer: ask again next visit
            }
        } catch (error) {
            console.error('📚 ReadWatch:', error);
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
        
        // Extract text content from a copy, so the page itself is never changed. The copy is laid out
        // off screen because innerText needs layout to keep paragraph breaks (and skips visibility:hidden, hence opacity).
        if (contentElement) {
            const copy = contentElement.cloneNode(true);
            copy.querySelectorAll('script, style, noscript, nav, header, footer, aside, button, svg, figcaption, [aria-hidden="true"]')
                .forEach(el => el.remove());
            const holder = document.createElement('div');
            holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:900px;opacity:0;pointer-events:none;';
            holder.appendChild(copy);
            document.documentElement.appendChild(holder);
            content = copy.innerText || copy.textContent || '';
            holder.remove();
        }
        
        // Clean up content, keeping one line per paragraph (headings and captions stay on lines of their own)
        content = content
            .replace(/[ \t\u00a0]+/g, ' ')
            .replace(/ *\n[\s]*/g, '\n')
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
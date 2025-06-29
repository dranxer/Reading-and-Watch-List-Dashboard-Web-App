// YouTube Debug Script for ReadWatch Tracker
console.log('🔍 YouTube Debug Script Starting...');

// Basic page info
console.log('📍 Current URL:', window.location.href);
console.log('📍 Hostname:', window.location.hostname);
console.log('📍 Pathname:', window.location.pathname);
console.log('📍 Title:', document.title);

// Check if this is actually a YouTube video page
const isYouTube = window.location.hostname.includes('youtube.com');
const isVideoPage = window.location.pathname === '/watch';
const hasVideoId = window.location.search.includes('v=');

console.log('🎬 YouTube Detection:');
console.log('  - Is YouTube domain:', isYouTube);
console.log('  - Is video page:', isVideoPage);
console.log('  - Has video ID:', hasVideoId);

// Test all possible selectors for YouTube content
function testYouTubeSelectors() {
    console.log('🔍 Testing YouTube Content Selectors...');
    
    // Title selectors
    const titleSelectors = [
        'h1.title',
        'h1.style-scope.ytd-video-primary-info-renderer',
        'h1.ytd-video-primary-info-renderer',
        '#title h1',
        '.title',
        'h1[class*="title"]',
        '.ytd-video-primary-info-renderer h1'
    ];
    
    console.log('📝 Title Testing:');
    titleSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`  ✅ ${selector}: "${element.innerText}"`);
        } else {
            console.log(`  ❌ ${selector}: Not found`);
        }
    });
    
    // Description selectors
    const descriptionSelectors = [
        '#description-text',
        '#description .content',
        '#meta-contents #description',
        'ytd-video-secondary-info-renderer #description',
        'ytd-expandable-video-description-body-renderer',
        '[id="description"]',
        '#watch-description-text',
        '#eow-description',
        '.description',
        '#description'
    ];
    
    console.log('📄 Description Testing:');
    descriptionSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.innerText || element.textContent || '';
            console.log(`  ✅ ${selector}: ${text.substring(0, 50)}...`);
        } else {
            console.log(`  ❌ ${selector}: Not found`);
        }
    });
    
    // Channel selectors
    const channelSelectors = [
        '#channel-name a',
        '#owner-name a',
        'ytd-video-owner-renderer a',
        '.ytd-channel-name a',
        '#upload-info .yt-user-info a',
        '.owner-name a',
        '#channel-name'
    ];
    
    console.log('👤 Channel Testing:');
    channelSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`  ✅ ${selector}: "${element.innerText}"`);
        } else {
            console.log(`  ❌ ${selector}: Not found`);
        }
    });
    
    // Duration selectors
    const durationSelectors = [
        '.ytp-time-duration',
        '#movie_player .ytp-time-duration',
        '.html5-main-video',
        '.ytp-time-display .ytp-time-duration'
    ];
    
    console.log('⏱️ Duration Testing:');
    durationSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`  ✅ ${selector}: "${element.innerText}"`);
        } else {
            console.log(`  ❌ ${selector}: Not found`);
        }
    });
    
    // Check for video element
    const videoElement = document.querySelector('video');
    if (videoElement) {
        console.log('🎥 Video Element Found:');
        console.log(`  - Duration: ${videoElement.duration}`);
        console.log(`  - Current time: ${videoElement.currentTime}`);
        console.log(`  - Paused: ${videoElement.paused}`);
    } else {
        console.log('❌ No video element found');
    }
}

// Run initial test
testYouTubeSelectors();

// Wait for content to load and test again
setTimeout(() => {
    console.log('🔄 Re-testing after 3 seconds...');
    testYouTubeSelectors();
}, 3000);

// Wait longer for YouTube's dynamic content
setTimeout(() => {
    console.log('🔄 Re-testing after 10 seconds...');
    testYouTubeSelectors();
}, 10000);

// Check if ReadWatch extension is loaded
setTimeout(() => {
    console.log('🔍 Checking ReadWatch Extension Status:');
    console.log('  - window.readWatchTrackerLoaded:', window.readWatchTrackerLoaded);
    
    if (window.readWatchTrackerLoaded) {
        console.log('✅ ReadWatch extension is loaded on this page');
    } else {
        console.log('❌ ReadWatch extension is NOT loaded on this page');
        console.log('   This could be why YouTube detection is not working');
    }
}, 5000);

// Monitor for DOM changes (YouTube is SPA)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if video title or description was added
            const hasTitle = document.querySelector('h1.title, h1.ytd-video-primary-info-renderer');
            const hasDescription = document.querySelector('#description, #description-text');
            
            if (hasTitle || hasDescription) {
                console.log('🔄 YouTube content detected via DOM mutation');
                setTimeout(testYouTubeSelectors, 1000);
            }
        }
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Stop observing after 30 seconds
setTimeout(() => {
    observer.disconnect();
    console.log('🔍 YouTube debug monitoring stopped');
}, 30000); 
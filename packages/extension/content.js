// Content script for ReadWatch Tracker Extension
(function() {
  'use strict';

  console.log('📚 ReadWatch Tracker content script starting...');
  console.log('📚 Current URL:', window.location.href);
  console.log('📚 Document ready state:', document.readyState);

  // Show initial loading message
  showTrackingStatus('🔄 ReadWatch Tracker loaded and checking page...', 'info');

  // Whitelist of reputable domains for different content types
  const REPUTABLE_DOMAINS = {
    news: [
      'bbc.com', 'bbc.co.uk', 'cnn.com', 'reuters.com', 'ap.org', 'npr.org',
      'theguardian.com', 'nytimes.com', 'washingtonpost.com', 'wsj.com',
      'bloomberg.com', 'economist.com', 'politico.com', 'axios.com',
      'abcnews.go.com', 'cbsnews.com', 'nbcnews.com', 'foxnews.com'
    ],
    tech: [
      'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com',
      'engadget.com', 'gizmodo.com', 'mashable.com', 'recode.net',
      'venturebeat.com', 'zdnet.com', 'cnet.com', 'pcmag.com',
      'tomshardware.com', 'anandtech.com', 'ieee.org'
    ],
    programming: [
      'stackoverflow.com', 'github.com', 'dev.to', 'hackernews.ycombinator.com',
      'medium.com', 'freecodecamp.org', 'codepen.io', 'css-tricks.com',
      'smashingmagazine.com', 'alistapart.com', 'mozilla.org',
      'developer.mozilla.org', 'web.dev', 'google.developers'
    ],
    science: [
      'nature.com', 'science.org', 'cell.com', 'pnas.org', 'nih.gov',
      'scientificamerican.com', 'newscientist.com', 'nationalgeographic.com',
      'smithsonianmag.com', 'popularmechanics.com', 'popsci.com'
    ],
    education: [
      'wikipedia.org', 'britannica.com', 'khanacademy.org', 'coursera.org',
      'edx.org', 'mit.edu', 'harvard.edu', 'stanford.edu', 'berkeley.edu',
      'ox.ac.uk', 'cambridge.org', 'scholar.google.com', 'jstor.org',
      'archive.org', 'gutenberg.org'
    ],
    business: [
      'mckinsey.com', 'bcg.com', 'bain.com', 'forbes.com', 'fortune.com',
      'businessinsider.com', 'fastcompany.com', 'inc.com', 'hbr.org'
    ],
    video: [
      'youtube.com', 'vimeo.com', 'ted.com', 'coursera.org',
      'udemy.com', 'edx.org', 'khanacademy.org', 'pluralsight.com',
      'linkedin.com/learning', 'skillshare.com', 'masterclass.com'
    ],
    podcast: [
      'spotify.com', 'podcasts.apple.com', 'soundcloud.com',
      'anchor.fm', 'buzzsprout.com', 'libsyn.com', 'simplecast.com'
    ]
  };

  let currentUrl = window.location.href;
  let analysisTimeout = null;
  let hasAnalyzed = false;

  // Enhanced exclusion list
  const EXCLUDED_DOMAINS = [
    'localhost:3000', // Don't track the app itself
    'chrome://', 'chrome-extension://', 'edge://', 'about:', 'moz-extension://'
    // Removed social media and other restrictions to be less restrictive
  ];

  // Skip analysis on excluded domains
  if (EXCLUDED_DOMAINS.some(domain => currentUrl.includes(domain))) {
    console.log('📚 ReadWatch: Skipping excluded domain:', window.location.hostname);
    showTrackingStatus('🚫 Skipping excluded domain', 'info');
    return;
  }

  // Check if domain is reputable
  function isDomainReputable(url) {
    try {
      // Allow local files for testing
      if (url.startsWith('file://')) {
        console.log('📚 ✅ Local file URL - treating as reputable for testing');
        showTrackingStatus('📁 Local file detected - treating as reputable', 'info');
        return true;
      }
      
      const hostname = new URL(url).hostname.replace('www.', '');
      console.log('📚 Checking domain reputation for:', hostname);
      
      // Check against all reputable domain lists
      for (const [category, domains] of Object.entries(REPUTABLE_DOMAINS)) {
        for (const domain of domains) {
          if (hostname.includes(domain) || domain.includes(hostname)) {
            console.log('📚 ✅ Domain is reputable:', hostname, 'in category:', category);
            showTrackingStatus(`✅ Reputable ${category} site detected: ${hostname}`, 'success');
            return true;
          }
        }
      }
      
      // Additional checks for educational and government sites
      if (hostname.endsWith('.edu') || hostname.endsWith('.gov') || 
          (hostname.endsWith('.org') && !hostname.includes('wordpress'))) {
        console.log('📚 ✅ Domain is reputable (edu/gov/org):', hostname);
        showTrackingStatus(`✅ Educational/Government site detected: ${hostname}`, 'success');
        return true;
      }
      
      console.log('📚 ❌ Domain not in reputable list:', hostname);
      showTrackingStatus(`❌ Not a reputable domain: ${hostname}`, 'warning');
      return false;
    } catch (error) {
      console.error('📚 Error checking domain:', error);
      return false;
    }
  }

  // Show tracking status with prominent notifications
  function showTrackingStatus(message, type = 'info') {
    console.log('📚 TRACKING STATUS:', message);
    
    // Create a more prominent notification for tracking status
    const notification = document.createElement('div');
    
    const colors = {
      success: { bg: '#059669', border: '#10b981' },
      warning: { bg: '#d97706', border: '#f59e0b' },
      info: { bg: '#0284c7', border: '#0ea5e9' },
      error: { bg: '#dc2626', border: '#ef4444' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 3px solid ${color.border};
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#trackingAnimation')) {
      const style = document.createElement('style');
      style.id = 'trackingAnimation';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    const delay = type === 'success' ? 5000 : 4000;
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, delay);
  }

  // Immediate check for reputable domain
  if (!isDomainReputable(window.location.href)) {
    console.log('📚 ReadWatch: Not a reputable domain, skipping analysis');
    return;
  }

  console.log('📚 ReadWatch: Reputable domain detected, scheduling analysis...');
  showTrackingStatus('🎯 Reputable domain detected! Preparing to analyze content...', 'info');

  // Monitor URL changes for SPA navigation
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      console.log('📚 URL changed from', currentUrl, 'to', window.location.href);
      currentUrl = window.location.href;
      hasAnalyzed = false;
      showTrackingStatus('🔄 Page changed - re-analyzing content...', 'info');
      scheduleAnalysis();
    }
  });

  // Start observing after DOM is ready
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initial analysis scheduling
  function scheduleAnalysis() {
    if (hasAnalyzed) {
      console.log('📚 Already analyzed this page');
      return;
    }
    
    console.log('📚 Scheduling content analysis...');
    
    // Longer delay for video platforms to let content load
    const isVideoSite = window.location.hostname.includes('youtube.com') || 
                       window.location.hostname.includes('vimeo.com');
    const delay = isVideoSite ? 4000 : 2000;
    
    console.log(`📚 Using ${delay}ms delay for ${isVideoSite ? 'video' : 'regular'} site`);
    showTrackingStatus(`⏱️ Waiting ${delay/1000}s for content to load...`, 'info');
    
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(() => {
      analyzeCurrentPage();
    }, delay);
  }

  // Start analysis based on document state
  if (document.readyState === 'loading') {
    console.log('📚 Document still loading, waiting for DOMContentLoaded...');
    showTrackingStatus('⏳ Waiting for page to finish loading...', 'info');
    document.addEventListener('DOMContentLoaded', scheduleAnalysis);
  } else {
    console.log('📚 Document ready, starting analysis...');
    scheduleAnalysis();
  }

  async function analyzeCurrentPage() {
    if (hasAnalyzed) return;
    
    console.log('📚 Starting page analysis...');
    showTrackingStatus('🔍 Starting content analysis...', 'info');
    
    try {
      // Check if this URL has already been tracked
      const currentUrl = window.location.href;
      const isDuplicate = await checkForDuplicateUrl(currentUrl);
      
      if (isDuplicate) {
        console.log('📚 ⚠️ URL already tracked, skipping:', currentUrl);
        showTrackingStatus('📚 Already tracked this content', 'warning');
        hasAnalyzed = true; // Mark as analyzed to prevent re-checking
        return;
      }
      
      const contentData = extractContentData();
      console.log('📚 Extracted content data:', {
        title: contentData.title,
        wordCount: contentData.wordCount,
        contentType: contentData.contentType,
        url: contentData.url
      });
      
      showTrackingStatus(`📝 Extracted ${contentData.contentType}: "${contentData.title.substring(0, 40)}..."`, 'info');
      
      if (!contentData || !isValidContent(contentData)) {
        console.log('📚 Content not valid for tracking');
        showTrackingStatus('❌ Content not suitable for tracking', 'warning');
        return;
      }

      // Simplified quality assessment
      const qualityAssessment = assessContentQuality(contentData);
      console.log('📚 Quality assessment:', qualityAssessment);
      
      showTrackingStatus(`📊 Quality score: ${qualityAssessment.score}% - ${qualityAssessment.score >= 40 ? 'PASSED' : 'FAILED'}`, 
                        qualityAssessment.score >= 40 ? 'success' : 'warning');

      // Lowered quality threshold for testing
      if (qualityAssessment.score < 40) {
        console.log('📚 Content quality too low:', qualityAssessment.score);
        showTrackingStatus(`📊 Quality too low: ${qualityAssessment.score}% - Need 40%+`, 'warning');
        return;
      }

      // Check extension settings
      const settings = await getExtensionSettings();
      if (!shouldTrackContent(contentData, settings)) {
        console.log('📚 Content tracking disabled in settings');
        showTrackingStatus('⚙️ Content tracking disabled in settings', 'warning');
        return;
      }

      hasAnalyzed = true;

      console.log('📚 ✅ Content approved for tracking:', contentData.title);
      showTrackingStatus('✅ Content approved! Sending for analysis...', 'success');

      // Send to background script for analysis
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        data: {
          ...contentData,
          qualityAssessment: qualityAssessment
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('📚 Extension communication error:', chrome.runtime.lastError);
          showTrackingStatus('❌ Extension communication failed', 'error');
          return;
        }

        if (response && response.success) {
          console.log('📚 ✅ Analysis successful:', response.data);
          const analysisResult = response.data;
          
          showTrackingStatus('🤖 AI analysis completed! Saving content...', 'info');
          
          // Save content with lower threshold
          if (analysisResult.qualityScore >= 30) { // Lowered from 50
            chrome.runtime.sendMessage({
              action: 'saveContent',
              data: analysisResult
            }, (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                console.log('📚 ✅ Content saved successfully');
                showTrackingStatus(`🎉 SAVED: "${analysisResult.title.substring(0, 30)}..." (${analysisResult.qualityScore}%)`, 'success');
              } else {
                console.log('📚 ⚠️ Failed to save to backend, saved locally');
                showTrackingStatus('💾 Saved locally (sign in to sync)', 'warning');
              }
            });
          } else {
            console.log('📚 Content quality below save threshold:', analysisResult.qualityScore);
            showTrackingStatus(`📊 Analyzed but not saved (${analysisResult.qualityScore}% quality)`, 'warning');
          }
        } else {
          console.error('📚 Analysis failed:', response?.error);
          showTrackingStatus('❌ Content analysis failed', 'error');
        }
      });
    } catch (error) {
      console.error('📚 Page analysis error:', error);
      showTrackingStatus('❌ Analysis error occurred', 'error');
    }
  }

  // Simplified content quality assessment
  function assessContentQuality(contentData) {
    let score = 40; // Start with base score
    const factors = [];

    console.log('📚 Assessing content quality for:', contentData.title);

    // Domain reputation (40% weight)
    if (isDomainReputable(contentData.url)) {
      score += 40;
      factors.push('Reputable domain (+40)');
    } else {
      factors.push('Unknown domain (0)');
      console.log('📚 ❌ Content rejected - not from reputable domain');
      return { score: 0, factors };
    }

    // Content length (simplified - 20% weight)
    if (contentData.wordCount >= 100) { // Lowered threshold
      score += 20;
      factors.push(`Good length: ${contentData.wordCount} words (+20)`);
    } else if (contentData.wordCount >= 50) {
      score += 10;
      factors.push(`Short content: ${contentData.wordCount} words (+10)`);
    } else {
      factors.push(`Too short: ${contentData.wordCount} words (+0)`);
    }

    console.log('📚 Quality assessment result:', { score, factors });
    return { score: Math.max(0, Math.min(100, score)), factors };
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
      console.error('Error normalizing URL:', error);
      return url;
    }
  }

  // Check for duplicate URL
  async function checkForDuplicateUrl(url) {
    try {
      const normalizedUrl = normalizeUrl(url);
      console.log('📚 Checking for duplicate URL:', normalizedUrl);
      
      // Check local storage first
      const result = await chrome.storage.local.get(['contentHistory']);
      if (result.contentHistory) {
        const localDuplicate = result.contentHistory.some(item => 
          normalizeUrl(item.url) === normalizedUrl
        );
        if (localDuplicate) {
          console.log('📚 Found duplicate in local storage');
          return true;
        }
      }

      return false; // Simplified - will check with backend later
    } catch (error) {
      console.error('📚 Error checking duplicates:', error);
      return false;
    }
  }

  // Extract content data from the page
  function extractContentData() {
    console.log('📚 Extracting content data...');
    
    const url = window.location.href;
    let title = '';
    let content = '';
    let excerpt = '';
    let contentType = 'article';
    let duration = null;
    let author = '';
    let publishDate = '';

    // Get title from multiple sources
    title = document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('title')?.textContent?.trim() ||
            document.querySelector('meta[property="og:title"]')?.content ||
            document.querySelector('meta[name="twitter:title"]')?.content ||
            'Untitled Content';

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();
    console.log('📚 Extracted title:', title);

    // Determine content type based on URL and page structure
    if (url.includes('youtube.com/watch') || url.includes('vimeo.com') || 
        document.querySelector('video')) {
      contentType = 'video';
      
      // YouTube-specific extraction
      if (url.includes('youtube.com')) {
        console.log('📚 Extracting YouTube content...');
        
        // Multiple selectors for robustness
        const titleSelectors = [
          'h1.ytd-watch-metadata yt-formatted-string',
          'h1.title yt-formatted-string',
          'h1 yt-formatted-string',
          '.ytd-video-primary-info-renderer h1',
          'meta[property="og:title"]'
        ];
        
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === 'META') {
              title = element.content;
            } else {
              title = element.textContent?.trim();
            }
            if (title) break;
          }
        }
        
        // Get description
        const descriptionSelectors = [
          '#description yt-formatted-string',
          '.ytd-video-secondary-info-renderer #description',
          '#meta-contents #description',
          'meta[property="og:description"]'
        ];
        
        for (const selector of descriptionSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === 'META') {
              content = element.content;
            } else {
              content = element.textContent?.trim();
            }
            if (content) break;
          }
        }
        
        // Get channel name
        const channelSelectors = [
          '.ytd-channel-name a',
          '#channel-name a',
          '.ytd-video-owner-renderer a',
          'meta[name="author"]'
        ];
        
        for (const selector of channelSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === 'META') {
              author = element.content;
            } else {
              author = element.textContent?.trim();
            }
            if (author) break;
          }
        }
      }
      
      // Get video duration if available
      const durationElement = document.querySelector('.ytp-time-duration, [aria-label*="duration"]');
      if (durationElement) {
        duration = durationElement.textContent?.trim();
      }
      
    } else if (url.includes('spotify.com') || url.includes('podcasts.apple.com') ||
               url.includes('soundcloud.com') || document.querySelector('audio')) {
      contentType = 'podcast';
    } else {
      contentType = 'article';
    }

    // Get main content for articles
    if (contentType === 'article') {
      // Try multiple content extraction methods
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.content',
        'main',
        '#content'
      ];

      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = element.textContent?.trim();
          if (content && content.length > 100) break;
        }
      }

      // Fallback to body if no content found
      if (!content || content.length < 50) {
        content = document.body.textContent?.trim() || '';
      }
    }

    // Get author and date
    if (!author) {
      const authorSelectors = [
        '[rel="author"]',
        '.author',
        '.byline',
        'meta[name="author"]'
      ];
      
      for (const selector of authorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          author = element.tagName === 'META' ? element.content : element.textContent?.trim();
          if (author) break;
        }
      }
    }

    // Get publication date
    const dateSelectors = [
      'time[datetime]',
      '[property="article:published_time"]',
      '.published',
      '.date'
    ];
    
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        publishDate = element.getAttribute('datetime') || 
                     element.getAttribute('content') || 
                     element.textContent?.trim();
        if (publishDate) break;
      }
    }

    // Calculate word count
    const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
    
    // Create excerpt
    excerpt = content ? content.substring(0, 300) + (content.length > 300 ? '...' : '') : '';

    const result = {
      title: title || 'Untitled',
      content: content || '',
      excerpt: excerpt,
      url: url,
      contentType: contentType,
      wordCount: wordCount,
      duration: duration,
      author: author,
      publishDate: publishDate,
      domain: window.location.hostname,
      timestamp: Date.now()
    };

    console.log('📚 Content extraction result:', {
      title: result.title,
      contentType: result.contentType,
      wordCount: result.wordCount,
      author: result.author,
      domain: result.domain
    });

    return result;
  }

  // Validate content before processing
  function isValidContent(contentData) {
    console.log('📚 Validating content:', contentData.title);
    
    // Basic validation
    if (!contentData || !contentData.title || !contentData.url) {
      console.log('📚 ❌ Missing basic content data');
      return false;
    }

    // Different minimum requirements for different content types
    const minimumWords = {
      video: 3,      // Very low for videos - they might have short titles
      podcast: 3,    // Very low for podcasts
      article: 10    // Still very low for articles
    };

    const required = minimumWords[contentData.contentType] || 10;
    
    if (contentData.wordCount < required) {
      console.log(`📚 ❌ Content too short: ${contentData.wordCount} words (need ${required})`);
      return false;
    }

    // Skip very short titles
    if (contentData.title.length < 5) {
      console.log('📚 ❌ Title too short');
      return false;
    }

    console.log('📚 ✅ Content validation passed');
    return true;
  }

  // Get extension settings
  async function getExtensionSettings() {
    try {
      const result = await chrome.storage.sync.get({
        autoTrack: true,
        trackArticles: true,
        trackVideos: true,
        trackPodcasts: true,
        notificationsEnabled: true
      });
      return result;
    } catch (error) {
      console.error('📚 Error getting settings:', error);
      return {
        autoTrack: true,
        trackArticles: true,
        trackVideos: true,
        trackPodcasts: true,
        notificationsEnabled: true
      };
    }
  }

  // Check if content should be tracked based on settings
  function shouldTrackContent(contentData, settings) {
    if (!settings.autoTrack) return false;
    
    switch (contentData.contentType) {
      case 'article':
        return settings.trackArticles;
      case 'video':
        return settings.trackVideos;
      case 'podcast':
        return settings.trackPodcasts;
      default:
        return settings.trackArticles; // Default to article setting
    }
  }

  console.log('📚 ReadWatch Tracker content script loaded - Ready for automatic tracking!');
})(); 
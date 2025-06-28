// Content script for ReadWatch Tracker Extension
(function() {
  'use strict';

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
    business: [
      'harvard.edu', 'mit.edu', 'stanford.edu', 'mckinsey.com',
      'bcg.com', 'bain.com', 'forbes.com', 'fortune.com',
      'businessinsider.com', 'fastcompany.com', 'inc.com'
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

  // Quality indicators for genuine content
  const QUALITY_INDICATORS = {
    positive: [
      'article', 'main', 'content', 'post', 'story', 'entry',
      'byline', 'author', 'published', 'updated', 'timestamp',
      'share', 'comment', 'read-more', 'continue-reading'
    ],
    negative: [
      'advertisement', 'ad-', 'sponsored', 'promo', 'popup',
      'sidebar', 'footer', 'header', 'navigation', 'menu',
      'cookie', 'gdpr', 'newsletter', 'subscribe'
    ]
  };

  const CONTENT_PATTERNS = {
    article: {
      selectors: [
        'article',
        '[role="main"]',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.story-body',
        '.post-body',
        '.content',
        'main',
        '.post',
        '.blog-post',
        '.story'
      ],
      minWordCount: 500, // Increased for genuine articles
      requiredElements: ['title', 'content'],
      qualityIndicators: ['byline', 'date', 'author']
    },
    video: {
      platforms: ['youtube.com', 'vimeo.com', 'ted.com'],
      selectors: ['video', '.video-player', '#player'],
      minDuration: 60, // At least 1 minute
      qualityIndicators: ['description', 'channel', 'views']
    },
    podcast: {
      platforms: ['spotify.com', 'podcasts.apple.com', 'soundcloud.com'],
      indicators: ['episode', 'podcast', 'audio'],
      minDuration: 300, // At least 5 minutes
      qualityIndicators: ['show', 'episode', 'description']
    }
  };

  let currentUrl = window.location.href;
  let analysisTimeout = null;
  let hasAnalyzed = false;

  // Enhanced exclusion list
  const EXCLUDED_DOMAINS = [
    'localhost:3000', // Don't track the app itself
    'chrome://', 'chrome-extension://', 'edge://', 'about:', 'moz-extension://',
    // Social media (too noisy)
    'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'snapchat.com',
    // Search engines
    'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
    // E-commerce
    'amazon.com', 'ebay.com', 'etsy.com', 'shopify.com',
    // Entertainment/Gaming (too casual)
    'netflix.com', 'hulu.com', 'twitch.tv', 'steam.com',
    // Forums (too conversational)
    'reddit.com', 'quora.com', 'discord.com'
  ];

  // Skip analysis on excluded domains
  if (EXCLUDED_DOMAINS.some(domain => currentUrl.includes(domain))) {
    console.log('📚 ReadWatch: Skipping excluded domain');
    return;
  }

  // Check if domain is reputable
  function isDomainReputable(url) {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    // Check against all reputable domain lists
    for (const category of Object.values(REPUTABLE_DOMAINS)) {
      if (category.some(domain => hostname.includes(domain) || domain.includes(hostname))) {
        return true;
      }
    }
    
    // Additional checks for educational and government sites
    if (hostname.endsWith('.edu') || hostname.endsWith('.gov') || 
        hostname.endsWith('.org') && !hostname.includes('wordpress')) {
      return true;
    }
    
    return false;
  }

  // Enhanced content quality assessment
  function assessContentQuality(contentData) {
    let score = 0;
    const factors = [];

    // Domain reputation (40% weight)
    if (isDomainReputable(contentData.url)) {
      score += 40;
      factors.push('Reputable domain');
    } else {
      factors.push('Unknown domain (-40)');
      return { score: 0, factors }; // Immediate rejection for non-reputable domains
    }

    // Content length (20% weight)
    if (contentData.wordCount >= 1000) {
      score += 20;
      factors.push('Substantial content');
    } else if (contentData.wordCount >= 500) {
      score += 15;
      factors.push('Adequate content');
    } else if (contentData.wordCount >= 200) {
      score += 10;
      factors.push('Short content');
    } else {
      factors.push('Too short (-20)');
      score -= 20;
    }

    // Content structure (15% weight)
    const hasProperStructure = checkContentStructure();
    if (hasProperStructure.score > 0.7) {
      score += 15;
      factors.push('Well-structured');
    } else if (hasProperStructure.score > 0.4) {
      score += 10;
      factors.push('Basic structure');
    }

    // Metadata quality (15% weight)
    const metaQuality = assessMetadataQuality();
    score += Math.floor(metaQuality * 15);
    if (metaQuality > 0.7) factors.push('Rich metadata');

    // Content type appropriateness (10% weight)
    if (isAppropriateContentType(contentData)) {
      score += 10;
      factors.push('Appropriate content type');
    }

    return { score: Math.max(0, Math.min(100, score)), factors };
  }

  function checkContentStructure() {
    const positiveElements = QUALITY_INDICATORS.positive.reduce((count, indicator) => {
      return count + document.querySelectorAll(`[class*="${indicator}"], [id*="${indicator}"]`).length;
    }, 0);

    const negativeElements = QUALITY_INDICATORS.negative.reduce((count, indicator) => {
      return count + document.querySelectorAll(`[class*="${indicator}"], [id*="${indicator}"]`).length;
    }, 0);

    const totalElements = document.querySelectorAll('*').length;
    const structureScore = Math.max(0, (positiveElements - negativeElements) / Math.max(totalElements * 0.1, 1));

    return { score: Math.min(1, structureScore), positive: positiveElements, negative: negativeElements };
  }

  function assessMetadataQuality() {
    let metaScore = 0;
    const checks = [
      () => document.querySelector('meta[name="description"]')?.content?.length > 50,
      () => document.querySelector('meta[property="og:title"]')?.content?.length > 0,
      () => document.querySelector('meta[property="og:description"]')?.content?.length > 0,
      () => document.querySelector('meta[name="author"]')?.content?.length > 0,
      () => document.querySelector('meta[property="article:published_time"]')?.content?.length > 0,
      () => document.querySelector('link[rel="canonical"]')?.href?.length > 0,
      () => document.title?.length > 10 && document.title?.length < 100
    ];

    checks.forEach(check => {
      if (check()) metaScore += 1/checks.length;
    });

    return metaScore;
  }

  function isAppropriateContentType(contentData) {
    const url = contentData.url.toLowerCase();
    const title = contentData.title.toLowerCase();
    
    // Check for inappropriate content types
    const inappropriatePatterns = [
      'login', 'register', 'signup', 'checkout', 'cart', 'payment',
      'privacy', 'terms', 'cookie', 'gdpr', 'unsubscribe',
      'error', '404', '500', 'maintenance', 'coming-soon',
      'contact', 'about-us', 'careers', 'jobs'
    ];

    return !inappropriatePatterns.some(pattern => 
      url.includes(pattern) || title.includes(pattern)
    );
  }

  // Monitor URL changes for SPA navigation
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      hasAnalyzed = false;
      scheduleAnalysis();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial analysis after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleAnalysis);
  } else {
    scheduleAnalysis();
  }

  function scheduleAnalysis() {
    if (hasAnalyzed) return;
    
    // Quick domain check before scheduling
    if (!isDomainReputable(window.location.href)) {
      console.log('📚 ReadWatch: Skipping non-reputable domain:', window.location.hostname);
      return;
    }
    
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(() => {
      analyzeCurrentPage();
    }, 4000); // Longer wait for quality content to load
  }

  async function analyzeCurrentPage() {
    if (hasAnalyzed) return;
    
    try {
      const contentData = extractContentData();
      
      if (!contentData || !isValidContent(contentData)) {
        console.log('📚 ReadWatch: Content not valid for tracking');
        return;
      }

      // Enhanced quality assessment
      const qualityAssessment = assessContentQuality(contentData);
      console.log('📚 ReadWatch: Quality assessment:', qualityAssessment);

      if (qualityAssessment.score < 60) {
        console.log('📚 ReadWatch: Content quality too low:', qualityAssessment.score, qualityAssessment.factors);
        showNotification(`📊 Content quality: ${qualityAssessment.score}% - Not tracking low-quality content`, 'info');
        return;
      }

      // Check extension settings
      const settings = await getExtensionSettings();
      if (!shouldTrackContent(contentData, settings)) {
        console.log('📚 ReadWatch: Content tracking disabled in settings');
        return;
      }

      hasAnalyzed = true;

      console.log('📚 ReadWatch: Analyzing high-quality content:', contentData.title);
      console.log('📚 ReadWatch: Quality factors:', qualityAssessment.factors);

      // Send to background script for analysis
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        data: {
          ...contentData,
          qualityAssessment: qualityAssessment
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Extension error:', chrome.runtime.lastError);
          return;
        }

        if (response && response.success) {
          const analysisResult = response.data;
          
          // Save high-quality content (lower threshold since we pre-filtered)
          if (analysisResult.qualityScore >= 50) {
            chrome.runtime.sendMessage({
              action: 'saveContent',
              data: analysisResult
            }, (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                showNotification(`📚 Quality content saved! (${analysisResult.qualityScore}% score)`, 'success');
              } else {
                console.error('Failed to save content:', saveResponse?.error);
                showNotification('📚 Content tracked locally (sign in to sync)', 'warning');
              }
            });
          } else {
            console.log('Content quality below threshold:', analysisResult.qualityScore);
            showNotification(`📊 Content analyzed (${analysisResult.qualityScore}% quality) - threshold not met`, 'info');
          }
        } else {
          console.error('Analysis failed:', response?.error);
          showNotification('❌ Content analysis failed', 'error');
        }
      });
    } catch (error) {
      console.error('Page analysis failed:', error);
    }
  }

  function extractContentData() {
    const url = window.location.href;
    const title = document.title || 'Untitled';
    
    // Extract main content
    let content = '';
    let contentType = detectContentType(url);
    
    if (contentType === 'video') {
      content = extractVideoContent();
    } else if (contentType === 'podcast') {
      content = extractPodcastContent();
    } else {
      content = extractArticleContent();
    }

    // Clean up content
    content = content.replace(/\s+/g, ' ').trim();

    return {
      url,
      title: title.trim(),
      text: content.substring(0, 5000), // Limit text length
      contentType,
      wordCount: content.split(' ').filter(word => word.length > 0).length,
      timestamp: new Date().toISOString(),
      domain: new URL(url).hostname.replace('www.', '')
    };
  }

  function extractArticleContent() {
    let content = '';
    
    // Try to find article content using common selectors
    for (const selector of CONTENT_PATTERNS.article.selectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.innerText || element.textContent || '';
        if (content.length > 1000) { // Higher threshold for quality content
          break;
        }
      }
    }

    // Enhanced content extraction for reputable sites
    if (!content || content.length < 500) {
      // Try structured data
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd.textContent);
          if (data.articleBody) content = data.articleBody;
        } catch (e) {}
      }

      // Try Open Graph description
      if (!content) {
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent).join(' ');
        content = ogDescription + ' ' + metaDescription + ' ' + paragraphs;
      }
    }

    return content;
  }

  function extractVideoContent() {
    const url = window.location.href;
    let content = '';

    if (url.includes('youtube.com')) {
      // Enhanced YouTube extraction
      const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata, #title h1');
      const descEl = document.querySelector('#description, #watch-description-text, #meta-contents #description, ytd-expander #content');
      const channelEl = document.querySelector('#channel-name a, .ytd-channel-name a, #owner-text a');
      const viewsEl = document.querySelector('#count .view-count, .view-count');
      
      content = [
        titleEl?.textContent || '',
        channelEl?.textContent || '',
        viewsEl?.textContent || '',
        descEl?.textContent || ''
      ].filter(Boolean).join(' ');
    } else if (url.includes('vimeo.com')) {
      // Enhanced Vimeo extraction
      const titleEl = document.querySelector('[data-name="Header"] h1, .player_title, h1');
      const descEl = document.querySelector('[data-name="Description"], .description, .clip_details-description');
      const creatorEl = document.querySelector('[data-name="PortraitByline"] a, .byline a, .userlink');
      
      content = [
        titleEl?.textContent || '',
        creatorEl?.textContent || '',
        descEl?.textContent || ''
      ].filter(Boolean).join(' ');
    } else if (url.includes('ted.com')) {
      // TED talks extraction
      const titleEl = document.querySelector('h1, .talk-title');
      const speakerEl = document.querySelector('.speaker-name, .talk-speaker');
      const descEl = document.querySelector('.talk-description, .description');
      
      content = [
        titleEl?.textContent || '',
        speakerEl?.textContent || '',
        descEl?.textContent || ''
      ].filter(Boolean).join(' ');
    }

    return content || document.title;
  }

  function extractPodcastContent() {
    const url = window.location.href;
    let content = '';

    if (url.includes('spotify.com')) {
      // Enhanced Spotify extraction
      const titleEl = document.querySelector('[data-testid="entityTitle"], h1, .track-title');
      const descEl = document.querySelector('[data-testid="entityDescription"], .description, .episode-description');
      const showEl = document.querySelector('[data-testid="entitySubtitle"], .show-name, .podcast-title');
      const durationEl = document.querySelector('.duration, .episode-duration');
      
      content = [
        titleEl?.textContent || '',
        showEl?.textContent || '',
        durationEl?.textContent || '',
        descEl?.textContent || ''
      ].filter(Boolean).join(' ');
    } else if (url.includes('podcasts.apple.com')) {
      // Enhanced Apple Podcasts extraction
      const titleEl = document.querySelector('.product-header__title, h1, .episode-title');
      const descEl = document.querySelector('.product-header__description, .description, .episode-description');
      const showEl = document.querySelector('.podcast-header__title, .show-title');
      
      content = [
        titleEl?.textContent || '',
        showEl?.textContent || '',
        descEl?.textContent || ''
      ].filter(Boolean).join(' ');
    }

    return content || document.title;
  }

  function detectContentType(url) {
    // Enhanced content type detection
    const hostname = new URL(url).hostname.replace('www.', '');
    
    // Video platforms
    if (REPUTABLE_DOMAINS.video.some(domain => hostname.includes(domain))) {
      return 'video';
    }
    
    // Podcast platforms
    if (REPUTABLE_DOMAINS.podcast.some(domain => hostname.includes(domain))) {
      return 'podcast';
    }
    
    // Default to article for reputable domains
    return 'article';
  }

  function isValidContent(contentData) {
    // Enhanced validation for genuine content
    
    // Must be from reputable domain
    if (!isDomainReputable(contentData.url)) {
      return false;
    }

    // Minimum word count based on content type
    const minWords = {
      'article': 500,
      'video': 100,
      'podcast': 50
    };

    if (contentData.wordCount < minWords[contentData.contentType]) {
      return false;
    }

    // Skip common non-content pages
    const skipPatterns = [
      '/login', '/register', '/sign-in', '/sign-up', '/checkout', '/cart',
      '/admin', '/settings', '/profile', '/account', '/404', '/error',
      '/auth-token', '/privacy', '/terms', '/cookie-policy',
      '/subscribe', '/newsletter', '/contact', '/about',
      '/search', '/category', '/tag', '/archive'
    ];

    if (skipPatterns.some(pattern => contentData.url.includes(pattern))) {
      return false;
    }

    // Enhanced title validation
    const skipTitles = [
      'sign in', 'log in', 'register', 'checkout', 'error', '404',
      'not found', 'auth token', 'privacy policy', 'terms of service',
      'cookie policy', 'subscribe', 'newsletter', 'search results'
    ];

    if (skipTitles.some(pattern => contentData.title.toLowerCase().includes(pattern))) {
      return false;
    }

    // Check for proper article structure
    if (contentData.contentType === 'article') {
      const hasHeadings = document.querySelectorAll('h1, h2, h3').length > 0;
      const hasParagraphs = document.querySelectorAll('p').length >= 3;
      
      if (!hasHeadings || !hasParagraphs) {
        return false;
      }
    }

    return true;
  }

  async function getExtensionSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        qualityThreshold: 60, // Higher threshold for genuine content
        autoTrack: true,
        trackVideos: true,
        trackArticles: true,
        trackPodcasts: true,
        excludedDomains: [],
        onlyReputableSites: true // New setting
      }, resolve);
    });
  }

  function shouldTrackContent(contentData, settings) {
    if (!settings.autoTrack) return false;
    
    // Respect reputable sites setting
    if (settings.onlyReputableSites && !isDomainReputable(contentData.url)) {
      return false;
    }
    
    const domain = new URL(contentData.url).hostname;
    if (settings.excludedDomains.includes(domain)) return false;

    switch (contentData.contentType) {
      case 'video':
        return settings.trackVideos;
      case 'podcast':
        return settings.trackPodcasts;
      case 'article':
      default:
        return settings.trackArticles;
    }
  }

  function showNotification(message, type = 'success') {
    // Enhanced notification with quality indicators
    const notification = document.createElement('div');
    
    const colors = {
      success: { bg: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
      warning: { bg: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
      info: { bg: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
      error: { bg: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }
    };
    
    const color = colors[type] || colors.success;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px ${color.border};
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      word-wrap: break-word;
    `;
    notification.textContent = message;
    
    // Add quality badge for info notifications
    if (type === 'info' && message.includes('%')) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        display: inline-block;
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 8px;
      `;
      badge.textContent = 'Quality Check';
      notification.appendChild(badge);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 100);
    
    // Remove after delay
    const delay = type === 'info' ? 6000 : 4000; // Longer for info messages
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

  console.log('📚 ReadWatch Tracker content script loaded - Quality content detection enabled');
})(); 
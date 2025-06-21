/* eslint-disable no-undef */
// Content script for Reading Tracker Extension
// This script runs on every page and extracts article content when appropriate

let isProcessing = false;
let lastProcessedUrl = null;

// Check if this page is likely to contain an article
function isArticlePage() {
  // Skip if already processing or if URL hasn't changed
  if (isProcessing || lastProcessedUrl === window.location.href) {
    return false;
  }

  // Skip certain page types
  const skipPatterns = [
    /^https?:\/\/(www\.)?(google|youtube|facebook|twitter|instagram|linkedin|github)\./,
    /^https?:\/\/.*\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/,
    /^https?:\/\/.*\/search\?/,
    /^https?:\/\/.*\/login/,
    /^https?:\/\/.*\/signin/,
    /^https?:\/\/.*\/admin/,
    /^https?:\/\/localhost/,
    /^https?:\/\/127\.0\.0\.1/
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(window.location.href)) {
      return false;
    }
  }

  // Check for article indicators
  const articleIndicators = [
    'article',
    'post',
    'blog',
    'story',
    'news',
    'tutorial',
    'guide',
    'how-to'
  ];

  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const hasArticleIndicator = articleIndicators.some(indicator => 
    url.includes(indicator) || title.includes(indicator)
  );

  // Check for article-like content structure
  const hasArticleContent = document.querySelector('article, .post, .blog-post, .story, .content, .entry');
  const hasSubstantialText = document.body.textContent.trim().length > 1000;

  return hasArticleIndicator || hasArticleContent || hasSubstantialText;
}

// Extract article content using Readability
async function extractArticleContent() {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    lastProcessedUrl = window.location.href;

    console.log("Attempting to extract article from:", window.location.href);

    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true);
    
    // Create Readability instance
    const article = new Readability(documentClone, {
      charThreshold: 500,
      classesToPreserve: ['highlight', 'important'],
      url: window.location.href
    }).parse();

    if (!article || !article.textContent || article.textContent.trim().length < 200) {
      console.log("No substantial article content found on this page");
      return;
    }

    console.log("Article extracted successfully:", {
      title: article.title,
      length: article.textContent.length,
      excerpt: article.excerpt
    });

    // Send to background script for summarization
    chrome.runtime.sendMessage({
      action: "summarize",
      article: {
        url: window.location.href,
        title: article.title || document.title,
        textContent: article.textContent,
        excerpt: article.excerpt,
        siteName: article.siteName,
        byline: article.byline
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Extension not available or not loaded");
      }
    });

  } catch (error) {
    console.error("Error extracting article content:", error);
  } finally {
    isProcessing = false;
  }
}

// Debounce function to avoid excessive processing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced version of extractArticleContent
const debouncedExtract = debounce(extractArticleContent, 2000);

// Main execution
function main() {
  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isArticlePage()) {
        debouncedExtract();
      }
    });
  } else {
    if (isArticlePage()) {
      debouncedExtract();
    }
  }
}

// Listen for navigation events (for SPAs)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    lastProcessedUrl = null; // Reset to allow processing of new URL
    setTimeout(() => {
      if (isArticlePage()) {
        debouncedExtract();
      }
    }, 1000);
  }
});

observer.observe(document, { subtree: true, childList: true });

// Listen for popstate events (back/forward navigation)
window.addEventListener('popstate', () => {
  lastProcessedUrl = null;
  setTimeout(() => {
    if (isArticlePage()) {
      debouncedExtract();
    }
  }, 1000);
});

// Start processing
main();

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractNow") {
    extractArticleContent();
    sendResponse({ success: true });
  }
}); 
import { ChatModule } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/dist/esm/web-llm.js";

// Global variables
let chatModule = null;
let isModelLoaded = false;
let isModelLoading = false;

// Show model loading progress
const progressCallback = (report) => {
  console.log("Model loading progress:", report);
  // Send progress to popup if it exists
  chrome.runtime.sendMessage({
    action: "modelProgress",
    progress: report
  }).catch(() => {
    // Ignore errors if popup is not open
  });
};

// Initialize and load the model
async function initializeModel() {
  if (isModelLoaded || isModelLoading) return;
  
  try {
    isModelLoading = true;
    console.log("Initializing WebLLM...");
    
    chatModule = new ChatModule();
    chatModule.setInitProgressCallback(progressCallback);
    
    console.log("Loading Gemma-3-1b model...");
    // Using Gemma-3-1b for better content quality detection
    await chatModule.reload("gemma-3-1b-it-q4f16_1");
    
    isModelLoaded = true;
    isModelLoading = false;
    console.log("Gemma-3-1b model loaded successfully!");
    
    // Notify popup that model is ready
    chrome.runtime.sendMessage({
      action: "modelReady"
    }).catch(() => {
      // Ignore errors if popup is not open
    });
    
  } catch (error) {
    console.error("Failed to load model:", error);
    isModelLoading = false;
    
    chrome.runtime.sendMessage({
      action: "modelError",
      error: error.message
    }).catch(() => {
      // Ignore errors if popup is not open
    });
  }
}

// Content quality assessment function
async function assessContentQuality(article) {
  try {
    const prompt = `You are a content quality assessor. Analyze the following content and determine if it's high-quality, meaningful, and worth sharing publicly.

Content Title: ${article.title}
Content Length: ${article.textContent.length} characters
Content Preview: ${article.textContent.substring(0, 500)}${article.textContent.length > 500 ? '...' : ''}

Rate this content on a scale of 1-10 where:
1-3: Low quality, clickbait, or uninformative
4-6: Average quality, some value but not exceptional
7-8: Good quality, informative and well-written
9-10: High quality, exceptional, insightful, or groundbreaking

Consider factors like:
- Information value and insights
- Writing quality and clarity
- Originality and depth
- Educational or entertainment value
- Relevance and timeliness

Respond with ONLY a number 1-10, followed by a brief explanation (max 100 words).`;

    const response = await chatModule.generate(prompt);
    console.log("Content quality assessment:", response);
    
    // Extract the rating from the response
    const ratingMatch = response.match(/(\d+)/);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
    
    // Extract explanation (everything after the number)
    const explanation = response.replace(/^\d+\s*/, '').trim();
    
    return {
      rating,
      explanation,
      isHighQuality: rating >= 7
    };
  } catch (error) {
    console.error("Error assessing content quality:", error);
    return {
      rating: 5,
      explanation: "Unable to assess quality",
      isHighQuality: false
    };
  }
}

// Enhanced summarization function
async function summarizeAndSend(article) {
  try {
    // Check if user is authenticated
    const authToken = await getAuthToken();
    if (!authToken) {
      console.log("User not authenticated. Please sign in to the website first.");
      chrome.runtime.sendMessage({
        action: "authRequired"
      }).catch(() => {});
      return;
    }

    // Ensure model is loaded
    if (!isModelLoaded) {
      console.log("Model not loaded yet. Loading...");
      await initializeModel();
    }

    console.log("Processing content:", article.title);
    
    // First, assess content quality
    const qualityAssessment = await assessContentQuality(article);
    console.log("Quality assessment:", qualityAssessment);
    
    // Only proceed if content is high quality (rating >= 7)
    if (!qualityAssessment.isHighQuality) {
      console.log("Content quality too low, skipping:", qualityAssessment.rating);
      chrome.runtime.sendMessage({
        action: "contentQualityLow",
        rating: qualityAssessment.rating,
        explanation: qualityAssessment.explanation
      }).catch(() => {});
      return;
    }

    // Create enhanced prompt for summarization
    const prompt = `You are an expert content summarizer. Create a compelling, insightful summary of the following high-quality content.

Title: ${article.title}

Content:
${article.textContent.substring(0, 3000)}${article.textContent.length > 3000 ? '...' : ''}

Create a summary that:
1. Captures the key insights and main points
2. Highlights why this content is valuable
3. Makes readers want to engage with the full content
4. Is 2-3 sentences long
5. Maintains the original tone and style

Summary:`;

    const summary = await chatModule.generate(prompt);
    console.log("Enhanced summary generated:", summary);

    // Send to backend with quality assessment
    const response = await fetch('http://localhost:3000/api/content', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        url: article.url,
        title: article.title,
        content: article.textContent,
        summary: summary,
        type: 'ARTICLE',
        qualityRating: qualityAssessment.rating,
        qualityExplanation: qualityAssessment.explanation,
        isPublic: true // High-quality content is automatically public
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Successfully saved high-quality content to backend:', result);
    
    // Notify success with quality info
    chrome.runtime.sendMessage({
      action: "summarizationComplete",
      success: true,
      title: article.title,
      qualityRating: qualityAssessment.rating,
      isPublic: true
    }).catch(() => {});
    
  } catch (error) {
    console.error('Error during summarization or sending data:', error);
    
    // Notify error
    chrome.runtime.sendMessage({
      action: "summarizationError",
      error: error.message
    }).catch(() => {});
  }
}

// Get authentication token from storage
async function getAuthToken() {
  try {
    const result = await chrome.storage.local.get(['authToken']);
    return result.authToken;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

// Set authentication token
async function setAuthToken(token) {
  try {
    await chrome.storage.local.set({ authToken: token });
    console.log("Auth token saved");
  } catch (error) {
    console.error("Error saving auth token:", error);
  }
}

// Clear authentication token
async function clearAuthToken() {
  try {
    await chrome.storage.local.remove(['authToken']);
    console.log("Auth token cleared");
  } catch (error) {
    console.error("Error clearing auth token:", error);
  }
}

// Listener for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request.action);
  
  switch (request.action) {
    case "summarize":
      summarizeAndSend(request.article);
      break;
      
    case "initializeModel":
      initializeModel();
      break;
      
    case "getModelStatus":
      sendResponse({
        isLoaded: isModelLoaded,
        isLoading: isModelLoading
      });
      break;
      
    case "setAuthToken":
      setAuthToken(request.token);
      sendResponse({ success: true });
      break;
      
    case "clearAuthToken":
      clearAuthToken();
      sendResponse({ success: true });
      break;
      
    case "getAuthToken":
      getAuthToken().then(token => {
        sendResponse({ token });
      });
      return true; // Keep message channel open for async response
  }
});

// Initialize model when extension loads
initializeModel();

// Keep the service worker alive
setInterval(() => {
  chrome.runtime.getPlatformInfo();
}, 20e3); 
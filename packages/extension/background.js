import { ChatModule } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/dist/esm/web-llm.js";

// Show model loading progress
const progressCallback = (report) => {
  console.log(report);
};

// Initialize chat module and load model
const cm = new ChatModule();
cm.setInitProgressCallback(progressCallback);

console.log("Loading model...");
await cm.reload("gemma-1.1-2b-it-q4f16_1");
console.log("Model loaded.");

// Summarization function
async function summarizeAndSend(article) {
  try {
    console.log("Summarizing:", article.title);
    const prompt = `Summarize the following text in 2-3 sentences:\n\n${article.textContent}`;
    const summary = await cm.generate(prompt);
    console.log("Summary generated:", summary);

    // Get auth token and send to backend
    const { email } = await chrome.identity.getProfileUserInfo();
    if (email) {
      console.log('Sending data to backend for user:', email);
      const response = await fetch('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: article.url,
          title: article.title,
          content: article.textContent,
          summary: summary,
          type: 'ARTICLE', // Assuming all are articles for now
        }),
      });

      const result = await response.json();
      console.log('Backend response:', result);
    } else {
      console.log('User is not signed in to Chrome. Cannot send data.');
    }
  } catch (error) {
    console.error('Error during summarization or sending data:', error);
  }
}

// Listener for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    summarizeAndSend(request.article);
  }
  return true; // Keep the message channel open for async response
});

// Keep the service worker alive
setInterval(() => {
  chrome.runtime.getPlatformInfo();
}, 20e3); 
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
async function summarize(text) {
  console.log("Summarizing text...");
  const prompt = `Summarize the following text in 2-3 sentences:\n\n${text}`;
  const summary = await cm.generate(prompt);
  console.log("Summary:", summary);
  return summary;
}

// Listener for messages from content script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "summarize") {
    await summarize(request.text);
  }
});

// Keep the service worker alive
setInterval(() => {
  chrome.runtime.getPlatformInfo();
}, 20e3); 
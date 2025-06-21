/* eslint-disable no-undef */
try {
  const documentClone = document.cloneNode(true);
  const article = new Readability(documentClone).parse();

  if (article && article.textContent) {
    console.log("Sending article to background for summarization:", article.title);
    chrome.runtime.sendMessage({
      action: "summarize",
      text: article.textContent
    });
  }
} catch (e) {
  console.error("Could not extract article from this page:", e);
} 
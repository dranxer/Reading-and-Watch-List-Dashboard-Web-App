/* eslint-disable no-undef */
try {
  const documentClone = document.cloneNode(true);
  const article = new Readability(document, {
    charThreshold: 500,
    url: window.location.href
  }).parse();

  if (article && article.textContent) {
    console.log("Sending article to background for summarization:", article.title);
    chrome.runtime.sendMessage({
      action: "summarize",
      article: {
        url: window.location.href,
        title: article.title,
        textContent: article.textContent
      }
    });
  }
} catch (e) {
  console.log("Could not extract article from this page. This is normal for non-article pages.");
} 
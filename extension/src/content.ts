import browser from 'webextension-polyfill';

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "GET_CONTENT") {
    // Get the main content of the page
    const article = document.querySelector('article') || document.body;
    const content = article.innerText;
    return Promise.resolve({ content });
  }
});

// Create a floating button for manual capture
const button = document.createElement('button');
button.textContent = '📝';
button.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 24px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 10000;
  transition: all 0.3s ease;
`;

// Add hover effect
button.addEventListener('mouseover', () => {
  button.style.transform = 'scale(1.1)';
  button.style.backgroundColor = '#45a049';
});

button.addEventListener('mouseout', () => {
  button.style.transform = 'scale(1)';
  button.style.backgroundColor = '#4CAF50';
});

// Add click handler
button.addEventListener('click', async () => {
  const article = document.querySelector('article') || document.body;
  const content = article.innerText;
  
  await browser.runtime.sendMessage({
    type: "MANUAL_CAPTURE",
    content: content.substring(0, 1000)
  });
  
  button.textContent = '✓';
  setTimeout(() => {
    button.textContent = '📝';
  }, 2000);
});

document.body.appendChild(button); 
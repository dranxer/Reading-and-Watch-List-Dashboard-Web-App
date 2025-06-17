import browser from 'webextension-polyfill';

interface ContentItem {
  url: string;
  title: string;
  timestamp: string;
  summary: string;
  type: 'article' | 'video';
}

document.addEventListener('DOMContentLoaded', async () => {
  const historyList = document.getElementById('history-list');
  const statusText = document.getElementById('status-text');
  
  if (!historyList || !statusText) return;

  try {
    // Get history from storage
    const { history = [] } = await browser.storage.local.get('history');
    
    if (history.length === 0) {
      statusText.textContent = 'No content captured yet. Start browsing!';
      return;
    }

    // Display history
    history.forEach((item: ContentItem) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const typeIcon = item.type === 'video' ? '🎥' : '📚';
      const date = new Date(item.timestamp).toLocaleDateString();
      
      li.innerHTML = `
        <div class="item-header">
          <span class="type-icon">${typeIcon}</span>
          <a href="${item.url}" target="_blank" class="title">${item.title}</a>
          <span class="date">${date}</span>
        </div>
        <p class="summary">${item.summary}</p>
      `;
      
      historyList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading history:', error);
    statusText.textContent = 'Error loading history. Please try again.';
  }
}); 
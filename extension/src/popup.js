document.addEventListener('DOMContentLoaded', async () => {
  // Get today's page count
  const { pages = [] } = await chrome.storage.local.get('pages');
  const today = new Date().toISOString().split('T')[0];
  const todayPages = pages.filter(page => 
    page.timestamp.startsWith(today)
  );
  
  document.getElementById('pageCount').textContent = todayPages.length;

  // Handle view history button click
  document.getElementById('viewHistory').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://your-website.com/history' // Replace with your actual website URL
    });
  });
}); 
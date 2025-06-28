# CurioLog Browser Extension Setup

## 🚀 Quick Setup

### 1. Install the Extension

1. **Clone or download** this repository
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right)
4. **Click "Load unpacked"** and select the `packages/extension` folder
5. **Pin the extension** to your toolbar for easy access

### 2. Start the Knowledge Tracker Website

```bash
cd packages/website
npm install
npm run dev
```

The website should open at `http://localhost:3000`

### 3. Connect Your Extension

1. **Click the CurioLog extension icon** in your browser toolbar
2. **Click "Sign In"** - this will open your Knowledge Tracker in a new tab
3. **Sign in** with your account (or create one if needed)
4. **You're connected!** The extension will automatically close the auth tab

## ✅ How It Works

### Automatic Content Detection

The extension automatically detects when you're reading substantial content:

- **Articles** from news sites, blogs, Medium, etc.
- **Long-form content** with 300+ words
- **Quality content** from reputable domains

### What Gets Saved

- **Title** and **URL** of the article
- **Full text content** (cleaned and processed)
- **Excerpt** for quick previews
- **Reading timestamp**
- **Content type** (article, video, etc.)

### Smart Filtering

The extension won't save:
- Search pages (Google, Bing, etc.)
- Social media feeds
- Shopping/e-commerce pages
- Login/signup pages
- Very short content

## 🎯 Usage

### 1. Browse Normally
Just browse the web as usual! The extension works in the background.

### 2. Check Status
Click the extension icon to see:
- ✅ **Authentication status**
- 🔗 **API connection**
- 📊 **Items saved count**

### 3. Test Current Page
Use the **"Test Current Page"** button to manually save the current article.

### 4. View Your Collection
Click **"Open Knowledge Tracker"** to see all your saved content and generate AI summaries.

## 🔧 Troubleshooting

### Extension Won't Connect
1. Make sure the website is running at `http://localhost:3000`
2. Click the extension → **⚙️ Settings** → verify the URL is correct
3. Try signing out and signing in again

### Content Not Being Saved
1. Check that you're authenticated (green dot in extension popup)
2. Make sure you're on a substantial article page (not a search page)
3. Look at the browser console for any error messages

### API Issues
1. Verify the website is running and accessible
2. Check for any firewall or antivirus blocking localhost connections
3. Try restarting both the browser and the dev server

## 🚀 Advanced Features

### Custom API URL
If you deploy your Knowledge Tracker to a custom domain:
1. Click the extension icon
2. Click **⚙️ Settings**
3. Update the **Knowledge Tracker URL**
4. Click **Update URL**

### Bulk Processing
The extension can process multiple tabs if you:
1. Open several article tabs
2. Wait 30 seconds on each tab (for automatic detection)
3. Or manually click **"Test Current Page"** on each tab

## 🔑 Privacy & Security

- **Your content stays with you** - everything is saved to your own Knowledge Tracker
- **Authentication tokens** are stored securely in browser storage
- **No tracking** - the extension only communicates with your own server
- **Content processing** happens locally using your chosen AI model

## 📝 What's Next?

Once your extension is capturing content, you can:

1. **📖 Review** your saved articles in the Knowledge Tracker dashboard
2. **🤖 Generate summaries** using local AI models
3. **🔍 Search** through your knowledge base
4. **📊 Track** your reading habits and interests
5. **🏷️ Organize** content with tags and categories (coming soon)

Happy knowledge tracking! 🎉 
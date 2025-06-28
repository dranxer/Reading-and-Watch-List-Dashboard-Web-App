# ReadWatch Tracker Browser Extension

The ReadWatch Tracker browser extension automatically captures and analyzes web content you read, watch, or listen to, syncing it with your ReadWatch Tracker account.

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Open Chrome Extension Management**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to the `packages/extension` folder
   - Select the folder and click "Select Folder"

3. **Verify Installation**
   - You should see "ReadWatch Tracker" in your extensions list
   - Click the extension icon in your browser toolbar

### Method 2: Install from ZIP

1. Download the extension files as a ZIP
2. Extract to a folder on your computer
3. Follow Method 1 steps using the extracted folder

## 🔧 Setup

1. **Start ReadWatch Tracker**
   - Make sure your ReadWatch Tracker web app is running at `http://localhost:3001`
   - Sign in to your account

2. **Connect Extension**
   - Click the ReadWatch Tracker extension icon
   - You should see a green "Connected" status
   - If you see "Please sign in", click the link to sign in

3. **Configure Settings**
   - Toggle auto-tracking on/off
   - Choose which content types to track:
     - Articles
     - Videos
     - Podcasts

## 🎯 How It Works

### Automatic Content Tracking
- **Articles**: Detects substantial text content on web pages
- **Videos**: Tracks YouTube, Vimeo, and other video platforms
- **Podcasts**: Captures Spotify, Apple Podcasts, and audio content

### Content Analysis
- **Quality Scoring**: AI analyzes content quality (45-85% range)
- **Tag Generation**: Automatically categorizes content
- **Smart Filtering**: Only saves high-quality, substantial content

### What Gets Tracked
✅ Blog posts and articles  
✅ News articles  
✅ Tutorial and educational content  
✅ YouTube videos  
✅ Podcast episodes  
✅ Documentation and guides  

❌ Login/signup pages  
❌ Shopping/checkout pages  
❌ Admin interfaces  
❌ Search result pages  

## 📊 Extension Features

### Popup Interface
- **Authentication Status**: Shows if you're signed in
- **Content Statistics**: Displays tracked items count
- **Toggle Controls**: Enable/disable different content types
- **Quick Access**: Direct link to your ReadWatch Tracker dashboard

### Notifications
- Green notification appears when content is successfully saved
- Subtle, non-intrusive design
- Auto-dismisses after 4 seconds

### Settings
- **Auto-track content**: Master on/off switch
- **Track videos**: Enable/disable video tracking
- **Track articles**: Enable/disable article tracking  
- **Track podcasts**: Enable/disable podcast tracking
- **Quality threshold**: Minimum quality score for saving (default: 50%)

## 🔧 Troubleshooting

### Extension Not Working
1. Check that ReadWatch Tracker is running on `http://localhost:3001`
2. Verify you're signed in to your account
3. Check extension popup for connection status
4. Try refreshing the page you're trying to track

### Content Not Being Saved
1. Ensure auto-tracking is enabled
2. Check that the content type is enabled (articles/videos/podcasts)
3. Verify content meets minimum quality threshold
4. Check browser console for any error messages

### Authentication Issues
1. Sign in to ReadWatch Tracker in your browser
2. Click "Refresh Stats" in the extension popup
3. If still having issues, try signing out and back in

## 🔒 Privacy & Security

- **Local Processing**: Content analysis happens locally in your browser
- **Secure Authentication**: Uses Clerk authentication system
- **No External Tracking**: Extension only communicates with your ReadWatch Tracker instance
- **Optional Sync**: Choose what content gets saved to your account

## 🎛️ Manual Controls

Even with auto-tracking enabled, you have full control:
- View all tracked content in your ReadWatch Tracker dashboard
- Delete unwanted items
- Organize content with custom tags and reading lists
- Export your data anytime

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your ReadWatch Tracker server is running
3. Try disabling and re-enabling the extension
4. Clear browser cache and cookies if needed

## 🔄 Updates

To update the extension:
1. Pull latest changes from the repository
2. Go to `chrome://extensions/`
3. Click the refresh icon on the ReadWatch Tracker extension
4. The extension will reload with the latest changes

---

**Note**: This extension is designed to work with the ReadWatch Tracker platform running locally. Make sure your web application is running before using the extension. 
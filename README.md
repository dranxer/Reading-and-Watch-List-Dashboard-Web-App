# Reading Tracker - AI-Powered Reading Insights

A comprehensive reading tracking system with a browser extension and web dashboard that automatically extracts, summarizes, and organizes your reading content using AI.

## 🚀 Features

### Browser Extension
- **Smart Content Detection**: Automatically identifies article pages and extracts content
- **AI Summarization**: Uses WebLLM with Gemma model for local AI-powered summaries
- **Authentication Integration**: Seamlessly connects with Clerk authentication
- **Interactive Popup**: Real-time status monitoring and manual extraction controls
- **Cross-platform**: Works on any website with article content

### Web Dashboard
- **Modern UI**: Beautiful, responsive design with glassmorphism effects
- **User Authentication**: Secure sign-in/sign-up with Clerk
- **Content Management**: View, organize, and search your saved articles
- **Real-time Updates**: Live data synchronization with the extension
- **MongoDB Integration**: Cloud-hosted database for reliable data storage

## 📁 Project Structure

```
GdscProject/
├── packages/
│   ├── extension/           # Chrome Extension
│   │   ├── background.js    # Service worker with AI model
│   │   ├── content.js       # Content extraction script
│   │   ├── popup.html       # Extension popup interface
│   │   ├── popup.js         # Popup functionality
│   │   ├── Readability.js   # Content extraction library
│   │   └── manifest.json    # Extension configuration
│   └── website/             # Next.js Web Application
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── lib/         # Utilities and database
│       │   └── middleware.ts # Clerk authentication
│       ├── .env.local       # Environment variables
│       └── package.json     # Dependencies
└── package.json             # Monorepo configuration
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Clerk account for authentication
- Chrome browser

### 1. Environment Setup

#### MongoDB Atlas
1. Create a free MongoDB Atlas cluster
2. Get your connection string
3. Update `packages/website/.env.local`:
```env
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"
```

#### Clerk Authentication
1. Create a Clerk application
2. Get your API keys
3. Update `packages/website/.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

### 2. Install Dependencies
```bash
npm install
cd packages/website && npm install
```

### 3. Start the Website
```bash
cd packages/website
npm run dev
```

The website will be available at `http://localhost:3000`

### 4. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packages/extension` folder
5. The extension icon should appear in your toolbar

## 🎯 How to Use

### Initial Setup
1. **Sign up/Sign in**: Visit `http://localhost:3000` and create an account
2. **Authenticate Extension**: 
   - Click the extension icon
   - Click "Sign In to Website"
   - Complete authentication on the website
   - The extension will automatically receive your auth token

### Daily Usage
1. **Browse Articles**: Visit any article page (news, blogs, tutorials, etc.)
2. **Automatic Extraction**: The extension automatically detects and extracts content
3. **Manual Extraction**: Click the extension icon and use "Extract Current Page"
4. **View Dashboard**: Visit `http://localhost:3000/dashboard` to see your saved articles
5. **AI Summaries**: Each article includes an AI-generated summary for quick insights

### Extension Features
- **Status Monitoring**: Real-time AI model and authentication status
- **Manual Control**: Extract content from any page manually
- **Quick Access**: Direct links to dashboard and authentication
- **Notifications**: Success/error feedback for all operations

## 🔧 Technical Details

### AI Model
- **Model**: Gemma-1.1-2b-it-q4f16_1
- **Framework**: WebLLM (local inference)
- **Purpose**: Content summarization and analysis
- **Performance**: Optimized for browser environment

### Content Extraction
- **Library**: Readability.js
- **Detection**: Smart article page identification
- **Processing**: Automatic content cleaning and formatting
- **Storage**: MongoDB with user-specific collections

### Authentication
- **Provider**: Clerk
- **Method**: JWT tokens
- **Security**: Secure token exchange between extension and website
- **Session**: Persistent authentication across browser sessions

## 🚀 Advanced Features

### Content Intelligence
- Automatic article detection based on URL patterns and page structure
- Duplicate prevention with URL-based deduplication
- Content type classification (articles, tutorials, guides, etc.)
- Metadata extraction (title, author, publication date)

### User Experience
- Responsive design that works on all devices
- Real-time status updates and notifications
- Smooth animations and transitions
- Intuitive navigation and controls

### Data Management
- Cloud-hosted MongoDB for reliability
- User-specific data isolation
- Automatic backup and synchronization
- Efficient querying and sorting

## 🐛 Troubleshooting

### Extension Issues
- **Model not loading**: Check internet connection and try refreshing
- **Authentication failed**: Re-authenticate through the extension popup
- **Content not extracting**: Ensure you're on an article page and try manual extraction

### Website Issues
- **Database connection**: Verify MongoDB URI in `.env.local`
- **Authentication**: Check Clerk API keys and configuration
- **Build errors**: Clear `.next` folder and reinstall dependencies

### Common Solutions
1. **Clear extension data**: Remove and reinstall the extension
2. **Reset authentication**: Sign out and sign back in
3. **Restart services**: Restart the website development server
4. **Check logs**: Monitor browser console and terminal output

## 🔮 Future Enhancements

- **Video Content**: Support for YouTube and video summarization
- **Reading Analytics**: Detailed insights and reading patterns
- **Export Features**: PDF, CSV, and API export options
- **Collaboration**: Share reading lists and summaries
- **Mobile App**: Native mobile application
- **Advanced AI**: Multi-modal content analysis

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

**Happy Reading! 📚✨**

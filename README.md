# 🤖 AI-Powered Reading Tracker

> **Forget less. Learn more.** Automatically discover, curate, and share high-quality content using local AI.

## 🎯 Project Overview

This project builds a **website + browser extension** that automatically logs your watched videos & read articles, then uses a **local LLM (Gemma-3-1b)** to assess content quality and create your **public reading list**.

### ✨ Key Features

- 🧠 **Local AI Analysis** - Gemma-3-1b model runs locally in your browser
- ⚡ **Automatic Curation** - AI only saves high-quality content (7+/10 rating) 
- 🌐 **Social Discovery** - Follow others' reading lists (imagine Sam Altman's reading feed!)
- 🔒 **Privacy First** - All AI processing happens locally on your device
- 📊 **Smart Summaries** - AI generates compelling summaries of saved content

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd packages/website && npm install
```

### 2. Start the Website
```bash
cd packages/website
npm run dev
```

### 3. Install Browser Extension
1. Go to `http://localhost:3000`
2. Click "Download Extension"
3. Extract the ZIP file
4. Go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the extracted folder

### 4. Sign In & Start Tracking
1. Sign in to the website
2. Browse articles/videos normally
3. AI automatically detects and saves high-quality content
4. View your curated reading list on the dashboard

## 🤖 Local AI Technology

### Model: Gemma-3-1b (1GB)
- **Size**: ~1GB quantized model optimized for browser usage
- **Runtime**: WebLLM for in-browser inference
- **Acceleration**: CPU + Vulkan for broader device compatibility
- **Privacy**: Zero data sent to external servers

### AI Capabilities
- **Content Quality Assessment**: Rates content 1-10 based on information value, writing quality, and relevance
- **Automatic Summarization**: Generates compelling summaries that make readers want to engage
- **Public/Private Decisions**: AI determines which content is worth sharing publicly
- **Smart Filtering**: Only high-quality content (7+/10) gets saved automatically

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Browser Ext    │───▶│   Website API   │───▶│   Database      │
│  + Local AI     │    │   (Next.js)     │    │   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Gemma-3-1b              Clerk Auth              Content Storage
   Content Analysis        User Management         Public Lists
   Local Processing        API Protection          Social Features
```

### Extension Components
- **Background Script**: WebLLM integration, AI content analysis
- **Content Script**: Automatic article/video detection using Readability.js
- **Popup Interface**: AI status, manual extraction, user controls

### Website Components
- **Dashboard**: View your AI-curated reading list
- **Public Feeds**: Discover what others are reading
- **Authentication**: Secure user management with Clerk
- **API**: Content storage, user profiles, social features

## 🔧 Technical Details

### Local AI Processing
```javascript
// AI quality assessment
const quality = await assessContentQuality(content);
// Rating: 1-10, Explanation, Public recommendation

// AI summarization  
const summary = await generateSummary(content);
// Compelling 2-3 sentence summary
```

### Content Detection
- Automatic detection of articles and videos
- YouTube, Vimeo, and general article support
- Quality heuristics for fallback when AI unavailable
- Smart filtering to avoid low-value content

### Privacy & Performance
- **Local Processing**: AI runs entirely in your browser
- **No Data Leakage**: Content never sent to external AI services
- **Efficient**: 1GB model optimized for CPU inference
- **Progressive**: Falls back to heuristics if AI unavailable

## 🌟 Use Cases

### Personal Knowledge Management
- **Automatic Curation**: Never manually bookmark articles again
- **Quality Filtering**: Only high-value content makes it to your list
- **AI Summaries**: Quickly review what you've read

### Social Discovery
- **Follow Thought Leaders**: See what experts in your field are reading
- **Share Your Insights**: Your reading list becomes a public signal
- **Discover Quality Content**: Find hidden gems through community curation

### Professional Development
- **Learning Tracking**: Monitor your educational content consumption
- **Expertise Building**: Curate content in your professional domain
- **Network Effects**: Connect with others through shared reading interests

## 🛠️ Development

### File Structure
```
packages/
├── extension/           # Browser extension
│   ├── background.js   # Local AI + content processing
│   ├── content.js      # Article detection
│   ├── popup.html/js   # User interface
│   └── manifest.json   # Extension config
└── website/            # Next.js website
    ├── src/app/        # App router pages
    ├── src/lib/        # Database connection
    └── public/         # Static assets
```

### Key Technologies
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, MongoDB
- **Authentication**: Clerk
- **AI**: WebLLM, Gemma-3-1b
- **Extension**: Chrome Extension Manifest V3

### Environment Variables
```bash
# Website (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
MONGODB_URI=your_mongodb_connection
```

## 🎯 Project Goals

This project demonstrates:
1. **Local AI Integration** - Running LLMs in the browser for privacy
2. **Automatic Content Curation** - AI-powered quality assessment
3. **Social Knowledge Sharing** - Building communities around reading
4. **Cross-Platform Development** - Website + browser extension
5. **Modern Web Technologies** - WebLLM, Chrome Extensions, React

## 🚀 Future Enhancements

- **Multi-Browser Support**: Firefox, Safari extension versions
- **Advanced AI Models**: Support for larger models on capable devices
- **Content Types**: PDF analysis, podcast transcripts, research papers
- **Social Features**: Comments, discussions, content recommendations
- **Analytics**: Reading patterns, learning insights, content trends

## 📝 License

MIT License - see LICENSE file for details.

---

**Built for GDSC with ❤️ - Showcasing the future of AI-powered content curation**



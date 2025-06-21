# Reading & Watch List Tracker

A comprehensive web application and browser extension that automatically tracks and shares your reading and watching history using local LLM for content summarization.

## 🚀 Features

### Core Functionality
- **Automatic Content Tracking**: Browser extension automatically logs your reading and watching history
- **Local AI Summaries**: Uses Gemma-3-1b local LLM for privacy-focused content summarization
- **Smart Content Detection**: Automatically identifies articles, videos, podcasts, and books
- **Real-time Sync**: Seamlessly sync content between extension and web dashboard

### Web Application
- **Modern Dashboard**: Beautiful, responsive interface to view your intellectual journey
- **User Authentication**: Secure signup/signin with NextAuth.js
- **Content Analytics**: Statistics and insights about your reading/watching habits
- **Social Features**: Follow others and discover interesting content (coming soon)
- **Mobile Responsive**: Works perfectly on all devices

### Browser Extension
- **Floating Capture Button**: Manual content capture with a click
- **Smart Content Extraction**: Automatically extracts main content from web pages
- **Local Storage**: Stores content locally before syncing to web
- **Beautiful Popup**: Modern interface showing recent activity and statistics
- **Cross-browser Support**: Works on Chrome, Firefox, and Edge

## 🛠️ Tech Stack

### Website
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Headless UI + Heroicons

### Browser Extension
- **Language**: TypeScript
- **Build Tool**: Webpack
- **Local AI**: @mlc-ai/web-llm with Gemma-3-1b
- **Browser APIs**: WebExtension Polyfill

## 📦 Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GdscProject
   ```

2. **Set up the database**
   ```bash
   # Install PostgreSQL and create database
   # See SETUP.md for detailed instructions
   ```

3. **Start the website**
   ```bash
   cd website
   npm install
   # Create .env.local with your database URL
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

4. **Build the extension**
   ```bash
   cd extension
   npm install
   npm run build
   # Load extension in your browser
   ```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 🎯 Usage

### Getting Started
1. Create an account on the website
2. Install the browser extension
3. Start browsing - content will be automatically tracked
4. Use the floating button (📝) for manual capture
5. View your dashboard to see all tracked content

### Features in Action
- **Automatic Tracking**: Visit any article or video page and content is automatically captured
- **AI Summaries**: Each piece of content gets an intelligent summary
- **Dashboard Analytics**: See your reading patterns and statistics
- **Content Sync**: Extension data syncs to your web dashboard

## 🔧 Development

### Project Structure
```
GdscProject/
├── website/                 # Next.js web application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   └── lib/           # Utilities and config
│   ├── prisma/            # Database schema
│   └── package.json
├── extension/              # Browser extension
│   ├── src/               # TypeScript source
│   ├── manifest.json      # Extension manifest
│   └── package.json
└── README.md
```

### Development Commands

**Website**
```bash
cd website
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

**Extension**
```bash
cd extension
npm run build        # Build extension
npm run watch        # Watch mode for development
```

## 🔒 Privacy & Security

- **Local AI Processing**: All content summarization happens locally using Gemma-3-1b
- **No Data Mining**: Your reading history stays private
- **Secure Authentication**: NextAuth.js with secure session management
- **Database Security**: PostgreSQL with proper user permissions
- **HTTPS Ready**: Production-ready security configurations

## 🚀 Deployment

### Website (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

### Extension (Chrome Web Store)
1. Build extension: `npm run build`
2. Create ZIP file
3. Submit to Chrome Web Store

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See [SETUP.md](./SETUP.md) for detailed setup instructions
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions for help and ideas

## 🎉 Acknowledgments

- Built with Next.js and the amazing React ecosystem
- Local AI powered by MLC-LLM and Gemma models
- Icons from Heroicons
- Styling with Tailwind CSS

---

**Start tracking your intellectual journey today! 📚✨**

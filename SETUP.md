# Reading & Watch List Tracker - Setup Guide

This guide will help you set up the complete Reading & Watch List Tracker project, including the website and browser extension.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

## 1. Database Setup

### Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`

### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE reading_tracker;

# Create user (optional)
CREATE USER reading_tracker_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE reading_tracker TO reading_tracker_user;

# Exit
\q
```

## 2. Website Setup

### Navigate to website directory
```bash
cd website
```

### Install dependencies
```bash
npm install
```

### Environment Configuration
Create a `.env.local` file in the website directory:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/reading_tracker"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: External AI services
# OPENAI_API_KEY="your-openai-api-key"
# GEMINI_API_KEY="your-gemini-api-key"
```

### Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) View database in Prisma Studio
npx prisma studio
```

### Start the development server
```bash
npm run dev
```

The website will be available at http://localhost:3000

## 3. Browser Extension Setup

### Navigate to extension directory
```bash
cd extension
```

### Install dependencies
```bash
npm install
```

### Build the extension
```bash
npm run build
```

### Load Extension in Browser

#### Chrome/Edge
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension should now appear in your extensions list

#### Firefox
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in the extension folder

## 4. Extension Icons

The extension requires icon files. You can create simple icons or use placeholder images:

- `extension/icons/icon16.png` (16x16 pixels)
- `extension/icons/icon48.png` (48x48 pixels)  
- `extension/icons/icon128.png` (128x128 pixels)

## 5. Testing the Setup

### Website Testing
1. Visit http://localhost:3000
2. Click "Get Started" to create an account
3. Sign in and access the dashboard
4. Verify the database connection by checking if user data is stored

### Extension Testing
1. Install the extension in your browser
2. Visit any article or video page
3. Click the extension icon to see the popup
4. Check if content is being captured automatically
5. Use the floating button (📝) for manual capture

### Integration Testing
1. Capture some content using the extension
2. Click "Sync with Website" in the extension popup
3. Check your dashboard to see if content appears
4. Verify that AI summaries are generated

## 6. Production Deployment

### Website Deployment (Vercel)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Extension Deployment
1. Build the extension: `npm run build`
2. Create a ZIP file of the extension folder
3. Submit to Chrome Web Store or Firefox Add-ons

## 7. Troubleshooting

### Common Issues

**Database Connection Error**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and user has permissions

**Extension Not Loading**
- Check browser console for errors
- Verify manifest.json is valid
- Ensure all required files are present

**LLM Not Working**
- Check if @mlc-ai/web-llm is properly installed
- Verify model URLs are accessible
- Check browser console for LLM errors

**Authentication Issues**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Ensure database migrations are complete

### Logs and Debugging

**Website Logs**
```bash
# Check Next.js logs
npm run dev

# Check Prisma logs
npx prisma studio
```

**Extension Logs**
- Open browser developer tools
- Check Console tab for extension errors
- Use `chrome://extensions/` for Chrome debugging

## 8. Development Workflow

### Making Changes

1. **Website Changes**
   ```bash
   cd website
   npm run dev  # Start development server
   # Make changes to code
   # Changes auto-reload
   ```

2. **Extension Changes**
   ```bash
   cd extension
   npm run watch  # Auto-rebuild on changes
   # Make changes to code
   # Reload extension in browser
   ```

3. **Database Changes**
   ```bash
   cd website
   # Edit prisma/schema.prisma
   npx prisma db push  # Apply changes
   npx prisma generate  # Update client
   ```

### Code Structure

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

## 9. Security Considerations

- Use strong passwords for database
- Keep NEXTAUTH_SECRET secure
- Regularly update dependencies
- Validate all user inputs
- Use HTTPS in production
- Implement rate limiting for API endpoints

## 10. Performance Optimization

- Enable Next.js caching
- Optimize database queries
- Use CDN for static assets
- Implement lazy loading
- Monitor extension performance

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review browser console logs
3. Verify all setup steps are completed
4. Check GitHub issues for known problems 
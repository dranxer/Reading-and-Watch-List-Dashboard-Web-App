Reading & Watch List Tracker

A web application and browser extension that automatically tracks and shares your reading and watching history using local LLM for content summarization.

Features

- Browser extension to automatically track reading and watching history
- Local LLM integration using Gemma-3-1b for content summarization
- Public profiles to showcase your intellectual consumption
- Social features to follow others and discover content
- CPU-based inference using Vulkan for efficient local processing

Project Structure

.
├── website/           # Next.js web application
├── extension/         # Browser extension
└── shared/           # Shared utilities and types

Setup Instructions

Website Setup

1. Navigate to the website directory:
   ```bash
   cd website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

Extension Setup

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

Development

- Website is built with Next.js 14
- Extension is built with TypeScript
- Local LLM integration using Gemma-3-1b
- Database: PostgreSQL
- Authentication: NextAuth.js

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { JSDOM } from 'jsdom';

// Simple Readability implementation for server-side extraction
class Readability {
  private doc: Document;
  private url: string;

  constructor(doc: Document, options: { url: string }) {
    this.doc = doc;
    this.url = options.url;
  }

  parse() {
    // Basic content extraction logic
    const article = this.doc.querySelector('article, .post, .blog-post, .story, .content, .entry, main');
    const title = this.doc.querySelector('h1, .title, .post-title')?.textContent?.trim() || 
                  this.doc.title || 
                  'Untitled Article';
    
    let content = '';
    if (article) {
      content = article.textContent || '';
    } else {
      // Fallback: get all text content from body
      const body = this.doc.body;
      if (body) {
        // Remove script and style elements
        const scripts = body.querySelectorAll('script, style, nav, header, footer, .sidebar, .ad, .advertisement');
        scripts.forEach(el => el.remove());
        content = body.textContent || '';
      }
    }

    // Clean up content
    content = content.replace(/\s+/g, ' ').trim();

    return {
      title,
      textContent: content,
      excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      siteName: new URL(this.url).hostname,
      byline: '',
      url: this.url
    };
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ 
        error: 'URL is required' 
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ 
        error: 'Invalid URL format' 
      }, { status: 400 });
    }

    console.log(`Extracting content from: ${url}`);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML using jsdom
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract content using Readability
    const article = new Readability(doc, { url }).parse();

    if (!article.textContent || article.textContent.length < 100) {
      return NextResponse.json({ 
        error: 'No substantial content found on this page' 
      }, { status: 400 });
    }

    // Generate a simple summary (in production, you'd use an AI model)
    const summary = article.textContent.length > 500 
      ? article.textContent.substring(0, 500) + '...'
      : article.textContent;

    // Save to database
    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('contentItems');

    // Check for existing content
    const existingItem = await collection.findOne({ 
      userId, 
      url: url 
    });

    let result: any;
    if (existingItem) {
      // Update existing item
      const updatedItem = {
        ...existingItem,
        title: article.title,
        content: article.textContent,
        summary: summary,
        updatedAt: new Date(),
      };

      await collection.updateOne(
        { _id: existingItem._id },
        { $set: updatedItem }
      );

      result = { ...updatedItem, _id: existingItem._id };
    } else {
      // Create new item
      const newItem = {
        createdAt: new Date(),
        userId,
        url: article.url,
        title: article.title,
        content: article.textContent,
        summary: summary,
        type: 'ARTICLE',
      };

      const insertResult = await collection.insertOne(newItem);
      result = { ...newItem, _id: insertResult.insertedId };
    }

    console.log(`Content extracted and saved for user ${userId}:`, {
      title: result.title,
      url: result.url
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/extract:', error);
    return NextResponse.json({ 
      error: 'Failed to extract content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
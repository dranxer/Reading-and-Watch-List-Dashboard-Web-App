import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

interface ContentAnalysis {
  title: string;
  description: string;
  type: 'article' | 'video' | 'podcast' | 'other';
  source: string;
  duration?: string;
  readingTime?: string;
  tags: string[];
  qualityScore: number;
  summary?: string;
}

function generateDomainTags(url: string): string[] {
  try {
    const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
    const tags: string[] = [];

    // Get clean site name
    let siteName = '';
    if (domain.includes('youtube.com')) {
      siteName = 'youtube';
    } else if (domain.includes('medium.com')) {
      siteName = 'medium';
    } else if (domain.includes('github.com')) {
      siteName = 'github';
    } else if (domain.includes('stackoverflow.com')) {
      siteName = 'stackoverflow';
    } else if (domain.includes('reddit.com')) {
      siteName = 'reddit';
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      siteName = 'twitter';
    } else if (domain.includes('linkedin.com')) {
      siteName = 'linkedin';
    } else if (domain.includes('facebook.com')) {
      siteName = 'facebook';
    } else if (domain.includes('instagram.com')) {
      siteName = 'instagram';
    } else if (domain.includes('tiktok.com')) {
      siteName = 'tiktok';
    } else if (domain.includes('vimeo.com')) {
      siteName = 'vimeo';
    } else if (domain.includes('twitch.tv')) {
      siteName = 'twitch';
    } else if (domain.includes('spotify.com')) {
      siteName = 'spotify';
    } else if (domain.includes('dev.to')) {
      siteName = 'dev.to';
    } else if (domain.includes('news.ycombinator.com')) {
      siteName = 'hackernews';
    } else if (domain.includes('techcrunch.com')) {
      siteName = 'techcrunch';
    } else if (domain.includes('wired.com')) {
      siteName = 'wired';
    } else if (domain.includes('theverge.com')) {
      siteName = 'theverge';
    } else if (domain.includes('cnn.com')) {
      siteName = 'cnn';
    } else if (domain.includes('bbc.com')) {
      siteName = 'bbc';
    } else if (domain.includes('nytimes.com')) {
      siteName = 'nytimes';
    } else if (domain.includes('washingtonpost.com')) {
      siteName = 'washingtonpost';
    } else if (domain.includes('wikipedia.org')) {
      siteName = 'wikipedia';
    } else if (domain.includes('coursera.org')) {
      siteName = 'coursera';
    } else if (domain.includes('udemy.com')) {
      siteName = 'udemy';
    } else if (domain.includes('notion.so')) {
      siteName = 'notion';
    } else if (domain.includes('figma.com')) {
      siteName = 'figma';
    } else {
      // For unknown domains, extract the main part
      siteName = domain.replace(/\.(com|org|net|edu|gov|io|co|ai)$/, '');
    }

    // Add site name if we have one
    if (siteName) {
      tags.push(siteName);
    }

    // Determine and add content type
    let contentType = '';
    if (domain.includes('youtube.com') || domain.includes('vimeo.com') || domain.includes('twitch.tv')) {
      contentType = 'video';
    } else if (domain.includes('spotify.com') || domain.includes('podcasts.apple.com')) {
      contentType = 'podcast';
    } else {
      contentType = 'article';
    }

    tags.push(contentType);

    return tags;
  } catch (error) {
    console.error('Error generating domain tags:', error);
    return ['unknown', 'article'];
  }
}

async function extractMetadata(url: string): Promise<ContentAnalysis> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Extract basic metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
                     html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
    
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
    const description = descMatch ? descMatch[1].trim() : 'No description available';
    
    // Determine content type and source
    const hostname = new URL(url).hostname;
    let type: 'article' | 'video' | 'podcast' | 'other' = 'article';
    let duration = undefined;
    let readingTime = undefined;
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      type = 'video';
      // Try to extract duration from YouTube
      const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
      if (durationMatch) {
        const seconds = parseInt(durationMatch[1]);
        const minutes = Math.floor(seconds / 60);
        duration = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
      }
    } else if (hostname.includes('spotify.com') || hostname.includes('anchor.fm') || hostname.includes('podcast')) {
      type = 'podcast';
    } else {
      // Estimate reading time for articles
      const wordCount = html.replace(/<[^>]*>/g, ' ').split(/\s+/).length;
      const estimatedMinutes = Math.ceil(wordCount / 200); // Average reading speed
      readingTime = `${estimatedMinutes} min read`;
    }
    
    // Generate tags based on content and URL
    const tags = generateDomainTags(url);
    
    // Generate quality score (simplified algorithm)
    let qualityScore = 50; // Base score
    
    // Boost for reputable sources
    if (['medium.com', 'dev.to', 'stackoverflow.com', 'github.com', 'youtube.com'].some(domain => hostname.includes(domain))) {
      qualityScore += 20;
    }
    
    // Boost for good title/description
    if (title.length > 20 && title.length < 100) qualityScore += 10;
    if (description.length > 50) qualityScore += 10;
    
    // Boost for educational content
    if (description.includes('tutorial') || description.includes('guide') || description.includes('how to')) {
      qualityScore += 15;
    }
    
    // Cap at 100
    qualityScore = Math.min(qualityScore, 100);
    
    return {
      title,
      description,
      type,
      source: hostname,
      duration,
      readingTime,
      tags,
      qualityScore,
      summary: description.length > 100 ? description.substring(0, 100) + '...' : description
    };
    
  } catch (error) {
    console.error('Error extracting metadata:', error);
    throw new Error('Failed to analyze content');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Extract and analyze content
    const analysis = await extractMetadata(url);
    
    // Generate unique ID to prevent React key conflicts
    const uniqueId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to content store
    const contentData = {
      id: uniqueId,
      url,
      ...analysis,
      userId,
      analyzedAt: new Date().toISOString()
    };
    
    // Add to persistent storage
    serverStorage.addUserContent(userId, contentData);
    
    console.log('✅ Content analyzed and saved with unique ID:', uniqueId);
    
    return NextResponse.json({
      success: true,
      data: contentData
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' }, 
      { status: 500 }
    );
  }
} 
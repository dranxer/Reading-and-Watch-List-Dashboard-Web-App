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
    const tags = [];
    const urlLower = url.toLowerCase();
    const contentLower = (title + ' ' + description).toLowerCase();
    
    // Tech-related tags
    if (contentLower.includes('react') || urlLower.includes('react')) tags.push('react');
    if (contentLower.includes('javascript') || urlLower.includes('javascript')) tags.push('javascript');
    if (contentLower.includes('typescript') || urlLower.includes('typescript')) tags.push('typescript');
    if (contentLower.includes('python') || urlLower.includes('python')) tags.push('python');
    if (contentLower.includes('ai') || contentLower.includes('artificial intelligence')) tags.push('ai');
    if (contentLower.includes('tutorial') || contentLower.includes('guide')) tags.push('tutorial');
    if (contentLower.includes('frontend') || contentLower.includes('front-end')) tags.push('frontend');
    if (contentLower.includes('backend') || contentLower.includes('back-end')) tags.push('backend');
    
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
    if (contentLower.includes('tutorial') || contentLower.includes('guide') || contentLower.includes('how to')) {
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
      tags: tags.slice(0, 5), // Limit to 5 tags
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
    
    // Save to content store
    const contentData = {
      id: Date.now().toString(),
      url,
      ...analysis,
      userId,
      analyzedAt: new Date().toISOString()
    };
    
    // Add to persistent storage
    serverStorage.addUserContent(userId, contentData);
    
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
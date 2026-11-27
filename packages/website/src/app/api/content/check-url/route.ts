import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

// Function to normalize URLs for duplicate checking
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // For YouTube, remove query parameters except for 'v' (video ID)
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    // For other sites, remove query parameters and fragments
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url; // Return original if normalization fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    const normalizedUrl = normalizeUrl(url);
    
    console.log('🔍 Checking URL duplicate:', normalizedUrl);

    // Check if user is authenticated to search their content
    if (userId) {
      const userContent = await serverStorage.getUserContent(userId);
      const exists = userContent.some(item => normalizeUrl(item.url) === normalizedUrl);
      
      console.log('🔍 User authenticated, checked content:', exists);
      
      return NextResponse.json({
        success: true,
        exists: exists
      });
    }

    // For unauthenticated users, return false (allow saving)
    return NextResponse.json({
      success: true,
      exists: false
    });

  } catch (error) {
    console.error('❌ Error checking URL duplicate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check URL duplicate' 
      },
      { status: 500 }
    );
  }
} 
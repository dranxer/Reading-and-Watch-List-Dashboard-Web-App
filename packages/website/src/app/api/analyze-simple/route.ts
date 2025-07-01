import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST analyze-simple request received');
    
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }
    
    const { url } = requestData;
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        error: 'Invalid URL',
        message: 'Please provide a valid URL to analyze'
      }, { status: 400 });
    }
    
    // Simple mock analysis based on URL
    let analysis;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      analysis = {
        title: "Sample YouTube Video",
        description: "This is a sample YouTube video analysis",
        type: "video",
        source: "youtube.com",
        duration: "10:30",
        tags: ["video", "youtube", "tutorial"],
        qualityScore: 85,
        summary: "A helpful tutorial video with good production quality"
      };
    } else if (url.includes('dev.to')) {
      analysis = {
        title: "Sample Dev.to Article",
        description: "This is a sample development article analysis",
        type: "article",
        source: "dev.to",
        readingTime: "5 min read",
        tags: ["development", "programming", "tutorial"],
        qualityScore: 90,
        summary: "A well-written technical article with practical examples"
      };
    } else {
      analysis = {
        title: "Sample Web Content",
        description: "This is a sample content analysis",
        type: "article",
        source: new URL(url).hostname,
        readingTime: "3 min read",
        tags: ["web", "content"],
        qualityScore: 70,
        summary: "General web content with standard quality"
      };
    }
    
    const response = NextResponse.json({
      success: true,
      data: analysis,
      url: url,
      message: "URL analyzed successfully"
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({
      error: 'Failed to analyze URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
} 
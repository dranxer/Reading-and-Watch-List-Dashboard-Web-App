import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST summarize-simple request received');
    
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }
    
    const { title, description, contentType } = requestData;
    
    if (!title || !description || !contentType) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'Title, description, and contentType are required' 
      }, { status: 400 });
    }
    
    // Generate a simple mock summary based on the content type and title
    let summary;
    if (contentType === 'video') {
      summary = `This ${contentType} titled "${title}" covers key concepts in an engaging visual format. ${description.split('.')[0]}. The video provides practical insights and actionable takeaways that viewers can immediately apply.`;
    } else if (contentType === 'article') {
      summary = `This ${contentType} titled "${title}" provides comprehensive coverage of the topic. ${description.split('.')[0]}. The article includes detailed explanations, examples, and best practices for readers.`;
    } else {
      summary = `This ${contentType} titled "${title}" offers valuable information on the subject. ${description.split('.')[0]}. It contains useful insights and practical knowledge for the audience.`;
    }
    
    const response = NextResponse.json({
      success: true,
      summary: summary,
      metadata: {
        title: title,
        contentType: contentType,
        wordCount: summary.split(' ').length,
        estimatedReadTime: Math.ceil(summary.split(' ').length / 200) + " min"
      },
      message: "Summary generated successfully"
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate summary',
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
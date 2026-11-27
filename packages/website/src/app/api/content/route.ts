import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass auth for testing
    let userId;
    try {
      const authResult = await auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.log('Auth failed, using mock user for testing:', authError);
    }
    
    // Use mock user if auth fails - using real user ID with content
    if (!userId) {
      userId = "demo_curator";
      console.log('🧪 Using real user with content for testing:', userId);
    }
    
    const userContent = await serverStorage.getUserContent(userId);
    
    const response = NextResponse.json({
      success: true,
      data: userContent,
      count: userContent.length
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Get content error:', error);
    const response = NextResponse.json(
      { 
        error: 'Failed to retrieve content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
    
    // Add CORS headers even for errors
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily bypass auth for testing
    let userId;
    try {
      const authResult = await auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.log('Auth failed, using mock user for testing:', authError);
    }
    
    // Use mock user if auth fails - using real user ID with content
    if (!userId) {
      // Writes always require a signed-in user
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    
    // Safely parse JSON with fallback
    let contentItem;
    try {
      contentItem = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }
    
    // Validate required fields
    if (!contentItem.title && !contentItem.url) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Either title or url is required'
      }, { status: 400 });
    }
    
    // Generate a unique ID to prevent React key conflicts
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new content item
    const newItem = {
      id: uniqueId,
      title: contentItem.title || 'Untitled',
      url: contentItem.url || '',
      description: contentItem.description || '',
      type: contentItem.type || 'article',
      tags: contentItem.tags || [],
      source: contentItem.source || '',
      readingTime: contentItem.readingTime || '',
      qualityScore: contentItem.qualityScore || 50,
      ...contentItem,
      userId,
      createdAt: new Date().toISOString(),
    };
    
    // Add to persistent storage
    await serverStorage.addUserContent(userId, newItem);
    
    console.log('✅ Content saved with unique ID:', uniqueId);
    
    const response = NextResponse.json({
      success: true,
      data: newItem,
      message: 'Content saved successfully'
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Save content error:', error);
    const response = NextResponse.json(
      { 
        error: 'Failed to save content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
    
    // Add CORS headers even for errors
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle preflight requests
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
} 
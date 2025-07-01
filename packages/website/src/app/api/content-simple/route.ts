import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';

// Mock user ID for testing (since we don't have auth)
const MOCK_USER_ID = "test-user-123";

export async function GET(request: NextRequest) {
  try {
    console.log('📄 GET content-simple request received');
    
    // Get content from serverStorage
    const userContent = serverStorage.getUserContent(MOCK_USER_ID);
    
    const response = NextResponse.json({
      success: true,
      data: userContent,
      count: userContent.length,
      message: "Content retrieved successfully from local storage"
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📄 POST content-simple request received');
    
    let contentItem;
    try {
      contentItem = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }
    
    // Generate a unique ID
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
      createdAt: new Date().toISOString(),
      ...contentItem
    };
    
    // Add to serverStorage
    serverStorage.addUserContent(MOCK_USER_ID, newItem);
    
    console.log('✅ Content saved to local storage with ID:', uniqueId);
    
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
    return NextResponse.json({
      error: 'Failed to save content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }
    
    const userContent = serverStorage.getUserContent(userId);
    
    const response = NextResponse.json({
      success: true,
      data: userContent
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Get content error:', error);
    const response = NextResponse.json(
      { error: 'Failed to retrieve content' }, 
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
    const { userId } = await auth();
    
    if (!userId) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }
    
    const contentItem = await request.json();
    
    // Generate a unique ID to prevent React key conflicts
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new content item
    const newItem = {
      id: uniqueId,
      ...contentItem,
      userId,
      createdAt: new Date().toISOString(),
    };
    
    // Add to persistent storage
    serverStorage.addUserContent(userId, newItem);
    
    console.log('✅ Content saved with unique ID:', uniqueId);
    
    const response = NextResponse.json({
      success: true,
      data: newItem
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Save content error:', error);
    const response = NextResponse.json(
      { error: 'Failed to save content' }, 
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
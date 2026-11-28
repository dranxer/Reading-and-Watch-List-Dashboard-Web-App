import { isGuestId } from '@/lib/authMode';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId, email } = await auth();
    
    if (!userId) {
      const response = NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    const lists = await serverStorage.getUserLists(userId, email);
    const response = NextResponse.json({ success: true, data: lists });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Failed to fetch reading lists:', error);
    const response = NextResponse.json({ success: false, error: 'Failed to fetch reading lists' }, { status: 500 });
    
    // Add CORS headers even for errors
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await auth();
    
    if (!userId) {
      const response = NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    const body = await request.json();
    const { name, description = '', isPublic = false, isCollaborative = false } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      const response = NextResponse.json({ success: false, error: 'List name is required' }, { status: 400 });
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    if (typeof description !== 'string' || typeof isPublic !== 'boolean' || typeof isCollaborative !== 'boolean' || name.length > 200 || description.length > 5000) return NextResponse.json({ error: 'Invalid list fields' }, { status: 400 });
    if (isGuestId(userId) && (isPublic === true)) return NextResponse.json({ error: 'Sign in with Google to share publicly' }, { status: 401 });
    const newListData = {
      name: name.trim(),
      description: description.trim(),
      ownerId: userId,
      isPublic,
      isCollaborative,
      contentIds: [],
      collaborators: []
    };

    const savedList = await serverStorage.createReadingList(newListData);
    const response = NextResponse.json({ success: true, data: savedList });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Failed to create reading list:', error);
    const response = NextResponse.json({ success: false, error: 'Failed to create reading list' }, { status: 500 });
    
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
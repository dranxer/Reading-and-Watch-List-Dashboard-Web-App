import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';

// Mock user ID for testing
const MOCK_USER_ID = "test-user-123";

export async function GET(request: NextRequest) {
  try {
    console.log('👤 GET profiles-simple request received');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        message: 'Please provide a userId parameter'
      }, { status: 400 });
    }

    // Find profile by userId from serverStorage
    const profile = serverStorage.getUserProfile(userId);
    
    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        message: `No profile found for user ID: ${userId}`
      }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      data: profile,
      message: "Profile retrieved successfully from local storage"
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({
      error: 'Failed to retrieve profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('👤 POST profiles-simple request received');
    
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }

    const { displayName, bio, website, isPublic } = requestData;

    // Generate new user ID
    const userId = `user-${Date.now()}`;
    
    // Create profile using serverStorage
    const newProfile = serverStorage.createUserProfile(userId, {
      displayName: displayName || 'New User',
      bio: bio || '',
      isPublic: isPublic !== false
    });

    const response = NextResponse.json({
      success: true,
      data: newProfile,
      message: "Profile created successfully in local storage"
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({
      error: 'Failed to create profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
} 
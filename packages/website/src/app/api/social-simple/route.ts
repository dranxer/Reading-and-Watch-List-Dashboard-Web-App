import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';

// Mock user ID for testing
const MOCK_USER_ID = "test-user-123";

export async function GET(request: NextRequest) {
  try {
    console.log('👥 GET social-simple request received');
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    
    let responseData;
    
    switch (action) {
      case 'following':
        const following = await serverStorage.getFollowing(userId || MOCK_USER_ID);
        responseData = {
          success: true,
          data: following,
          message: "Following list retrieved from local storage"
        };
        break;
        
      case 'followers':
        const followers = await serverStorage.getFollowers(userId || MOCK_USER_ID);
        responseData = {
          success: true,
          data: followers,
          message: "Followers list retrieved from local storage"
        };
        break;
        
      case 'profile':
        const user = await serverStorage.getUserProfile(userId || MOCK_USER_ID);
        responseData = {
          success: true,
          data: user || null,
          message: user ? "Profile retrieved from local storage" : "User not found"
        };
        break;
        
      case 'lists':
        const publicLists = await serverStorage.getPublicLists();
        responseData = {
          success: true,
          data: publicLists,
          message: "Public lists retrieved from local storage"
        };
        break;
        
      default:
        const allUsers = await serverStorage.getAllUserProfiles();
        const allPublicLists = await serverStorage.getPublicLists();
        responseData = {
          success: true,
          data: {
            users: Object.values(allUsers),
            lists: allPublicLists
          },
          message: "Social data retrieved from local storage"
        };
    }
    
    const response = NextResponse.json(responseData);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Social API GET error:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('👥 POST social-simple request received');
    
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        message: 'Please send valid JSON data'
      }, { status: 400 });
    }
    
    const { action, targetUserId, profileData } = requestData;
    
    let responseData;
    
    switch (action) {
      case 'follow':
        if (!targetUserId) {
          return NextResponse.json({
            error: 'Target user ID required'
          }, { status: 400 });
        }
        const followed = await serverStorage.followUser(MOCK_USER_ID, targetUserId);
        responseData = {
          success: followed,
          message: followed ? `Successfully followed user ${targetUserId}` : 'Already following or error occurred',
          action: 'follow',
          targetUserId: targetUserId
        };
        break;
        
      case 'unfollow':
        if (!targetUserId) {
          return NextResponse.json({
            error: 'Target user ID required'
          }, { status: 400 });
        }
        const unfollowed = await serverStorage.unfollowUser(MOCK_USER_ID, targetUserId);
        responseData = {
          success: unfollowed,
          message: unfollowed ? `Successfully unfollowed user ${targetUserId}` : 'Not following or error occurred',
          action: 'unfollow',
          targetUserId: targetUserId
        };
        break;
        
      case 'create_profile':
        const newUserId = `user-${Date.now()}`;
        const newProfile = await serverStorage.createUserProfile(newUserId, {
          displayName: profileData?.displayName || 'New User',
          bio: profileData?.bio || '',
          isPublic: profileData?.isPublic !== false
        });
        responseData = {
          success: true,
          data: newProfile,
          message: 'Profile created successfully in local storage'
        };
        break;
        
      case 'update_profile':
        const updated = await serverStorage.updateUserProfile(MOCK_USER_ID, profileData || {});
        responseData = {
          success: updated,
          message: updated ? 'Profile updated successfully in local storage' : 'Profile not found',
          data: profileData
        };
        break;
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          message: 'Supported actions: follow, unfollow, create_profile, update_profile'
        }, { status: 400 });
    }
    
    const response = NextResponse.json(responseData);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error) {
    console.error('Social API POST error:', error);
    return NextResponse.json({
      error: 'Failed to process request',
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
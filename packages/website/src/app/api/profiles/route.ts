import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    // If no userId provided, use current authenticated user or fallback
    if (!userId) {
      try {
        const authResult = await auth();
        userId = authResult?.userId || 'demo_curator';
      } catch (error) {
        userId = 'demo_curator'; // Fallback to real user ID
      }
    }

    // Ensure userId is never null (TypeScript safety)
    const finalUserId = userId || 'demo_curator';

    // Use serverStorage methods
    const profile = await serverStorage.getUserProfile(finalUserId);
    const allContent = await serverStorage.getUserContent(finalUserId);
    
    // Count public content (assume all content is public for now)
    const publicContentCount = allContent.length;

    // Get followers and following counts
    const followers = await serverStorage.getFollowers(finalUserId);
    const following = await serverStorage.getFollowing(finalUserId);

    const profileData = {
      userId: finalUserId,
      displayName: profile?.displayName || 'User Profile',
      bio: profile?.bio || 'Reading enthusiast',
      isPublic: profile?.isPublic !== false,
      publicContentCount,
      followersCount: followers.length,
      followingCount: following.length,
      totalContent: allContent.length,
      joinedAt: profile?.joinedAt || new Date().toISOString(),
      stats: profile?.stats || {
        totalContent: allContent.length,
        totalReads: 0,
        favoriteCategories: []
      }
    };

    const response = NextResponse.json(profileData);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Error fetching profile:', error);
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    
    // Add CORS headers even for errors
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId;
    try {
      const authResult = await auth();
      userId = authResult?.userId;
    } catch (error) {
      console.log('Auth failed, using fallback user ID');
      userId = 'demo_curator'; // Fallback to real user ID
    }

    // Ensure userId is never null
    const finalUserId = userId || 'demo_curator';

    const body = await request.json();
    const { displayName, bio, isPublic } = body;

    // Check if profile exists
    const existingProfile = await serverStorage.getUserProfile(finalUserId);
    
    if (existingProfile) {
      // Update existing profile
      const updates = {
        displayName: displayName || existingProfile.displayName,
        bio: bio || existingProfile.bio,
        isPublic: isPublic !== undefined ? isPublic : existingProfile.isPublic
      };
      
      await serverStorage.updateUserProfile(finalUserId, updates);
      const updatedProfile = await serverStorage.getUserProfile(finalUserId);
      
      const response = NextResponse.json(updatedProfile);
      
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    } else {
      // Create new profile
      const newProfile = await serverStorage.createUserProfile(finalUserId, {
        displayName: displayName || 'User Profile',
        bio: bio || 'Reading enthusiast',
        isPublic: isPublic !== undefined ? isPublic : true
      });
      
      const response = NextResponse.json(newProfile);

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    
    // Add CORS headers even for errors
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
}

// Handle CORS preflight requests
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
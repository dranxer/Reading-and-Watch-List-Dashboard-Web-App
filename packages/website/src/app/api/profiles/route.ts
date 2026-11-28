import { isGuestId } from '@/lib/authMode';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const finalUserId = searchParams.get('userId') || userId;
    const target = await serverStorage.getUserProfile(finalUserId);
    if (finalUserId !== userId && !target?.isPublic) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    // Use serverStorage methods
    const profile = await serverStorage.getUserProfile(finalUserId);
    const allContent = await serverStorage.getUserContent(finalUserId);
    
    // Count public content (assume all content is public for now)
    const publicContentCount = allContent.filter(item => item.isPublic === true).length;

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
      totalContent: finalUserId === userId ? allContent.length : publicContentCount,
      joinedAt: profile?.joinedAt || new Date().toISOString(),
      stats: (finalUserId === userId ? profile?.stats : null) || {
        totalContent: finalUserId === userId ? allContent.length : publicContentCount,
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
    const { userId: finalUserId } = await auth();
    if (!finalUserId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json();
    const { displayName, bio, isPublic } = body;

    if (isGuestId(finalUserId) && (isPublic === true)) return NextResponse.json({ error: 'Sign in with Google to share publicly' }, { status: 401 });
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
import { isGuestId } from '@/lib/authMode';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const targetUserId = searchParams.get('userId');
    
    switch (action) {
      case 'following':
        const following = await serverStorage.getFollowing(userId);
        const followingData = following.map(followingId => ({ followingId }));
        return NextResponse.json(followingData);
        
      case 'followers':
        const followers = await serverStorage.getFollowers(userId);
        return NextResponse.json({ success: true, data: followers });
        
      case 'profile':
        if (!targetUserId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }
        const profile = await serverStorage.getUserProfile(targetUserId);
        if (targetUserId !== userId && !profile?.isPublic) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: profile });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Social API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    
    const { action, targetUserId, profileData } = await request.json();
    
    if (isGuestId(userId) && profileData?.isPublic === true) return NextResponse.json({ error: 'Sign in with Google to publish a profile' }, { status: 401 });
    switch (action) {
      case 'follow':
        if (!targetUserId) {
          return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
        }
        const followed = await serverStorage.followUser(userId, targetUserId);
        return NextResponse.json({ 
          success: followed, 
          message: followed ? 'User followed' : 'Already following' 
        });
        
      case 'unfollow':
        if (!targetUserId) {
          return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
        }
        const unfollowed = await serverStorage.unfollowUser(userId, targetUserId);
        return NextResponse.json({ 
          success: unfollowed, 
          message: unfollowed ? 'User unfollowed' : 'Not following' 
        });
        
      case 'create_profile':
        const profile = await serverStorage.createUserProfile(userId, Object.fromEntries(Object.entries(profileData || {}).filter(([key]) => ['displayName', 'bio', 'isPublic'].includes(key))));
        return NextResponse.json({ success: true, data: profile });
        
      case 'update_profile':
        const updated = await serverStorage.updateUserProfile(userId, Object.fromEntries(Object.entries(profileData || {}).filter(([key]) => ['displayName', 'bio', 'isPublic'].includes(key))));
        return NextResponse.json({ 
          success: updated, 
          message: updated ? 'Profile updated' : 'Profile not found' 
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Social API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
} 
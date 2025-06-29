import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get only the current user's public reading lists
    const userLists = serverStorage.getUserLists(userId);
    const userProfile = serverStorage.getUserProfile(userId);
    
    // Filter for only public lists created by the current user
    const publicLists = userLists
      .filter(list => list.isPublic === true)
      .map(list => ({
        ...list,
        owner: {
          displayName: userProfile?.displayName || 'Your Lists',
          bio: userProfile?.bio || ''
        }
      }));

    console.log(`✅ Found ${publicLists.length} public reading lists for discovery`);
    
    return NextResponse.json(publicLists);
  } catch (error) {
    console.error('Error fetching public lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
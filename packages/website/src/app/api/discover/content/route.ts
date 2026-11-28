import { NextRequest, NextResponse } from 'next/server';
import { isGuestId } from '@/lib/authMode';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all content from all users
    const allContent = await serverStorage.getAllContent();
    const allUsers = await serverStorage.getAllUserProfiles();
    
    // Filter for public content only
    const publicContent = Object.entries(allContent)
      .filter(([id]) => !isGuestId(id))
      .flatMap(([authorUserId, userContent]) => 
        (userContent as any[])
          .filter((item: any) => item.isPublic === true)
          .map((item: any) => ({
            ...item,
            userId: authorUserId,
            author: {
              displayName: allUsers[authorUserId]?.displayName || 'Anonymous User'
            }
          }))
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`✅ Found ${publicContent.length} public content items for discovery`);
    
    return NextResponse.json(publicContent);
  } catch (error) {
    console.error('Error fetching public content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
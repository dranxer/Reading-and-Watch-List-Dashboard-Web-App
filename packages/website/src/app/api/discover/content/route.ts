import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all content from all users
    const allContent = serverStorage.getAllContent();
    const allUsers = serverStorage.getAllUserProfiles();
    
    // Filter for public content only
    const publicContent = Object.entries(allContent)
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
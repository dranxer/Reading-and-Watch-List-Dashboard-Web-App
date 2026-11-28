import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { clerkClient } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Get ALL public reading lists from ALL users
    const allPublicLists = await serverStorage.getPublicLists();
    
    // Enrich each list with creator information from Clerk
    const enrichedLists = await Promise.all(
      allPublicLists.map(async (list) => {
        try {
          // Get creator info from Clerk
          const client = await clerkClient();
          const creator = await client.users.getUser(list.ownerId);
          
          return {
            ...list,
            creator: {
              id: creator.id,
              name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Anonymous User',
              firstName: creator.firstName || 'Anonymous',
              lastName: creator.lastName || '',
              imageUrl: creator.imageUrl || '',
              isCurrentUser: creator.id === userId
            }
          };
        } catch (error) {
          console.error(`Error fetching creator info for list ${list.id}:`, error);
          
          // Fallback to serverStorage profile if Clerk fails
          const userProfile = await serverStorage.getUserProfile(list.ownerId);
          return {
            ...list,
            creator: {
              id: list.ownerId,
              name: userProfile?.displayName || 'Unknown User',
              firstName: userProfile?.displayName?.split(' ')[0] || 'Unknown',
              lastName: '',
              email: '',
              imageUrl: '',
              isCurrentUser: list.ownerId === userId
            }
          };
        }
      })
    );

    // Sort lists - current user's lists first, then by creation date
    const sortedLists = enrichedLists.sort((a, b) => {
      // Current user's lists first
      if (a.creator.isCurrentUser && !b.creator.isCurrentUser) return -1;
      if (!a.creator.isCurrentUser && b.creator.isCurrentUser) return 1;
      
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`✅ Found ${sortedLists.length} public reading lists from all users for discovery`);
    
    const response = NextResponse.json(sortedLists);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Error fetching public lists:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const profilesCollection = db.collection('profiles');
    const contentCollection = db.collection('content');

    // Get all public profiles except the current user
    const profiles = await profilesCollection
      .find({ 
        isPublic: true,
        userId: { $ne: userId }
      })
      .toArray();

    // Get stats for each profile
    const profilesWithStats = await Promise.all(
      profiles.map(async (profile) => {
        const publicContentCount = await contentCollection.countDocuments({ 
          userId: profile.userId, 
          isPublic: true 
        });

        const followersCount = await db.collection('follows').countDocuments({ 
          followingId: profile.userId 
        });
        
        const followingCount = await db.collection('follows').countDocuments({ 
          followerId: profile.userId 
        });

        return {
          ...profile,
          publicContentCount,
          followersCount,
          followingCount
        };
      })
    );

    // Sort by public content count (most active first)
    profilesWithStats.sort((a, b) => b.publicContentCount - a.publicContentCount);

    return NextResponse.json(profilesWithStats);
  } catch (error) {
    console.error('Error fetching discoverable profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
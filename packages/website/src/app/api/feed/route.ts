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

    // Get users that the current user is following
    const followsCollection = db.collection('follows');
    const following = await followsCollection
      .find({ followerId: userId })
      .toArray();

    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get public content from followed users
    const contentCollection = db.collection('content');
    const feedContent = await contentCollection
      .find({ 
        userId: { $in: followingIds },
        isPublic: true 
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get user profiles for the content
    const profilesCollection = db.collection('profiles');
    const userIds = [...new Set(feedContent.map(c => c.userId))];
    
    const profiles = await profilesCollection
      .find({ userId: { $in: userIds } })
      .toArray();

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    // Combine content with user profiles
    const feedWithProfiles = feedContent.map(content => ({
      ...content,
      user: profileMap.get(content.userId)
    }));

    return NextResponse.json(feedWithProfiles);
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const profilesCollection = db.collection('profiles');
    const contentCollection = db.collection('content');

    // Get user profile
    const profile = await profilesCollection.findOne({ userId });
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get public content count
    const publicContentCount = await contentCollection.countDocuments({ 
      userId, 
      isPublic: true 
    });

    // Get followers and following counts
    const followersCount = await db.collection('follows').countDocuments({ 
      followingId: userId 
    });
    
    const followingCount = await db.collection('follows').countDocuments({ 
      followerId: userId 
    });

    const profileData = {
      ...profile,
      publicContentCount,
      followersCount,
      followingCount
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { displayName, bio, website, isPublic } = body;

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('profiles');

    const profileData = {
      userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      bio: bio || '',
      website: website || '',
      isPublic: isPublic !== undefined ? isPublic : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert profile
    await collection.updateOne(
      { userId },
      { $set: profileData },
      { upsert: true }
    );

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
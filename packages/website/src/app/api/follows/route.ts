import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'followers' or 'following'

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('follows');

    let query: any = {};
    if (type === 'followers') {
      query.followingId = userId;
    } else if (type === 'following') {
      query.followerId = userId;
    } else {
      return NextResponse.json({ error: 'Type parameter required: followers or following' }, { status: 400 });
    }

    const follows = await collection.find(query).toArray();

    // Get user profiles for the follows
    const profilesCollection = db.collection('profiles');
    const userIds = follows.map(f => type === 'followers' ? f.followerId : f.followingId);
    
    const profiles = await profilesCollection
      .find({ userId: { $in: userIds } })
      .toArray();

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    const followsWithProfiles = follows.map(follow => ({
      ...follow,
      user: profileMap.get(type === 'followers' ? follow.followerId : follow.followingId)
    }));

    return NextResponse.json(followsWithProfiles);
  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { followingId } = body;

    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 });
    }

    if (userId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('follows');

    // Check if already following
    const existingFollow = await collection.findOne({ 
      followerId: userId, 
      followingId: followingId 
    });

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 409 });
    }

    const newFollow: any = {
      followerId: userId,
      followingId: followingId,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newFollow);
    newFollow._id = result.insertedId;

    return NextResponse.json(newFollow, { status: 201 });
  } catch (error) {
    console.error('Error creating follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const followingId = searchParams.get('followingId');

    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('follows');

    const result = await collection.deleteOne({ 
      followerId: userId, 
      followingId: followingId 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Follow relationship not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error deleting follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
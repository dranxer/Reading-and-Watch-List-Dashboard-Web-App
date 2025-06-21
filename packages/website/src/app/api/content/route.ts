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
    const publicOnly = searchParams.get('public') === 'true';
    const getAllPublic = searchParams.get('all') === 'true';
    const profileUserId = searchParams.get('userId'); // For viewing other users' content

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('content');

    let query: any = {};

    if (getAllPublic) {
        query.isPublic = true;
    } else {
        const targetUserId = profileUserId || userId;
        query.userId = targetUserId;
        if (publicOnly || profileUserId) {
            query.isPublic = true;
        }
    }

    const content = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
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
    const { url, title, content, summary, type, qualityRating, qualityExplanation, isPublic } = body;

    if (!url || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('content');

    // Check if content already exists for this user and URL
    const existingContent = await collection.findOne({ userId, url });
    if (existingContent) {
      return NextResponse.json({ error: 'Content already exists for this URL' }, { status: 409 });
    }

    const newContent: any = {
      userId,
      url,
      title,
      content,
      summary: summary || '',
      type: type || 'ARTICLE',
      qualityRating: qualityRating || null,
      qualityExplanation: qualityExplanation || null,
      isPublic: isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newContent);
    newContent._id = result.insertedId;

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
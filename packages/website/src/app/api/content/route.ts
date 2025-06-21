import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { url, title, content, summary, type } = body;

    if (!url || !title || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker'); // You can name your database anything
    const collection = db.collection('contentItems');

    const newItem = {
      createdAt: new Date(),
      userId,
      url,
      title,
      content,
      summary,
      type,
    };

    const result = await collection.insertOne(newItem);

    return NextResponse.json({ ...newItem, _id: result.insertedId });

  } catch (error) {
    console.error('Error in /api/content:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 
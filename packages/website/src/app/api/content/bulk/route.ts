import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        error: 'Array of content IDs is required' 
      }, { status: 400 });
    }

    // Validate all ObjectIds
    const validIds = ids.filter(id => ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      return NextResponse.json({ 
        error: 'Some content IDs have invalid format' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('content');

    // Delete multiple content items (only if they belong to the user)
    const result = await collection.deleteMany({
      _id: { $in: validIds.map(id => new ObjectId(id)) },
      userId: userId
    });

    console.log(`Bulk delete for user ${userId}:`, { 
      requested: ids.length, 
      deleted: result.deletedCount 
    });

    return NextResponse.json({ 
      message: 'Bulk delete completed',
      requestedCount: ids.length,
      deletedCount: result.deletedCount,
      deletedIds: validIds
    });

  } catch (error) {
    console.error('Error in /api/content/bulk DELETE:', error);
    return NextResponse.json({ 
      error: 'Failed to perform bulk delete',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
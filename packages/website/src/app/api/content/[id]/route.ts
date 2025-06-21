import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ 
        error: 'Content ID is required' 
      }, { status: 400 });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        error: 'Invalid content ID format' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('reading-tracker');
    const collection = db.collection('contentItems');

    // Delete the content item (only if it belongs to the user)
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: userId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Content not found or you do not have permission to delete it' 
      }, { status: 404 });
    }

    console.log(`Content deleted for user ${userId}:`, { id });

    return NextResponse.json({ 
      message: 'Content deleted successfully',
      deletedId: id
    });

  } catch (error) {
    console.error('Error in /api/content/[id] DELETE:', error);
    return NextResponse.json({ 
      error: 'Failed to delete content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
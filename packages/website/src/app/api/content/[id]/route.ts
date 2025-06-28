import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { serverStorage } from '@/lib/serverStorage';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

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
    const collection = db.collection('content');

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Add fields that are being updated
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.qualityRating !== undefined) updateData.qualityRating = body.qualityRating;
    if (body.qualityExplanation !== undefined) updateData.qualityExplanation = body.qualityExplanation;

    // Update the content item (only if it belongs to the user)
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        userId: userId
      },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ 
        error: 'Content not found or you do not have permission to update it' 
      }, { status: 404 });
    }

    console.log(`Content updated for user ${userId}:`, { id, fields: Object.keys(updateData) });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/content/[id] PATCH:', error);
    return NextResponse.json({ 
      error: 'Failed to update content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const contentId = params.id;
    
    // Remove from persistent storage
    const deleted = serverStorage.removeUserContent(userId, contentId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' }, 
      { status: 500 }
    );
  }
} 
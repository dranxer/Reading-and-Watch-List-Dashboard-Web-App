import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const listId = params.id;
    const body = await request.json();
    const { name, description, isPublic, isCollaborative } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'List name is required' }, { status: 400 });
    }

    const updatedData = {
      name: name.trim(),
      description: description?.trim() || '',
      isPublic: Boolean(isPublic),
      isCollaborative: Boolean(isCollaborative)
    };

    const success = serverStorage.updateReadingList(listId, updatedData);

    if (success) {
      return NextResponse.json({ success: true, data: updatedData });
    } else {
      return NextResponse.json({ success: false, error: 'List not found or access denied' }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to update reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to update reading list' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const listId = params.id;
    const success = serverStorage.deleteReadingList(listId, userId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'List not found or access denied' }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to delete reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete reading list' }, { status: 500 });
  }
} 
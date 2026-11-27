import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { contentId } = await request.json();
    const listId = (await params).id;

    if (!contentId) {
      return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
    }

    // Remove content from the reading list
    const success = await serverStorage.removeFromReadingList(listId, contentId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to remove content from list' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to remove content from reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove content from reading list' }, { status: 500 });
  }
} 
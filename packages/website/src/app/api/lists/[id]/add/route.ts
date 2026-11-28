import { auth } from '@/lib/auth';
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

    const result = await serverStorage.addToReadingList(listId, contentId, userId);
    if (result === 'added' || result === 'exists') {
      return NextResponse.json({ success: true, alreadyInList: result === 'exists' });
    }
    if (result === 'forbidden') {
      return NextResponse.json({ success: false, error: 'You can only add to your own lists' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'That list no longer exists. Refresh the page and try again.' }, { status: 404 });
  } catch (error) {
    console.error('Failed to add content to reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to add content to reading list' }, { status: 500 });
  }
} 
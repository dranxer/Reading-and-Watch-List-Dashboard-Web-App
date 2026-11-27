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

    // Add content to the reading list
    const success = await serverStorage.addToReadingList(listId, contentId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to add content to list' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to add content to reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to add content to reading list' }, { status: 500 });
  }
} 
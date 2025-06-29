import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const listId = params.id;
    const contents = serverStorage.getListContents(listId, userId);

    return NextResponse.json({ success: true, data: contents });
  } catch (error) {
    console.error('Failed to fetch list contents:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch list contents' }, { status: 500 });
  }
} 
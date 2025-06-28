import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const lists = serverStorage.getUserLists(userId);
    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error('Failed to fetch reading lists:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reading lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description = '', isPublic = false, isCollaborative = false } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'List name is required' }, { status: 400 });
    }

    const newListData = {
      name: name.trim(),
      description: description.trim(),
      ownerId: userId,
      isPublic,
      isCollaborative,
      contentIds: [],
      collaborators: []
    };

    const savedList = serverStorage.createReadingList(newListData);
    return NextResponse.json({ success: true, data: savedList });
  } catch (error) {
    console.error('Failed to create reading list:', error);
    return NextResponse.json({ success: false, error: 'Failed to create reading list' }, { status: 500 });
  }
} 
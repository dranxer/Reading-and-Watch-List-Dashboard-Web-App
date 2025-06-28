import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userContent = serverStorage.getUserContent(userId);
    
    return NextResponse.json({
      success: true,
      data: userContent
    });
    
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve content' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const contentItem = await request.json();
    
    // Generate a unique ID to prevent React key conflicts
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new content item
    const newItem = {
      id: uniqueId,
      ...contentItem,
      userId,
      createdAt: new Date().toISOString(),
    };
    
    // Add to persistent storage
    serverStorage.addUserContent(userId, newItem);
    
    console.log('✅ Content saved with unique ID:', uniqueId);
    
    return NextResponse.json({
      success: true,
      data: newItem
    });
    
  } catch (error) {
    console.error('Save content error:', error);
    return NextResponse.json(
      { error: 'Failed to save content' }, 
      { status: 500 }
    );
  }
} 
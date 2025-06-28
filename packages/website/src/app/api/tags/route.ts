import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const tags = serverStorage.getAllTags();
    
    return NextResponse.json({
      success: true,
      data: tags
    });
    
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve tags' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const { name, category, color, isSystemTag = false } = await request.json();
    
    if (!name || !category) {
      return NextResponse.json({ success: false, error: 'Name and category are required' }, { status: 400 });
    }
    
    // Check if tag already exists
    const existingTags = serverStorage.getAllTags();
    const exists = existingTags.some(tag => 
      tag.name.toLowerCase() === name.toLowerCase()
    );
    
    if (exists) {
      return NextResponse.json({ success: false, error: 'Tag already exists' }, { status: 409 });
    }
    
    const newTag = serverStorage.createTag({
      name: name.trim(),
      category: category.trim(),
      color: color || '#3b82f6',
      createdBy: userId,
      isSystemTag
    });
    
    return NextResponse.json({
      success: true,
      data: newTag
    });
    
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' }, 
      { status: 500 }
    );
  }
} 
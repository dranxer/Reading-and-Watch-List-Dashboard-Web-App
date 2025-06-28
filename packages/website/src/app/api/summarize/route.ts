import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { title, description, contentType } = await request.json();
    
    if (!title || !description || !contentType) {
      return NextResponse.json({ 
        error: 'Title, description, and content type are required' 
      }, { status: 400 });
    }
    
    // For now, return a mock AI summary since WebLLM runs on client-side
    // In a real implementation, you'd use a server-side AI model
    const mockSummary = `This ${contentType} discusses ${title.toLowerCase()}. ${description.split('.')[0]}. Key insights include practical applications and actionable takeaways for readers interested in this topic.`;
    
    return NextResponse.json({
      success: true,
      summary: mockSummary
    });
    
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' }, 
      { status: 500 }
    );
  }
} 
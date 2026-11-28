import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { firstSentence, keyPoints, composeSummary } from '@/lib/summary';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    
    const { title, description, contentType } = await request.json();
    
    if (!title || !description || !contentType) {
      return NextResponse.json({ 
        error: 'Title, description, and content type are required' 
      }, { status: 400 });
    }
    
    // Without the local model: the description's first sentence, then the page's key sentences
    const lead = firstSentence(String(description)) || String(title);
    const mockSummary = composeSummary(lead, keyPoints(String(description), [lead]));
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
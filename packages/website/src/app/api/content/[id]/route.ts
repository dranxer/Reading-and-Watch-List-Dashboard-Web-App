import { isGuestId } from '@/lib/authMode';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PUT(request, context);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });


    const contentId = (await params).id;
    const userContent = await serverStorage.getUserContent(userId);
    const item = userContent.find((item: any) => item.id === contentId);

    if (!item) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });


    const contentId = (await params).id;
    const body = await request.json();
    if (isGuestId(userId) && (body.isPublic === true)) return NextResponse.json({ error: 'Sign in with Google to share publicly' }, { status: 401 });
    const EDITABLE = ['aiSummary', 'summary', 'qualityRating', 'qualityExplanation', 'isPublic', 'tags', 'notes', 'status', 'rating', 'title', 'description'];
    const updates = Object.fromEntries(Object.entries(body || {}).filter(([k]) => EDITABLE.includes(k)));
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Update the content item
    const updated = await serverStorage.updateUserContent(userId, contentId, updates);

    if (!updated) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    console.log(`✅ Content ${contentId} updated for user ${userId}`);
    return NextResponse.json({ success: true, message: 'Content updated successfully' });
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });


    const contentId = (await params).id;
    
    // Delete the content item
    const deleted = await serverStorage.removeUserContent(userId, contentId);

    if (!deleted) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    console.log(`✅ Content ${contentId} deleted for user ${userId}`);
    return NextResponse.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isGuestId } from '@/lib/authMode';
import { serverStorage, listRole } from '@/lib/serverStorage';
import { metric } from '@vercel/functions';
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, email } = await auth();
  const list = await serverStorage.getReadingList((await params).id);
  const role = listRole(list, userId, email);
  if (!list || !role) return NextResponse.json({ error: 'List not found or private' }, { status: 404 });
  const { collaboratorEmails, collaborators, ...safe } = list;
  return NextResponse.json({ success: true, data: { ...safe, role, ...(role === 'owner' ? { collaboratorEmails: collaboratorEmails || [] } : {}) }, contents: await serverStorage.getListContents(list.id, userId || '', email) });
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || isGuestId(userId)) return NextResponse.json({ error: 'Sign in with Google to manage sharing' }, { status: 401 });
  const id = (await params).id;
  const list = await serverStorage.getReadingList(id);
  if (list?.ownerId !== userId) return NextResponse.json({ error: 'Only the owner can change sharing' }, { status: 403 });
  const body = await request.json();
  if (typeof body.isPublic !== 'boolean' || typeof body.isCollaborative !== 'boolean' || !Array.isArray(body.collaboratorEmails) || body.collaboratorEmails.length > 50 || body.collaboratorEmails.some((v: unknown) => typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 254)) return NextResponse.json({ error: 'Invalid sharing settings' }, { status: 400 });
  const collaboratorEmails = [...new Set<string>(body.collaboratorEmails.map((email: string) => email.trim().toLowerCase()))];
  await serverStorage.updateReadingList(id, { isPublic: body.isPublic, isCollaborative: body.isCollaborative, collaboratorEmails, collaborators: [] }, userId);
  metric('lists.sharing_updated', 1);
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { ids } = await request.json();
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some(id => typeof id !== 'string')) return NextResponse.json({ error: 'Provide up to 500 content IDs' }, { status: 400 });
  const content = await serverStorage.getUserContent(userId);
  const deletedIds = content.filter(item => ids.includes(item.id)).map(item => item.id);
  await serverStorage.setUserContent(userId, content.filter(item => !ids.includes(item.id)));
  return NextResponse.json({ requestedCount: ids.length, deletedCount: deletedIds.length, deletedIds });
}

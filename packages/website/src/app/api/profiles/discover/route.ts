import { NextResponse } from 'next/server';
import { isGuestId } from '@/lib/authMode';
import { auth } from '@/lib/auth';
import { serverStorage } from '@/lib/serverStorage';
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const profiles = await serverStorage.getAllUserProfiles();
  const content = await serverStorage.getAllContent();
  return NextResponse.json(await Promise.all(Object.values(profiles).filter(p => p.isPublic && !isGuestId(p.userId) && p.userId !== userId).map(async p => ({
    userId: p.userId, displayName: p.displayName, bio: p.bio, avatar: p.avatar,
    publicContentCount: (content[p.userId] || []).filter(i => i.isPublic === true).length,
    followersCount: (await serverStorage.getFollowers(p.userId)).length,
    followingCount: (await serverStorage.getFollowing(p.userId)).length,
  }))));
}

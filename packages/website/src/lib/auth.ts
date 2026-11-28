// Server-side auth for route handlers: Clerk when configured, otherwise the guest cookie.
import { auth as clerkAuth, clerkClient as clerkClientFn } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './googleSession';
import { CLERK_ENABLED, GUEST_COOKIE, isGuestId } from './authMode';

export async function auth(): Promise<{ userId: string | null; email?: string | null }> {
  if (CLERK_ENABLED) {
    const a = await clerkAuth();
    return { userId: a.userId ?? null };
  }
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) return { userId: session.userId, email: session.inviteEmail };
  const id = (await cookies()).get(GUEST_COOKIE)?.value ?? null;
  return { userId: isGuestId(id) ? id : null };
}

type MinimalUser = {
  id: string; firstName: string | null; lastName: string | null; username: string | null;
  imageUrl: string; emailAddresses: { emailAddress: string }[];
};

export async function clerkClient(): Promise<{ users: { getUser: (id: string) => Promise<MinimalUser> } }> {
  if (CLERK_ENABLED) return (await clerkClientFn()) as unknown as { users: { getUser: (id: string) => Promise<MinimalUser> } };
  return {
    users: {
      getUser: async (id: string) => ({
        id,
        firstName: isGuestId(id) ? 'Guest' : 'Demo',
        lastName: isGuestId(id) ? null : 'Reader',
        username: null,
        imageUrl: '',
        emailAddresses: [],
      }),
    },
  };
}

export async function currentUser(): Promise<(MinimalUser & { fullName: string | null }) | null> {
  if (CLERK_ENABLED) {
    const { currentUser: clerkCurrentUser } = await import('@clerk/nextjs/server');
    return (await clerkCurrentUser()) as unknown as (MinimalUser & { fullName: string | null }) | null;
  }
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) return { id: session.userId, firstName: session.name, lastName: null, fullName: session.name, username: null, imageUrl: session.picture, emailAddresses: [{ emailAddress: session.email }] };
  const { userId } = await auth();
  if (!userId) return null;
  const u = await (await clerkClient()).users.getUser(userId);
  return { ...u, fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || null };
}

'use client';
// Client-side auth: Clerk components/hooks when configured, guest-mode stand-ins otherwise.
import React from 'react';
import * as Clerk from '@clerk/nextjs';
import { CLERK_ENABLED, GUEST_COOKIE } from './authMode';

function guestId(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`(?:^|; )${GUEST_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

const guestUser = () => {
  const id = guestId();
  return {
    id,
    firstName: 'Guest',
    lastName: '',
    fullName: 'Guest',
    username: null as string | null,
    imageUrl: '',
    primaryEmailAddress: null as { emailAddress: string } | null,
    emailAddresses: [] as { emailAddress: string }[],
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return CLERK_ENABLED ? <Clerk.ClerkProvider>{children}</Clerk.ClerkProvider> : <>{children}</>;
}

export function useUser() {
  if (CLERK_ENABLED) return Clerk.useUser();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [user, setUser] = React.useState<ReturnType<typeof guestUser> | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => { setUser(guestUser()); }, []);
  return { isLoaded: user !== null, isSignedIn: !!user?.id, user } as const;
}

export function useAuth() {
  if (CLERK_ENABLED) return Clerk.useAuth();
  return { isLoaded: true, isSignedIn: true, userId: guestId(), getToken: async () => null } as const;
}

/** In guest mode "sign out" starts a fresh guest session with fresh demo data. */
export function SignOutButton({ children }: { children?: React.ReactNode }) {
  if (CLERK_ENABLED) return <Clerk.SignOutButton>{children}</Clerk.SignOutButton>;
  const reset = () => {
    document.cookie = `${GUEST_COOKIE}=; Max-Age=0; path=/`;
    window.location.href = '/';
  };
  return <span onClick={reset} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') reset(); }}>{children ?? 'Reset demo'}</span>;
}

export function SignIn() {
  if (CLERK_ENABLED) return <Clerk.SignIn />;
  return <GuestRedirect />;
}
export function SignUp() {
  if (CLERK_ENABLED) return <Clerk.SignUp />;
  return <GuestRedirect />;
}
function GuestRedirect() {
  React.useEffect(() => { window.location.replace('/'); }, []);
  return <p style={{ padding: 32 }}>Opening the demo…</p>;
}

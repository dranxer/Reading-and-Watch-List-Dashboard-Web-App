'use client';
// Client-side auth: Clerk components/hooks when configured, guest-mode stand-ins otherwise.
import React from 'react';
import Script from 'next/script';
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
  React.useEffect(() => { fetch('/api/session').then(r => r.json()).then(data => setUser(data.user ? { ...data.user, primaryEmailAddress: data.user.emailAddresses?.[0] || null } : guestUser())).catch(() => setUser(guestUser())); }, []);
  return { isLoaded: user !== null, isSignedIn: !!user?.id, user } as const;
}

export function useAuth() {
  if (CLERK_ENABLED) return Clerk.useAuth();
  return { isLoaded: true, isSignedIn: true, userId: guestId(), getToken: async () => null } as const;
}

/** In guest mode "sign out" starts a fresh guest session with fresh demo data. */
export function SignOutButton({ children }: { children?: React.ReactNode }) {
  if (CLERK_ENABLED) return <Clerk.SignOutButton>{children}</Clerk.SignOutButton>;
  const reset = async () => {
    const response = await fetch('/api/session', { method: 'DELETE' });
    if (!response.ok) return;
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

export function GoogleSignIn() {
  const { user } = useUser();
  const ref = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    if (!ready || !ref.current || !user || !user.id.startsWith('guest_')) return;
    let active = true;
    fetch('/api/session?login=1').then(r => r.json()).then(data => {
      if (!active || !data.clientId || !ref.current) return;
      const api = (window as any).google?.accounts?.id;
      api?.initialize({ client_id: data.clientId, nonce: data.nonce, callback: async ({ credential }: { credential: string }) => {
        try {
          const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Sign-in failed');
          window.location.reload();
        } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed'); }
      }});
      api?.renderButton(ref.current, { theme: 'outline', size: 'medium' });
    }).catch(() => setError('Sign-in is unavailable. Please retry.'));
    return () => { active = false; };
  }, [ready, user?.id]);
  if (CLERK_ENABLED || (user && !user.id.startsWith('guest_'))) return null;
  return <div><Script src="https://accounts.google.com/gsi/client" onReady={() => setReady(true)} onError={() => setError('Google sign-in could not load. Check your connection.')} /><div ref={ref} />{error && <p role="alert">{error}</p>}</div>;
}

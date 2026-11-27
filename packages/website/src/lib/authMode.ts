/**
 * Clerk is used when its publishable key is configured. Without it the app runs in
 * guest mode: every visitor gets a private guest id (a cookie) and a copy of the demo
 * data, so the dashboard can be tried without signing up.
 */
export const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const GUEST_COOKIE = 'curiolog_guest';
export const isGuestId = (id: string | null | undefined) => !!id && id.startsWith('guest_');

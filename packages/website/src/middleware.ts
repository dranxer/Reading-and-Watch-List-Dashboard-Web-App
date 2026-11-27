import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { CLERK_ENABLED, GUEST_COOKIE } from '@/lib/authMode';

// Guest mode: give each visitor a private guest id the first time they arrive.
function guestMiddleware(req: NextRequest) {
  if (req.cookies.get(GUEST_COOKIE)) return NextResponse.next();
  const id = `guest_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  req.cookies.set(GUEST_COOKIE, id);                       // visible to this request's handlers
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(GUEST_COOKIE, id, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export default CLERK_ENABLED ? clerkMiddleware() : guestMiddleware;

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};

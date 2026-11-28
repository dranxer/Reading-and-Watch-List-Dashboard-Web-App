import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { metric } from '@vercel/functions';
import { auth, currentUser } from '@/lib/auth';
import { SESSION_COOKIE, NONCE_COOKIE, signSession } from '@/lib/googleSession';
import { GUEST_COOKIE, isGuestId } from '@/lib/authMode';
import { serverStorage } from '@/lib/serverStorage';
const google = new OAuth2Client();
const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export async function GET(request: NextRequest) {
  const user = await currentUser();
  const nonce = randomBytes(32).toString('hex');
  const configured = !!process.env.GOOGLE_CLIENT_ID && (process.env.AUTH_SECRET?.length || 0) >= 32;
  const response = NextResponse.json({ user, clientId: configured ? process.env.GOOGLE_CLIENT_ID : null, nonce });
  response.headers.set('Cache-Control', 'no-store');
  if (request.nextUrl.searchParams.has('login')) response.cookies.set(NONCE_COOKIE, nonce, { ...options, maxAge: 600 });
  return response;
}
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  if (!process.env.GOOGLE_CLIENT_ID || (process.env.AUTH_SECRET?.length || 0) < 32) return NextResponse.json({ error: 'Google sign-in is not configured yet' }, { status: 503 });
  const start = performance.now();
  try {
    const { credential } = await request.json();
    if (typeof credential !== 'string' || credential.length > 16000) return NextResponse.json({ error: 'Invalid credential' }, { status: 400 });
    const ticket = await google.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const nonce = request.cookies.get(NONCE_COOKIE)?.value;
    if (!payload || !nonce || (payload as unknown as { nonce?: string }).nonce !== nonce || !payload.email || !payload.email_verified) return NextResponse.json({ error: 'Invalid sign-in. Please refresh and try again.' }, { status: 401 });
    const userId = `google_${payload.sub}`;
    const email = payload.email.toLowerCase();
    const session = { userId, email, name: payload.name || email.split('@')[0], picture: payload.picture || '', inviteEmail: email.endsWith('@gmail.com') || payload.hd ? email : null };
    const token = await signSession(session);
    const previous = await auth();
    if (previous.userId && isGuestId(previous.userId)) await serverStorage.mergeGuest(previous.userId, userId);
    const existing = await serverStorage.getUserProfile(userId);
    await serverStorage.createUserProfile(userId, { ...(existing || {}), displayName: session.name, avatar: session.picture });
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, { ...options, maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set(NONCE_COOKIE, '', { ...options, maxAge: 0 });
    response.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });
    metric('auth.login', 1, { outcome: 'success' });
    return response;
  } catch {
    metric('auth.login', 1, { outcome: 'error' });
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 401 });
  } finally { metric('auth.duration_ms', performance.now() - start); }
}
export async function DELETE(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...options, maxAge: 0 });
  response.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

import { SignJWT, jwtVerify } from 'jose';
export const SESSION_COOKIE = 'readwatch_session';
export const NONCE_COOKIE = 'readwatch_login_nonce';
export type SessionUser = { userId: string; email: string; name: string; picture: string; inviteEmail: string | null };
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
  return new TextEncoder().encode(secret);
}
export async function signSession(user: SessionUser) {
  return new SignJWT({ ...user }).setProtectedHeader({ alg: 'HS256' }).setIssuer('readwatch').setAudience('readwatch').setIssuedAt().setExpirationTime('7d').sign(key());
}
export async function readSession(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'], issuer: 'readwatch', audience: 'readwatch' });
    if (typeof payload.userId !== 'string' || !payload.userId.startsWith('google_') || typeof payload.email !== 'string' || typeof payload.name !== 'string') return null;
    return { userId: payload.userId, email: payload.email, name: payload.name, picture: typeof payload.picture === 'string' ? payload.picture : '', inviteEmail: typeof payload.inviteEmail === 'string' ? payload.inviteEmail : null };
  } catch { return null; }
}

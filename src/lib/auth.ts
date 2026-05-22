import { createHash, randomBytes } from 'node:crypto';
import { getSql } from './db';
import { getAdminEmail, isProduction } from './env';

const sessionCookie = 'lat_session';
const oauthStateCookie = 'lat_oauth_state';
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

interface CookieJar {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: Record<string, unknown>): void;
  delete(name: string, options: Record<string, unknown>): void;
}

export interface AdminSession {
  email: string;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions(maxAge = sessionMaxAgeSeconds) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge,
  };
}

export function createOAuthState(cookies: CookieJar) {
  const state = randomBytes(24).toString('hex');
  cookies.set(oauthStateCookie, state, cookieOptions(10 * 60));
  return state;
}

export function verifyOAuthState(cookies: CookieJar, state: string) {
  const stored = cookies.get(oauthStateCookie)?.value || '';
  cookies.delete(oauthStateCookie, { path: '/' });
  return Boolean(state && stored && state === stored);
}

export async function createSession(cookies: CookieJar, email: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();
  const sql = getSql();

  await sql`
    insert into admin_sessions (token_hash, email, expires_at)
    values (${tokenHash}, ${email.toLowerCase()}, ${expiresAt})
  `;

  cookies.set(sessionCookie, token, cookieOptions());
}

export async function getAdminSession(cookies: CookieJar): Promise<AdminSession | null> {
  const token = cookies.get(sessionCookie)?.value;
  const adminEmail = getAdminEmail();

  if (!token || !adminEmail) return null;

  const sql = getSql();
  const rows = await sql`
    select email
    from admin_sessions
    where token_hash = ${hashToken(token)} and expires_at > now()
    limit 1
  `;
  const email = String(rows[0]?.email || '').toLowerCase();

  if (email !== adminEmail) return null;

  return { email };
}

export async function destroySession(cookies: CookieJar) {
  const token = cookies.get(sessionCookie)?.value;

  if (token) {
    const sql = getSql();
    await sql`delete from admin_sessions where token_hash = ${hashToken(token)}`;
  }

  cookies.delete(sessionCookie, { path: '/' });
}

export async function requireAdmin(cookies: CookieJar) {
  const session = await getAdminSession(cookies);

  if (!session) {
    return null;
  }

  return session;
}

export function assertSameOrigin(request: Request) {
  const expected = new URL(request.url).origin;
  const source = request.headers.get('origin') || request.headers.get('referer');

  if (!source) {
    throw new Error('Missing request origin');
  }

  if (new URL(source).origin !== expected) {
    throw new Error('Invalid request origin');
  }
}

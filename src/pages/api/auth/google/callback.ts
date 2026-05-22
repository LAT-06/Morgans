import type { APIRoute } from 'astro';
import { createSession, destroySession, verifyOAuthState } from '../../../../lib/auth';
import { getAdminEmail, getEnv, requireEnv } from '../../../../lib/env';

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
}

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

export const GET: APIRoute = async ({ cookies, request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  if (!code || !verifyOAuthState(cookies, state)) {
    return redirect('/admin?error=oauth_state');
  }

  try {
    const clientId = requireEnv('GOOGLE_CLIENT_ID');
    const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
    const adminEmail = getAdminEmail();
    const redirectUri = getEnv('GOOGLE_REDIRECT_URI') || new URL('/api/auth/google/callback', request.url).toString();

    if (!adminEmail) {
      return redirect('/admin?error=admin_email');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const token = (await tokenResponse.json()) as TokenResponse;

    if (!tokenResponse.ok || !token.access_token) {
      return redirect('/admin?error=oauth_token');
    }

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = (await userResponse.json()) as GoogleUserInfo;
    const email = String(user.email || '').toLowerCase();

    if (!userResponse.ok || !user.email_verified || email !== adminEmail) {
      await destroySession(cookies);
      return redirect('/admin?error=forbidden');
    }

    await createSession(cookies, email);
    return redirect('/admin');
  } catch {
    return redirect('/admin?error=oauth_failed');
  }
};

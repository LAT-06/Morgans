import type { APIRoute } from 'astro';
import { createOAuthState } from '../../../lib/auth';
import { getEnv, requireEnv } from '../../../lib/env';

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const clientId = requireEnv('GOOGLE_CLIENT_ID');
    requireEnv('GOOGLE_CLIENT_SECRET');

    const state = createOAuthState(cookies);
    const redirectUri = getEnv('GOOGLE_REDIRECT_URI') || new URL('/api/auth/google/callback', request.url).toString();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');

    return redirect(url.toString());
  } catch {
    return redirect('/admin?error=oauth_config');
  }
};

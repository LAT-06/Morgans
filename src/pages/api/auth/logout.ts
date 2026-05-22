import type { APIRoute } from 'astro';
import { assertSameOrigin, destroySession } from '../../../lib/auth';

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    assertSameOrigin(request);
    await destroySession(cookies);
  } catch {
    return redirect('/admin?error=logout');
  }

  return redirect('/admin');
};

export const GET: APIRoute = async () => {
  return redirect('/admin');
};

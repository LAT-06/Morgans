import type { APIRoute } from 'astro';
import { assertSameOrigin, requireAdmin } from '../../../lib/auth';
import { createPost, listAdminPosts } from '../../../lib/posts';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON');
  }
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = await requireAdmin(cookies);
  if (!session) return json(401, { error: 'Unauthorized' });

  const posts = await listAdminPosts();
  return json(200, { posts });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    assertSameOrigin(request);
    const session = await requireAdmin(cookies);
    if (!session) return json(401, { error: 'Unauthorized' });

    const payload = await readJson(request);
    const post = await createPost({
      markdown: String(payload.markdown || ''),
      status: String(payload.status || 'draft'),
      authorEmail: session.email,
    });

    return json(201, { post });
  } catch (error) {
    return json(422, { error: error instanceof Error ? error.message : 'Cannot create post' });
  }
};

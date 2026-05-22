import type { APIRoute } from 'astro';
import { assertSameOrigin, requireAdmin } from '../../../lib/auth';
import { deletePost, getAdminPost, updatePost, updatePostStatus } from '../../../lib/posts';

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

export const GET: APIRoute = async ({ cookies, params }) => {
  const session = await requireAdmin(cookies);
  if (!session) return json(401, { error: 'Unauthorized' });

  const post = await getAdminPost(String(params.id || ''));
  if (!post) return json(404, { error: 'Post not found' });

  return json(200, { post });
};

export const PUT: APIRoute = async ({ cookies, params, request }) => {
  try {
    assertSameOrigin(request);
    const session = await requireAdmin(cookies);
    if (!session) return json(401, { error: 'Unauthorized' });

    const payload = await readJson(request);
    const post =
      payload.markdown === undefined
        ? await updatePostStatus(String(params.id || ''), String(payload.status || 'draft'))
        : await updatePost(String(params.id || ''), {
            markdown: String(payload.markdown || ''),
            status: String(payload.status || 'draft'),
            authorEmail: session.email,
          });

    if (!post) return json(404, { error: 'Post not found' });

    return json(200, { post });
  } catch (error) {
    return json(422, { error: error instanceof Error ? error.message : 'Cannot update post' });
  }
};

export const DELETE: APIRoute = async ({ cookies, params, request }) => {
  try {
    assertSameOrigin(request);
    const session = await requireAdmin(cookies);
    if (!session) return json(401, { error: 'Unauthorized' });

    await deletePost(String(params.id || ''));
    return json(200, { ok: true });
  } catch (error) {
    return json(422, { error: error instanceof Error ? error.message : 'Cannot delete post' });
  }
};

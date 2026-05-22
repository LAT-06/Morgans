import type { APIRoute } from 'astro';
import { assertSameOrigin, requireAdmin } from '../../../lib/auth';
import { saveUpload } from '../../../lib/storage';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    assertSameOrigin(request);
    const session = await requireAdmin(cookies);
    if (!session) return json(401, { error: 'Unauthorized' });

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return json(400, { error: 'No image file provided.' });
    }

    const result = await saveUpload(file);

    return json(200, { url: result.url, filename: result.filename });
  } catch (error) {
    return json(422, {
      error: error instanceof Error ? error.message : 'Cannot upload image.',
    });
  }
};

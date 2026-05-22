import { getSql, hasDatabase } from './db';
import { deriveMarkdown, slugify } from './markdown';

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: PostStatus;
  authorEmail: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: PostStatus;
  author_email: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    content: row.content,
    status: row.status,
    authorEmail: row.author_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function assertStatus(status: string): PostStatus {
  if (status === 'draft' || status === 'published') return status;
  throw new Error('Invalid post status');
}

async function getAvailableSlug(baseSlug: string) {
  const sql = getSql();
  const base = (slugify(baseSlug) || 'writeup').slice(0, 82);

  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const rows = await sql`select 1 from posts where slug = ${candidate} limit 1`;
    if (!rows.length) return candidate;
  }

  return `${base}-${Date.now()}`;
}

export function isDbConfigured() {
  return hasDatabase();
}

export async function listPublishedPosts() {
  if (!hasDatabase()) return [];

  const sql = getSql();
  const rows = await sql`
    select id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
    from posts
    where status = 'published'
    order by published_at desc nulls last, updated_at desc
  `;

  return (rows as PostRow[]).map(mapPost);
}

export async function getPublishedPostBySlug(slug: string) {
  if (!hasDatabase()) return null;

  const sql = getSql();
  const rows = await sql`
    select id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
    from posts
    where slug = ${slugify(slug)} and status = 'published'
    limit 1
  `;

  return rows[0] ? mapPost(rows[0] as PostRow) : null;
}

export async function listAdminPosts() {
  const sql = getSql();
  const rows = await sql`
    select id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
    from posts
    order by updated_at desc
  `;

  return (rows as PostRow[]).map(mapPost);
}

export async function getAdminPost(id: string) {
  const sql = getSql();
  const rows = await sql`
    select id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
    from posts
    where id = ${id}
    limit 1
  `;

  return rows[0] ? mapPost(rows[0] as PostRow) : null;
}

export async function createPost(input: { markdown: string; status: string; authorEmail: string }) {
  const status = assertStatus(input.status);
  const derived = deriveMarkdown(input.markdown);

  if (!derived.slug) {
    throw new Error('Cannot derive slug from title');
  }

  const slug = await getAvailableSlug(derived.slug);
  const sql = getSql();
  const rows = await sql`
    insert into posts (slug, title, description, content, status, author_email, published_at)
    values (
      ${slug},
      ${derived.title},
      ${derived.description},
      ${derived.body},
      ${status},
      ${input.authorEmail},
      ${status === 'published' ? new Date().toISOString() : null}
    )
    returning id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
  `;

  return mapPost(rows[0] as PostRow);
}

export async function updatePost(
  id: string,
  input: { markdown: string; status: string; authorEmail: string },
) {
  const existing = await getAdminPost(id);
  if (!existing) return null;

  const status = assertStatus(input.status);
  const derived = deriveMarkdown(input.markdown, existing.slug);
  const publishedAt =
    status === 'published' ? existing.publishedAt || new Date().toISOString() : null;
  const sql = getSql();
  const rows = await sql`
    update posts
    set
      title = ${derived.title},
      description = ${derived.description},
      content = ${derived.body},
      status = ${status},
      author_email = ${input.authorEmail},
      updated_at = now(),
      published_at = ${publishedAt}
    where id = ${id}
    returning id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
  `;

  return rows[0] ? mapPost(rows[0] as PostRow) : null;
}

export async function updatePostStatus(id: string, statusValue: string) {
  const status = assertStatus(statusValue);
  const existing = await getAdminPost(id);
  if (!existing) return null;

  const publishedAt =
    status === 'published' ? existing.publishedAt || new Date().toISOString() : null;
  const sql = getSql();
  const rows = await sql`
    update posts
    set
      status = ${status},
      updated_at = now(),
      published_at = ${publishedAt}
    where id = ${id}
    returning id, slug, title, description, content, status, author_email, created_at, updated_at, published_at
  `;

  return rows[0] ? mapPost(rows[0] as PostRow) : null;
}

export async function deletePost(id: string) {
  const sql = getSql();
  await sql`delete from posts where id = ${id}`;
}

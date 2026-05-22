import './load-env.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Pool } from '@neondatabase/serverless';
import matter from 'gray-matter';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const writeupsDir = resolve(process.cwd(), 'src/content/writeups');
const files = (await readdir(writeupsDir)).filter((file) => file.endsWith('.mdx'));
const pool = new Pool({ connectionString: databaseUrl });

try {
  for (const file of files) {
    const slug = basename(file, '.mdx');
    const raw = await readFile(join(writeupsDir, file), 'utf8');
    const parsed = matter(raw);
    const title = String(parsed.data.title || slug);
    const description = String(parsed.data.description || 'Imported writeup.');
    const status = parsed.data.draft ? 'draft' : 'published';
    const publishedAt = status === 'published' ? parsed.data.pubDate || new Date() : null;

    await pool.query(
      `
        insert into posts (slug, title, description, content, status, author_email, published_at)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (slug) do update set
          title = excluded.title,
          description = excluded.description,
          content = excluded.content,
          status = excluded.status,
          updated_at = now(),
          published_at = excluded.published_at
      `,
      [slug, title, description, parsed.content.trim(), status, null, publishedAt],
    );

    console.log(`Seeded ${slug}`);
  }
} finally {
  await pool.end();
}

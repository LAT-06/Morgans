# LAT

Astro SSR blog for security writeups with Google-only admin login and Neon Postgres storage.

## Run Locally

```sh
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Environment

Create `.env` locally and set the same values in Vercel:

```sh
DATABASE_URL="postgresql://..."
ADMIN_EMAIL="you@gmail.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
SITE_URL="https://blog.yourdomain.com"
```

Never commit `.env`. `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, and any OAuth secrets must stay in local/Vercel environment variables only.

Optional if Google needs an exact callback override:

```sh
GOOGLE_REDIRECT_URI="https://blog.yourdomain.com/api/auth/google/callback"
```

Google OAuth callback URL:

```txt
http://localhost:4321/api/auth/google/callback
https://blog.yourdomain.com/api/auth/google/callback
```

## Database

Run the schema on Neon:

```sh
pnpm run db:migrate
```

Import existing MDX writeups into Neon:

```sh
pnpm run db:seed
```

## Admin

Open `/admin` and sign in with Google. Only `ADMIN_EMAIL` can access the dashboard.

- The top `Posts` menu loads existing posts and supports search.
- `New` starts a new draft.
- The first `# Heading` becomes the title.
- The first normal text line becomes the description.
- The right pane previews markdown live.
- Content autosaves after edits.
- The `Draft` / `Published` control stores a private draft or makes the writeup visible on `/` and `/writeups/<slug>/`.
- The `...` menu contains image URL insertion, public URL copy, and delete.
- Pasted screenshots are compressed in the browser and embedded in markdown as safe image data URLs.

Images should be inserted as URLs for now:

```md
![alt text](https://example.com/image.png)
```

For larger production image libraries, add object storage such as Vercel Blob, Cloudflare R2, Supabase Storage, or S3. Do not store large image binaries in Neon.

## Deploy

This project uses Astro SSR with the Vercel adapter.

1. Create a Neon database.
2. Set the environment variables in Vercel.
3. Configure Google OAuth callback URLs.
4. Deploy to Vercel.
5. Run `pnpm run db:migrate` locally with the production `DATABASE_URL`, or run the SQL in `db/schema.sql` from Neon.

## Subdomain

Point `blog.yourdomain.com` to the host:

- Vercel: add the domain in Vercel, then create the DNS record it gives you.
- Set `SITE_URL=https://blog.yourdomain.com`.

## Build

```sh
pnpm build
```

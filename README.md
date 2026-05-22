# Morgan Writeups

Astro blog for security writeups with a dark red hacker theme and a light minimal luxury theme.

## Run locally

```sh
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Writeups

Writeups live in `src/content/writeups/*.mdx`.

Required frontmatter:

```md
---
title: "Title"
description: "Short summary"
pubDate: 2026-05-22
tags: ["web"]
category: "web"
draft: false
---
```

## Web CMS

`/admin/` uses Decap CMS and writes MDX files into `src/content/writeups`.

Local CMS needs two terminals:

```sh
pnpm dev
```

```sh
pnpm run cms:local
```

Then open `http://localhost:4321/admin/`. The local proxy listens on `http://localhost:8081/api/v1`; if it is not running, the browser will show `ERR_CONNECTION_REFUSED`.

For Netlify:

1. Deploy this repo.
2. Enable Identity.
3. Enable Git Gateway.
4. Invite your admin account.
5. Go to `https://blog.yourdomain.com/admin/`.

Decap's local proxy does not support `editorial_workflow`. If you want editorial workflow in production, add this back to `public/admin/config.yml` after the site is connected to Git Gateway:

```yml
publish_mode: editorial_workflow
```

For GitHub OAuth on another host, edit `public/admin/config.yml` and replace the backend with your GitHub repo:

```yml
backend:
  name: github
  repo: your-user/your-repo
  branch: main
```

## Subdomain

Point `blog.yourdomain.com` to the host:

- Netlify: add a `CNAME` record from `blog` to the Netlify domain.
- Vercel: add the domain in Vercel, then create the DNS record it gives you.
- Set `SITE_URL=https://blog.yourdomain.com` in the hosting environment.

## Build

```sh
pnpm build
```

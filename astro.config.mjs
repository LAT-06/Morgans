// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';
import rehypePrettyCode from 'rehype-pretty-code';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://blog.example.com',
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    rehypePlugins: [[rehypePrettyCode, { theme: 'github-dark', keepBackground: false }]]
  },

  integrations: [mdx()]
});

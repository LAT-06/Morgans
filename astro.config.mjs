// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';
import rehypePrettyCode from 'rehype-pretty-code';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://blog.example.com',
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    rehypePlugins: [[rehypePrettyCode, { theme: 'github-dark', keepBackground: false }]]
  },

  integrations: [mdx()]
});

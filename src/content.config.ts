import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writeups = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writeups' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1).max(260),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Morgan'),
    tags: z.array(z.string()).default([]),
    category: z
      .enum(['web', 'pwn', 'crypto', 'reverse', 'forensics', 'osint', 'misc', 'notes'])
      .default('web'),
    difficulty: z.enum(['easy', 'medium', 'hard', 'insane']).optional(),
    target: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writeups };

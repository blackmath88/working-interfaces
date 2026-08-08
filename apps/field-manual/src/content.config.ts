import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const knowledgeStatus = z.enum([
  'rough',
  'experiment',
  'promising',
  'reference',
  'graduated',
  'discarded',
]);

const knowledgeKind = z.enum([
  'component',
  'pattern',
  'doctrine',
  'foundation',
  'motion',
]);

const patterns = defineCollection({
  loader: glob({
    base: '../../knowledge/patterns',
    pattern: '**/*.md',
  }),
  schema: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: knowledgeStatus,
    kind: knowledgeKind,
    revision: z.number().int().positive(),
    summary: z.string().min(1),
    related: z.array(z.string()).default([]),
    implementation: z.object({
      html: z.string().optional(),
      react: z.string().optional(),
      status: z.enum(['none', 'experimental', 'stable']).default('none'),
    }).optional(),
  }),
});

export const collections = { patterns };

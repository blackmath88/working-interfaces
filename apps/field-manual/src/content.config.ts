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

const token = z.union([
  z.object({
    light: z.string().regex(/^oklch\(.+\)$/),
    note: z.string().min(1),
  }),
  z.object({
    value: z.string().min(1),
    range: z.string().optional(),
    note: z.string().optional(),
  }),
]);

const foundations = defineCollection({
  loader: glob({
    base: '../../knowledge/foundations',
    pattern: '*.md',
  }),
  schema: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: knowledgeStatus,
    kind: knowledgeKind,
    revision: z.number().int().positive(),
    summary: z.string().min(1),
    tokens: z.record(z.string(), token),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { patterns, foundations };

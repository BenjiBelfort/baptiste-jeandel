// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const baseFields = {
  title: z.string(),
  excerpt: z.string(),
  sort: z.number().default(0),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  ctaMessage: z.string().optional(),
};

export const collections = {
  services: defineCollection({
    type: 'content',
    schema: z.object({
      ...baseFields,
      domain: z.string(),
    }),
  }),
  formations: defineCollection({
    type: 'content',
    schema: z.object({
      ...baseFields,
      domain: z.string(),
    }),
  }),
};

// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const faqItem = z.object({
  q: z.string(), // Question (texte, tu peux mettre un peu de HTML si besoin)
  a: z.string(), // Réponse (HTML simple accepté par Google : <p>, <br>, <strong>, listes…)
});

const baseFields = {
  title: z.string(),
  excerpt: z.string(),
  sort: z.number().default(0),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  image: z.string().optional(),
  ctaMessage: z.string().optional(),
  ctaLabel: z.string().optional(),
  seoKeywords: z.string().optional(),
  // NEW ↓ — champ FAQ optionnel pour toutes les collections
  faq: z.array(faqItem).optional(),
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
  cours: defineCollection({
    type: 'content',
    schema: z.object({
      ...baseFields,
      domain: z.string(),
    }),
  }),
};

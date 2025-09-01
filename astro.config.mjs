// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap'; // pour typer correctement

const SITE = process.env.URL || process.env.PUBLIC_SITE || 'http://localhost:4321';

/** Retourne une priorité pour le sitemap
 *  @param {string} p
 *  @returns {number}
 */
function getPriority(p) {
  if (p === '/') return 1.0;
  if (p.startsWith('/services') || p.startsWith('/formations')) return 0.8;
  if (p === '/contact') return 0.6;
  return 0.5;
}

export default defineConfig({
  site: SITE,

  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const url = new URL(item.url);
        const p = url.pathname;

        return {
          ...item,
          changefreq: p === '/' ? EnumChangefreq.WEEKLY : EnumChangefreq.MONTHLY,
          priority: getPriority(p),
        };
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});

// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';
import { EnumChangefreq } from 'sitemap';

const SITE = process.env.URL || process.env.PUBLIC_SITE || 'http://localhost:4321';

function getPriority(p) {
  if (p === '/') return 1.0;
  if (p.startsWith('/services') || p.startsWith('/formations')) return 0.8;
  if (p === '/contact') return 0.6;
  return 0.5;
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'never', // évite les doublons /page/ vs /page
  integrations: [
    mdx({
      // 👇 ici : tous les liens externes des MDX ouvrent en nouvel onglet
      rehypePlugins: [
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
      ],
    }),
    sitemap({
      filter: (page) => ![
        '/404',
        '/merci',
        '/humans.txt',
        '/site.webmanifest',
      ].includes(page),
      serialize(item) {
        const url = new URL(item.url);
        const p = url.pathname;
        return {
          ...item,
          changefreq: p === '/' ? EnumChangefreq.WEEKLY : EnumChangefreq.MONTHLY,
          priority: getPriority(p),
          // Optionnel : si tu veux mettre un lastmod global au build :
          // lastmod: new Date().toISOString(),
        };
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

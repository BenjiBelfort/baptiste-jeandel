// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';
import { EnumChangefreq } from 'sitemap';

// Priorités d'URL pour Netlify (prod/preview) + fallback local
const SITE =
  process.env.PUBLIC_SITE ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL || // <-- ajouté
  'http://localhost:4321';

function getPriority(p) {
  if (p === '/') return 1.0;
  if (p === '/services'   || p.startsWith('/services/'))   return 0.8;
  if (p === '/formations' || p.startsWith('/formations/')) return 0.8;
  if (p === '/cours'      || p.startsWith('/cours/'))      return 0.7;
  if (p === '/contact') return 0.6;
  return 0.5;
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  integrations: [
    mdx({
      rehypePlugins: [
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
      ],
    }),
    sitemap({
      filter: (page) => {
        const bad = [
          '/404',
          '/merci',
        ];
        return !bad.includes(page);
      },
      serialize(item) {
        const p = new URL(item.url).pathname;
        return {
          ...item,
          changefreq: p === '/' ? EnumChangefreq.WEEKLY : EnumChangefreq.MONTHLY,
          priority: getPriority(p),
          // lastmod: new Date().toISOString(),
        };
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

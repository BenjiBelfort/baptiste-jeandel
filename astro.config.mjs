// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({

    site: process.env.URL || process.env.PUBLIC_SITE || 'http://localhost:4321',
    integrations: [mdx(), sitemap()],

    vite: {
        plugins: [tailwindcss()],
    },
});
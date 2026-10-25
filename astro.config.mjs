import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://strikeelectricllc.net',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
});

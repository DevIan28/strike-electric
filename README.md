# Strike Electric

Website for Strike Electric LLC, a residential and commercial electrical contractor in New York City.
Bilingual (English / Spanish), static, and fast.

## Highlights

- Live lightning in the hero: arcs jump from the logo's bolt toward the cursor, and a tap strikes on touch screens.
- Services shown as a breaker panel with a copper bus bar. Switching between homes and businesses power-cycles the breakers.
- A copper wire that energizes step by step as the process section scrolls by.
- Open/closed status calculated in New York time.
- A floating header on desktop and a thumb-reach dock on phones.
- A footer built like a panel door: flip the main switch to call.
- Respects reduced-motion settings, keyboard navigation and screen readers.

## Stack

[Astro](https://astro.build) · TypeScript · hand-written CSS · Canvas 2D · Saira variable font (self-hosted)

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm run preview
```

Requires Node.js 18.20+ (Astro 5).

## Editing content

- Business facts (phone, email, hours, service area, job photos): `src/data/site.ts`
- All text in English and Spanish: `src/i18n/copy.ts`
- Job photos: put them in `public/work/` and list them in `site.work`; the gallery appears on its own.

## Estimate form

Without configuration, the form opens the visitor's email app with the request filled in.
To receive requests straight to the inbox, create a free access key at [web3forms.com](https://web3forms.com)
for `support@strikeelectricllc.net` and set it as `PUBLIC_WEB3FORMS_KEY` (see `.env.example`).

## Deploy

Any static host works. For a GitHub Pages project URL, build with
`BASE_PATH=/<repo-name>/ SITE_URL=https://<user>.github.io npm run build`.

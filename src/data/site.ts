// Business facts live here so the copy never drifts out of sync with them.
// Values marked TODO still need confirmation from the owner.

export const site = {
  name: 'Strike Electric',
  legalName: 'Strike Electric LLC',
  url: 'https://strikeelectricllc.net',
  phone: {
    display: '(646) 363-1492',
    href: 'tel:+16463631492',
    sms: 'sms:+16463631492',
  },
  email: 'support@strikeelectricllc.net',
  timezone: 'America/New_York',
  // TODO: confirm real hours. 0 = Sunday. Times in 24h, New York time.
  hours: {
    1: [7, 19],
    2: [7, 19],
    3: [7, 19],
    4: [7, 19],
    5: [7, 19],
    6: [8, 16],
  } as Record<number, [number, number]>,
  // TODO: confirm coverage.
  areas: ['Manhattan', 'Queens', 'Brooklyn', 'The Bronx', 'Staten Island'],
  // Optional. Create a free access key at web3forms.com and set PUBLIC_WEB3FORMS_KEY
  // to receive estimate requests by email; without it the form opens the visitor's mail app.
  formKey: import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined,
  // Drop real job photos in /public/work and list them here; the gallery shows up on its own.
  work: [] as { src: string; alt: { en: string; es: string } }[],
} as const;

export type Lang = 'en' | 'es';

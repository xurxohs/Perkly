export const GUIDE_SLUGS = [
  'check-digital-offer',
  'promo-codes-uzbekistan',
  'safe-digital-purchase',
  'create-clear-listing',
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export const ADSENSE_EDITORIAL_ROUTES = [
  '/guides',
  ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`),
] as const;

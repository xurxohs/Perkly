import { ADSENSE_EDITORIAL_ROUTES } from '@/content/guide-routes';

const RAW_PUBLISHER_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID?.trim() ?? '';

export const ADSENSE_PUBLISHER_ID = /^ca-pub-\d{16}$/.test(RAW_PUBLISHER_ID)
  ? RAW_PUBLISHER_ID
  : null;

export const ADSENSE_RUNTIME_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_CERTIFIED_CMP_READY === 'true';

// Advertising is intentionally limited to known, original editorial pages.
// An explicit allowlist prevents Auto Ads from appearing on 404s, marketplace,
// account, checkout, chat, empty or user-generated screens.
const EDITORIAL_ROUTES = new Set<string>(ADSENSE_EDITORIAL_ROUTES);

export function isAdSenseEligiblePath(pathname: string): boolean {
  return EDITORIAL_ROUTES.has(pathname);
}

const RAW_PUBLISHER_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID?.trim() ?? '';

export const ADSENSE_PUBLISHER_ID = /^ca-pub-\d{16}$/.test(RAW_PUBLISHER_ID)
  ? RAW_PUBLISHER_ID
  : null;

// Advertising is intentionally limited to original editorial content. Current
// marketplace, account, checkout, chat and demo routes must never render ads.
const EDITORIAL_ROUTE_PREFIXES = ['/guides', '/editorial'] as const;

export function isAdSenseEligiblePath(pathname: string): boolean {
  return EDITORIAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

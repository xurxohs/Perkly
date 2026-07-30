import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense-config';

export const dynamic = 'force-dynamic';

export function GET() {
  if (!ADSENSE_PUBLISHER_ID) {
    return new Response('AdSense publisher ID is not configured.\n', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const publisherAccountId = ADSENSE_PUBLISHER_ID.replace(/^ca-/, '');

  return new Response(
    `google.com, ${publisherAccountId}, DIRECT, f08c47fec0942fa0\n`,
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
}

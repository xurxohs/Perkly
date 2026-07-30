import type { NextConfig } from "next";

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://telegram.org https://api-maps.yandex.ru https://yastatic.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://fundingchoicesmessages.google.com",
  "style-src 'self' 'unsafe-inline' https://yastatic.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://fundingchoicesmessages.google.com",
  "worker-src 'self' blob:",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicyReportOnly },
];

const privateOrNonContentRoutes = [
  '/admin/:path*',
  '/vendor/:path*',
  '/profile/:path*',
  '/chat/:path*',
  '/messages/:path*',
  '/notifications/:path*',
  '/cart/:path*',
  '/login',
  '/register',
  '/sell/dashboard/:path*',
  '/search/:path*',
  '/offer/:path*',
  '/map/:path*',
  '/plans/:path*',
  '/wheel/:path*',
  '/feed/:path*',
  '/news/:path*',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      ...privateOrNonContentRoutes.map((source) => ({
        source,
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      })),
    ];
  },
};

export default nextConfig;

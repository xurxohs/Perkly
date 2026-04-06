import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSR Mode: output: 'export' removed
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;

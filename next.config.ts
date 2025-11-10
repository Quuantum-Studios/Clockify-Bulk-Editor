import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  async redirects() {
    const site = process.env.NEXT_PUBLIC_SITE_URL || ''
    const host = site ? new URL(site).host : ''
    const isWwwPreferred = host.startsWith('www.')

    const preferredHost = host || ''
    const altHost = isWwwPreferred ? host.replace(/^www\./, '') : `www.${host}`

    const redirects = [] as { source: string; destination: string; permanent: boolean; has?: any[] }[]

    if (host) {
      redirects.push({
        source: '/:path*',
        destination: `${new URL(site).protocol}//${preferredHost}/:path*`,
        permanent: true,
        has: [{ type: 'host', value: altHost }],
      })
    }

    return redirects
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  // Enforce non-trailing-slash canonical URLs via automatic redirects
  skipTrailingSlashRedirect: false,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'react-date-range',
      'papaparse',
      'audiomotion-analyzer'
    ],
  },

  serverExternalPackages: ['@google/generative-ai'],

  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    // No external images currently, but ready for future use
    remotePatterns: [],
    domains: [],
  },
};

export default nextConfig;
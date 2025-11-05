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

  skipTrailingSlashRedirect: true,

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
};

export default nextConfig;
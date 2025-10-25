import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
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
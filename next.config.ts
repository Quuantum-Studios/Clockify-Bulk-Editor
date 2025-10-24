import {withSentryConfig} from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
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
    optimizePackageImports: ['lucide-react', 'date-fns', 'react-date-range', 'papaparse', 'audiomotion-analyzer'],
  },
  serverExternalPackages: ['@google/generative-ai', 'assemblyai', 'posthog-node', '@sentry/nextjs', 'axios', 'axios-logger'],
  webpack: (config, { isServer, webpack }) => {
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
    };

    // Only apply chunk splitting for client-side builds
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 200000, // 200KB chunks
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 200000,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            maxSize: 200000,
          },
        },
      };
    }

    // Tree shaking optimization
    config.resolve = {
      ...config.resolve,
    };

    // Remove unused modules
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@google/generative-ai': 'commonjs @google/generative-ai',
        'assemblyai': 'commonjs assemblyai',
        'posthog-node': 'commonjs posthog-node',
        '@sentry/nextjs': 'commonjs @sentry/nextjs',
        'axios': 'commonjs axios',
        'axios-logger': 'commonjs axios-logger',
      });
    }
    
    return config;
  },
};

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false
});

export default withBundleAnalyzerConfig(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: process.env.SENTRY_ORG || "",

    project: process.env.SENTRY_PROJECT || "",

    authToken: process.env.SENTRY_AUTH_TOKEN || undefined,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: process.env.SENTRY_TUNNEL_ROUTE || "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  })
);

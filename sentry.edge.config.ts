// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const env = process.env;

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || env.NODE_ENV || "development",
  tracesSampleRate: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ? Number(env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) : 0.1,
  sendDefaultPii: env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true",
  enableLogs: env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS === "true",
});

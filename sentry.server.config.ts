// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

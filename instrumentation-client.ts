import * as Sentry from "@sentry/nextjs";
import { initAnalytics } from "./lib/analytics";

initAnalytics();

Sentry.init({
    dsn: "https://d5598e6c4fa3771c64711008899328e3@o4510228070268928.ingest.us.sentry.io/4510228072955905",
    // integrations: [
    //     Sentry.replayIntegration(),
    // ],
    // tracesSampleRate: 1,
    enableLogs: true,
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
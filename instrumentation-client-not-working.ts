import * as Sentry from "@sentry/nextjs";

// In Next.js browser environment, NEXT_PUBLIC_ variables are available globally
// Use a safer approach that checks for the variables in different contexts
const getEnvVar = (name: string): string | undefined => {
    // Check if we're in a browser context and the variable is available globally
    if (typeof window !== 'undefined' && window[name as keyof Window]) {
        return window[name as keyof Window] as string;
    }
    // Fallback: try process.env (for server-side rendering context)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
        return process.env[name];
    }
    return undefined;
};

// Get environment variables with fallbacks
const dsn = getEnvVar('NEXT_PUBLIC_SENTRY_DSN');
const environment = getEnvVar('NEXT_PUBLIC_SENTRY_ENVIRONMENT') || getEnvVar('NODE_ENV') || 'development';
const tracesSampleRate = getEnvVar('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE');
const enableLogs = getEnvVar('NEXT_PUBLIC_SENTRY_ENABLE_LOGS');
const replaysSessionSampleRate = getEnvVar('NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE');
const replaysOnErrorSampleRate = getEnvVar('NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE');
const sendDefaultPii = getEnvVar('NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII');

Sentry.init({
    dsn,
    integrations: [
        Sentry.replayIntegration(),
    ],
    environment,
    tracesSampleRate: tracesSampleRate ? Number(tracesSampleRate) : 0.1,
    enableLogs: enableLogs === "true",
    replaysSessionSampleRate: replaysSessionSampleRate ? Number(replaysSessionSampleRate) : 0.1,
    replaysOnErrorSampleRate: replaysOnErrorSampleRate ? Number(replaysOnErrorSampleRate) : 1.0,
    sendDefaultPii: sendDefaultPii === "true",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
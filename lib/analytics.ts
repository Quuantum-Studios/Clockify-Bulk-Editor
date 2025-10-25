// lib/analytics.ts - Responsibility Matrix Aware
export const AnalyticsEvents = {
  // User actions (PostHog)
  APP_OPEN: "app_open",
  API_KEY_VALIDATED: "api_key_validated",
  SETTINGS_SAVED: "settings_saved",
  BULK_UPLOAD_STARTED: "bulk_upload_started",
  BULK_UPLOAD_SUCCESS: "bulk_upload_success",
  BULK_DELETE_TAGS: "bulk_delete_tags",
  BULK_DELETE_TASKS: "bulk_delete_tasks",
  VERIFY_PROJECTS: "verify_projects",
  VERIFY_TASKS: "verify_tasks",
  VERIFY_TAGS: "verify_tags",
  CREATE_MISSING_TASKS: "create_missing_tasks",
  CREATE_MISSING_TAGS: "create_missing_tags",
  USER_IDENTIFIED: "user_identified",
  FEATURE_USED: "feature_used",
  
  // Funnels (PostHog)
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  ONBOARDING_STEP: "onboarding_step",
  
  // User errors (PostHog, NOT Sentry)
  VALIDATION_ERROR: "validation_error",
  USER_ERROR: "user_error",
} as const;

type AnalyticsEvent = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (distinctId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
      get_distinct_id: () => string;
      get_session_id?: () => string;
      get_session_replay_url?: () => string;
      isFeatureEnabled: (flag: string) => boolean;
      getFeatureFlag?: (flag: string) => boolean | string;
      onFeatureFlags?: (callback: () => void) => void;
      startSessionRecording?: () => void;
      stopSessionRecording?: () => void;
    };
  }
}

// Event tracking
export function capture(event: AnalyticsEvent | string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }
}

// User identification
export function identify(userId: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, properties);
  }
}

// Feature flags (PostHog responsibility)
export function isFeatureEnabled(flag: string): boolean {
  if (typeof window !== 'undefined' && window.posthog) {
    return window.posthog.isFeatureEnabled(flag);
  }
  return false;
}

export function getFeatureFlag(flag: string): boolean | string | undefined {
  if (typeof window !== 'undefined' && window.posthog?.getFeatureFlag) {
    return window.posthog.getFeatureFlag(flag);
  }
  return undefined;
}

// User errors - PostHog only (NOT Sentry)
export function trackUserError(errorType: string, details: Record<string, unknown>) {
  capture(AnalyticsEvents.USER_ERROR, {
    error_type: errorType,
    ...details,
  });
}

// Session recording control
export function startRecording() {
  if (typeof window !== 'undefined' && window.posthog?.startSessionRecording) {
    window.posthog.startSessionRecording();
  }
}

export function stopRecording() {
  if (typeof window !== 'undefined' && window.posthog?.stopSessionRecording) {
    window.posthog.stopSessionRecording();
  }
}

// Reset user
export function reset() {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset();
  }
}



"use client";

import posthog from "posthog-js";

export const AnalyticsEvents = {
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
} as const;

type EventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY as string | undefined;
  if (!key) return;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    autocapture: true,
    capture_pageview: true,
    defaults: '2025-05-24',
    capture_exceptions: true,
    session_recording: { maskAllInputs: true },
    debug: process.env.NODE_ENV === "development",
  });
  initialized = true;
}

export function capture(event: EventName, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch { /* noop */ }
}

export function identify(distinctId: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!initialized) return;
  try {
    posthog.identify(distinctId, properties);
  } catch { /* noop */ }
}



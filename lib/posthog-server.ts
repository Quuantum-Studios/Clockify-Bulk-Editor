// lib/posthog-server.ts - All user tracking + errors
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'production') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) return;

  try {
    await fetch(`${apiHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
        event,
        properties: {
          ...properties,
          $lib: 'cloudflare-worker',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('PostHog server capture failed:', error);
  }
}

// Track server-side user errors (NOT technical errors)
export async function trackServerUserError(
  distinctId: string,
  errorType: string,
  details: Record<string, unknown>
) {
  await captureServerEvent(distinctId, 'user_error', {
    error_type: errorType,
    ...details,
  });
}

// Identify user on server
export async function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'production') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) return;

  try {
    await fetch(`${apiHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
        event: '$identify',
        properties: {
          $set: properties,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('PostHog server identify failed:', error);
  }
}


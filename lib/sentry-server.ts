// lib/sentry-server.ts - ONLY technical/system errors
export async function captureServerException(
  error: Error,
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error('Server error:', error, context);
    return;
  }

  // Filter: Don't send user validation errors (PostHog handles)
  if (error.message.includes('validation') || 
      error.message.includes('required field') ||
      error.message.includes('invalid')) {
    // Let PostHog track this instead
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Parse DSN: https://PUBLIC_KEY@DOMAIN/PROJECT_ID
    const match = dsn.match(/https:\/\/(.+)@(.+)\/(\d+)/);
    if (!match) {
      console.error('Invalid Sentry DSN format');
      return;
    }

    const [, publicKey, host, projectId] = match;

    await fetch(`https://${host}/api/${projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: JSON.stringify({
        exception: {
          values: [{
            type: error.name,
            value: error.message,
            stacktrace: {
              frames: error.stack?.split('\n').slice(1).map(line => ({
                filename: line.trim(),
              })) || []
            }
          }]
        },
        level: 'error',
        platform: 'node',
        environment: process.env.NODE_ENV,
        contexts: context,
        timestamp: Date.now() / 1000,
      }),
    });
  } catch (e) {
    console.error('Failed to send error to Sentry:', e);
  }
}


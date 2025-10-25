# Cursor AI Prompt: Migrate Sentry & PostHog to CDN-Based Implementation

## Context
My Next.js app deployed on Cloudflare Workers is exceeding the 3MB gzipped bundle limit (currently at 6.09MB) because `@sentry/nextjs` and PostHog are bundled into the worker. I need to migrate to a CDN-based implementation that keeps both SDKs out of the bundle while maintaining full functionality.

## Current Implementation Issues
- `@sentry/nextjs` is installed via npm and bundled into server functions (~500KB-1MB)
- PostHog may be installed via npm (adding ~200KB)
- Analytics are being used in `app/editor/page.tsx` with imports from `../../lib/analytics`
- Global error handling imports Sentry directly
- Total bundle size: 17.73MB uncompressed / 6.09MB gzipped (exceeds 3MB limit)

## Required Changes

### 1. Remove NPM Dependencies
```bash
# Run these commands first:
npm uninstall @sentry/nextjs
npm uninstall posthog-js posthog-node  # if installed
```

### 2. Delete Sentry Configuration Files
Delete these files if they exist:
- `sentry.client.config.js` or `sentry.client.config.ts`
- `sentry.server.config.js` or `sentry.server.config.ts`
- `sentry.edge.config.js` or `sentry.edge.config.ts`
- `instrumentation.ts` (if only used for Sentry)

### 3. Update `next.config.js`
Remove `withSentryConfig` wrapper:

```javascript
// BEFORE (remove this pattern):
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, sentryOptions);

// AFTER (clean config):
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Add this for bundle optimization
  // ... rest of your config
};

module.exports = nextConfig;
```

### 4. Update `app/layout.tsx`
Add CDN scripts for both Sentry and PostHog:

```typescript
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Sentry Lazy Loader - 0KB until error occurs */}
            <Script
              id="sentry-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.sentryOnLoad = function() {
                    Sentry.init({
                      dsn: '${process.env.NEXT_PUBLIC_SENTRY_DSN}',
                      environment: '${process.env.NODE_ENV}',
                      tracesSampleRate: 0.1,
                      replaysSessionSampleRate: 0,
                      replaysOnErrorSampleRate: 0,
                      beforeSend(event) {
                        if (window.posthog) {
                          event.user = { id: window.posthog.get_distinct_id() };
                        }
                        return event;
                      }
                    });
                  };
                `
              }}
            />
            <Script
              src={`https://js.sentry-cdn.com/${process.env.NEXT_PUBLIC_SENTRY_PROJECT_KEY}.min.js`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />

            {/* PostHog Snippet - ~6KB initial */}
            <Script
              id="posthog-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                  
                  posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {
                    api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'}',
                    capture_pageview: false,
                    disable_session_recording: true,
                    autocapture: {
                      dom_event_allowlist: ['click'],
                      element_allowlist: ['button', 'a']
                    },
                    capture_exception: false,
                    loaded: function(ph) {
                      if (ph.isFeatureEnabled('enable-session-replay')) {
                        ph.startSessionRecording();
                      }
                    }
                  });
                `
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 5. Update `lib/analytics.ts`
Rewrite to use global PostHog instance from CDN:

```typescript
// lib/analytics.ts
export const AnalyticsEvents = {
  APP_OPEN: 'app_open',
  USER_IDENTIFIED: 'user_identified',
  // ... add other events as needed
} as const;

type AnalyticsEvent = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
      identify: (distinctId: string, properties?: Record<string, any>) => void;
      reset: () => void;
      get_distinct_id: () => string;
      isFeatureEnabled: (flag: string) => boolean;
    };
  }
}

export function capture(event: AnalyticsEvent | string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }
}

export function identify(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, properties);
  }
}

export function reset() {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset();
  }
}
```

### 6. Update `app/global-error.tsx`
Remove Sentry import and use global instance:

```typescript
'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error) => void;
    };
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry loaded from CDN
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong!</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

### 7. Create Server-Side Error Helper
Create `lib/sentry-server.ts` for server-side error tracking:

```typescript
// lib/sentry-server.ts
export async function captureServerException(
  error: Error,
  context?: Record<string, any>
) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Server error:', error, context);
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
```

### 8. Create Server-Side PostHog Helper
Create `lib/posthog-server.ts` for server-side analytics:

```typescript
// lib/posthog-server.ts
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
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

export async function identifyServerUser(
  distinctId: string,
  properties?: Record<string, any>
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
```

### 9. Update API Routes with Error Handling
Example for any API route:

```typescript
// app/api/*/route.ts
import { captureServerException } from '@/lib/sentry-server';
import { captureServerEvent } from '@/lib/posthog-server';

export async function POST(request: Request) {
  try {
    // Your logic here
    const result = await someOperation();
    
    // Track server-side event
    await captureServerEvent('user-id', 'api_call_success', {
      route: '/api/your-route',
      method: 'POST'
    });

    return Response.json(result);
  } catch (error) {
    // Capture error to Sentry
    await captureServerException(error as Error, {
      route: '/api/your-route',
      method: 'POST',
      requestUrl: request.url,
    });

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 10. Update Environment Variables
Add to `.env.local`:

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://PUBLIC_KEY@DOMAIN/PROJECT_ID
NEXT_PUBLIC_SENTRY_PROJECT_KEY=YOUR_PROJECT_KEY
SENTRY_DSN=https://PUBLIC_KEY@DOMAIN/PROJECT_ID  # For server-side
```

## Execution Instructions

1. **First, run the uninstall commands** to remove npm packages
2. **Delete Sentry config files** listed in step 2
3. **Update all files** as specified above
4. **Run `npm install`** to clean up dependencies
5. **Test locally** with `npm run dev`
6. **Deploy** with `npm run deploy`

## Expected Results

- ✅ Bundle size reduced from 6.09MB to ~2-2.5MB gzipped (under 3MB limit)
- ✅ Client-side bundle impact: ~6KB (PostHog snippet only)
- ✅ Sentry: 0KB initial, loads only on error
- ✅ Full error tracking on client and server
- ✅ Full analytics tracking on client and server
- ✅ Successful deployment to Cloudflare Workers free tier

## Important Notes

- All client-side imports of Sentry and PostHog must be removed
- Use `window.Sentry` and `window.posthog` globals instead
- Server-side uses lightweight HTTP API calls (no SDK dependencies)
- This approach maintains full functionality while eliminating bundle bloat

## Verification

After changes, verify:
1. `package.json` has no `@sentry/nextjs`, `posthog-js`, or `posthog-node`
2. No direct imports of Sentry/PostHog SDKs anywhere in code
3. Build completes without Sentry webpack plugin warnings
4. Bundle analyzer shows handler.mjs < 2.5MB
5. Deployment succeeds without size limit error

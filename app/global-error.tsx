'use client';

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
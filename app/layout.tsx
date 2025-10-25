import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "ClockifyManager"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME + " — Bulk edit, upload, and clean Clockify faster",
  description: "Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                      
                      // Filter user errors out (PostHog responsibility)
                      beforeSend(event, hint) {
                        const error = hint.originalException;
                        if (error?.message?.includes('validation') || 
                            error?.message?.includes('required') ||
                            error?.message?.includes('invalid')) {
                          return null; // PostHog tracks user errors
                        }
                        // Link to PostHog user (only if fully initialized)
                        if (window.posthog && typeof window.posthog.get_distinct_id === 'function' && !window.posthog._i) {
                          event.user = { 
                            id: window.posthog.get_distinct_id(),
                            posthog_session: window.posthog.get_session_id?.() || ''
                          };
                        }
                        return event;
                      },
                      
                      // Only send slow transactions (>2s)
                      tracesSampleRate: 0.1,
                      beforeSendTransaction(transaction) {
                        const duration = (transaction.timestamp - transaction.start_timestamp) * 1000;
                        return duration >= 2000 ? transaction : null;
                      },
                      
                      replaysSessionSampleRate: 0,
                      replaysOnErrorSampleRate: 0,
                      profilesSampleRate: 0,
                      
                      beforeBreadcrumb(breadcrumb) {
                        if (breadcrumb.category === 'navigation' || breadcrumb.level === 'error') {
                          return breadcrumb;
                        }
                        return null;
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
                    
                    // Manual pageview tracking
                    capture_pageview: false,
                    
                    // Full session replay with smart sampling (responsibility: PostHog)
                    disable_session_recording: false,
                    session_recording: {
                      recordCrossOriginIframes: false,
                      maskAllInputs: true,
                      maskTextSelector: '[data-private]',
                    },
                    
                    // Full interaction tracking (responsibility: PostHog)
                    autocapture: {
                      dom_event_allowlist: ['click', 'submit', 'change'],
                      element_allowlist: ['button', 'a', 'input', 'select', 'form'],
                      css_selector_allowlist: ['[data-ph-capture]'],
                    },
                    
                    // Disable exception tracking (Sentry responsibility)
                    capture_exception: false,
                    
                    // Enable web vitals (responsibility: PostHog)
                    capture_performance: true,
                    
                    // Feature flags support (responsibility: PostHog)
                    bootstrap: {
                      featureFlags: {},
                    },
                    
                    loaded: function(ph) {
                      // Start recording with smart 5% + errors sampling
                      ph.startSessionRecording({
                        sampling: {
                          minimumDuration: 2000,
                          linkedFlag: 'record-session-on-error',
                        }
                      });
                      
                      // Track pageview
                      ph.capture('$pageview');
                    },
                    
                    // Add session replay URL to events
                    before_send: function(event) {
                      if (event.properties && window.posthog && typeof window.posthog.get_session_replay_url === 'function') {
                        event.properties.$session_recording_url = window.posthog.get_session_replay_url();
                      }
                      return event;
                    }
                  });
                `
              }}
            />

            {/* Sentry-PostHog Integration: Link errors to session replays */}
            <Script
              id="sentry-posthog-integration"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.addEventListener('load', function() {
                    if (window.Sentry && window.posthog) {
                      var originalCaptureException = window.Sentry.captureException;
                      
                      window.Sentry.captureException = function(error, captureContext) {
                        // Force PostHog to record this session when error occurs
                        if (window.posthog) {
                          window.posthog.capture('$exception', {
                            error_message: error.message,
                            error_type: error.name,
                            $session_recording_force_capture: true,
                          });
                        }
                        
                        // Add PostHog context to Sentry error (only if fully initialized)
                        var context = captureContext || {};
                        context.contexts = context.contexts || {};
                        if (window.posthog && typeof window.posthog.get_distinct_id === 'function' && !window.posthog._i) {
                          context.contexts.posthog = {
                            distinct_id: window.posthog.get_distinct_id(),
                            session_id: window.posthog.get_session_id ? window.posthog.get_session_id() : '',
                            session_replay_url: window.posthog.get_session_replay_url ? window.posthog.get_session_replay_url() : '',
                          };
                        }
                        
                        return originalCaptureException.call(this, error, context);
                      };
                    }
                  });
                `
              }}
            />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ''} />
    </html>
  );
}

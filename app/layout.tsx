import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import { Suspense } from 'react'
import SEO from '@/components/SEO'
import TrackingConsentGate from '@/components/TrackingConsentGate'
import WebVitalsReporter from '@/components/WebVitalsReporter'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@bulkifyai";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME + " — Bulk edit, upload, and clean Clockify faster",
    template: "%s — " + APP_NAME,
  },
  alternates: {
    canonical: SITE_URL,
  },
  description: "Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.",
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
  },
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: APP_NAME + " — Bulk edit, upload, and clean Clockify faster",
    description: "Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.",
    url: SITE_URL,
    siteName: APP_NAME,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: APP_NAME + " — Bulk edit, upload, and clean Clockify faster",
    description: "Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F1A' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Performance: Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://us.i.posthog.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        {/* Search engine verification */}
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && (
          <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION} />
        )}
        {(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') && (
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

          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SEO />
        <Suspense fallback={null}>
          <TrackingConsentGate />
          <WebVitalsReporter />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

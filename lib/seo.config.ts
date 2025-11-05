const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@bulkifyai'

export const defaultSeo = {
  titleTemplate: `%s — ${APP_NAME}`,
  defaultTitle: `${APP_NAME} — Bulk edit, upload, and clean Clockify faster`,
  description:
    'Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.',
  canonical: SITE_URL,
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Bulk edit, upload, and clean Clockify faster`,
    description:
      'Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free for a limited time.',
    images: [
      { url: `${SITE_URL.replace(/\/$/, '')}/opengraph-image`, width: 1200, height: 630, alt: APP_NAME },
    ],
  },
  twitter: {
    cardType: 'summary_large_image',
    site: TWITTER_HANDLE,
    handle: TWITTER_HANDLE,
  },
  additionalMetaTags: [
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { name: 'format-detection', content: 'telephone=no,address=no,email=no' },
  ],
}

export default defaultSeo



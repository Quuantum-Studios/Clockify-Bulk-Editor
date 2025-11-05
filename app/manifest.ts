import type { MetadataRoute } from 'next'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0B0F1A',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}


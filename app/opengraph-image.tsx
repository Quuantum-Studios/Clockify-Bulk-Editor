import { ImageResponse } from 'next/og'

export const alt = 'Open Graph Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const site_url = process.env.NEXT_PUBLIC_SITE_URL || 'https://bulkifyai.quuantum.com'
  return new ImageResponse(
    (
      <img
        src={`${site_url.replace(/\/$/, '')}/bulkifyai-og-banner.png`}
        alt="BulkifyAI - Manage Clockify in bulk. Faster."
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    ),
    { ...size }
  )
}



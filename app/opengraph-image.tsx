import { ImageResponse } from 'next/og'

export const alt = 'Open Graph Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const title = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0F1A',
          color: '#ffffff',
          fontSize: 72,
          fontWeight: 700,
        }}
      >
        {title}
      </div>
    ),
    { ...size }
  )
}



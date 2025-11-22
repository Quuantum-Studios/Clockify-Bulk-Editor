import { ImageResponse } from 'next/og'

export const alt = 'Open Graph Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function getImageDataUrl(): Promise<string | null> {
  const site_url = process.env.NEXT_PUBLIC_SITE_URL || 'https://bulkifyai.quuantum.com'
  const imageUrl = `${site_url.replace(/\/$/, '')}/bulkifyai-og-banner.png`
  
  try {
    const imageResponse = await fetch(imageUrl, {
      cache: 'force-cache',
    })
    if (!imageResponse.ok) {
      return null
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = arrayBufferToBase64(imageBuffer)
    return `data:image/png;base64,${base64Image}`
  } catch {
    return null
  }
}

export default async function Image() {
  const dataUrl = await getImageDataUrl()
  
  if (dataUrl) {
    return new ImageResponse(
      (
        <img
          src={dataUrl}
          alt="BulkifyAI - Manage Clockify in bulk. Faster."
          width={1200}
          height={630}
        />
      ),
      { ...size }
    )
  }
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          fontSize: 48,
          fontWeight: 'bold',
        }}
      >
        BulkifyAI
      </div>
    ),
    { ...size }
  )
}

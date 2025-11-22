import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

export const alt = 'Open Graph Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  try {
    const imagePath = join(process.cwd(), 'public', 'bulkifyai-og-banner.png')
    const imageBuffer = await readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
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
  } catch {
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
}



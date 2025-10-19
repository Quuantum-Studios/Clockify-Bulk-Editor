import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { apiKey: string }
    apiKeySchema.parse(body)
    
    const res = await fetch("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": body.apiKey }
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json({ 
        valid: false, 
        error: res.status === 401 ? "Invalid API key" : `Validation failed: ${errorText}` 
      }, { status: 200 })
    }
    
    const data = await res.json()
    return NextResponse.json({ valid: true, user: data })
  } catch (e: unknown) {
    return NextResponse.json({ 
      valid: false, 
      error: e instanceof Error ? e.message : String(e) 
    }, { status: 200 })
  }
}


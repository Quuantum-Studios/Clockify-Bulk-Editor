import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })

export async function POST(req: NextRequest) {
  try {
    let apiKey: string | undefined = req.headers.get("X-Api-Key") || undefined
    let body: { apiKey?: string } = {}
    try {
      body = await req.json()
    } catch { /* ignore empty body */ }

    apiKey = apiKey || body.apiKey

    if (!apiKey) throw new Error("API key required")
    apiKeySchema.parse({ apiKey })
    
    const res = await fetch("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": apiKey }
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


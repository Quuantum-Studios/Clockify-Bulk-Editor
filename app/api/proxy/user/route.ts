import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "../../../../lib/ratelimit"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })

// Get current user info from Clockify
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = req.headers.get("X-Api-Key") || searchParams.get("apiKey")
    if (!apiKey) throw new Error("API key required")
    apiKeySchema.parse({ apiKey })
    const rateLimit = checkRateLimit(apiKey!)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString()
        }
      })
    }
    // https://api.clockify.me/api/v1/user
    const res = await fetch("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": apiKey! }
    })
    if (!res.ok) throw new Error("Failed to fetch user info")
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

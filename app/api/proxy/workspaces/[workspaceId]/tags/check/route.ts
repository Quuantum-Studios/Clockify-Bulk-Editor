import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"

const bodySchema = z.object({
  apiKey: z.string().min(1),
  tagNames: z.array(z.string()).optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const body = await req.json() as { apiKey?: string; tagNames?: string[] }
    const apiKey = req.headers.get("X-Api-Key") || body.apiKey
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
    const { tagNames = [] } = body
    const rateLimit = checkRateLimit(apiKey)
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

    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)

    const { workspaceId } = await context.params
    const allTags = await clockify.getTags(workspaceId)

    const existingNames = new Set(allTags.map(t => t.name.toLowerCase().trim()))
    const missing = tagNames.filter(n => !existingNames.has(n.toLowerCase().trim()))

    const existing = allTags.filter(t =>
      tagNames.map(n => n.toLowerCase().trim()).includes(t.name.toLowerCase().trim())
    )

    return NextResponse.json({ existing, missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

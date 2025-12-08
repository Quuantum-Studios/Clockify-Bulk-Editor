import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../lib/ratelimit"

const aggregatedEntriesSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  projectIds: z.array(z.string()),
  start: z.string(),
  end: z.string(),
  timezone: z.string().optional()
})

const getApiKey = (req: NextRequest) => {
  return req.headers.get("X-Api-Key")
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey(req)
    
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
    if (apiKey.length < 10) return NextResponse.json({ error: "Invalid API key" }, { status: 400 })

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

    const body = await req.json()
    const payload = aggregatedEntriesSchema.safeParse(body)
    
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid payload", details: payload.error.format() }, { status: 400 })
    }

    const { workspaceId, userId, projectIds, start, end, timezone } = payload.data
    const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)))

    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    if (timezone) clockify.setDefaultTimezone(timezone)

    const results = await Promise.all(
      uniqueProjectIds.map(projectId => 
        clockify.getTimeEntries(workspaceId, userId, projectId, start, end)
          .catch(err => {
            console.error(`Failed to fetch entries for project ${projectId}:`, err)
            return [] // Return empty array on failure so other projects still load
          })
      )
    )

    const allEntries = results.flat()
    
    // Deduplicate entries based on ID
    const uniqueEntries = Array.from(
      new Map(allEntries.map((entry: any) => [entry.id, entry])).values()
    )

    return NextResponse.json(uniqueEntries)

  } catch (e: unknown) {
    console.error("[API] Error in POST /aggregated/entries:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

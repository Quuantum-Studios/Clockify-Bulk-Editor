import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"

const bodySchema = z.object({
  apiKey: z.string().min(1),
  projectNames: z.array(z.string()).optional()
})

export async function POST(req: NextRequest, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await context.params
    const body = await req.json() as { apiKey: string; projectNames?: string[] }
    bodySchema.parse(body)
    const { apiKey, projectNames = [] } = body
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
    clockify.setApiKey(apiKey)

    const allProjects = await clockify.getProjects(workspaceId)
    const normalized = projectNames.map((n: string) => n.toLowerCase().trim())
    const existing = allProjects.filter(p => normalized.includes(p.name.toLowerCase().trim()))
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()))
    const missing = projectNames.filter((n: string) => !existingNames.has(n.toLowerCase().trim()))

    return NextResponse.json({ existing, missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

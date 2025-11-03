import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"

const bodySchema = z.object({ apiKey: z.string().min(1), projectId: z.string().min(1), taskNames: z.array(z.string()).min(1) })

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const body = await req.json() as { apiKey: string; projectId: string; taskNames: string[] }
    bodySchema.parse(body)
    const { apiKey, projectId, taskNames } = body
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
    const params = await context.params
    const workspaceId = params.workspaceId
    const created: { id: string; name: string }[] = []
    for (const name of taskNames) {
      const id = await clockify.createTask(workspaceId, projectId, name)
      created.push({ id, name })
    }
    return NextResponse.json({ created })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

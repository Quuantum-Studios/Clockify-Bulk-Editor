import { NextResponse, NextRequest } from "next/server"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await context.params
    const { apiKey, tagIds } = await request.json() as { apiKey: string; tagIds: string[] }

    if (!apiKey) return NextResponse.json({ error: "API key is required" }, { status: 400 })
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
    if (!workspaceId) return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0)
      return NextResponse.json({ error: "Tag IDs are required" }, { status: 400 })

    const api = new ClockifyAPI()
    api.setApiKey(apiKey)

    const failed: { id: string; reason: string }[] = []
    const batchSize = 5

    for (let i = 0; i < tagIds.length; i += batchSize) {
      const batch = tagIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(batch.map(id => api.deleteTag(workspaceId, id)))
      results.forEach((res, index) => {
        if (res.status === "rejected") {
          failed.push({ id: batch[index], reason: String(res.reason) })
        }
      })
      await delay(1000)
    }

    if (failed.length > 0) {
      return NextResponse.json(
        { error: `Failed to delete ${failed.length} tags`, details: failed },
        { status: 429 }
      )
    }

    return NextResponse.json({ message: "Tags deleted successfully" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

import { NextResponse, NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"
import { invalidateCache } from "../../../../../../../lib/cache"

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getEmailFromApiKey(env: { KV?: KVNamespace }, apiKey: string): Promise<string> {
  try {
    if (env.KV) {
      const apiKeyHash = await hashApiKey(apiKey)
      const userCacheKey = `user:${apiKeyHash}`
      const cached = await env.KV.get(userCacheKey, "json") as { email?: string } | null
      if (cached?.email) {
        return cached.email
      }
    }
    const res = await fetch("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": apiKey }
    })
    if (res.ok) {
      const user = await res.json() as { email?: string }
      if (user.email) {
        if (env.KV) {
          const apiKeyHash = await hashApiKey(apiKey)
          const userCacheKey = `user:${apiKeyHash}`
          await env.KV.put(userCacheKey, JSON.stringify(user), { expirationTtl: 3600 })
        }
        return user.email
      }
    }
  } catch {
    // Ignore errors
  }
  return apiKey
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
    await api.setApiKey(apiKey)

    // Fetch actual tags for the workspace to validate
    let workspaceTags: { id: string; name: string }[] = []
    try {
      workspaceTags = await api.getTags(workspaceId)
    } catch {
      return NextResponse.json({ error: "Failed to fetch workspace tags" }, { status: 500 })
    }

    // Filter to only include tags that belong to this workspace
    const validTagIds = tagIds.filter(id => workspaceTags.some(tag => tag.id === id))
    const invalidTagIds = tagIds.filter(id => !workspaceTags.some(tag => tag.id === id))

    if (validTagIds.length === 0) {
      return NextResponse.json({ 
        error: "No valid tags found for this workspace",
        skipped: invalidTagIds.length
      }, { status: 400 })
    }

    const failed: { id: string; reason: string }[] = []
    const skipped: { id: string; reason: string }[] = invalidTagIds.map(id => ({
      id,
      reason: "Tag doesn't belong to workspace"
    }))
    const batchSize = 5

    for (let i = 0; i < validTagIds.length; i += batchSize) {
      const batch = validTagIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(batch.map(id => api.deleteTag(workspaceId, id)))
      results.forEach((res, index) => {
        if (res.status === "rejected") {
          const errorMessage = res.reason instanceof Error ? res.reason.message : String(res.reason)
          // Skip tags that don't belong to workspace (error code 501)
          if (errorMessage.includes("Tag doesn't belong to Workspace") || errorMessage.includes("code: 501")) {
            skipped.push({ id: batch[index], reason: "Tag doesn't belong to workspace" })
          } else {
            failed.push({ id: batch[index], reason: errorMessage })
          }
        }
      })
      await delay(1000)
    }

    const deletedCount = validTagIds.length - failed.length - skipped.length
    const { env } = getCloudflareContext()
    const email = await getEmailFromApiKey(env, apiKey)
    await invalidateCache(env.KV, `tags:${email}:${workspaceId}`)
    if (failed.length > 0 || skipped.length > 0) {
      return NextResponse.json({
        message: `Deleted ${deletedCount} tag(s)`,
        deleted: deletedCount,
        failed: failed.length,
        skipped: skipped.length,
        details: { failed, skipped }
      }, { status: failed.length > 0 ? 207 : 200 })
    }

    return NextResponse.json({ message: "Tags deleted successfully", deleted: deletedCount })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

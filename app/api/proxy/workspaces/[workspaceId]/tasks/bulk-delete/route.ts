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
    const { apiKey, projectId, taskIds } = await request.json() as { apiKey: string; projectId: string; taskIds: string[] }

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
    if (!projectId) return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0)
      return NextResponse.json({ error: "Task IDs are required" }, { status: 400 })

    const api = new ClockifyAPI()
    await api.setApiKey(apiKey)

    const failed: { id: string; reason: string }[] = []
    const batchSize = 5

    for (let i = 0; i < taskIds.length; i += batchSize) {
      const batch = taskIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(batch.map(id => api.deleteTask(workspaceId, projectId, id)))
      results.forEach((res, index) => {
        if (res.status === "rejected") {
          failed.push({ id: batch[index], reason: String(res.reason) })
        }
      })
      await delay(1000)
    }

    const { env } = getCloudflareContext()
    const email = await getEmailFromApiKey(env, apiKey)
    await invalidateCache(env.KV, `tasks:${email}:${workspaceId}:${projectId}`)
    if (failed.length > 0) {
      return NextResponse.json(
        { error: `Failed to delete ${failed.length} tasks`, details: failed },
        { status: 429 }
      )
    }

    return NextResponse.json({ message: "Tasks deleted successfully" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



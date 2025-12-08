import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"
import { invalidateCache } from "../../../../../../../lib/cache"

const bodySchema = z.object({ apiKey: z.string().min(1), projectId: z.string().min(1), taskNames: z.array(z.string()).min(1) })

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const body = await req.json() as { apiKey?: string; projectId: string; taskNames: string[] }
    const { projectId, taskNames } = body
    const apiKey = req.headers.get("X-Api-Key") || body.apiKey
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
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
    const { env } = getCloudflareContext()
    const email = await getEmailFromApiKey(env, apiKey)
    await invalidateCache(env.KV, `tasks:${email}:${workspaceId}:${projectId}`)
    return NextResponse.json({ created })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

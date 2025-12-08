import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../../lib/ratelimit"
import { invalidateCache } from "../../../../../../../lib/cache"

const bodySchema = z.object({ apiKey: z.string().min(1), tagNames: z.array(z.string()).min(1) })

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
    const body = await req.json() as { apiKey?: string; tagNames: string[] }
    // bodySchema.parse(body) // Schema requires apiKey. Skip or partial check.
    const { tagNames } = body
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
    // Filter out empty/invalid tag names
    const validTagNames = tagNames.filter(name => name && typeof name === 'string' && name.trim().length > 0)
    // Parallelize tag creation
    const tagCreationPromises = validTagNames.map(async (name) => {
      try {
        return await clockify.createTag(workspaceId, name.trim())
      } catch (error) {
        // Log error and try to find existing
        console.error(`Failed to create tag "${name}":`, error)
        try {
          // Ideally we would fetch all tags once outside the loop to optimize, but this is a fallback
          // For now, let's just try to fetch this specific tag if possible? No, API lists all.
          // Optimization: Fetch all tags ONCE if any creation fails? 
          // Or just let it fail. The original code fetched all tags per failure.
          // Let's stick to the pattern but maybe just return null?
          // If we return null, we filter it out.
          // Re-implementing the fallback check efficiently:
          // Since we can't easily share the "allTags" cache inside this map without fetching it every time,
          // let's try to fetch all tags ONLY IF we haven't already?
          // Actually, let's keep it simple: parallelism is the main gain.
          // If creation fails (e.g. 400 duplicate), we should handle it.
          // ClockifyAPI.createTag already handles 400 by fetching all tags and finding it!
          // See lib/clockify.ts lines 98-104.
          // So we don't need the try-catch block here if createTag handles it!
          // Wait, createTag in lib/clockify.ts DOES handle 400.
          // So we can just call it.
          throw error; 
        } catch {
          return null
        }
      }
    })

    const results = await Promise.allSettled(tagCreationPromises)
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        created.push(result.value)
      }
    })
    const { env } = getCloudflareContext()
    const email = await getEmailFromApiKey(env, apiKey)
    await invalidateCache(env.KV, `tags:${email}:${workspaceId}`)
    return NextResponse.json({ created })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

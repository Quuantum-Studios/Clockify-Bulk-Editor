import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { ClockifyAPI, TimeEntryPayload } from "../../../../../../lib/clockify"
import { checkRateLimit } from "../../../../../../lib/ratelimit"
import { invalidateCache } from "../../../../../../lib/cache"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })

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

const entrySchema = z.object({
  description: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional()
})

export async function POST(req: NextRequest, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await context.params
    const body = await req.json() as { apiKey: string; userId: string; entries: unknown[] }
    const { apiKey, userId, entries } = body
    apiKeySchema.parse({ apiKey })
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
    if (!userId) throw new Error("userId required")
    if (!Array.isArray(entries)) throw new Error("Entries must be an array")
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    const parsedEntriesRaw = entries.map((e: unknown) => entrySchema.parse(e))
    type MutableEntry = Partial<{
      description: string
      projectId: string
      projectName: string
      taskId: string
      taskName: string
      start: string
      end?: string
      tags?: string[]
      billable?: boolean
      userId?: string
    }>
    const parsedEntries = parsedEntriesRaw as MutableEntry[]
    let projectsCache: { id: string; name: string }[] | null = null
    for (const entry of parsedEntries) {
      const projName = entry.projectName
      if (projName && !entry.projectId) {
        if (!projectsCache) projectsCache = await clockify.getProjects(workspaceId)
        const found = projectsCache.find(p => p.name.toLowerCase() === projName.trim().toLowerCase())
        if (found) entry.projectId = found.id
      }
      if (entry.projectName) delete entry.projectName
    }
    const results = await clockify.bulkUpdateTimeEntries(workspaceId, userId, parsedEntries as TimeEntryPayload[])
    const { env } = getCloudflareContext()
    const email = await getEmailFromApiKey(env, apiKey)
    await invalidateCache(env.KV, `time-entries:${email}:${workspaceId}:${userId}`)
    return NextResponse.json({ success: true, results })
  } catch (e: unknown) {
    console.error("[API] Error in BULK POST:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const statusCode = errorMessage.includes("Clockify API Error") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

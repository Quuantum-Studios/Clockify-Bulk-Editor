import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { ClockifyAPI } from "../../../../lib/clockify"
import { checkRateLimit } from "../../../../lib/ratelimit"
import { getCachedData } from "../../../../lib/cache"

const apiKeySchema = z.object({
  apiKey: z.string().min(10)
})

const timeEntryPayloadSchema = z.object({
  description: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional()
})

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getEmailFromApiKey(env: { KV?: KVNamespace }, apiKey: string): Promise<string> {
  try {
    // Try to get from cache if KV is available
    if (env.KV) {
      const apiKeyHash = await hashApiKey(apiKey)
      const userCacheKey = `user:${apiKeyHash}`
      const cached = await env.KV.get(userCacheKey, "json") as { email?: string } | null
      if (cached?.email) {
        return cached.email
      }
    }
    
    // Fetch user info from Clockify API (whether KV is available or not)
    const res = await fetch("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": apiKey }
    })
    if (res.ok) {
      const user = await res.json() as { email?: string }
      if (user.email) {
        // Cache it if KV is available (using hash instead of full apiKey)
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
  return apiKey // Fallback to apiKey if email not available
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const { env } = getCloudflareContext()
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get("apiKey")
    apiKeySchema.parse({ apiKey })
    const rateLimit = checkRateLimit(apiKey!)
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
    await clockify.setApiKey(apiKey!)
    const email = await getEmailFromApiKey(env, apiKey!)
    const { slug } = await context.params
    const [resource, ...rest] = slug
    if (resource === "workspaces") {
      const data = await getCachedData(
        env.KV,
        `workspaces:${email}`,
        () => clockify.getWorkspaces(),
        3600 // 1 hour
      )
      return NextResponse.json(data)
    }
    if (resource === "projects") {
      const [workspaceId] = rest
      const data = await getCachedData(
        env.KV,
        `projects:${email}:${workspaceId}`,
        () => clockify.getProjects(workspaceId),
        1800 // 30 minutes
      )
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const data = await getCachedData(
        env.KV,
        `tasks:${email}:${workspaceId}:${projectId}`,
        () => clockify.getTasks(workspaceId, projectId),
        900 // 15 minutes
      )
      return NextResponse.json(data)
    }
    if (resource === "tags") {
      const [workspaceId] = rest
      const data = await getCachedData(
        env.KV,
        `tags:${email}:${workspaceId}`,
        () => clockify.getTags(workspaceId),
        1800 // 30 minutes
      )
      return NextResponse.json(data)
    }
    if (resource === "time-entries") {
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const projectId = searchParams.get("projectId") || undefined
      const start = searchParams.get("start") || undefined
      const end = searchParams.get("end") || undefined
      const data = await clockify.getTimeEntries(workspaceId, userId, projectId, start, end)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in GET:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const statusCode = errorMessage.includes("Clockify API Error") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const body = await req.json() as { apiKey: string; timezone?: string; [key: string]: unknown }
    const { apiKey, timezone, ...payload } = body
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
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    if (timezone && typeof timezone === 'string') clockify.setDefaultTimezone(timezone)
    const { slug } = await context.params
    const [resource, ...rest] = slug
    if (resource === "time-entries") {
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const entry = timeEntryPayloadSchema.parse(payload)
      const data = await clockify.createTimeEntry(workspaceId, userId, entry)
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const name = z.string().min(1).parse(payload.name)
      const data = await clockify.createTask(workspaceId, projectId, name)
      return NextResponse.json({ id: data })
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in POST:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const statusCode = errorMessage.includes("Clockify API Error") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const body = await req.json() as { apiKey: string; timezone?: string; [key: string]: unknown }
    const { apiKey, timezone, ...payload } = body
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
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    if (timezone && typeof timezone === 'string') clockify.setDefaultTimezone(timezone)
    const { slug } = await context.params
    const [resource, ...rest] = slug
    if (resource === "time-entries") {
      const [workspaceId, userId, entryId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const data = await clockify.updateTimeEntry(workspaceId, userId, entryId, payload as Partial<import("../../../../lib/clockify").TimeEntry> & { tags?: string[] })
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in PUT:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const statusCode = errorMessage.includes("Clockify API Error") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const body = await req.json() as { apiKey: string; [key: string]: unknown }
    const { apiKey } = body
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
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    const { slug } = await context.params
    const [resource, ...rest] = slug
    if (resource === "time-entries") {
      const [workspaceId, userId, entryId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 })
      const data = await clockify.deleteTimeEntry(workspaceId, userId, entryId)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in DELETE:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const statusCode = errorMessage.includes("Clockify API Error") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

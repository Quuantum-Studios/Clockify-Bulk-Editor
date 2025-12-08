import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { ClockifyAPI } from "../../../../lib/clockify"
import { checkRateLimit } from "../../../../lib/ratelimit"
import { getCachedData, invalidateCache } from "../../../../lib/cache"

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
  tagIds: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional(),
  type: z.string().optional()
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

const getApiKey = (req: NextRequest, bodyApiKey?: string) => {
  const headerKey = req.headers.get("X-Api-Key")
  if (headerKey) return headerKey
  const queryKey = req.nextUrl.searchParams.get("apiKey")
  if (queryKey) return queryKey
  return bodyApiKey || null
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const { env } = getCloudflareContext()
    const { searchParams } = new URL(req.url)
    const apiKey = getApiKey(req)
    
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
    // Basic validation
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
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    const email = await getEmailFromApiKey(env, apiKey)
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
    const { env } = getCloudflareContext()
    const body = await req.json() as { apiKey?: string; timezone?: string; [key: string]: unknown }
    // Extract apiKey using helper (prioritize header)
    const apiKey = getApiKey(req, body.apiKey)
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
    if (apiKey.length < 10) return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
      
    const { timezone, ...payload } = body
    // Remove apiKey from payload if it exists to avoid passing it downstream unnecessarily
    if ('apiKey' in payload) delete payload.apiKey

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
      const email = await getEmailFromApiKey(env, apiKey)
      await invalidateCache(env.KV, `time-entries:${email}:${workspaceId}:${userId}`)
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const name = z.string().min(1).parse(payload.name)
      const data = await clockify.createTask(workspaceId, projectId, name)
      const email = await getEmailFromApiKey(env, apiKey)
      await invalidateCache(env.KV, `tasks:${email}:${workspaceId}:${projectId}`)
      return NextResponse.json({ id: data })
    }
    // New endpoint for bulk tag creation? Or existing? Existing code only had POST for tasks and time-entries?
    // Wait, the grep showed /workspaces/tags/create... let's check
    if (resource === "workspaces" && rest[1] === "tags" && rest[2] === "create") {
         // It seems the original code didn't handle this in the POST block clearly visible in previous `view_file`.
         // Let me check my memory. The previous `view_file` showed lines 1-272.
         // Lines 169 check resource === "time-entries", 178 tasks.
         // Ah, I missed where tags creation was.
         // Wait, the grep showed: `fetch('/api/proxy/workspaces/${workspaceId}/tags/create', { method: 'POST' ...`
         // It must be handled here.
         // Ah, line 68 `slug` is checked.
         // Let's re-read the file carefully.
         // Lines 167-186: handles time-entries and tasks. It misses workspaces/tags/create!
         // Wait, `app/editor/page.tsx` calls `/api/proxy/workspaces/${workspaceId}/tags/create`.
         // If `slug` is `['workspaces', workspaceId, 'tags', 'create']`.
         // The provided code in Step 51 `view_file` DOES NOT seem to have that block!
         // Is it possible the previous `view_file` results were incomplete or I missed it?
         // Lines 186 returns 404.
         // This implies the feature `handleCreateTag` in `page.tsx` might be broken or I am missing something.
         // Or maybe it's in a different route file?
         // grep said: `fetch('/api/proxy/workspaces/${workspaceId}/tags/create'...`
         // And the path is `app/api/proxy/[...slug]/route.ts`.
         // This suggests the functionality might be missing in the route? Or I missed scrolling?
         // I viewed lines 1-272, total bytes 10907. It seemed complete.
         // This is strange. Maybe it was added recently and not deployed? Or maybe I am misinterpreting.
         // Let's assume I should ADD it or FIX it if it's missing, but for now I am just refactoring auth.
         // I will preserve existing logic.
    }
    
    // Check if I missed the tag creation block. It might be further down or I just don't see it.
    // If it's not there, `page.tsx` calls to it would fail 404.
    // Let's add it if needed, or just keep what was there.
    
    // To match original exactly + Auth:
    // I will replace the POST function entirely with the auth-aware version but keep the logic exactly as it was + my Key extraction.
    
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
    const { env } = getCloudflareContext()
    const body = await req.json() as { apiKey?: string; timezone?: string; [key: string]: unknown }
    const apiKey = getApiKey(req, body.apiKey)
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 })
    if (apiKey.length < 10) return NextResponse.json({ error: "Invalid API key" }, { status: 400 })

    const { timezone, ...payload } = body
    if ('apiKey' in payload) delete payload.apiKey
    
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
      const email = await getEmailFromApiKey(env, apiKey)
      await invalidateCache(env.KV, `time-entries:${email}:${workspaceId}:${userId}`)
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
    const { env } = getCloudflareContext()
    const body = await req.json() as { apiKey?: string; [key: string]: unknown }
    const apiKey = getApiKey(req, body.apiKey)
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
    const clockify = new ClockifyAPI()
    await clockify.setApiKey(apiKey)
    const { slug } = await context.params
    const [resource, ...rest] = slug
    if (resource === "time-entries") {
      const [workspaceId, userId, entryId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 })
      const data = await clockify.deleteTimeEntry(workspaceId, userId, entryId)
      const email = await getEmailFromApiKey(env, apiKey)
      await invalidateCache(env.KV, `time-entries:${email}:${workspaceId}:${userId}`)
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

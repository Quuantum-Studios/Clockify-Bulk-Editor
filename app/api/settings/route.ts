import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"

const settingsSchema = z.object({
  userPrompt: z.string().optional(),
  defaultTimezone: z.string().optional(),
})

const apiKeySchema = z.object({
  apiKey: z.string().min(10),
})

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function getEmailFromApiKey(env: { KV?: KVNamespace }, apiKey: string): Promise<string | null> {
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
      headers: { "X-Api-Key": apiKey },
    })

    if (!res.ok) {
      return null
    }

    const user = await res.json() as { email?: string }
    if (user.email && env.KV) {
      const apiKeyHash = await hashApiKey(apiKey)
      const userCacheKey = `user:${apiKeyHash}`
      await env.KV.put(userCacheKey, JSON.stringify({ email: user.email }), { expirationTtl: 3600 })
    }

    return user.email ?? null
  } catch {
    return null
  }
}

// Get user settings from KV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 })
    }

    apiKeySchema.parse({ apiKey })

    const { env } = getCloudflareContext()
    if (!env.KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const email = await getEmailFromApiKey(env, apiKey)
    if (!email) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const key = `settings:${email}`
    const settings = await env.KV.get(key, "json")
    
    return NextResponse.json({ settings: settings || {} })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input",
          issues: e.issues,
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// Save user settings to KV
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json() as { apiKey?: string; userPrompt?: string; defaultTimezone?: string }
    const { apiKey } = apiKeySchema.parse({ apiKey: rawBody.apiKey })
    const body = settingsSchema.parse({
      userPrompt: rawBody.userPrompt,
      defaultTimezone: rawBody.defaultTimezone,
    })
    
    const { env } = getCloudflareContext()
    if (!env.KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const email = await getEmailFromApiKey(env, apiKey)
    if (!email) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const key = `settings:${email}`
    const settings = {
      userPrompt: body.userPrompt || "",
      defaultTimezone: body.defaultTimezone || "UTC",
      updatedAt: new Date().toISOString()
    }
    
    await env.KV.put(key, JSON.stringify(settings))
    
    return NextResponse.json({ success: true, settings })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input",
          issues: e.issues,
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}


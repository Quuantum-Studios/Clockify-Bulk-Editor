import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"

const settingsSchema = z.object({
  email: z.string().email(),
  userPrompt: z.string().optional(),
  defaultTimezone: z.string().optional(),
})

// Get user settings from KV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { env } = getCloudflareContext()
    if (!env.KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const key = `settings:${email}`
    const settings = await env.KV.get(key, "json")
    
    return NextResponse.json({ settings: settings || {} })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// Save user settings to KV
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email: string; userPrompt?: string; defaultTimezone?: string }
    settingsSchema.parse(body)
    
    const { env } = getCloudflareContext()
    if (!env.KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const key = `settings:${body.email}`
    const settings = {
      userPrompt: body.userPrompt || "",
      defaultTimezone: body.defaultTimezone || "UTC",
      updatedAt: new Date().toISOString()
    }
    
    await env.KV.put(key, JSON.stringify(settings))
    
    return NextResponse.json({ success: true, settings })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}


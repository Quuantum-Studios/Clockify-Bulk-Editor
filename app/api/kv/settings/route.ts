import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const settingsSchema = z.object({
  apiKey: z.string().min(10),
  userPrompt: z.string().optional(),
  defaultTimezone: z.string().optional(),
})

// Get user settings from KV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get("apiKey")
    
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
    }

    // @ts-expect-error - KV binding available in Cloudflare Workers context
    const KV = process.env.KV || globalThis.KV
    if (!KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const key = `settings:${apiKey}`
    const settings = await KV.get(key, "json")
    
    return NextResponse.json({ settings: settings || {} })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// Save user settings to KV
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { apiKey: string; userPrompt?: string; defaultTimezone?: string }
    settingsSchema.parse(body)
    
    // @ts-expect-error - KV binding available in Cloudflare Workers context
    const KV = process.env.KV || globalThis.KV
    if (!KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    const key = `settings:${body.apiKey}`
    const settings = {
      userPrompt: body.userPrompt || "",
      defaultTimezone: body.defaultTimezone || "UTC",
      updatedAt: new Date().toISOString()
    }
    
    await KV.put(key, JSON.stringify(settings))
    
    return NextResponse.json({ success: true, settings })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}


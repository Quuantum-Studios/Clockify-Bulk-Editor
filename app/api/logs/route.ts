import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getUserLogs } from "../../../lib/logger"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let email = searchParams.get("email")
    const apiKey = searchParams.get("apiKey")
    
    const { env } = getCloudflareContext()
    if (!env.KV) {
      return NextResponse.json({ error: "KV not available" }, { status: 500 })
    }

    // Fallback: derive email from apiKey using KV mapping if email not provided
    if ((!email || !email.includes("@")) && apiKey) {
      try {
        const encoder = new TextEncoder()
        const data = encoder.encode(apiKey)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        const userInfo = await env.KV.get(`user:${apiKeyHash}`, "json") as { email?: string } | null
        if (userInfo?.email) email = userInfo.email
      } catch {
        // Ignore errors
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email or apiKey" }, { status: 400 })
    }

    const logs = await getUserLogs(env.KV, email)
    
    return NextResponse.json({ logs })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}


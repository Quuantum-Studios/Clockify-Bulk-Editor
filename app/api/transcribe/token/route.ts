import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ error: "missing ASSEMBLYAI_API_KEY" }), { status: 500 })
    const res = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ expires_in: 60 }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return new Response(JSON.stringify({ error: "token request failed", details: body }), { status: 500 })
    }
    const data = await res.json() as any
    const token = data?.token
    if (!token) return new Response(JSON.stringify({ error: "no token" }), { status: 500 })
    return Response.json({ token })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 })
  }
}



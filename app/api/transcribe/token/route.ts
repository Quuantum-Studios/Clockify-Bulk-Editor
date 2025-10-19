export const runtime = "nodejs"

export async function GET() {
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
    const data = await res.json() as { token?: string }
    const token = data?.token
    if (!token) return new Response(JSON.stringify({ error: "no token" }), { status: 500 })
    return Response.json({ token })
  } catch (e: unknown) {
    const error = e as { message?: string }
    return new Response(JSON.stringify({ error: String(error?.message || e) }), { status: 500 })
  }
}



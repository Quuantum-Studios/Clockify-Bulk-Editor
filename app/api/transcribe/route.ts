import { NextRequest } from "next/server"
import { AssemblyAI } from "assemblyai"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    let apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
      const headerKey = req.headers.get("x-assemblyai-key") || req.headers.get("authorization")
      if (headerKey) apiKey = headerKey.replace(/^Bearer\s+/i, "")
    }
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) return new Response(JSON.stringify({ error: "invalid content-type" }), { status: 400 })
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return new Response(JSON.stringify({ error: "no file" }), { status: 400 })
    if (!apiKey) return new Response(JSON.stringify({ error: "missing ASSEMBLYAI_API_KEY" }), { status: 500 })

    const client = new AssemblyAI({ apiKey })
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadUrl = await client.files.upload(buffer)
    const transcript = await client.transcripts.transcribe({ audio: uploadUrl })
    if (transcript.status !== "completed") {
      if (transcript.error) return new Response(JSON.stringify({ error: transcript.error }), { status: 500 })
      return new Response(JSON.stringify({ error: "timeout" }), { status: 504 })
    }
    return Response.json({ text: transcript.text || "" })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 })
  }
}



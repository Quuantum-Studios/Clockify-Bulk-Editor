import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({ apiKey: z.string().min(1), tagNames: z.array(z.string()).optional() })

export async function POST(req: NextRequest, context: { params: { workspaceId: string } }) {
  try {
    const body = await req.json()
    bodySchema.parse(body)
  const { apiKey, tagNames = [] } = body as { apiKey: string; tagNames?: string[] }
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const params = await context.params
    const workspaceId = params.workspaceId
    const allTags = await clockify.getTags(workspaceId)
  const existingNames = new Set(allTags.map(t => t.name.toLowerCase().trim()))
  const missing = (tagNames as string[]).filter((n: string) => !existingNames.has(n.toLowerCase().trim()))
  return NextResponse.json({ existing: allTags.filter(t => (tagNames as string[]).map((n: string) => n.toLowerCase().trim()).includes(t.name.toLowerCase().trim())), missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

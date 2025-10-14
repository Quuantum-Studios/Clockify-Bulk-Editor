import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({
  apiKey: z.string().min(1),
  tagNames: z.array(z.string()).optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const body = await req.json() as { apiKey: string; tagNames?: string[] }
    bodySchema.parse(body)
    const { apiKey, tagNames = [] } = body

    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)

    const { workspaceId } = await context.params
    const allTags = await clockify.getTags(workspaceId)

    const existingNames = new Set(allTags.map(t => t.name.toLowerCase().trim()))
    const missing = tagNames.filter(n => !existingNames.has(n.toLowerCase().trim()))

    const existing = allTags.filter(t =>
      tagNames.map(n => n.toLowerCase().trim()).includes(t.name.toLowerCase().trim())
    )

    return NextResponse.json({ existing, missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

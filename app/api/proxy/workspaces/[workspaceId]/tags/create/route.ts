import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({ apiKey: z.string().min(1), tagNames: z.array(z.string()).min(1) })

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const body = await req.json() as { apiKey: string; tagNames: string[] }
    bodySchema.parse(body)
    const { apiKey, tagNames } = body
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const params = await context.params
    const workspaceId = params.workspaceId
    const created: { id: string; name: string }[] = []
    for (const name of tagNames) {
      const tag = await clockify.createTag(workspaceId, name)
      created.push(tag)
    }
    return NextResponse.json({ created })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

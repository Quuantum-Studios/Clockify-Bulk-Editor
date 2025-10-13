import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({ apiKey: z.string().min(1), projectId: z.string().min(1), taskNames: z.array(z.string()).min(1) })

export async function POST(req: NextRequest, context: { params: { workspaceId: string } }) {
  try {
    const body = await req.json()
    bodySchema.parse(body)
    const { apiKey, projectId, taskNames } = body
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const params = await context.params
    const workspaceId = params.workspaceId
    const created: { id: string; name: string }[] = []
    for (const name of taskNames) {
      const id = await clockify.createTask(workspaceId, projectId, name)
      created.push({ id, name })
    }
    return NextResponse.json({ created })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

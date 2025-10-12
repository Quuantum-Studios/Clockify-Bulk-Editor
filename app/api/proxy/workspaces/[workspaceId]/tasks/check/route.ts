import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({ apiKey: z.string().min(1), projectId: z.string().optional(), taskNames: z.array(z.string()).optional() })

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const body = await req.json()
    bodySchema.parse(body)
    const { apiKey, projectId, taskNames = [] } = body
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const workspaceId = params.workspaceId
    if (!projectId) return NextResponse.json({ existing: [], missing: taskNames })
    const tasks = await clockify.getTasks(workspaceId, projectId)
    const existingNames = new Set(tasks.map(t => t.name.toLowerCase().trim()))
    const missing = taskNames.filter(n => !existingNames.has(n.toLowerCase().trim()))
    return NextResponse.json({ existing: tasks.filter(t => taskNames.map(n => n.toLowerCase().trim()).includes(t.name.toLowerCase().trim())), missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

const bodySchema = z.object({ apiKey: z.string().min(1), projectNames: z.array(z.string()).optional() })

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const body = await req.json()
    bodySchema.parse(body)
    const { apiKey, projectNames = [] } = body
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const workspaceId = params.workspaceId
    const allProjects = await clockify.getProjects(workspaceId)
    const existing = allProjects.filter(p => projectNames.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()))
    const missing = projectNames.filter(n => !existingNames.has(n.toLowerCase().trim()))
    return NextResponse.json({ existing, missing })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../lib/clockify"

const apiKeySchema = z.object({
  apiKey: z.string().min(10)
})

const timeEntryPayloadSchema = z.object({
  description: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional()
})


export async function GET(req: NextRequest, context: { params: { slug: string[] } }) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get("apiKey")
    apiKeySchema.parse({ apiKey })
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey!)
    const params = await context.params
    const [resource, ...rest] = params.slug
    if (resource === "workspaces") {
      const data = await clockify.getWorkspaces()
      return NextResponse.json(data)
    }
    if (resource === "projects") {
      const [workspaceId] = rest
      const data = await clockify.getProjects(workspaceId)
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const data = await clockify.getTasks(workspaceId, projectId)
      return NextResponse.json(data)
    }
    if (resource === "time-entries") {
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const projectId = searchParams.get("projectId") || undefined
      const start = searchParams.get("start") || undefined
      const end = searchParams.get("end") || undefined
      const data = await clockify.getTimeEntries(workspaceId, userId, projectId, start, end)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in GET:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const statusCode = errorMessage.includes('Clockify API Error') ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}


export async function POST(req: NextRequest, context: { params: { slug: string[] } }) {
  try {
    const body = await req.json()
    const { apiKey, ...payload } = body
    apiKeySchema.parse({ apiKey })
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const params = await context.params
    const [resource, ...rest] = params.slug
    if (resource === "time-entries") {
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const entry = timeEntryPayloadSchema.parse(payload)
      const data = await clockify.createTimeEntry(workspaceId, userId, entry)
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const name = z.string().min(1).parse(payload.name)
      const data = await clockify.createTask(workspaceId, projectId, name)
      return NextResponse.json({ id: data })
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in POST:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const statusCode = errorMessage.includes('Clockify API Error') ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}


export async function PUT(req: NextRequest, context: { params: { slug: string[] } }) {
  try {
    const body = await req.json()
    const { apiKey, ...payload } = body
    apiKeySchema.parse({ apiKey })
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const params = await context.params
    const [resource, ...rest] = params.slug
    if (resource === "time-entries") {
      const [workspaceId, userId, entryId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const data = await clockify.updateTimeEntry(workspaceId, userId, entryId, payload)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    console.error("[API] Error in PUT:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const statusCode = errorMessage.includes('Clockify API Error') ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

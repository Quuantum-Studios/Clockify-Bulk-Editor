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
      const [workspaceId] = rest
      const projectId = searchParams.get("projectId") || undefined
      const start = searchParams.get("start") || undefined
      const end = searchParams.get("end") || undefined
      const data = await clockify.getTimeEntries(workspaceId, projectId, start, end)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
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
      const [workspaceId] = rest
      const entry = timeEntryPayloadSchema.parse(payload)
      const data = await clockify.createTimeEntry(workspaceId, entry)
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
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
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
      const [workspaceId, entryId] = rest
      const data = await clockify.updateTimeEntry(workspaceId, entryId, payload)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

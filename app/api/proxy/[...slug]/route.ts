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
      console.log("[API] GET workspaces");
      const data = await clockify.getWorkspaces()
      console.log("[API] Response:", data);
      return NextResponse.json(data)
    }
    if (resource === "projects") {
      const [workspaceId] = rest
      console.log(`[API] GET projects for workspaceId=${workspaceId}`);
      const data = await clockify.getProjects(workspaceId)
      console.log("[API] Response:", data);
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      console.log(`[API] GET tasks for workspaceId=${workspaceId}, projectId=${projectId}`);
      const data = await clockify.getTasks(workspaceId, projectId)
      console.log("[API] Response:", data);
      return NextResponse.json(data)
    }
    if (resource === "time-entries") {
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const projectId = searchParams.get("projectId") || undefined
      const start = searchParams.get("start") || undefined
      const end = searchParams.get("end") || undefined
      console.log(`[API] GET time-entries for workspaceId=${workspaceId}, userId=${userId}, projectId=${projectId}, start=${start}, end=${end}`);
      const data = await clockify.getTimeEntries(workspaceId, userId, projectId, start, end)
      console.log("[API] Response:", data);
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
      const [workspaceId, userId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const entry = timeEntryPayloadSchema.parse(payload)
      console.log(`[API] POST time-entry for workspaceId=${workspaceId}, userId=${userId}, entry=`, entry);
      const data = await clockify.createTimeEntry(workspaceId, userId, entry)
      console.log("[API] Response:", data);
      return NextResponse.json(data)
    }
    if (resource === "tasks") {
      const [workspaceId, projectId] = rest
      const name = z.string().min(1).parse(payload.name)
      console.log(`[API] POST task for workspaceId=${workspaceId}, projectId=${projectId}, name=${name}`);
      const data = await clockify.createTask(workspaceId, projectId, name)
      console.log("[API] Response:", data);
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
      const [workspaceId, userId, entryId] = rest
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      console.log(`[API] PUT time-entry for workspaceId=${workspaceId}, userId=${userId}, entryId=${entryId}, payload=`, payload);
      const data = await clockify.updateTimeEntry(workspaceId, userId, entryId, payload)
      console.log("[API] Response:", data);
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

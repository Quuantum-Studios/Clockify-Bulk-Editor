import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI, TimeEntryPayload } from "../../../../../../lib/clockify"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })
const entrySchema = z.object({
  description: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional()
})

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const body = await req.json()
    const { apiKey, userId, entries } = body
    apiKeySchema.parse({ apiKey })
    if (!userId) throw new Error("userId required")
    if (!Array.isArray(entries)) throw new Error("Entries must be an array")
    const clockify = new ClockifyAPI()
    clockify.setApiKey(apiKey)
    const workspaceId = params.workspaceId
    const parsedEntriesRaw = entries.map((e: unknown) => entrySchema.parse(e))
    // We'll mutate entries to set projectId when possible; define a local type for clarity
    type MutableEntry = Partial<{
      description: string
      projectId: string
      projectName: string
      taskId: string
      taskName: string
      start: string
      end?: string
      tags?: string[]
      billable?: boolean
      userId?: string
    }>
    const parsedEntries = parsedEntriesRaw as MutableEntry[]
    // Resolve projectName -> projectId when provided (best-effort). We cache projects per workspace.
    let projectsCache: { id: string; name: string }[] | null = null
    for (const entry of parsedEntries) {
      const projName = entry.projectName
      if (projName && !entry.projectId) {
        if (!projectsCache) projectsCache = await clockify.getProjects(workspaceId)
        const found = projectsCache.find(p => p.name.toLowerCase() === projName.trim().toLowerCase())
        if (found) {
          entry.projectId = found.id
        } else {
          // leave projectId undefined — entries without projectId will be created without project.
        }
      }
      // remove projectName before sending to Clockify API
      if (entry.projectName) delete entry.projectName
    }

    console.log(`[API] BULK PUT time-entries for workspaceId=${workspaceId}, userId=${userId}, entries=`, parsedEntries)
  const results = await clockify.bulkUpdateTimeEntries(workspaceId, userId, parsedEntries as TimeEntryPayload[])
    console.log("[API] BULK Response:", results)
    return NextResponse.json({ success: true, results })
  } catch (e: unknown) {
    console.error("[API] Error in BULK POST:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const statusCode = errorMessage.includes('Clockify API Error') ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

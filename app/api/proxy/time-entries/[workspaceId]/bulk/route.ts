import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClockifyAPI } from "../../../../../../lib/clockify"

const apiKeySchema = z.object({ apiKey: z.string().min(10) })
const entrySchema = z.object({
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
    const parsedEntries = entries.map((e: unknown) => entrySchema.parse(e))
    console.log(`[API] BULK PUT time-entries for workspaceId=${workspaceId}, userId=${userId}, entries=`, parsedEntries)
    const results = await clockify.bulkUpdateTimeEntries(workspaceId, userId, parsedEntries)
    console.log("[API] BULK Response:", results)
    return NextResponse.json({ success: true, results })
  } catch (e: unknown) {
    console.error("[API] Error in BULK POST:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const statusCode = errorMessage.includes('Clockify API Error') ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

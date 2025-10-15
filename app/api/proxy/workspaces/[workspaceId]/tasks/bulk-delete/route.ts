import { NextResponse, NextRequest } from "next/server"
import { ClockifyAPI } from "../../../../../../../lib/clockify"

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await context.params
    const { apiKey, projectId, taskIds } = await request.json() as { apiKey: string; projectId: string; taskIds: string[] }

    if (!apiKey) return NextResponse.json({ error: "API key is required" }, { status: 400 })
    if (!workspaceId) return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    if (!projectId) return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0)
      return NextResponse.json({ error: "Task IDs are required" }, { status: 400 })

    const api = new ClockifyAPI()
    api.setApiKey(apiKey)

    const failed: { id: string; reason: string }[] = []
    const batchSize = 5

    for (let i = 0; i < taskIds.length; i += batchSize) {
      const batch = taskIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(batch.map(id => api.deleteTask(workspaceId, projectId, id)))
      results.forEach((res, index) => {
        if (res.status === "rejected") {
          failed.push({ id: batch[index], reason: String(res.reason) })
        }
      })
      await delay(1000)
    }

    if (failed.length > 0) {
      return NextResponse.json(
        { error: `Failed to delete ${failed.length} tasks`, details: failed },
        { status: 429 }
      )
    }

    return NextResponse.json({ message: "Tasks deleted successfully" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



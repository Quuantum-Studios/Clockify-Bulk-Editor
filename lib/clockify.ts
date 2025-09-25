import axios from "axios"


export interface TimeEntry {
  id: string
  description?: string
  projectId?: string
  taskId?: string
  start: string
  end?: string
  tags?: string[]
  billable?: boolean
  userId?: string
  [key: string]: string | string[] | boolean | undefined
}

export interface TimeEntryPayload {
  description?: string
  projectId?: string
  taskId?: string
  taskName?: string
  start: string
  end?: string
  tags?: string[]
  billable?: boolean
  userId?: string
  [key: string]: string | string[] | boolean | undefined
}

export class ClockifyAPI {
  private apiKey: string = ""
  private axiosInstance: ReturnType<typeof axios.create> | null = null
  private baseUrl = "https://api.clockify.me/api/v1"

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: { "X-Api-Key": apiKey }
    })
  }

  async getWorkspaces() {
  return (await this.axiosInstance!.get("/workspaces")).data as { id: string; name: string }[]
  }

  async getProjects(workspaceId: string) {
  return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/projects`)).data as { id: string; name: string }[]
  }

  async getTasks(workspaceId: string, projectId: string) {
  return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/projects/${projectId}/tasks`)).data as { id: string; name: string }[]
  }

  async createTask(workspaceId: string, projectId: string, name: string): Promise<string> {
  const res = await this.axiosInstance!.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, { name })
  return (res.data as { id: string }).id
  }

  async getTimeEntries(workspaceId: string, projectId?: string, start?: string, end?: string) {
  const params: Record<string, string> = {}
  if (projectId) params.project = projectId
  if (start) params.start = start
  if (end) params.end = end
  return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/time-entries`, { params })).data as TimeEntry[]
  }

  async updateTimeEntry(workspaceId: string, entryId: string, data: Partial<TimeEntry>) {
  return (await this.axiosInstance!.put(`/workspaces/${workspaceId}/time-entries/${entryId}`, data)).data as TimeEntry
  }

  async createTimeEntry(workspaceId: string, data: TimeEntryPayload) {
  const payload = { ...data }
    if (!payload.taskId && payload.taskName && payload.projectId) {
      const tasks = await this.getTasks(workspaceId, payload.projectId)
  const task = (tasks as { id: string; name: string }[]).find((t) => t.name === payload.taskName)
      if (!task) {
        const taskId = await this.createTask(workspaceId, payload.projectId, payload.taskName)
        payload.taskId = taskId
      } else {
        payload.taskId = task.id
      }
    }
    delete payload.taskName
  return (await this.axiosInstance!.post(`/workspaces/${workspaceId}/time-entries`, payload)).data as TimeEntry
  }

  async bulkUpdateTimeEntries(workspaceId: string, entries: TimeEntryPayload[]) {
    const results = []
    for (const entry of entries) {
      results.push(await this.createTimeEntry(workspaceId, entry))
    }
    return results
  }
}

import axios from "axios"
import { requestLogger, responseLogger, errorLogger } from 'axios-logger';

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

  async getTags(workspaceId: string) {
    // Returns array of { id, name }
    return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/tags`)).data as { id: string; name: string }[];
  }

  async createTag(workspaceId: string, name: string) {
    // Returns { id, name }
    const res = (await this.axiosInstance!.post(`/workspaces/${workspaceId}/tags`, { name })).data as { id: string; name: string };
    console.log("created tag:", res);
    return res;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: { "X-Api-Key": apiKey }
    })
    this.axiosInstance.interceptors.request.use(requestLogger);
    this.axiosInstance.interceptors.response.use(responseLogger, errorLogger);
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

  async getTimeEntries(workspaceId: string, userId: string, projectId?: string, start?: string, end?: string) {
    const params: Record<string, string> = {}
    if (projectId) params.project = projectId
    if (start) params.start = start
    if (end) params.end = end
    // Official endpoint: /workspaces/{workspaceId}/user/{userId}/time-entries
    return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/user/${userId}/time-entries`, { params })).data as TimeEntry[]
  }

  async updateTimeEntry(workspaceId: string, userId: string, entryId: string, data: Partial<TimeEntry> & { tags?: string[] }) {
    // If tags are provided as labels, resolve to tag IDs, create if missing
    console.log('Starting to update entry', entryId);
    let tagIds = undefined;
    if (data.tags && Array.isArray(data.tags)) {
      const allTags = await this.getTags(workspaceId);
      console.log('All tags', allTags);
      tagIds = [];
      for (const label of data.tags) {
        let tag = allTags.find(t => t.name === label);
        if (!tag) {
          console.log('Creating tag', label);
          tag = await this.createTag(workspaceId, label);
        }
        tagIds.push(tag.id);
      }
    }
    const allowedKeys = new Set([
      'description',
      'projectId',
      'taskId',
      'start',
      'end',
      'billable',
      'tagIds'
    ]);
    const normalizeDate = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return new Date(value).toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return value;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    const payload: Record<string, unknown> = {};
    const startFromTimeInterval = (data as any)?.timeInterval?.start as string | undefined;
    const endFromTimeInterval = (data as any)?.timeInterval?.end as string | undefined;
    const start = normalizeDate((data as any).start ?? startFromTimeInterval);
    const end = normalizeDate((data as any).end ?? endFromTimeInterval);
    if (start) payload.start = start;
    if (end) payload.end = end;
    for (const [key, value] of Object.entries(data)) {
      if (!allowedKeys.has(key)) continue;
      if (key === 'start' || key === 'end') continue;
      if (value !== undefined) payload[key] = value;
    }
    if (tagIds) payload.tagIds = tagIds;
    console.log('Payload to update entry', payload);
    try {
      const res = (await this.axiosInstance!.put(`/workspaces/${workspaceId}/time-entries/${entryId}`, payload));
      console.log("Updated time entry:", res);
      return res.data as TimeEntry;
    } catch (error: unknown) {
      console.error("Clockify API Error:", (error as any).response?.data || (error as Error).message);
      const errorMessage = (error as any).response?.data?.message || (error as any).response?.data || (error as Error).message || "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }

  async createTimeEntry(workspaceId: string, userId: string, data: TimeEntryPayload) {
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
    try {
      // Official endpoint: /workspaces/{workspaceId}/user/{userId}/time-entries
      return (await this.axiosInstance!.post(`/workspaces/${workspaceId}/user/${userId}/time-entries`, payload)).data as TimeEntry
    } catch (error: unknown) {
      console.error("Clockify API Error:", (error as any).response?.data || (error as Error).message);
      const errorMessage = (error as any).response?.data?.message || (error as any).response?.data || (error as Error).message || "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }

  async bulkUpdateTimeEntries(workspaceId: string, userId: string, entries: TimeEntryPayload[]) {
    try {
      // Official endpoint: PUT /workspaces/{workspaceId}/user/{userId}/time-entries
      // The payload is an array of time entry objects
      return (await this.axiosInstance!.put(`/workspaces/${workspaceId}/user/${userId}/time-entries`, entries)).data as TimeEntry[]
    } catch (error: unknown) {
      console.error("Clockify API Error:", (error as any).response?.data || (error as Error).message);
      const errorMessage = (error as any).response?.data?.message || (error as any).response?.data || (error as Error).message || "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }
}

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
  type?: string
  tagIds?: string[]
  [key: string]: string | string[] | boolean | undefined
}

interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string
    } | string
  }
  message?: string
}

export class ClockifyAPI {
  private apiKey: string = ""
  private axiosInstance: ReturnType<typeof axios.create> | null = null
  private baseUrl = "https://api.clockify.me/api/v1"

  async getTags(workspaceId: string) {
    return (await this.axiosInstance!.get(`/workspaces/${workspaceId}/tags`)).data as { id: string; name: string }[];
  }

  async createTag(workspaceId: string, name: string) {
    const res = (await this.axiosInstance!.post(`/workspaces/${workspaceId}/tags`, { name })).data as { id: string; name: string };
    return res;
  }

  async deleteTag(workspaceId: string, tagId: string) {
    try {
      const res = await this.axiosInstance!.delete(`/workspaces/${workspaceId}/tags/${tagId}`);
      return res.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && (axiosError.response.data).message) ||
        (axiosError.response?.data as string) ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
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

  async deleteTask(workspaceId: string, projectId: string, taskId: string) {
    try {
      const res = await this.axiosInstance!.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      return res.data
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && (axiosError.response.data).message) ||
        (axiosError.response?.data as string) ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
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

    let tagIds = undefined;
    if (data.tags && Array.isArray(data.tags)) {
      const allTags = await this.getTags(workspaceId);
      tagIds = [];
      for (const label of data.tags) {
        let tag = allTags.find(t => t.name === label);
        if (!tag) {
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
        // Treat datetimes without timezone as India time (IST, UTC+5:30).
        // Parse components and convert to UTC so the resulting ISO string
        // represents the correct instant in time.
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (!m) return undefined;
        const [, yy, mm, dd, hh, min] = m;
        const year = Number(yy);
        const month = Number(mm) - 1;
        const day = Number(dd);
        const hour = Number(hh);
        const minute = Number(min);
        // IST offset is +5:30 (5.5 hours)
        const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
        const utcMs = Date.UTC(year, month, day, hour, minute) - istOffsetMs;
        const d = new Date(utcMs);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return value;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    const payload: Record<string, unknown> = {};
    const dataWithTimeInterval = data as Partial<TimeEntry> & { timeInterval?: { start?: string; end?: string } };
    const startFromTimeInterval = dataWithTimeInterval.timeInterval?.start;
    const endFromTimeInterval = dataWithTimeInterval.timeInterval?.end;
    const start = normalizeDate(data.start ?? startFromTimeInterval);
    const end = normalizeDate(data.end ?? endFromTimeInterval);
    if (start) payload.start = start;
    if (end) payload.end = end;

    if (start && end && start >= end) {
      throw new Error(`Start time ${start} must be before end time ${end}`);
    }
    for (const [key, value] of Object.entries(data)) {
      if (!allowedKeys.has(key)) continue;
      if (key === 'start' || key === 'end') continue;
      if (value !== undefined) payload[key] = value;
    }
    if (tagIds) payload.tagIds = tagIds;
    try {
      const res = (await this.axiosInstance!.put(`/workspaces/${workspaceId}/time-entries/${entryId}`, payload));
      return res.data as TimeEntry;
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && axiosError.response.data.message) ||
        axiosError.response?.data ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }

  async createTimeEntry(workspaceId: string, userId: string, data: TimeEntryPayload) {
    const payload = { ...data }

    const normalizeDate = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        // Treat naive timestamps as India time (IST) by converting the
        // provided wall-clock IST time into the corresponding UTC instant.
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (!m) return undefined;
        const [, yy, mm, dd, hh, min] = m;
        const year = Number(yy);
        const month = Number(mm) - 1;
        const day = Number(dd);
        const hour = Number(hh);
        const minute = Number(min);
        const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
        const utcMs = Date.UTC(year, month, day, hour, minute) - istOffsetMs;
        const d = new Date(utcMs);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return value;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    if (payload.start) {
      const normalized = normalizeDate(payload.start);
      if (normalized) payload.start = normalized;
    }

    if (payload.end) {
      const normalized = normalizeDate(payload.end);
      if (normalized) payload.end = normalized;
    }

    if (payload.start && payload.end && payload.start >= payload.end) {
      throw new Error(`Start time ${payload.start} must be before end time ${payload.end}`);
    }

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
    // Convert tag names to tagIds if necessary (Clockify expects tagIds)
    if (payload.tags && Array.isArray(payload.tags)) {
      const allTags = await this.getTags(workspaceId);
      const tagIds: string[] = [];
      for (const label of payload.tags) {
        let tag = allTags.find(t => t.name === label);
        if (!tag) {
          tag = await this.createTag(workspaceId, label);
        }
        tagIds.push(tag.id);
      }
      payload.tagIds = tagIds;
    }
    // Remove client-facing helper fields
    delete payload.taskName
    delete payload.tags
    // Ensure a default type if not provided
    if (!payload.type) payload.type = 'REGULAR'
    try {
      return (await this.axiosInstance!.post(`/workspaces/${workspaceId}/user/${userId}/time-entries`, payload)).data as TimeEntry
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && axiosError.response.data.message) ||
        axiosError.response?.data ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }

  async bulkUpdateTimeEntries(workspaceId: string, userId: string, entries: TimeEntryPayload[]) {
    const normalizeDate = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        // When bulk importing, treat bare datetimes as India time (IST).
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (!m) return undefined;
        const [, yy, mm, dd, hh, min] = m;
        const year = Number(yy);
        const month = Number(mm) - 1;
        const day = Number(dd);
        const hour = Number(hh);
        const minute = Number(min);
        const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
        const utcMs = Date.UTC(year, month, day, hour, minute) - istOffsetMs;
        const d = new Date(utcMs);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return value;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const normalizedEntries = entries.map(entry => {
      const normalized = { ...entry };
      if (normalized.start) {
        const normalizedStart = normalizeDate(normalized.start);
        if (normalizedStart) normalized.start = normalizedStart;
      }
      if (normalized.end) {
        const normalizedEnd = normalizeDate(normalized.end);
        if (normalizedEnd) normalized.end = normalizedEnd;
      }

      if (normalized.start && normalized.end && normalized.start >= normalized.end) {
        throw new Error(`Start time ${normalized.start} must be before end time ${normalized.end}`);
      }

      return normalized;
    });

    try {
      return (await this.axiosInstance!.put(`/workspaces/${workspaceId}/user/${userId}/time-entries`, normalizedEntries)).data as TimeEntry[]
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && axiosError.response.data.message) ||
        axiosError.response?.data ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }

  async deleteTimeEntry(workspaceId: string, userId: string, entryId: string) {
    try {
      // Deleting a specific time entry uses the endpoint without the /user/{userId} segment
      const res = await this.axiosInstance!.delete(`/workspaces/${workspaceId}/time-entries/${entryId}`)
      return res.data as { id?: string }
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorResponse;
      console.error("Clockify API Error:", axiosError.response?.data || axiosError.message);
      const errorMessage =
        (typeof axiosError.response?.data === 'object' && axiosError.response.data.message) ||
        axiosError.response?.data ||
        axiosError.message ||
        "Unknown error occurred";
      throw new Error(`Clockify API Error: ${errorMessage}`);
    }
  }
}
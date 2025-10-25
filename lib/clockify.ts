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
  private defaultTimezone: string = "UTC"

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
    // Only enable logging in development
    if (process.env.NODE_ENV === 'development') {
      this.axiosInstance.interceptors.request.use(requestLogger);
      this.axiosInstance.interceptors.response.use(responseLogger, errorLogger);
    }
  }

  setDefaultTimezone(tz: string) {
    this.defaultTimezone = tz || "UTC"
  }

  private toUtcIsoFromNaive(value: string): string | undefined {
    if (!value) return undefined;
    // value is expected like YYYY-MM-DDTHH:mm (no seconds, no Z) in the selected timezone
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return undefined;
    const [, yy, mm, dd, hh, min] = m;
    try {
      // Use Intl to compute offset for the target timezone at that local time by formatting the time parts.
      // Build a Date in UTC for the same wall time, then adjust by the timezone offset.
      const year = Number(yy);
      const month = Number(mm) - 1;
      const day = Number(dd);
      const hour = Number(hh);
      const minute = Number(min);
      // Start with UTC millis for the naive local time
      const utcMs = Date.UTC(year, month, day, hour, minute);
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: this.defaultTimezone || 'UTC',
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const parts = dtf.formatToParts(new Date(utcMs));
      const y = Number(parts.find(p => p.type === 'year')?.value || yy);
      const mo = Number(parts.find(p => p.type === 'month')?.value || mm);
      const da = Number(parts.find(p => p.type === 'day')?.value || dd);
      const ho = Number(parts.find(p => p.type === 'hour')?.value || hh);
      const mi = Number(parts.find(p => p.type === 'minute')?.value || min);
      const se = Number(parts.find(p => p.type === 'second')?.value || '0');
      // Compute the same wall time interpreted as if it were in the selected TZ, then convert to UTC by subtracting the actual offset between that TZ time and UTC.
      const tzGuessMs = Date.UTC(y, mo - 1, da, ho, mi, se);
      // Determine actual offset by comparing formatting back to UTC
      const tzDate = new Date(tzGuessMs);
      // Format tzDate in that timezone to recover its local wall time
      const backParts = dtf.formatToParts(tzDate);
      const backY = Number(backParts.find(p => p.type === 'year')?.value || yy);
      const backMo = Number(backParts.find(p => p.type === 'month')?.value || mm);
      const backDa = Number(backParts.find(p => p.type === 'day')?.value || dd);
      const backHo = Number(backParts.find(p => p.type === 'hour')?.value || hh);
      const backMi = Number(backParts.find(p => p.type === 'minute')?.value || min);
      const backSe = Number(backParts.find(p => p.type === 'second')?.value || '0');
      const reconstructedMs = Date.UTC(backY, backMo - 1, backDa, backHo, backMi, backSe);
      return new Date(reconstructedMs).toISOString();
    } catch {
      return undefined;
    }
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
        const iso = this.toUtcIsoFromNaive(value);
        if (iso) return iso;
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
        const iso = this.toUtcIsoFromNaive(value);
        if (iso) return iso;
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
        const iso = this.toUtcIsoFromNaive(value);
        if (iso) return iso;
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
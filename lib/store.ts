import { create } from "zustand"

export type Workspace = { id: string; name: string }
export type Project = { id: string; name: string }
export type Task = { id: string; name: string; projectId?: string }
export type TimeEntry = {
  id: string
  description?: string
  start: string
  end?: string
  projectId?: string
  projectName?: string
  taskId?: string
  taskName?: string
  tags?: string[]
  billable?: boolean
  [key: string]: unknown
}

export type UserProfile = {
  id: string
  email: string
  name: string
  profilePicture?: string
  activeWorkspace?: string
}

type State = {
  apiKey: string
  setApiKey: (apiKey: string) => void
  userPrompt: string
  setUserPrompt: (prompt: string) => void
  defaultTimezone: string
  setDefaultTimezone: (tz: string) => void
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile | null) => void
  workspaces: Workspace[]
  setWorkspaces: (w: Workspace[]) => void
  projects: Project[]
  setProjects: (p: Project[]) => void
  tasks: Record<string, Task[]> // projectId -> tasks
  setTasks: (projectId: string, tasks: Task[]) => void
  timeEntries: TimeEntry[]
  setTimeEntries: (e: TimeEntry[]) => void
  updateTimeEntry: (id: string, patch: Partial<TimeEntry>) => void
  optimisticUpdate: (id: string, patch: Partial<TimeEntry>) => void
  optimisticTask: (projectId: string, task: Task) => void
  // Bulk upload dialog controls
  bulkUploadOpen: boolean
  bulkUploadCsv: string | null
  openBulkUploadWithCsv: (csv: string) => void
  closeBulkUpload: () => void
  resetUserData: () => void
}

// Hydrate apiKey from localStorage if available
let initialApiKey = ""
let initialPrompt = ""
let initialTimezone = ""
const getBrowserTimezone = () => {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      return new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    }
  } catch { /* ignore */ }
  return "UTC"
}
if (typeof window !== "undefined") {
  initialApiKey = window.localStorage.getItem("clockify_api_key") || ""
  initialPrompt = window.localStorage.getItem("clockify_user_prompt") || ""
  initialTimezone =
    window.localStorage.getItem("clockify_default_timezone") ||
    getBrowserTimezone()
}

export const useClockifyStore = create<State>((set) => ({
  apiKey: initialApiKey,
  setApiKey: (apiKey) => {
    set({ apiKey })
    if (typeof window !== "undefined") {
      window.localStorage.setItem("clockify_api_key", apiKey)
    }
  },
  userPrompt: initialPrompt,
  setUserPrompt: (userPrompt) => {
    set({ userPrompt })
    if (typeof window !== "undefined") {
      window.localStorage.setItem("clockify_user_prompt", userPrompt)
    }
  },
  defaultTimezone: initialTimezone,
  setDefaultTimezone: (defaultTimezone) => {
    set({ defaultTimezone })
    if (typeof window !== "undefined") {
      window.localStorage.setItem("clockify_default_timezone", defaultTimezone)
    }
  },
  userProfile: null,
  setUserProfile: (userProfile) => set({ userProfile }),
  workspaces: [],
  setWorkspaces: (w) => set({ workspaces: w }),
  projects: [],
  setProjects: (p) => set({ projects: p }),
  tasks: {},
  setTasks: (projectId, tasks) => set(state => ({ tasks: { ...state.tasks, [projectId]: tasks } })),
  timeEntries: [],
  setTimeEntries: (e) => set({ timeEntries: e }),
  updateTimeEntry: (id, patch) => set(state => ({
    timeEntries: state.timeEntries.map(e => e.id === id ? { ...e, ...patch } : e)
  })),
  optimisticUpdate: (id, patch) => set(state => ({
    timeEntries: state.timeEntries.map(e => e.id === id ? { ...e, ...patch, _optimistic: true } : e)
  })),
  optimisticTask: (projectId, task) => set(state => ({
    tasks: { ...state.tasks, [projectId]: [...(state.tasks[projectId] || []), { ...task, _optimistic: true }] }
  })),
  // Bulk upload dialog controls
  bulkUploadOpen: false,
  bulkUploadCsv: null,
  openBulkUploadWithCsv: (csv) => set({ bulkUploadOpen: true, bulkUploadCsv: csv || "" }),
  closeBulkUpload: () => set({ bulkUploadOpen: false, bulkUploadCsv: null }),
  resetUserData: () => {
    set({
      apiKey: "",
      userPrompt: "",
      defaultTimezone: getBrowserTimezone(),
      userProfile: null,
      workspaces: [],
      projects: [],
      tasks: {},
      timeEntries: [],
      bulkUploadOpen: false,
      bulkUploadCsv: null
    })
    if (typeof window !== "undefined") {
      const keys = [
        "clockify_api_key",
        "clockify_user_prompt",
        "clockify_default_timezone",
        "clockify_selected_workspace",
        "clockify_selected_project",
        "clockify_selected_start",
        "clockify_selected_end"
      ]
      keys.forEach(key => window.localStorage.removeItem(key))
    }
  }
}))

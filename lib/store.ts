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

type State = {
  apiKey: string
  setApiKey: (apiKey: string) => void
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
}

// Hydrate apiKey from localStorage if available
let initialApiKey = ""
if (typeof window !== "undefined") {
  initialApiKey = window.localStorage.getItem("clockify_api_key") || ""
}

export const useClockifyStore = create<State>((set) => ({
  apiKey: initialApiKey,
  setApiKey: (apiKey) => {
    set({ apiKey })
    if (typeof window !== "undefined") {
      window.localStorage.setItem("clockify_api_key", apiKey)
    }
  },
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
  closeBulkUpload: () => set({ bulkUploadOpen: false, bulkUploadCsv: null })
}))

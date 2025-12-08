"use client"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useClockifyStore } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Select } from "../../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table"
import { DateRangePicker } from "../../components/DateRangePicker"
import { BulkUploadDialog } from "../../components/BulkUploadDialog"
import { BulkDeleteTagsDialog } from "../../components/BulkDeleteTagsDialog"
import { BulkDeleteTasksDialog } from "../../components/BulkDeleteTasksDialog"
import { TagSelector } from "../../components/TagSelector"
import { ProjectSelector } from "../../components/ProjectSelector"
import { Skeleton } from "../../components/ui/skeleton"
import { Toast } from "../../components/ui/toast"
import { Input } from "../../components/ui/input"
import { Save, RotateCcw, Trash2, XCircle, Calendar, DollarSign } from "lucide-react"
import { capture, identify, AnalyticsEvents } from "../../lib/analytics"

import type { Task, TimeEntry } from "../../lib/store"
import MagicButton from "@/components/MagicButton"

export const dynamic = 'force-dynamic'

const getLast30DaysRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { startDate: start, endDate: end }
}

export default function AppPage() {
  const apiKey = useClockifyStore(state => state.apiKey)
  const defaultTimezone = useClockifyStore(state => state.defaultTimezone)
  const workspaces = useClockifyStore(state => state.workspaces)
  const setWorkspaces = useClockifyStore(state => state.setWorkspaces)
  const projects = useClockifyStore(state => state.projects)
  const setProjects = useClockifyStore(state => state.setProjects)
  const tasks = useClockifyStore(state => state.tasks)
  const setTasks = useClockifyStore(state => state.setTasks)
  const timeEntries = useClockifyStore(state => state.timeEntries)
  const setTimeEntries = useClockifyStore(state => state.setTimeEntries)
  const optimisticUpdate = useClockifyStore(state => state.optimisticUpdate)
  const optimisticTask = useClockifyStore(state => state.optimisticTask)
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [userId, setUserId] = useState("")
  const [dateRange, setDateRange] = useState<null | { startDate: Date; endDate: Date }>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<Record<string, Partial<typeof timeEntries[number]>>>({})
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const bulkOpen = useClockifyStore(state => state.bulkUploadOpen)
  const bulkCsv = useClockifyStore(state => state.bulkUploadCsv)
  const closeBulk = useClockifyStore(state => state.closeBulkUpload)
  const [bulkDeleteTagsDialogOpen, setBulkDeleteTagsDialogOpen] = useState(false)
  const [bulkDeleteTasksDialogOpen, setBulkDeleteTasksDialogOpen] = useState(false)
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const tagsFetchedRef = useRef(false)
  const isInitialMountRef = useRef(true)
  const [createTaskState, setCreateTaskState] = useState<Record<string, { showCreate: boolean; name: string; loading: boolean }>>({})
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [timeEditOpen, setTimeEditOpen] = useState<Record<string, { start: boolean; end: boolean }>>({})
  const [projectTaskEditOpen, setProjectTaskEditOpen] = useState<Record<string, boolean>>({})
  const [tagsEditOpen, setTagsEditOpen] = useState<Record<string, boolean>>({})
  const [descriptionEditOpen, setDescriptionEditOpen] = useState<Record<string, boolean>>({})
  const [selectionMode, setSelectionMode] = useState(false)
  const timeEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const projectTaskEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tagsEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const descriptionEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const isFetchingEntriesRef = useRef(false)
  const pendingFetchRef = useRef(false)

  const defaultDateRange = useMemo(() => getLast30DaysRange(), [])

  const toggleTimeEditor = (entryId: string, field: 'start' | 'end', open?: boolean) => {
    setTimeEditOpen(prev => {
      const cur = prev[entryId] || { start: false, end: false }
      const next = { ...cur, [field]: typeof open === 'boolean' ? open : !cur[field] }
      return { ...prev, [entryId]: next }
    })
  }

  // Close inline editors when clicking outside their containers
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const targetNode = e.target as Node
      // Date picker
      if (showDatePicker) {
        const datePickerContainer = document.querySelector('.date-picker-container')
        if (datePickerContainer && !datePickerContainer.contains(targetNode)) {
          setShowDatePicker(false)
        }
      }
      // Time editors
      Object.entries(timeEditOpen).forEach(([id, open]) => {
        if (!(open?.start || open?.end)) return
        const container = timeEditorRefs.current[id]
        if (container && !container.contains(targetNode)) {
          setTimeEditOpen(prev => ({ ...prev, [id]: { start: false, end: false } }))
        }
      })
      // Project/Task editor
      Object.entries(projectTaskEditOpen).forEach(([id, isOpen]) => {
        if (!isOpen) return
        const container = projectTaskEditorRefs.current[id]
        if (container && !container.contains(targetNode)) {
          setProjectTaskEditOpen(prev => ({ ...prev, [id]: false }))
        }
      })
      // Tags editor
      Object.entries(tagsEditOpen).forEach(([id, isOpen]) => {
        if (!isOpen) return
        const container = tagsEditorRefs.current[id]
        if (container && !container.contains(targetNode)) {
          setTagsEditOpen(prev => ({ ...prev, [id]: false }))
        }
      })
      // Description editor
      Object.entries(descriptionEditOpen).forEach(([id, isOpen]) => {
        if (!isOpen) return
        const container = descriptionEditorRefs.current[id]
        if (container && !container.contains(targetNode)) {
          setDescriptionEditOpen(prev => ({ ...prev, [id]: false }))
        }
      })
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [timeEditOpen, projectTaskEditOpen, tagsEditOpen, descriptionEditOpen, showDatePicker])

  const toggleCreateTaskUI = (entryId: string, show?: boolean) => {
    setCreateTaskState(prev => ({ ...prev, [entryId]: { ...(prev[entryId] || { showCreate: false, name: "", loading: false }), showCreate: typeof show === 'boolean' ? show : !((prev[entryId] || {}).showCreate) } }))
  }

  const setCreateTaskName = (entryId: string, name: string) => {
    setCreateTaskState(prev => ({ ...prev, [entryId]: { ...(prev[entryId] || { showCreate: false, name: "", loading: false }), name } }))
  }

  const createTaskForEntry = async (entryId: string, projectIdArg?: string) => {
    const state = createTaskState[entryId] || { name: "", loading: false }
    const name = state.name?.trim()
    const projectIdToUse = projectIdArg || (editing[entryId]?.projectId as string) || (timeEntries.find(e => e.id === entryId)?.projectId)
    if (!name) { setToast({ type: "error", message: "Task name required" }); return }
    if (!workspaceId || !apiKey) { setToast({ type: "error", message: "Workspace and API key required" }); return }
    if (!projectIdToUse) { setToast({ type: "error", message: "Please select a project before creating a task" }); return }
    setCreateTaskState(prev => ({ ...prev, [entryId]: { ...(prev[entryId] || { showCreate: true, name }), loading: true } }))
    try {
      const createRes = await fetch(`/api/proxy/tasks/${workspaceId}/${projectIdToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, name })
      })
      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({})) as { error?: string }
        throw new Error(errorData.error || 'Failed to create task')
      }
      const { id: taskId } = await createRes.json() as { id: string }
      const newTask: Task = { id: taskId, name, projectId: projectIdToUse }
      // add optimistic and refresh tasks for the project
      optimisticTask(projectIdToUse, newTask)
      try {
        const tasksRes = await fetch(`/api/proxy/tasks/${workspaceId}/${projectIdToUse}?apiKey=${apiKey}`)
        if (tasksRes.ok) {
          const refreshed = await tasksRes.json() as Task[]
          setTasks(projectIdToUse, refreshed)
        }
      } catch {
        // ignore refresh errors
      }
      // set the edited values on the entry
      handleEdit(entryId, "taskId", taskId)
      handleEdit(entryId, "taskName", name)
      setModifiedRows(s => new Set(s).add(entryId))
      toggleCreateTaskUI(entryId, false)
      setToast({ type: "success", message: "Task created" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setToast({ type: "error", message: `Failed to create task: ${msg}` })
    } finally {
      setCreateTaskState(prev => ({ ...prev, [entryId]: { ...(prev[entryId] || { showCreate: false, name: "" }), loading: false } }))
    }
  }

  // NOTE: removed global overlay loader; using inline spinners per-control instead
  useEffect(() => {
    capture(AnalyticsEvents.APP_OPEN, { page: "editor" })
    if (!apiKey) return;
    fetch(`/api/proxy/user?apiKey=${apiKey}`)
      .then(r => r.json())
      .then((data: unknown) => {
        const userData = data as { id?: string; email?: string; name?: string }
        if (userData && userData.id) {
          setUserId(userData.id)
          identify(userData.id, { email: userData.email, name: userData.name })
        }
        else setUserId("")
      })
      .catch(() => setUserId(""))
  }, [apiKey])

  useEffect(() => {
    try {
      const savedWs = window.localStorage.getItem("clockify_selected_workspace") || ""
      const savedPr = window.localStorage.getItem("clockify_selected_project") || ""
      const savedStart = window.localStorage.getItem("clockify_selected_start")
      const savedEnd = window.localStorage.getItem("clockify_selected_end")
      if (savedWs) setWorkspaceId(savedWs)
      if (savedPr) {
        try {
          const parsed = JSON.parse(savedPr)
          if (Array.isArray(parsed)) {
            setProjectIds(parsed)
          } else if (typeof parsed === 'string') {
            // Legacy: single project ID as string
            setProjectIds([parsed])
          }
        } catch {
          // Legacy: single project ID as plain string
          if (savedPr) setProjectIds([savedPr])
        }
      }

      let appliedSavedRange = false
      if (savedStart && savedEnd) {
        const parsedStart = new Date(savedStart)
        const parsedEnd = new Date(savedEnd)
        if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
          setDateRange({ startDate: parsedStart, endDate: parsedEnd })
          appliedSavedRange = true
        }
      }
      if (!appliedSavedRange) {
        setDateRange(getLast30DaysRange())
      }
    } catch {
      setDateRange(getLast30DaysRange())
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem("clockify_selected_workspace", workspaceId || "")
    } catch { }
  }, [workspaceId])

  useEffect(() => {
    try {
      if (projectIds.length > 0) {
        window.localStorage.setItem("clockify_selected_project", JSON.stringify(projectIds))
      } else {
        window.localStorage.removeItem("clockify_selected_project")
      }
    } catch { }
  }, [projectIds])

  useEffect(() => {
    try {
      if (dateRange) {
        window.localStorage.setItem("clockify_selected_start", dateRange.startDate.toISOString())
        window.localStorage.setItem("clockify_selected_end", dateRange.endDate.toISOString())
      }
    } catch { }
  }, [dateRange])

  useEffect(() => {
    if (!apiKey) return
    fetch(`/api/proxy/workspaces?apiKey=${apiKey}`)
      .then(async r => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(errorData.error || `HTTP ${r.status}: Failed to load workspaces`);
        }
        return r.json();
      })
      .then((data: unknown) => {
        const workspacesData = data as { id: string; name: string }[]
        setWorkspaces(workspacesData)
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to load workspaces";
        setToast({ type: "error", message: errorMessage })
      })
  }, [apiKey, setWorkspaces])

  // Lazy load tasks for a specific project
  const fetchTasksForProject = useCallback(async (projectIdToFetch: string) => {
    if (!apiKey || !workspaceId || !projectIdToFetch) return
    // Skip if already fetched
    if (tasks[projectIdToFetch] && tasks[projectIdToFetch].length > 0) return
    
    try {
      const tasksRes = await fetch(`/api/proxy/tasks/${workspaceId}/${projectIdToFetch}?apiKey=${apiKey}`)
      if (tasksRes.ok) {
        const projectTasks = await tasksRes.json() as Task[]
        setTasks(projectIdToFetch, projectTasks)
      }
    } catch {
      // Ignore errors for individual projects
    }
  }, [apiKey, workspaceId, tasks, setTasks])

  useEffect(() => {
    if (!apiKey || !workspaceId) return

    const fetchProjects = async () => {
      try {
        const response = await fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to load projects`);
        }
        const projectsData = await response.json() as { id: string; name: string }[]
        setProjects(projectsData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load projects";
        setToast({ type: "error", message: errorMessage })
      }
    }

    const fetchTags = async () => {
      try {
        const tagsRes = await fetch(`/api/proxy/tags/${workspaceId}?apiKey=${apiKey}`)
        if (tagsRes.ok) {
          const tagList = await tagsRes.json() as { id: string; name: string }[]
          setTags(tagList);
          tagsFetchedRef.current = true;
        } else {
          setTags([]);
        }
      } catch {
        setTags([]);
      }
    };

    fetchProjects();
    fetchTags();
  }, [apiKey, workspaceId, setProjects])

  // Fetch tasks only when projects are selected
  useEffect(() => {
    projectIds.forEach(pid => {
      if (pid) {
        fetchTasksForProject(pid)
      }
    })
  }, [projectIds, fetchTasksForProject])

  const fetchEntries = useCallback(() => {
    if (!apiKey) {
      setToast({ type: "error", message: "API key required." });
      return;
    }
    if (!workspaceId) {
      setToast({ type: "error", message: "Please select a workspace." });
      return;
    }
    if (!userId) {
      setToast({ type: "error", message: "User ID not loaded." });
      return;
    }
    if (!dateRange) {
      setToast({ type: "error", message: "Please select a date range." });
      return;
    }
    if (projectIds.length === 0) {
      // Don't fetch entries when no projects are selected
      setTimeEntries([])
      setSelectedIds(new Set())
      return;
    }
    // Prevent overlapping fetches
    if (isFetchingEntriesRef.current) {
      // Mark that another fetch was requested while one is in-flight; it will trigger another run afterwards
      pendingFetchRef.current = true
      return
    }
    isFetchingEntriesRef.current = true
    setLoading(true)
    // Interpret the dateRange start/end as wall time in selected timezone and send as UTC Z strings
    const toUtcIso = (d: Date) => {
      // Reuse server normalization by letting API convert timezone? We convert client-side to be consistent with UI
      try {
        const dtf = new Intl.DateTimeFormat('en-US', { timeZone: defaultTimezone || 'UTC', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const parts = dtf.formatToParts(d)
        const y = Number(parts.find(p => p.type === 'year')?.value)
        const mo = Number(parts.find(p => p.type === 'month')?.value)
        const da = Number(parts.find(p => p.type === 'day')?.value)
        const ho = Number(parts.find(p => p.type === 'hour')?.value)
        const mi = Number(parts.find(p => p.type === 'minute')?.value)
        const se = Number(parts.find(p => p.type === 'second')?.value || '0')
        const ms = Date.UTC(y, mo - 1, da, ho, mi, se)
        return new Date(ms).toISOString()
      } catch {
        return d.toISOString()
      }
    }
    const start = toUtcIso(dateRange.startDate)
    const end = toUtcIso(dateRange.endDate)
    
    // Fetch entries for each selected project and combine. Deduplicate projectIds to avoid duplicate requests.
    const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)))
    Promise.all(uniqueProjectIds.map(pid => 
      fetch(`/api/proxy/time-entries/${workspaceId}/${userId}?apiKey=${apiKey}&projectId=${pid}&start=${start}&end=${end}`)
        .then(async r => {
          if (!r.ok) {
            const errorData = await r.json().catch(() => ({})) as { error?: string };
            throw new Error(errorData.error || `HTTP ${r.status}: Failed to load entries`);
          }
          return r.json();
        })
    ))
      .then((results: unknown[]) => {
        // Combine all entries from all selected projects
        const allEntries = results.flat() as Record<string, unknown>[]
        // Remove duplicates based on entry ID
        const uniqueEntries = Array.from(
          new Map(allEntries.map(entry => [entry.id as string, entry])).values()
        )
        // Transform entries: convert tagIds to tags (tag names) and taskId to taskName
        const transformedEntries = uniqueEntries.map((entry: Record<string, unknown>) => {
          const transformed: TimeEntry = { ...entry } as TimeEntry
          // Convert tagIds to tags (tag names)
          if ((entry.tagIds as string[] | undefined) && Array.isArray(entry.tagIds)) {
            transformed.tags = (entry.tagIds as string[]).map((id: string) => {
              const tag = tags.find(t => t.id === id)
              return tag ? tag.name : id
            }).filter(Boolean) as string[]
          }
          // Convert taskId to taskName
          if (entry.taskId && !entry.taskName && entry.projectId) {
            const projectTasks = (tasks[entry.projectId as string] || []) as Task[]
            const task = projectTasks.find(t => t.id === entry.taskId)
            if (task) {
              transformed.taskName = task.name
            }
          }
          return transformed
        })
        setTimeEntries(transformedEntries)
        setSelectedIds(new Set())
        setLoading(false)
        isFetchingEntriesRef.current = false
        if (pendingFetchRef.current) {
          pendingFetchRef.current = false
          fetchEntries()
        }
      })
      .catch((error) => {
        setTimeEntries([]);
        const errorMessage = error instanceof Error ? error.message : "Failed to load entries";
        setToast({ type: "error", message: errorMessage });
        setLoading(false)
        isFetchingEntriesRef.current = false
        if (pendingFetchRef.current) {
          pendingFetchRef.current = false
          fetchEntries()
        }
      })
  }, [apiKey, workspaceId, userId, dateRange, projectIds, defaultTimezone, setTimeEntries, tags, tasks])

  const refreshAllReferenceData = useCallback(async () => {
    if (!apiKey) { setToast({ type: "error", message: "API key required." }); return }
    setRefreshing(true)
    try {
      // Workspaces
      const wsRes = await fetch(`/api/proxy/workspaces?apiKey=${apiKey}`)
      if (wsRes.ok) {
        const ws = await wsRes.json() as { id: string; name: string }[]
        setWorkspaces(ws)
      }
      if (!workspaceId) return;
      // Projects
      const projectsRes = await fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json() as { id: string; name: string }[]
        setProjects(projectsData)
        // Only refresh tasks for projects that are already loaded (not fetch all)
        const projectIdsToRefresh = Object.keys(tasks).filter(pid => 
          projectsData.some(p => p.id === pid)
        )
        // Also include selected projects if not already in the list
        projectIds.forEach(pid => {
          if (pid && !projectIdsToRefresh.includes(pid)) {
            projectIdsToRefresh.push(pid)
          }
        })
        for (const pid of projectIdsToRefresh) {
          try {
            const tasksRes = await fetch(`/api/proxy/tasks/${workspaceId}/${pid}?apiKey=${apiKey}`)
            if (tasksRes.ok) {
              const projectTasks = await tasksRes.json() as Task[]
              setTasks(pid, projectTasks)
            }
          } catch { }
        }
      }
      // Tags
      try {
        const tagsRes = await fetch(`/api/proxy/tags/${workspaceId}?apiKey=${apiKey}`)
        if (tagsRes.ok) {
          const tagList = await tagsRes.json() as { id: string; name: string }[]
          setTags(tagList)
        } else {
          setTags([])
        }
      } catch { setTags([]) }
      // Entries
      fetchEntries()
      setToast({ type: 'success', message: 'Refreshed data' })
    } catch {
      setToast({ type: 'error', message: 'Refresh failed' })
    } finally {
      setRefreshing(false)
    }
  }, [apiKey, workspaceId, projectIds, tasks, setWorkspaces, setProjects, setTasks, fetchEntries])


  // Auto-fetch entries when filters change
  // Skip auto-fetch on initial mount if projectIds is empty (first-time user)
  // to avoid fetching ALL entries across all projects unnecessarily
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      // On first load, only auto-fetch if projectIds are set (returning user with saved preference)
      // If projectIds is empty, wait for user to explicitly select a project
      if (apiKey && workspaceId && userId && dateRange && projectIds.length > 0) {
        fetchEntries()
      }
      return
    }
    // After initial mount, auto-fetch when filters change
    // Only fetch if at least one project is selected
    if (apiKey && workspaceId && userId && dateRange && projectIds.length > 0) {
      fetchEntries()
    }
  }, [apiKey, workspaceId, projectIds, userId, dateRange, fetchEntries])

  const addNewRow = () => {
    const tempId = `new-${Date.now()}`
    const now = new Date()
    const in30 = new Date(Date.now() + 30 * 60 * 1000)
    const toLocalNaive = (d: Date) => {
      const yyyy = d.getFullYear().toString().padStart(4, '0')
      const mm = (d.getMonth() + 1).toString().padStart(2, '0')
      const dd = d.getDate().toString().padStart(2, '0')
      const HH = d.getHours().toString().padStart(2, '0')
      const MM = d.getMinutes().toString().padStart(2, '0')
      return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00Z`
    }
    const nowIso = toLocalNaive(now)
    const endIso = toLocalNaive(in30)
    const newEntry: import("../../lib/store").TimeEntry & { _isNew: boolean } = {
      id: tempId,
      description: "",
      start: nowIso,
      end: endIso,
      projectId: projectIds[0] || "",
      taskName: "New Task",
      tags: [],
      billable: true,
      _isNew: true
    }
    setTimeEntries([newEntry, ...timeEntries])
    setModifiedRows(s => new Set(s).add(tempId))
  }

  // Populate entries returned from BulkUploadDialog for manual review
  const populateEntriesForReview = async (entries: Record<string, unknown>[]) => {

    const toAdd: TimeEntry[] = entries.map((e, idx) => {
      const tempId = `bulk-${Date.now()}-${idx}`
      const incomingProjectName = (e.projectName as string) || undefined
      const incomingTaskName = (e.taskName as string) || undefined
      // try to resolve projectId from supplied value or project name
      let resolvedProjectId = (e.projectId as string) || undefined
      if (!resolvedProjectId && incomingProjectName && Array.isArray(projects)) {
        const found = projects.find((p: { id: string; name: string }) => p.name.toLowerCase().trim() === incomingProjectName.toLowerCase().trim())
        if (found) resolvedProjectId = found.id
      }
      // try to resolve taskId from supplied value or task name (requires project)
      let resolvedTaskId = (e.taskId as string) || undefined
      if (!resolvedTaskId && incomingTaskName && resolvedProjectId) {
        const projectTasks = (tasks && tasks[resolvedProjectId]) || []
        const foundT = (projectTasks as Task[]).find(tk => tk.name.toLowerCase().trim() === incomingTaskName.toLowerCase().trim())
        if (foundT) resolvedTaskId = foundT.id
      }
      const t: TimeEntry & { _isNew?: boolean } = {
        id: tempId,
        description: (e.description as string) || "",
        start: (e.start as string) || new Date().toISOString(),
        end: (e.end as string) || undefined,
        projectId: resolvedProjectId,
        projectName: incomingProjectName,
        taskId: resolvedTaskId,
        taskName: incomingTaskName,
        tags: (e.tags as string[]) || undefined,
        billable: (typeof e.billable === 'boolean') ? e.billable as boolean : undefined,
        _isNew: true
      }
      return t
    })
    // Fetch tasks for involved projects first, so we can resolve taskId from taskName reliably
    const projectIdsToFetch = Array.from(new Set(toAdd.map(t => t.projectId).filter(Boolean))) as string[]
    const fetchedTasksMap: Record<string, Task[]> = {}
    try {
      if (apiKey && workspaceId && projectIdsToFetch.length) {
        for (const pid of projectIdsToFetch) {
          try {
            // if we already have tasks for this project, reuse; else fetch
            const existing = (tasks && tasks[pid]) || []
            let projectTasks: Task[] = []
            if (Array.isArray(existing) && existing.length > 0) {
              projectTasks = existing
            } else {
              const tasksRes = await fetch(`/api/proxy/tasks/${workspaceId}/${pid}?apiKey=${apiKey}`)
              if (tasksRes.ok) {
                projectTasks = await tasksRes.json() as Task[]
              }
            }
            fetchedTasksMap[pid] = projectTasks
            if (!(Array.isArray(existing) && existing.length > 0)) setTasks(pid, projectTasks)
          } catch {
            // ignore per-project task fetch errors
          }
        }
      }
    } catch {
      // ignore prefetch errors
    }
    // Resolve taskId by name when possible
    const toAddResolved = toAdd.map(t => {
      if (!t.taskId && t.taskName && t.projectId) {
        const list = fetchedTasksMap[t.projectId] || []
        const found = list.find(tt => tt.name.toLowerCase().trim() === (t.taskName as string).toLowerCase().trim())
        if (found) return { ...t, taskId: found.id, taskName: found.name }
      }
      return t
    })
    const next = [...toAddResolved, ...(Array.isArray(timeEntries) ? timeEntries : [])]
    setTimeEntries(next)
    // mark them as modified so user can bulk save all or individually
    setModifiedRows(s => {
      const n = new Set(s)
      for (const t of toAddResolved) n.add(t.id)
      return n
    })
    setBulkDialogOpen(false)
  }

  const handleEdit = (id: string, field: string, value: unknown) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    setModifiedRows(s => new Set(s).add(id))
  }

  const handleCreateTag = async (name: string) => {
    if (!workspaceId || !apiKey) throw new Error("Workspace and API key required")
    const createRes = await fetch(`/api/proxy/workspaces/${workspaceId}/tags/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, tagNames: [name] })
    })
    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({})) as { error?: string }
      throw new Error(errorData.error || 'Failed to create tag')
    }
    const { created } = await createRes.json() as { created: { id: string; name: string }[] }
    const newTag = created[0]
    setTags(prev => [...prev, newTag])
    return newTag
  }

  const handleSaveRow = async (entry: typeof timeEntries[number], options?: { skipRefresh?: boolean }) => {
    setSavingRows(s => new Set(s).add(entry.id))
    setToast(null)
    // Declare allowedKeys once at the top (do NOT send userId in the request body)
    const allowedKeys = new Set([
      'description', 'projectId', 'taskId', 'taskName', 'start', 'end', 'billable', 'tagIds'
    ]);
    const original = entry as Record<string, unknown>;
    let patch: Record<string, unknown> = { ...(editing[entry.id] || {}) };
    const normalizeDate = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        const d = new Date(value + ':00');
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return value;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    if (patch.start !== undefined) {
      const normalized = normalizeDate(patch.start);
      if (normalized) patch.start = normalized;
      else delete patch.start;
    }
    if (patch.end !== undefined) {
      const normalized = normalizeDate(patch.end);
      if (normalized) patch.end = normalized;
      else delete patch.end;
    }

    if (patch.start && patch.end && patch.start >= patch.end) {
      setToast({ type: "error", message: `Start time must be before end time` });
      setSavingRows(s => { const n = new Set(s); n.delete(entry.id); return n })
      return;
    }
    const entryAny = entry as unknown as { timeInterval?: { start?: string; end?: string }; start?: string; end?: string; _isNew?: boolean };
    let tagIdsFromPatch: string[] | undefined = undefined;
    // Get tags from either patch (user edits) or original entry (bulk upload)
    const tagsToConvert = patch.tags || (entryAny._isNew ? (original.tags as string[] | undefined) : undefined);
    if (Array.isArray(tagsToConvert) && workspaceId && apiKey) {
      const tagIds: string[] = [];
      const newTags: { id: string; name: string }[] = [];
      // Filter out empty/invalid tag names
      const validTags = tagsToConvert.filter(label => label && typeof label === 'string' && label.trim().length > 0);
      for (const label of validTags) {
        const trimmedLabel = label.trim();
        let tag = tags.find(t => t.name === trimmedLabel) || newTags.find(t => t.name === trimmedLabel);
        if (!tag) {
          try {
            const createRes = await fetch(`/api/proxy/workspaces/${workspaceId}/tags/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey, tagNames: [trimmedLabel] })
            })
            if (!createRes.ok) {
              // Try to get existing tag as fallback
              const allTagsRes = await fetch(`/api/proxy/tags/${workspaceId}?apiKey=${apiKey}`).catch(() => null)
              if (allTagsRes?.ok) {
                const allTagsList = await allTagsRes.json() as { id: string; name: string }[]
                tag = allTagsList.find(t => t.name === trimmedLabel)
              }
              if (!tag) {
                const errorData = await createRes.json().catch(() => ({})) as { error?: string }
                throw new Error(errorData.error || 'Failed to create tag')
              }
            } else {
              const { created } = await createRes.json() as { created: { id: string; name: string }[] }
              tag = created[0]
            }
            if (tag) {
              newTags.push(tag);
            }
          } catch (error) {
            // Skip this tag if creation fails and we can't find existing one
            console.error(`Failed to create/find tag "${trimmedLabel}":`, error)
            continue;
          }
        }
        if (tag) {
          tagIds.push(tag.id);
        }
      }
      if (newTags.length > 0) {
        setTags([...tags, ...newTags]);
      }
      if (patch.tags) {
        const { tags: _omitTags, ...rest } = patch;
        void _omitTags;
        patch = { ...rest, tagIds };
      }
      tagIdsFromPatch = tagIds;
    }
    const minimalPatch: Record<string, unknown> = {};
    const currentStart = entryAny.timeInterval?.start ?? entryAny.start;
    const currentEnd = entryAny.timeInterval?.end ?? entryAny.end;
    for (const [k, v] of Object.entries(patch)) {
      if (!allowedKeys.has(k)) continue;
      const current = (k === 'start') ? currentStart : (k === 'end') ? currentEnd : (original as Record<string, unknown>)[k];
      if (
        JSON.stringify(v) !== JSON.stringify(current) &&
        v !== null && v !== undefined
      ) {
        minimalPatch[k] = v;
      }
    }
    if (entryAny._isNew) {
      const createPayload: Record<string, unknown> = {}
      const merged = { ...original, ...patch }
      for (const [k, v] of Object.entries(merged)) {
        if (!allowedKeys.has(k)) continue
        if (v !== undefined && v !== "") createPayload[k] = v
      }
      if (!createPayload.start) {
        const s = normalizeDate((merged as Record<string, unknown>).start)
        if (s) createPayload.start = s
      }
      // Ensure required/expected fields for the Clockify API
      if (createPayload.billable === undefined) createPayload.billable = false
      if (!createPayload.type) createPayload.type = 'REGULAR'
      // If tags were provided as names they were converted into tagIds earlier
      // Explicitly include tagIds if they were converted from tags
      if (tagIdsFromPatch !== undefined) {
        createPayload.tagIds = tagIdsFromPatch
      }
      try {
        const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, timezone: defaultTimezone, ...createPayload })
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({})) as { error?: string };
          const finalErrorMessage = errorData.error || `HTTP ${res.status}: Save failed`;
          throw new Error(finalErrorMessage);
        }
        setToast({ type: "success", message: "Saved" })
        setModifiedRows(s => { const n = new Set(s); n.delete(entry.id); return n })
        if (!options?.skipRefresh) fetchEntries()
        setSavingRows(s => { const n = new Set(s); n.delete(entry.id); return n })
        return
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Save failed";
        setToast({ type: "error", message: errorMessage })
        setSavingRows(s => { const n = new Set(s); n.delete(entry.id); return n })
        return
      }
    }
    // Merge edits into the full entry data, but use normalized values (dates, tagIds)
    const mergedEntry: Record<string, unknown> = {};
    const editsRaw = editing[entry.id] || {};
    // Start with a copy and normalize any transformed values we computed above
    const normalizedEdits: Record<string, unknown> = { ...editsRaw };
    // If tags were converted earlier, prefer tagIds (even if empty array)
    if (tagIdsFromPatch !== undefined) {
      normalizedEdits.tagIds = tagIdsFromPatch;
      delete normalizedEdits.tags;
    }
    // Normalize start/end values if present in edits
    if (normalizedEdits.start !== undefined) {
      const ns = normalizeDate(normalizedEdits.start);
      if (ns) normalizedEdits.start = ns; else delete normalizedEdits.start;
    }
    if (normalizedEdits.end !== undefined) {
      const ne = normalizeDate(normalizedEdits.end);
      if (ne) normalizedEdits.end = ne; else delete normalizedEdits.end;
    }
    for (const k of allowedKeys) {
      // Special handling for start/end: prefer edited value, otherwise use timeInterval if present, otherwise original
      if (k === 'start') {
        const v = (normalizedEdits.start !== undefined) ? normalizedEdits.start : (entryAny.timeInterval?.start ?? entryAny.start ?? original.start);
        if (v !== undefined && v !== null && v !== "") mergedEntry.start = v
        continue
      }
      if (k === 'end') {
        const v = (normalizedEdits.end !== undefined) ? normalizedEdits.end : (entryAny.timeInterval?.end ?? entryAny.end ?? original.end);
        if (v !== undefined && v !== null && v !== "") mergedEntry.end = v
        continue
      }
      // Other keys: prefer edited value, else original
      const v = (normalizedEdits[k] !== undefined) ? normalizedEdits[k] : original[k];
      if (v !== undefined && v !== null) mergedEntry[k] = v;
    }
    optimisticUpdate(entry.id, mergedEntry);
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, timezone: defaultTimezone, ...mergedEntry })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { error?: string };
        const finalErrorMessage = errorData.error || `HTTP ${res.status}: Save failed`;
        throw new Error(finalErrorMessage);
      }
      setToast({ type: "success", message: "Saved" })
      setModifiedRows(s => { const n = new Set(s); n.delete(entry.id); return n })
      if (!options?.skipRefresh) fetchEntries()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Save failed";
      setToast({ type: "error", message: errorMessage })
    } finally {
      setSavingRows(s => { const n = new Set(s); n.delete(entry.id); return n })
    }
  }
  const undoEdits = (id: string) => {
    setEditing(prev => { const copy = { ...prev }; delete copy[id]; return copy })
    setModifiedRows(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const removeRow = (id: string) => {
    setTimeEntries((Array.isArray(timeEntries) ? timeEntries : []).filter(e => e.id !== id))
    setModifiedRows(prev => { const n = new Set(prev); n.delete(id); return n })
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleDeleteRow = async (entry: typeof timeEntries[number]) => {
    // If it's a locally-created new row, just remove it
    if ((entry as unknown as { _isNew?: boolean })._isNew) {
      removeRow(entry.id)
      setToast({ type: "success", message: "Removed" })
      return
    }
    if (!workspaceId || !userId || !apiKey) { setToast({ type: "error", message: "Workspace, user and API key required to delete" }); return }
    if (!confirm("Delete this time entry? This action cannot be undone.")) return
    setSavingRows(s => new Set(s).add(entry.id))
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { error?: string };
        const finalErrorMessage = errorData.error || `HTTP ${res.status}: Delete failed`;
        throw new Error(finalErrorMessage);
      }
      removeRow(entry.id)
      setToast({ type: "success", message: "Deleted" })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      setToast({ type: "error", message: errorMessage })
    } finally {
      setSavingRows(s => { const n = new Set(s); n.delete(entry.id); return n })
    }
  }
  const handleBulkSave = async () => {
    setToast(null)
    if (Array.isArray(timeEntries)) {
      for (const id of modifiedRows) {
        const entry = timeEntries.find((e) => e.id === id)
        if (entry) await handleSaveRow(entry, { skipRefresh: true })
      }
      fetchEntries()
    }
    setToast({ type: "success", message: "Bulk save complete" })
    setModifiedRows(new Set())
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const areAllSelected = Array.isArray(timeEntries) && timeEntries.length > 0 && timeEntries.every(e => selectedIds.has(e.id))
  const toggleSelectAll = () => {
    if (!Array.isArray(timeEntries) || timeEntries.length === 0) return
    setSelectedIds(() => {
      if (areAllSelected) return new Set()
      return new Set(timeEntries.map(e => e.id))
    })
  }

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!workspaceId || !userId || !apiKey) { setToast({ type: "error", message: "Workspace, user and API key required to delete" }); return }
    if (!confirm(`Delete ${selectedIds.size} selected entr${selectedIds.size === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return
    setToast(null)
    let successCount = 0
    let failCount = 0
    for (const id of Array.from(selectedIds)) {
      const entry = (Array.isArray(timeEntries) ? timeEntries : []).find(e => e.id === id)
      if (!entry) continue
      if ((entry as unknown as { _isNew?: boolean })._isNew) {
        removeRow(entry.id)
        successCount++
        continue
      }
      setSavingRows(s => new Set(s).add(id))
      try {
        const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey })
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({})) as { error?: string };
          const finalErrorMessage = errorData.error || `HTTP ${res.status}: Delete failed`
          throw new Error(finalErrorMessage)
        }
        removeRow(id)
        successCount++
      } catch {
        failCount++
      } finally {
        setSavingRows(s => { const n = new Set(s); n.delete(id); return n })
      }
    }
    setSelectedIds(new Set())
    if (failCount === 0) setToast({ type: "success", message: `Deleted ${successCount} entr${successCount === 1 ? 'y' : 'ies'}` })
    else if (successCount === 0) setToast({ type: "error", message: `Failed to delete ${failCount} entr${failCount === 1 ? 'y' : 'ies'}` })
    else setToast({ type: "error", message: `Deleted ${successCount}, failed ${failCount}` })
    // After bulk delete completes, refetch from server for a canonical view
    fetchEntries()
  }

  // dateRange is initialized from localStorage in the mount effect above

  return (
    <div className="max-w-7xl mx-auto">
      {/* Controls Section (mobile responsive) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Workspace */}
            <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className="h-9 w-full sm:w-[200px] cursor-pointer">
              <option value="">Workspace</option>
              {Array.isArray(workspaces) && workspaces.map((ws: { id: string; name: string }) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </Select>
            {/* Project */}
            <ProjectSelector
              selectedProjectIds={projectIds}
              availableProjects={projects}
              onChange={setProjectIds}
              placeholder="Select project"
              className="h-9 w-full sm:w-[220px]"
              onSelectAll={() => setProjectIds(projects.map(p => p.id))}
            />
            {/* Date Range */}
            <div className="relative date-picker-container">
              <button
                type="button"
                onClick={() => setShowDatePicker(v => !v)}
                className="h-9 w-full sm:w-[200px] px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                {dateRange
                  ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                  : 'Pick Date Range'}
              </button>
              {showDatePicker && (
                <div className="absolute z-20 mt-2 left-0 right-0 sm:right-auto bg-white dark:bg-gray-900 rounded shadow-lg border p-2">
                  <DateRangePicker value={dateRange || defaultDateRange} onChange={val => { setDateRange(val); }} />
                </div>
              )}
            </div>
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Button onClick={refreshAllReferenceData} type="button" variant="outline" className="h-9 cursor-pointer" title="Refresh data" disabled={refreshing}>
              {refreshing ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => setBulkDeleteTagsDialogOpen(true)} type="button" variant="outline" className="h-9 cursor-pointer">
              <span className="hidden sm:inline">🏷️ Manage Tags</span>
              <span className="sm:hidden">🏷️</span>
            </Button>
            <Button onClick={() => setBulkDeleteTasksDialogOpen(true)} type="button" variant="outline" className="h-9 cursor-pointer" disabled={projectIds.length === 0}>
              <span className="hidden sm:inline">✅ Manage Tasks</span>
              <span className="sm:hidden">✅</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Time Entries</h2>
            <Button
              type="button"
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode)
                if (selectionMode) {
                  setSelectedIds(new Set())
                }
              }}
              className="h-8 text-xs px-3 cursor-pointer font-medium"
            >
              {selectionMode ? 'Cancel Selection' : 'Select Entries'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button onClick={addNewRow} type="button" variant="outline" className="h-9 cursor-pointer flex-1 sm:flex-none">
              <span className="hidden sm:inline">+ Add New Entry</span>
              <span className="sm:hidden">+ Add</span>
            </Button>
            <Button onClick={() => setBulkDialogOpen(true)} type="button" variant="outline" className="h-9 cursor-pointer flex-1 sm:flex-none">
              <span className="hidden sm:inline">📁 Bulk Upload</span>
              <span className="sm:hidden">📁</span>
            </Button>
            <MagicButton />
          </div>
        </div>
        <div className="entries-table-wrapper overflow-x-auto relative">
          {loading ? (
            <div className="p-8">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            Array.isArray(timeEntries) && timeEntries.length > 0 ? (
              <Table className="entries-table w-full min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    {selectionMode && (
                      <TableHead className="w-12 text-center sticky left-0 z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                        <input type="checkbox" checked={areAllSelected} onChange={toggleSelectAll} className="cursor-pointer w-4 h-4" />
                      </TableHead>
                    )}
                    <TableHead className={`w-12 text-center sticky ${selectionMode ? "left-12" : "left-0"} z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}></TableHead>
                    <TableHead className="min-w-[200px] max-w-[300px]">Description</TableHead>
                    <TableHead className="min-w-[200px] max-w-[280px] whitespace-nowrap">Time (UTC)</TableHead>
                    <TableHead className="min-w-[250px] max-w-[420px]">Project / Task</TableHead>
                    <TableHead className="min-w-[100px] max-w-[150px]">Tags</TableHead>
                    <TableHead className="text-center w-[180px] whitespace-nowrap sticky right-0 z-20 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.1)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map(entry => {
                    const editingEntry = (editing[entry.id] || {}) as Record<string, unknown>;
                    const timeInterval = (entry as unknown as { timeInterval?: { start?: string; end?: string } }).timeInterval;
                    const tiStart = timeInterval?.start;
                    const tiEnd = timeInterval?.end;
                    const taskName = (editing[entry.id]?.taskName as string | undefined) ?? (entry.taskName ?? "");

                    // Get task name from taskId if taskName is not available
                    let resolvedTaskName = taskName;
                    const entryTyped = entry as TimeEntry;
                    if (!resolvedTaskName && entryTyped.taskId) {
                      const projectTasks = (tasks[entryTyped.projectId || ""] || []) as Task[];
                      const task = projectTasks.find((t) => t.id === entryTyped.taskId);
                      resolvedTaskName = task?.name || "";
                    }
                    let tagLabels: string[] = [];
                    if (editing[entry.id]?.tags) {
                      tagLabels = editing[entry.id]?.tags as string[];
                    } else if (entry.tags) {
                      tagLabels = entry.tags as string[];
                    } else if ((entry as unknown as { tagIds?: string[] }).tagIds && Array.isArray((entry as unknown as { tagIds?: string[] }).tagIds)) {
                      tagLabels = ((entry as unknown as { tagIds?: string[] }).tagIds || []).map((id: string) => tags.find(t => t.id === id)?.name || id);
                    }
                    const rowStart = (editing[entry.id]?.start as string | undefined) ?? tiStart ?? entry.start
                    const rowEnd = (editing[entry.id]?.end as string | undefined) ?? tiEnd ?? entry.end
                    const hasStart = !!rowStart
                    const startDate = rowStart ? new Date(rowStart) : null
                    const endDate = rowEnd ? new Date(rowEnd) : null
                    const timeError = startDate && endDate ? startDate.getTime() >= endDate.getTime() : false
                    const rowHasErrors = !hasStart || timeError
                    const isBillable = (editingEntry.billable !== undefined ? Boolean(editingEntry.billable) : Boolean(entry.billable))
                    return (
                      <TableRow key={entry.id} className={`entries-table-row ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""} ${rowHasErrors ? "border border-red-200" : ""} relative`}>
                        {selectionMode && (
                          <TableCell data-label="Select" className={`text-center w-12 sticky left-0 z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-r border-gray-200 dark:border-gray-700`}>
                            <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleSelectOne(entry.id)} className="cursor-pointer w-4 h-4" />
                          </TableCell>
                        )}
                        <TableCell data-label="Billable" className={`text-center p-2 w-12 sticky ${selectionMode ? "left-12" : "left-0"} z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-r border-gray-200 dark:border-gray-700`}>
                          <button
                            type="button"
                            onClick={() => handleEdit(entry.id, 'billable', !isBillable)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${isBillable ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            title={isBillable ? 'Billable (click to mark non-billable)' : 'Non-billable (click to mark billable)'}
                            aria-label={isBillable ? 'Toggle to non-billable' : 'Toggle to billable'}
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        </TableCell>
                        <TableCell data-label="Description" className="overflow-hidden min-w-[200px] max-w-[300px]" ref={el => { descriptionEditorRefs.current[entry.id] = el }}>
                          {descriptionEditOpen[entry.id] ? (
                            <Input
                              value={editingEntry.description !== undefined ? String(editingEntry.description) : (entry.description ?? "")}
                              onChange={e => handleEdit(entry.id, "description", e.target.value)}
                              onBlur={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: false }))}
                              className="w-full min-w-0 cursor-text text-xs h-7"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-gray-700 dark:text-gray-200 hover:underline w-full text-left cursor-pointer min-h-[20px] break-words"
                              onClick={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                              title="Edit description"
                            >
                              {(() => {
                                const desc = editingEntry.description !== undefined 
                                  ? String(editingEntry.description) 
                                  : (entry.description ?? "")
                                return desc.trim() || 'No description'
                              })()}
                            </button>
                          )}
                        </TableCell>
                        <TableCell data-label="Time (UTC)" className="whitespace-nowrap overflow-hidden min-w-[200px] max-w-[280px]" ref={el => { timeEditorRefs.current[entry.id] = el }}>
                          {(() => {
                            const open = timeEditOpen[entry.id] || { start: false, end: false }
                            const startVal = editingEntry.start
                              ? (typeof editingEntry.start === "string" ? editingEntry.start.slice(0, 16) : "")
                              : (tiStart
                                ? new Date(tiStart).toISOString().slice(0, 16)
                                : (entry.start ? new Date(entry.start).toISOString().slice(0, 16) : "")
                              )
                            const endVal = editingEntry.end
                              ? (typeof editingEntry.end === "string" ? editingEntry.end.slice(0, 16) : "")
                              : (tiEnd
                                ? new Date(tiEnd).toISOString().slice(0, 16)
                                : (entry.end ? new Date(entry.end).toISOString().slice(0, 16) : "")
                              )
                            const displayStart = startVal ? startVal.replace('T', ' ') : ""
                            const displayEnd = endVal ? endVal.replace('T', ' ') : ""
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Start */}
                                {open.start ? (
                                  <Input
                                    type="datetime-local"
                                    className="w-[130px] cursor-text text-xs h-7"
                                    value={startVal}
                                    onChange={e => handleEdit(entry.id, "start", e.target.value)}
                                    onBlur={() => toggleTimeEditor(entry.id, 'start', false)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="text-xs text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                                    onClick={() => toggleTimeEditor(entry.id, 'start', true)}
                                    title="Edit start"
                                  >{displayStart || '—'}</button>
                                )}
                                <span className="text-muted-foreground text-xs">→</span>
                                {/* End */}
                                {open.end ? (
                                  <Input
                                    type="datetime-local"
                                    className="w-[130px] cursor-text text-xs h-7"
                                    value={endVal}
                                    onChange={e => handleEdit(entry.id, "end", e.target.value)}
                                    onBlur={() => toggleTimeEditor(entry.id, 'end', false)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="text-xs text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                                    onClick={() => toggleTimeEditor(entry.id, 'end', true)}
                                    title="Edit end"
                                  >{displayEnd || '—'}</button>
                                )}
                                <Button
                                  type="button"
                                  className="h-7 w-7 p-0 rounded-full bg-transparent cursor-pointer"
                                  onClick={() => setTimeEditOpen(prev => ({ ...prev, [entry.id]: { start: true, end: true } }))}
                                  title="Open date editors"
                                  aria-label="Open date editors"
                                >
                                  <Calendar className="h-3.5 w-3.5 text-blue-700" />
                                </Button>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell data-label="Project / Task" className="overflow-hidden min-w-[250px] max-w-[420px]" ref={el => { projectTaskEditorRefs.current[entry.id] = el }}>
                          {(() => {
                            const entryProjectId = String(editingEntry.projectId ?? entry.projectId ?? "")
                            const projectObj = Array.isArray(projects) ? projects.find((p: { id: string; name: string }) => p.id === entryProjectId) : null
                            const projectLabel = projectObj?.name || "None"
                            const taskIdSelected = (editingEntry.taskId !== undefined ? (editingEntry.taskId as string) : (entry as TimeEntry).taskId) || ""
                            const taskList = (tasks && tasks[entryProjectId] || []) as Task[]
                            const taskObj = taskList.find(t => t.id === taskIdSelected)
                            const taskLabel = (editingEntry.taskName as string) || taskObj?.name || (entry as TimeEntry).taskName || "None"
                            const isOpen = !!projectTaskEditOpen[entry.id]
                            const createState = createTaskState[entry.id] || { showCreate: false, name: "", loading: false }
                            if (!isOpen) {
                              return (
                                <button
                                  type="button"
                                  className="text-xs text-gray-700 dark:text-gray-200 hover:underline break-words cursor-pointer"
                                  onClick={() => {
                                    setProjectTaskEditOpen(prev => ({ ...prev, [entry.id]: true }))
                                    // Lazy load tasks for this entry's project if not already loaded
                                    if (entryProjectId) {
                                      fetchTasksForProject(entryProjectId)
                                    }
                                  }}
                                  title="Edit project and task"
                                >{projectLabel}{taskLabel && taskLabel !== 'None' ? ` • ${taskLabel}` : ''}</button>
                              )
                            }
                            return (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Select
                                  value={entryProjectId}
                                  onChange={e => {
                                    const newProjectId = e.target.value
                                    handleEdit(entry.id, "projectId", newProjectId)
                                    // Lazy load tasks for the newly selected project
                                    if (newProjectId) {
                                      fetchTasksForProject(newProjectId)
                                    }
                                  }}
                                  className="w-full sm:w-[150px] text-xs h-8 leading-tight py-1.5 cursor-pointer"
                                  title={projectLabel}
                                >
                                  <option value="">None</option>
                                  {Array.isArray(projects) ? projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  )) : null}
                                </Select>
                                <Select
                                  value={taskIdSelected}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (v === "__create_new__") {
                                      toggleCreateTaskUI(entry.id, true)
                                    } else {
                                      handleEdit(entry.id, "taskId", v)
                                      const t = taskList.find((tt) => tt.id === v)
                                      handleEdit(entry.id, "taskName", t ? t.name : "")
                                    }
                                  }}
                                  className="w-full sm:w-[150px] text-xs h-8 leading-tight py-1.5 cursor-pointer"
                                  title={taskLabel}
                                >
                                  <option value="">None</option>
                                  {Array.isArray(taskList) && taskList.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                  <option value="__create_new__">Create new...</option>
                                </Select>                                
                                {createState.showCreate && (
                                  <div className="w-full mt-1 flex gap-1.5">
                                    <Input value={createState.name} onChange={e => setCreateTaskName(entry.id, e.target.value)} placeholder="New task name" className="cursor-text text-xs h-7 flex-1" />
                                    <Button onClick={() => createTaskForEntry(entry.id, entryProjectId)} disabled={createState.loading} className="cursor-pointer text-xs h-7 px-2">{createState.loading ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create'}</Button>
                                    <Button className="bg-transparent text-xs h-7 px-2 cursor-pointer" onClick={() => toggleCreateTaskUI(entry.id, false)}>Cancel</Button>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell data-label="Tags" className="min-w-[100px] max-w-[150px] overflow-visible" ref={el => { tagsEditorRefs.current[entry.id] = el }}>
                          {tagsEditOpen[entry.id] ? (
                            <TagSelector
                              selectedTags={tagLabels}
                              availableTags={tags}
                              onChange={(newTags) => handleEdit(entry.id, "tags", newTags)}
                              onCreateTag={handleCreateTag}
                              placeholder="Select tags..."
                              className="w-full text-xs h-7 cursor-pointer"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-gray-700 dark:text-gray-200 hover:underline cursor-pointer"
                              onClick={() => setTagsEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                              title="Edit tags"
                            >{tagLabels && tagLabels.length > 0 ? tagLabels.join(", ") : 'No tags'}</button>
                          )}
                        </TableCell>
                        <TableCell data-label="Actions" className={`entries-table-actions flex items-center gap-2 w-[180px] text-center justify-center sticky right-0 z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-l border-gray-200 dark:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.1)]`}>
                          <Button
                            onClick={() => handleSaveRow(entry)}
                            disabled={!modifiedRows.has(entry.id)}
                            className={`h-8 w-8 p-0 rounded-full cursor-pointer ${modifiedRows.has(entry.id) ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-transparent"}`}
                            title="Save"
                            aria-label="Save"
                          >
                            {savingRows.has(entry.id)
                              ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Save className="h-4 w-4 text-green-700" />}
                          </Button>

                          <Button
                            className={`h-8 w-8 p-0 rounded-full bg-transparent cursor-pointer ${modifiedRows.has(entry.id) ? "ring-2 ring-amber-400 bg-amber-50 text-amber-700" : ""}`}
                            onClick={() => undoEdits(entry.id)}
                            title="Undo changes"
                            aria-label="Undo changes"
                          >
                            <RotateCcw className="h-4 w-4 text-amber-700" />
                          </Button>

                          {((entry as unknown as { _isNew?: boolean })._isNew) && (
                            <Button
                              className="h-8 w-8 p-0 rounded-full bg-transparent text-red-600 hover:bg-red-50 cursor-pointer"
                              onClick={() => removeRow(entry.id)}
                              title="Remove new row"
                              aria-label="Remove new row"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}

                          <Button
                            className="h-8 w-8 p-0 rounded-full bg-transparent text-red-600 hover:bg-red-50 cursor-pointer"
                            onClick={() => handleDeleteRow(entry)}
                            disabled={savingRows.has(entry.id)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            {savingRows.has(entry.id)
                              ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Trash2 className="h-4 w-4 text-red-600" />}
                          </Button>
                          {rowHasErrors && (
                            <span className="ml-2 inline-block align-middle text-sm text-red-600" title={`${!hasStart ? 'Start time is missing.' : ''}${timeError ? ' Start must be before End.' : ''}`}>
                              ⚠️
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <span className="text-4xl text-blue-400 mb-2" role="img" aria-label="Magnifying glass">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                  <span className="font-medium text-lg">No time entries found</span>
                  <span className="text-sm text-center max-w-xs">
                    You don&apos;t have any entries for this period.<br />
                    Click the &quot;<span className="font-semibold">+ New Entry</span>&quot; button to create your first entry, or try choosing another project or date range.
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {Array.isArray(timeEntries) && timeEntries.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-muted-foreground">
            <span>Selected: {selectedIds.size}</span>
            <Button className="bg-transparent text-red-600 cursor-pointer" onClick={handleBulkDeleteSelected} disabled={selectedIds.size === 0 || savingRows.size > 0}>{savingRows.size > 0 ? <span className="inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : 'Bulk Delete Selected'}</Button>
          </div>
          <Button onClick={handleBulkSave} disabled={modifiedRows.size === 0} className="cursor-pointer">{/* show spinner if any rows saving */savingRows.size > 0 ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Bulk Save All'}</Button>
        </div>
      )}

      {/* Editor Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 mt-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">How to use the editor:</h3>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Click on any field</strong> to edit it inline (description, time, project/task, tags)</li>
          <li>• <strong>Time editing:</strong> Click on start/end times or use the calendar icon to open date pickers</li>
          <li>• <strong>Project/Task:</strong> Click to select from dropdowns or create new tasks</li>
          <li>• <strong>Tags:</strong> Click to select existing tags or create new ones</li>
          <li>• <strong>Save:</strong> Click the green save button (✓) to save individual changes</li>
          <li>• <strong>Bulk actions:</strong> Select multiple entries and use bulk save/delete</li>
          <li>• <strong>Billable toggle:</strong> Click the $ icon on the left of each row</li>
        </ul>
      </div>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={bulkDialogOpen || bulkOpen}
        onClose={() => { setBulkDialogOpen(false); closeBulk(); }}
        workspaceId={workspaceId}
        apiKey={apiKey}
        userId={userId}
        onSuccess={async () => { await refreshAllReferenceData(); setBulkDialogOpen(false); closeBulk(); fetchEntries() }}
        onPopulate={populateEntriesForReview}
        initialCsv={bulkCsv || undefined}
      />
      <BulkDeleteTagsDialog
        open={bulkDeleteTagsDialogOpen}
        onClose={() => setBulkDeleteTagsDialogOpen(false)}
        workspaceId={workspaceId}
        apiKey={apiKey}
        onSuccess={() => {
          setBulkDeleteTagsDialogOpen(false);
          // also refetch tags
          const fetchTags = async () => {
            if (!apiKey || !workspaceId) return;
            try {
              const tagsRes = await fetch(`/api/proxy/tags/${workspaceId}?apiKey=${apiKey}`)
              if (tagsRes.ok) {
                const tagList = await tagsRes.json() as { id: string; name: string }[]
                setTags(tagList);
              } else {
                setTags([]);
              }
            } catch {
              setTags([]);
            }
          };
          fetchTags();
          fetchEntries();
        }}
      />
      <BulkDeleteTasksDialog
        open={bulkDeleteTasksDialogOpen}
        onClose={() => setBulkDeleteTasksDialogOpen(false)}
        workspaceId={workspaceId}
        apiKey={apiKey}
        projectId={projectIds[0] || ""}
        onSuccess={() => {
          if (!apiKey || !workspaceId || projectIds.length === 0) return;
          // Refresh tasks for all selected projects
          projectIds.forEach(pid => {
            try {
              fetch(`/api/proxy/tasks/${workspaceId}/${pid}?apiKey=${apiKey}`)
                .then(async res => {
                  if (res.ok) {
                    const projectTasks = await res.json() as Task[]
                    setTasks(pid, projectTasks)
                  }
                })
                .catch(() => { })
            } catch { }
          })
          fetchEntries();
        }}
      />
      {/* Toast */}
      {toast && (
        <Toast open={!!toast} onClose={() => setToast(null)} duration={4000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {toast.message}
        </Toast>
      )}
    </div>
  )
}

"use client"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useClockifyStore } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Select } from "../../components/ui/select"
import { BulkUploadDialog } from "../../components/BulkUploadDialog"
import { BulkDeleteTagsDialog } from "../../components/BulkDeleteTagsDialog"
import { BulkDeleteTasksDialog } from "../../components/BulkDeleteTasksDialog"
import { Skeleton } from "../../components/ui/skeleton"
import { FilterBar } from "../../components/editor/FilterBar"
import { BulkActions } from "../../components/editor/BulkActions"
import { Toast } from "../../components/ui/toast"
import { capture, identify, AnalyticsEvents } from "../../lib/analytics"
import { fetchProxy } from "../../lib/client-api"
import { TimeEntryTable } from "../../components/editor/TimeEntryTable"
import { Task, TimeEntry } from "../../lib/store"
import { getLast30DaysRange, toUtcIso, toLocalNaive, normalizeDate } from "../../lib/dateUtils"
import MagicButton from "@/components/MagicButton"

export const dynamic = 'force-dynamic'

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
  const [selectionMode, setSelectionMode] = useState(false)
  const isFetchingEntriesRef = useRef(false)
  const pendingFetchRef = useRef(false)

  const defaultDateRange = useMemo(() => getLast30DaysRange(), [])



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
      const { id: taskId } = await fetchProxy<{ id: string }>(`/api/proxy/tasks/${workspaceId}/${projectIdToUse}`, apiKey, {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      const newTask: Task = { id: taskId, name, projectId: projectIdToUse }
      // add optimistic and refresh tasks for the project
      optimisticTask(projectIdToUse, newTask)
      try {
        const tasksRes = await fetchProxy<Task[]>(`/api/proxy/tasks/${workspaceId}/${projectIdToUse}`, apiKey)
        setTasks(projectIdToUse, tasksRes)
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
    fetchProxy<{ id?: string; email?: string; name?: string }>("/api/proxy/user", apiKey)
      .then((data) => {
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
    fetchProxy<{ id: string; name: string }[]>("/api/proxy/workspaces", apiKey)
      .then((data) => {
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
      const projectTasks = await fetchProxy<Task[]>(`/api/proxy/tasks/${workspaceId}/${projectIdToFetch}`, apiKey)
      setTasks(projectIdToFetch, projectTasks)
    } catch {
      // Ignore errors for individual projects
    }
  }, [apiKey, workspaceId, tasks, setTasks])

  useEffect(() => {
    if (!apiKey || !workspaceId) return

    const fetchProjects = async () => {
      try {
        const projectsData = await fetchProxy<{ id: string; name: string }[]>(`/api/proxy/projects/${workspaceId}`, apiKey)
        setProjects(projectsData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load projects";
        setToast({ type: "error", message: errorMessage })
      }
    }

    const fetchTags = async () => {
      try {
        const tagList = await fetchProxy<{ id: string; name: string }[]>(`/api/proxy/tags/${workspaceId}`, apiKey)
        setTags(tagList);
        tagsFetchedRef.current = true;
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
    const start = toUtcIso(dateRange.startDate, defaultTimezone)
    const end = toUtcIso(dateRange.endDate, defaultTimezone)
    
    // Fetch entries for each selected project and combine. Deduplicate projectIds to avoid duplicate requests.
    const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)))
    // Batched fetch using aggregated endpoint
    fetchProxy<Record<string, unknown>[]>(`/api/proxy/aggregated/entries`, apiKey, {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        userId,
        projectIds: uniqueProjectIds,
        start,
        end,
        timezone: defaultTimezone
      })
    })
      .then((uniqueEntries) => {
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
      const ws = await fetchProxy<{ id: string; name: string }[]>("/api/proxy/workspaces", apiKey)
      setWorkspaces(ws)
      if (!workspaceId) return;
      // Projects
      const projectsData = await fetchProxy<{ id: string; name: string }[]>(`/api/proxy/projects/${workspaceId}`, apiKey)
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
            const projectTasks = await fetchProxy<Task[]>(`/api/proxy/tasks/${workspaceId}/${pid}`, apiKey)
            setTasks(pid, projectTasks)
          } catch { }
        }
      // Tags
      try {
        const tagList = await fetchProxy<{ id: string; name: string }[]>(`/api/proxy/tags/${workspaceId}`, apiKey)
        setTags(tagList)
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
              projectTasks = await fetchProxy<Task[]>(`/api/proxy/tasks/${workspaceId}/${pid}`, apiKey)
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

  const handleEdit = (id: string, field: keyof TimeEntry, value: unknown) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    setModifiedRows(s => new Set(s).add(id))
  }

  const handleCreateTag = async (name: string) => {
    if (!workspaceId || !apiKey) throw new Error("Workspace and API key required")
    const { created } = await fetchProxy<{ created: { id: string; name: string }[] }>(`/api/proxy/workspaces/${workspaceId}/tags/create`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ tagNames: [name] })
    })
    const newTag = created[0]
    if (!newTag) throw new Error("Failed to create tag")
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

      // Identify tags that need creation
      const tagsToCreate = new Set<string>();
      for (const label of validTags) {
        const trimmedLabel = label.trim();
        const tag = tags.find(t => t.name === trimmedLabel) || newTags.find(t => t.name === trimmedLabel);
        if (!tag) {
          tagsToCreate.add(trimmedLabel);
        }
      }

      // Create missing tags in bulk
      if (tagsToCreate.size > 0) {
        try {
          const { created } = await fetchProxy<{ created: { id: string; name: string }[] }>(`/api/proxy/workspaces/${workspaceId}/tags/create`, apiKey, {
            method: 'POST',
            body: JSON.stringify({ tagNames: Array.from(tagsToCreate) })
          })
          if (created && Array.isArray(created)) {
            newTags.push(...created);
          }
        } catch (error) {
          console.error("Failed to bulk create tags:", error)
        }
      }

      // Resolve all tag IDs
      for (const label of validTags) {
        const trimmedLabel = label.trim();
        const tag = tags.find(t => t.name === trimmedLabel) || newTags.find(t => t.name === trimmedLabel);
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
        await fetchProxy(`/api/proxy/time-entries/${workspaceId}/${userId}`, apiKey, {
          method: "POST",
          body: JSON.stringify({ timezone: defaultTimezone, ...createPayload })
        })
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
      await fetchProxy(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, apiKey, {
        method: "PUT",
        body: JSON.stringify({ timezone: defaultTimezone, ...mergedEntry })
      })
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
      await fetchProxy(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, apiKey, {
        method: "DELETE",
        body: JSON.stringify({})
      })
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
        await fetchProxy(`/api/proxy/time-entries/${workspaceId}/${userId}/${id}`, apiKey, {
          method: "DELETE",
          body: JSON.stringify({})
        })
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
      {/* Controls Section (mobile responsive) */}
      <FilterBar
        workspaces={workspaces}
        workspaceId={workspaceId}
        onWorkspaceChange={setWorkspaceId}
        projects={projects}
        projectIds={projectIds}
        onProjectsChange={setProjectIds}
        dateRange={dateRange}
        defaultDateRange={defaultDateRange}
        onDateRangeChange={(val) => setDateRange(val)}
        onRefresh={refreshAllReferenceData}
        refreshing={refreshing}
        onManageTags={() => setBulkDeleteTagsDialogOpen(true)}
        onManageTasks={() => setBulkDeleteTasksDialogOpen(true)}
      />

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
                <TimeEntryTable
                  timeEntries={timeEntries}
                  projects={projects}
                  tasks={tasks}
                  tags={tags}
                  editing={editing}
                  modifiedRows={modifiedRows}
                  savingRows={savingRows}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  createTaskState={createTaskState}
                  onSelectAll={toggleSelectAll}
                  onSelectOne={toggleSelectOne}
                  onEdit={handleEdit}
                  onSaveRow={handleSaveRow}
                  onDeleteRow={handleDeleteRow}
                  onUndoEdits={undoEdits}
                  onRemoveRow={removeRow}
                  onCreateTag={handleCreateTag}
                  onFetchTasksForProject={fetchTasksForProject}
                  onCreateTask={createTaskForEntry}
                  onToggleCreateTaskUI={toggleCreateTaskUI}
                  onSetCreateTaskName={setCreateTaskName}
                />
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
      <BulkActions
        timeEntries={timeEntries}
        selectedCount={selectedIds.size}
        savingCount={savingRows.size}
        modifiedCount={modifiedRows.size}
        onBulkDelete={handleBulkDeleteSelected}
        onBulkSave={handleBulkSave}
      />

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
              try {
                const tagList = await fetchProxy<{ id: string; name: string }[]>(`/api/proxy/tags/${workspaceId}`, apiKey)
                setTags(tagList);
              } catch {
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
              try {
                fetchProxy<Task[]>(`/api/proxy/tasks/${workspaceId}/${pid}`, apiKey)
                  .then(projectTasks => {
                    setTasks(pid, projectTasks)
                  })
                  .catch(() => { })
              } catch { }
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

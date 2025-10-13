"use client"
import { useEffect, useState, useRef } from "react"
import { useClockifyStore } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Select } from "../../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table"
import { DateRangePicker } from "../../components/DateRangePicker"
import { BulkUploadDialog } from "../../components/BulkUploadDialog"
import { TagCloud } from "../../components/TagCloud"
import { Skeleton } from "../../components/ui/skeleton"
import { Toast } from "../../components/ui/toast"
import { Input } from "../../components/ui/input"

import { ClockifyAPI } from "../../lib/clockify"
import type { Task, TimeEntry } from "../../lib/store"

export default function DashboardPage() {
  const apiKey = useClockifyStore(state => state.apiKey)
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
  try {
    console.log('[Dashboard] render: timeEntries length', Array.isArray(timeEntries) ? timeEntries.length : typeof timeEntries)
    console.log('[Dashboard] render: timeEntries value ->', timeEntries)
    try { console.log('[Dashboard] render: direct store timeEntries length', Array.isArray(useClockifyStore.getState().timeEntries) ? useClockifyStore.getState().timeEntries.length : typeof useClockifyStore.getState().timeEntries) } catch (e) { console.error(e) }
  } catch (err) { console.error('[Dashboard] render log error', err) }
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [userId, setUserId] = useState("")
  const [dateRange, setDateRange] = useState<null | { startDate: Date; endDate: Date }>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, Partial<typeof timeEntries[number]>>>({})
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const tagsFetchedRef = useRef(false)
  const [createTaskState, setCreateTaskState] = useState<Record<string, { showCreate: boolean; name: string; loading: boolean }>>({})
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())

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
      const api = new ClockifyAPI()
      api.setApiKey(apiKey)
      const taskId = await api.createTask(workspaceId, projectIdToUse, name)
      const newTask: Task = { id: taskId, name, projectId: projectIdToUse }
      // add optimistic and refresh tasks for the project
      optimisticTask(projectIdToUse, newTask)
      try {
        const refreshed = await api.getTasks(workspaceId, projectIdToUse)
        setTasks(projectIdToUse, refreshed)
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
    if (!apiKey) return;
    fetch(`/api/proxy/user?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.id) setUserId(data.id)
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
      if (savedPr) setProjectId(savedPr)

      // Parse saved dates if present and valid, otherwise fall back to today as a sensible default
      if (savedStart && savedEnd) {
        const parsedStart = new Date(savedStart)
        const parsedEnd = new Date(savedEnd)
        if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
          setDateRange({ startDate: parsedStart, endDate: parsedEnd })
        } else {
          const today = new Date()
          setDateRange({ startDate: today, endDate: today })
        }
      } else {
        const today = new Date()
        setDateRange({ startDate: today, endDate: today })
      }
    } catch { }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem("clockify_selected_workspace", workspaceId || "")
    } catch {}
  }, [workspaceId])

  useEffect(() => {
    try {
      window.localStorage.setItem("clockify_selected_project", projectId || "")
    } catch {}
  }, [projectId])

  useEffect(() => {
    try {
      if (dateRange) {
        window.localStorage.setItem("clockify_selected_start", dateRange.startDate.toISOString())
        window.localStorage.setItem("clockify_selected_end", dateRange.endDate.toISOString())
      }
    } catch {}
  }, [dateRange])

  useEffect(() => {
    if (!apiKey) return
    fetch(`/api/proxy/workspaces?apiKey=${apiKey}`)
      .then(async r => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${r.status}: Failed to load workspaces`);
        }
        return r.json();
      })
      .then(data => setWorkspaces(data))
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to load workspaces";
        setToast({ type: "error", message: errorMessage })
      })
  }, [apiKey, setWorkspaces])

  useEffect(() => {
    if (!apiKey || !workspaceId) return

    const fetchProjectsAndTasks = async () => {
      try {
        const response = await fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to load projects`);
        }
        const projectsData = await response.json()
        setProjects(projectsData)

        // Fetch tasks for each project
        for (const project of projectsData) {
          try {
            const api = new ClockifyAPI();
            api.setApiKey(apiKey);
            const projectTasks = await api.getTasks(workspaceId, project.id);
            setTasks(project.id, projectTasks);
          } catch {
            // Ignore errors for individual projects
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load projects";
        setToast({ type: "error", message: errorMessage })
      }
    }

    const fetchTags = async () => {
      try {
        const api = new ClockifyAPI();
        api.setApiKey(apiKey);
        const tagList = await api.getTags(workspaceId);
        setTags(tagList);
        tagsFetchedRef.current = true;
      } catch {
        setTags([]);
      }
    };

    fetchProjectsAndTasks();
    fetchTags();
  }, [apiKey, workspaceId, setProjects, setTasks])

  const fetchEntries = () => {
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
    setLoading(true)
    const start = dateRange.startDate.toISOString()
    const end = dateRange.endDate.toISOString()
    fetch(`/api/proxy/time-entries/${workspaceId}/${userId}?apiKey=${apiKey}&projectId=${projectId}&start=${start}&end=${end}`)
      .then(async r => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${r.status}: Failed to load entries`);
        }
        return r.json();
      })
      .then(data => { setTimeEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch((error) => { 
        setTimeEntries([]); 
        const errorMessage = error instanceof Error ? error.message : "Failed to load entries";
        setToast({ type: "error", message: errorMessage }); 
        setLoading(false) 
      })
  }

  const addNewRow = () => {
    const tempId = `new-${Date.now()}`
    const nowIso = new Date().toISOString()
    const endIso = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const newEntry: import("../../lib/store").TimeEntry & { _isNew: boolean } = {
      id: tempId,
      description: "",
      start: nowIso,
      end: endIso,
      projectId: projectId,
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
    console.log('[Dashboard] populateEntriesForReview: received entries', entries?.length)
    if (entries && entries.length > 0) console.log('[Dashboard] populateEntriesForReview first', entries[0])
    try {
      console.log('[Dashboard] populateEntriesForReview called, entries:', entries.length, entries)
    } catch (err) {
      console.error('[Dashboard] populateEntriesForReview: logging error', err)
    }

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
    console.log('[Dashboard] populateEntriesForReview: toAdd count', toAdd.length)
    try {
      console.log('[Dashboard] populateEntriesForReview: prev length', Array.isArray(timeEntries) ? timeEntries.length : 0)
    } catch (err) { console.error('[Dashboard] populateEntriesForReview: prev log error', err) }
    const next = [...toAdd, ...(Array.isArray(timeEntries) ? timeEntries : [])]
    try {
      console.log('[Dashboard] populateEntriesForReview: next length', next.length)
    } catch (err) { console.error('[Dashboard] populateEntriesForReview: next log error', err) }
    setTimeEntries(next)
    // prefetch tasks for resolved projects so the task dropdowns can show the correct task lists
    try {
      if (apiKey && workspaceId) {
        const api = new ClockifyAPI()
        api.setApiKey(apiKey)
        const projectIdsToFetch = Array.from(new Set(toAdd.map(t => t.projectId).filter(Boolean))) as string[]
        for (const pid of projectIdsToFetch) {
          // if we already have tasks for this project, skip
          if (tasks && tasks[pid] && Array.isArray(tasks[pid]) && tasks[pid].length > 0) continue
          try {
            const projectTasks = await api.getTasks(workspaceId, pid)
            setTasks(pid, projectTasks)
          } catch {
            // ignore per-project task fetch errors
          }
        }
      }
    } catch {
      // ignore prefetch errors
    }
    try {
      const store = useClockifyStore.getState()
      console.log('[Dashboard] populateEntriesForReview: store timeEntries length', Array.isArray(store.timeEntries) ? store.timeEntries.length : typeof store.timeEntries)
    } catch (err) { console.error('[Dashboard] populateEntriesForReview: store inspect error', err) }
    console.log('[Dashboard] populateEntriesForReview: updated timeEntries with', toAdd.length, 'items')
    // mark them as modified so user can bulk save all or individually
    setModifiedRows(s => {
      const n = new Set(s)
      for (const t of toAdd) n.add(t.id)
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
    const api = new ClockifyAPI()
    api.setApiKey(apiKey)
    const newTag = await api.createTag(workspaceId, name)
    setTags(prev => [...prev, newTag])
    return newTag
  }
  const handleSaveRow = async (entry: typeof timeEntries[number]) => {
    setSavingRows(s => new Set(s).add(entry.id))
    setToast(null)
    // Declare allowedKeys once at the top (do NOT send userId in the request body)
    const allowedKeys = new Set([
      'description', 'projectId', 'taskId', 'taskName', 'start', 'end', 'billable', 'tagIds', 'tags'
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
    let tagIdsFromPatch: string[] | undefined = undefined;
    if (patch.tags && Array.isArray(patch.tags) && workspaceId && apiKey) {
      const api = new ClockifyAPI();
      api.setApiKey(apiKey);
      const tagIds: string[] = [];
      const newTags: { id: string; name: string }[] = [];
      for (const label of patch.tags as string[]) {
        let tag = tags.find(t => t.name === label) || newTags.find(t => t.name === label);
        if (!tag) {
          tag = await api.createTag(workspaceId, label);
          newTags.push(tag);
        }
        tagIds.push(tag.id);
      }
      if (newTags.length > 0) {
        setTags([...tags, ...newTags]);
      }
      const { tags: _omitTags, ...rest } = patch;
      void _omitTags;
      patch = { ...rest, tagIds };
      tagIdsFromPatch = tagIds;
    }
    const minimalPatch: Record<string, unknown> = {};
    const entryAny = entry as unknown as { timeInterval?: { start?: string; end?: string }; start?: string; end?: string; _isNew?: boolean };
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
      try {
        const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, ...createPayload })
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const finalErrorMessage = errorData.error || `HTTP ${res.status}: Save failed`;
          throw new Error(finalErrorMessage);
        }
        setToast({ type: "success", message: "Saved" })
        setModifiedRows(s => { const n = new Set(s); n.delete(entry.id); return n })
        fetchEntries()
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
    // If tags were converted earlier, prefer tagIds
    if (tagIdsFromPatch) {
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
        body: JSON.stringify({ apiKey, ...mergedEntry })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log("Error response:", errorData);
        console.log("Error message from response:", errorData.error);
        const finalErrorMessage = errorData.error || `HTTP ${res.status}: Save failed`;
        console.log("Final error message:", finalErrorMessage);
        throw new Error(finalErrorMessage);
      }
      setToast({ type: "success", message: "Saved" })
      setModifiedRows(s => { const n = new Set(s); n.delete(entry.id); return n })
    } catch (error) {
      console.log("Caught error in handleSaveRow:", error);
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
        const errorData = await res.json().catch(() => ({}));
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
        if (entry) await handleSaveRow(entry)
      }
    }
    setToast({ type: "success", message: "Bulk save complete" })
    setModifiedRows(new Set())
  }

  // dateRange is initialized from localStorage in the mount effect above

  return (
    <div>
      {/* inline spinners are rendered per-control instead of a global overlay */}
      {/* Workspace/project/date pickers */}
      <div className="relative flex flex-wrap gap-4 mb-6 items-end">
        {/* Workspace Dropdown */}
        <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
          <option value="">Select Workspace</option>
          {Array.isArray(workspaces) && workspaces.map((ws: { id: string; name: string }) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </Select>
        {/* Project Dropdown */}
        <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All Projects</option>
          {Array.isArray(projects) && projects.map((p: { id: string; name: string }) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        {/* Date Picker */}
        <Button onClick={() => setShowDatePicker(v => !v)} type="button">
          {dateRange ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}` : 'Pick Date Range'}
        </Button>
        {showDatePicker && (
          <div className="absolute z-20 top-full left-0 bg-white dark:bg-gray-900 rounded shadow-lg border p-2">
            <DateRangePicker value={dateRange || { startDate: new Date(), endDate: new Date() }} onChange={val => { setDateRange(val); }} />
          </div>
        )}
        <Button onClick={fetchEntries} type="button">{loading ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Fetch Entries'}</Button>
        <Button onClick={addNewRow} type="button">Add Row</Button>
        <Button onClick={() => setBulkDialogOpen(true)} type="button">Bulk Upload</Button>
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
            Array.isArray(timeEntries) && timeEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Start(UTC)</TableHead>
                    <TableHead>End(UTC)</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Actions</TableHead>
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
                    } else if ((entry as unknown as { tagIds?: string[] }).tagIds && Array.isArray((entry as unknown as { tagIds?: string[] }).tagIds) && tags.length > 0) {
                      tagLabels = ((entry as unknown as { tagIds?: string[] }).tagIds || []).map((id: string) => tags.find(t => t.id === id)?.name || id);
                    }
                    const rowStart = (editing[entry.id]?.start as string | undefined) ?? tiStart ?? entry.start
                    const rowEnd = (editing[entry.id]?.end as string | undefined) ?? tiEnd ?? entry.end
                    const hasStart = !!rowStart
                    const startDate = rowStart ? new Date(rowStart) : null
                    const endDate = rowEnd ? new Date(rowEnd) : null
                    const timeError = startDate && endDate ? startDate.getTime() >= endDate.getTime() : false
                    const rowHasErrors = !hasStart || timeError
                    return (
                      <TableRow key={entry.id} className={`${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""} ${rowHasErrors ? "border border-red-200" : ""}`}>
                        <TableCell>
                          <Input
                            value={editingEntry.description !== undefined ? String(editingEntry.description) : (entry.description ?? "")}
                            onChange={e => handleEdit(entry.id, "description", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={
                              editingEntry.start
                                ? (typeof editingEntry.start === "string" ? editingEntry.start.slice(0, 16) : "")
                                : (tiStart
                                  ? new Date(tiStart).toISOString().slice(0, 16)
                                  : (entry.start ? new Date(entry.start).toISOString().slice(0, 16) : "")
                                )
                            }
                            onChange={e => handleEdit(entry.id, "start", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={
                              editingEntry.end
                                ? (typeof editingEntry.end === "string" ? editingEntry.end.slice(0, 16) : "")
                                : (tiEnd
                                  ? new Date(tiEnd).toISOString().slice(0, 16)
                                  : (entry.end ? new Date(entry.end).toISOString().slice(0, 16) : "")
                                )
                            }
                            onChange={e => handleEdit(entry.id, "end", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String((editingEntry.projectId ?? entry.projectId ?? ""))}
                            onChange={e => handleEdit(entry.id, "projectId", e.target.value)}
                          >
                            <option value="">None</option>
                            {Array.isArray(projects) ? projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            )) : null}
                          </Select>
                          {/* {project && <div className="text-xs text-muted-foreground mt-1">{project.name}</div>} */}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const projectIdForRow = String(editingEntry.projectId ?? entry.projectId ?? "")
                            const projectTaskList = (tasks && tasks[projectIdForRow] || []) as Task[]
                            const selectedTaskId = (editingEntry.taskId !== undefined ? (editingEntry.taskId as string) : (entry as TimeEntry).taskId) || ""
                            const createState = createTaskState[entry.id] || { showCreate: false, name: "", loading: false }
                            return (
                              <div>
                                <Select
                                  value={selectedTaskId}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (v === "__create_new__") {
                                      toggleCreateTaskUI(entry.id, true)
                                    } else {
                                      handleEdit(entry.id, "taskId", v)
                                      const t = projectTaskList.find((tt) => tt.id === v)
                                      handleEdit(entry.id, "taskName", t ? t.name : "")
                                    }
                                  }}
                                >
                                  <option value="">None</option>
                                  {Array.isArray(projectTaskList) && projectTaskList.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                  <option value="__create_new__">Create new...</option>
                                </Select>
                                {createState.showCreate && (
                                  <div className="mt-2 flex gap-2">
                                    <Input value={createState.name} onChange={e => setCreateTaskName(entry.id, e.target.value)} placeholder="New task name" />
                                    <Button onClick={() => createTaskForEntry(entry.id, projectIdForRow)} disabled={createState.loading}>{createState.loading ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create'}</Button>
                                    <Button className="bg-transparent text-sm" onClick={() => toggleCreateTaskUI(entry.id, false)}>Cancel</Button>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <TagCloud
                            selectedTags={tagLabels}
                            availableTags={tags}
                            onChange={(newTags) => handleEdit(entry.id, "tags", newTags)}
                            onCreateTag={handleCreateTag}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editingEntry.billable !== undefined ? String(editingEntry.billable) : (entry.billable ? "true" : "false")}
                            onChange={e => handleEdit(entry.id, "billable", e.target.value === "true")}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button onClick={() => handleSaveRow(entry)} disabled={!modifiedRows.has(entry.id)}>{savingRows.has(entry.id) ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}</Button>
                          <Button className="bg-transparent text-sm" onClick={() => undoEdits(entry.id)}>Undo</Button>
                          {((entry as unknown as { _isNew?: boolean })._isNew) && <Button className="bg-transparent text-sm text-red-600" onClick={() => removeRow(entry.id)}>Remove</Button>}
                          <Button className="bg-transparent text-sm text-red-600" onClick={() => handleDeleteRow(entry)} disabled={savingRows.has(entry.id)}>{savingRows.has(entry.id) ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Delete'}</Button>
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
              <div className="text-center text-muted-foreground py-8">No entries found.</div>
            )
        )}
      </div>
      {Array.isArray(timeEntries) && timeEntries.length > 0 && (
        <div className="flex justify-end mt-4">
          <Button onClick={handleBulkSave} disabled={modifiedRows.size === 0}>{/* show spinner if any rows saving */savingRows.size > 0 ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Bulk Save All'}</Button>
        </div>
      )}
      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        workspaceId={workspaceId}
        apiKey={apiKey}
        userId={userId}
        onSuccess={() => { setBulkDialogOpen(false); fetchEntries() }}
        onPopulate={populateEntriesForReview}
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

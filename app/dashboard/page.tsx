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

export default function DashboardPage() {
  const {
    apiKey, workspaces, setWorkspaces,
    projects, setProjects,
    tasks, setTasks,
    timeEntries, setTimeEntries,
    optimisticUpdate
  } = useClockifyStore()
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
      if (savedStart && savedEnd) setDateRange({ startDate: new Date(savedStart), endDate: new Date(savedEnd) })
    } catch {}
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
    fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
      .then(async r => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${r.status}: Failed to load projects`);
        }
        return r.json();
      })
      .then(data => setProjects(data))
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to load projects";
        setToast({ type: "error", message: errorMessage })
      })
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
    fetchTags();
    
    const fetchTasksForProjects = async () => {
      if (Array.isArray(projects)) {
        for (const project of projects) {
          try {
            const api = new ClockifyAPI();
            api.setApiKey(apiKey);
            const projectTasks = await api.getTasks(workspaceId, project.id);
            setTasks(project.id, projectTasks);
          } catch {
            // Ignore errors for individual projects
          }
        }
      }
    };
    fetchTasksForProjects();
  }, [apiKey, workspaceId, setProjects, projects, setTasks])

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
    setToast(null)
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
      return;
    }
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
      patch = { ...rest, tagIds };
    }
    const allowedKeys = new Set([
      'description', 'projectId', 'taskId', 'taskName', 'start', 'end', 'billable', 'tagIds', 'tags'
    ]);
    const minimalPatch: Record<string, unknown> = {};
    const entryAny = entry as unknown as { timeInterval?: { start?: string; end?: string }; start?: string; end?: string; _isNew?: boolean };
    const currentStart = entryAny.timeInterval?.start ?? entryAny.start;
    const currentEnd = entryAny.timeInterval?.end ?? entryAny.end;
    for (const [k, v] of Object.entries(patch)) {
      if (!allowedKeys.has(k)) continue;
      const current = (k === 'start') ? currentStart : (k === 'end') ? currentEnd : (original as Record<string, unknown>)[k];
      if (JSON.stringify(v) !== JSON.stringify(current)) minimalPatch[k] = v;
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
        return
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Save failed";
        setToast({ type: "error", message: errorMessage })
        return
      }
    }
    optimisticUpdate(entry.id, minimalPatch)
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, ...minimalPatch })
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

  // Set initial date range on mount
  useEffect(() => {
    if (!dateRange) {
      const today = new Date()
      setDateRange({ startDate: today, endDate: today })
    }
  }, [dateRange])

  return (
    <div>
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
        <Button onClick={fetchEntries} type="button">Fetch Entries</Button>
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
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
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
                    if (!resolvedTaskName && (entry as any).taskId) {
                      const projectTasks = tasks[entry.projectId || ""] || [];
                      const task = projectTasks.find((t: any) => t.id === (entry as any).taskId);
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
                    return (
                      <TableRow key={entry.id} className={modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
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
                          <Input
                            value={resolvedTaskName}
                            onChange={e => handleEdit(entry.id, "taskName", e.target.value)}
                          />
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
                        <TableCell>
                          <Button onClick={() => handleSaveRow(entry)} disabled={!modifiedRows.has(entry.id)}>Save</Button>
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
          <Button onClick={handleBulkSave} disabled={modifiedRows.size === 0}>Bulk Save All</Button>
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

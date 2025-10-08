"use client"
import { useEffect, useState, useRef } from "react"
import { useClockifyStore } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Select } from "../../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table"
import { DateRangePicker } from "../../components/DateRangePicker"
import { BulkUploadDialog } from "../../components/BulkUploadDialog"
import { Skeleton } from "../../components/ui/skeleton"
import { Toast } from "../../components/ui/toast"
import { Input } from "../../components/ui/input"

import { ClockifyAPI } from "../../lib/clockify"

export default function DashboardPage() {
  const {
    apiKey, workspaces, setWorkspaces,
    projects, setProjects,
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
  // Fetch userId on mount or when apiKey changes
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
    // Fetch tags for workspace
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
  }, [apiKey, workspaceId, setProjects])

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

  const handleEdit = (id: string, field: string, value: unknown) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    setModifiedRows(s => new Set(s).add(id))
  }
  const handleSaveRow = async (entry: typeof timeEntries[number]) => {
    setToast(null)
    const original = entry as Record<string, unknown>;
    let patch: Record<string, unknown> = { ...(editing[entry.id] || {}) };
    const normalizeDate = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return new Date(value).toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return value;
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
    // Convert tag labels to tagIds and create tags if missing
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
      // Always remove 'tags' from payload, only send 'tagIds'
      const { tags: _tags, ...rest } = patch;
      patch = { ...rest, tagIds };
    }
    const allowedKeys = new Set([
      'description', 'projectId', 'taskId', 'taskName', 'start', 'end', 'billable', 'tagIds', 'tags'
    ]);
    const minimalPatch: Record<string, unknown> = {};
    const currentStart = ((entry as any).timeInterval?.start as string | undefined) ?? (entry as any).start;
    const currentEnd = ((entry as any).timeInterval?.end as string | undefined) ?? (entry as any).end;
    for (const [k, v] of Object.entries(patch)) {
      if (!allowedKeys.has(k)) continue;
      const current = (k === 'start') ? currentStart : (k === 'end') ? currentEnd : (original as any)[k];
      if (JSON.stringify(v) !== JSON.stringify(current)) minimalPatch[k] = v;
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
            <DateRangePicker value={dateRange || { startDate: new Date(), endDate: new Date() }} onChange={val => { setDateRange(val); setShowDatePicker(false); }} />
          </div>
        )}
        <Button onClick={fetchEntries} type="button">Fetch Entries</Button>
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
                    const editingEntry = (editing[entry.id] || {}) as any;
                    const timeInterval = (entry as any).timeInterval as { start?: string; end?: string } | undefined;
                    const tiStart = timeInterval?.start;
                    const tiEnd = timeInterval?.end;
                    // Find project and task names for display
                    // const project = Array.isArray(projects) ? projects.find(p => p.id === (editing[entry.id]?.projectId ?? entry.projectId)) : undefined;
                    // If you have tasks per project, you can fetch from store.tasks[projectId] if needed
                    const taskName = editing[entry.id]?.taskName ?? entry.taskName ?? "";
                    // Show tag labels (not IDs)
                    let tagLabels: string[] = [];
                    if (editing[entry.id]?.tags) {
                      tagLabels = editing[entry.id]?.tags as string[];
                    } else if (entry.tags) {
                      tagLabels = entry.tags as string[];
                    } else if (entry.tagIds && Array.isArray(entry.tagIds) && tags.length > 0) {
                      tagLabels = entry.tagIds.map((id: string) => tags.find(t => t.id === id)?.name || id);
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
                            value={editingEntry.projectId ?? entry.projectId ?? ""}
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
                            value={taskName}
                            onChange={e => handleEdit(entry.id, "taskName", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={Array.isArray(tagLabels) ? tagLabels.join(", ") : (typeof tagLabels === "string" ? tagLabels : "")}
                            onChange={e => handleEdit(entry.id, "tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
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

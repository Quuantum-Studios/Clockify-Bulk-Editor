"use client"
import { useEffect, useState } from "react"
import { useClockifyStore } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Select } from "../../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table"
import { DateRangePicker } from "../../components/DateRangePicker"
import { BulkUploadDialog } from "../../components/BulkUploadDialog"
import { Skeleton } from "../../components/ui/skeleton"
import { Toast } from "../../components/ui/toast"
import { Input } from "../../components/ui/input"

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
      .then(r => r.json())
      .then(data => setWorkspaces(data))
      .catch(() => setToast({ type: "error", message: "Failed to load workspaces" }))
  }, [apiKey, setWorkspaces])

  useEffect(() => {
    if (!apiKey || !workspaceId) return
    fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(data => setProjects(data))
      .catch(() => setToast({ type: "error", message: "Failed to load projects" }))
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
      .then(r => r.json())
      .then(data => { setTimeEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setTimeEntries([]); setToast({ type: "error", message: "Failed to load entries" }); setLoading(false) })
  }

  const handleEdit = (id: string, field: string, value: unknown) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    setModifiedRows(s => new Set(s).add(id))
  }
  const handleSaveRow = async (entry: typeof timeEntries[number]) => {
    setToast(null)
    optimisticUpdate(entry.id, editing[entry.id])
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${userId}/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, ...editing[entry.id] })
      })
      if (!res.ok) throw new Error()
      setToast({ type: "success", message: "Saved" })
      setModifiedRows(s => { const n = new Set(s); n.delete(entry.id); return n })
    } catch {
      setToast({ type: "error", message: "Save failed" })
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
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Workspace</label>
          <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className="min-w-[180px]">
            <option value="">Select Workspace</option>
            {Array.isArray(workspaces) ? workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>) : null}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Project</label>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="min-w-[180px]">
            <option value="">All Projects</option>
            {Array.isArray(projects) ? projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : null}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Date Range</label>
          <Button variant="outline" onClick={() => setShowDatePicker(v => !v)}>
            {dateRange ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}` : 'Pick Date Range'}
          </Button>
          {showDatePicker && (
            <div className="absolute z-20 mt-2 bg-white dark:bg-gray-900 rounded shadow-lg border p-2">
              <DateRangePicker value={dateRange || { startDate: new Date(), endDate: new Date() }} onChange={val => { setDateRange(val); setShowDatePicker(false); }} />
            </div>
          )}
        </div>
        <Button onClick={fetchEntries}>Fetch Entries</Button>
        <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>Bulk Upload</Button>
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
                    // Find project and task names for display
                    const project = Array.isArray(projects) ? projects.find(p => p.id === (editing[entry.id]?.projectId ?? entry.projectId)) : undefined;
                    // If you have tasks per project, you can fetch from store.tasks[projectId] if needed
                    const taskName = editing[entry.id]?.taskName ?? entry.taskName ?? "";
                    // Support both tags (array of strings) and tagIds (array of ids or null)
                    const tags = editing[entry.id]?.tags ?? entry.tags ?? entry.tagIds ?? [];
                    return (
                      <TableRow key={entry.id} className={modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
                        <TableCell>
                          <Input
                            value={editing[entry.id]?.description !== undefined ? String(editing[entry.id]?.description) : (entry.description ?? "")}
                            onChange={e => handleEdit(entry.id, "description", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={
                              editing[entry.id]?.start
                                ? (typeof editing[entry.id]?.start === "string" ? editing[entry.id]?.start.slice(0, 16) : "")
                                : (entry.timeInterval?.start
                                  ? new Date(entry.timeInterval.start).toISOString().slice(0, 16)
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
                              editing[entry.id]?.end
                                ? (typeof editing[entry.id]?.end === "string" ? editing[entry.id]?.end.slice(0, 16) : "")
                                : (entry.timeInterval?.end
                                  ? new Date(entry.timeInterval.end).toISOString().slice(0, 16)
                                  : (entry.end ? new Date(entry.end).toISOString().slice(0, 16) : "")
                                )
                            }
                            onChange={e => handleEdit(entry.id, "end", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing[entry.id]?.projectId ?? entry.projectId ?? ""}
                            onChange={e => handleEdit(entry.id, "projectId", e.target.value)}
                          >
                            <option value="">None</option>
                            {Array.isArray(projects) ? projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            )) : null}
                          </Select>
                          {project && <div className="text-xs text-muted-foreground mt-1">{project.name}</div>}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={taskName}
                            onChange={e => handleEdit(entry.id, "taskName", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={Array.isArray(tags) ? tags.join(", ") : (typeof tags === "string" ? tags : "")}
                            onChange={e => handleEdit(entry.id, "tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing[entry.id]?.billable !== undefined ? String(editing[entry.id]?.billable) : (entry.billable ? "true" : "false")}
                            onChange={e => handleEdit(entry.id, "billable", e.target.value === "true")}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleSaveRow(entry)} disabled={!modifiedRows.has(entry.id)}>Save</Button>
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
        <Toast open={!!toast} onClose={() => setToast(null)} duration={3000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {toast.message}
        </Toast>
      )}
    </div>
  )
}

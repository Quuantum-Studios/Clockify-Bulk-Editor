
"use client"
import { useEffect, useRef, useState } from "react"
import { useClockifyStore } from "../lib/store"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Select } from "../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table"
import { DateRangePicker, DateRangeValue } from "../components/DateRangePicker"

import { BulkUploadDialog } from "../components/BulkUploadDialog"

type Workspace = { id: string; name: string }
type Project = { id: string; name: string }
type Task = { id: string; name: string }
type TimeEntry = {
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
  [key: string]: any
}

export default function Home() {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const apiKey = useClockifyStore(s => s.apiKey)
  const setApiKey = useClockifyStore(s => s.setApiKey)
  const workspaces = useClockifyStore(s => s.workspaces)
  const setWorkspaces = useClockifyStore(s => s.setWorkspaces)
  const projects = useClockifyStore(s => s.projects)
  const setProjects = useClockifyStore(s => s.setProjects)
  const tasksMap = useClockifyStore(s => s.tasks)
  const setTasks = useClockifyStore(s => s.setTasks)
  const timeEntries = useClockifyStore(s => s.timeEntries)
  const setTimeEntries = useClockifyStore(s => s.setTimeEntries)
  const updateTimeEntry = useClockifyStore(s => s.updateTimeEntry)
  const optimisticUpdate = useClockifyStore(s => s.optimisticUpdate)
  const optimisticTask = useClockifyStore(s => s.optimisticTask)
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date()
  })
  const [editing, setEditing] = useState<Record<string, Partial<TimeEntry>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  // Load API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("clockifyApiKey")
    if (stored) setApiKey(stored)
  }, [setApiKey])
  useEffect(() => {
    if (apiKey) localStorage.setItem("clockifyApiKey", apiKey)
  }, [apiKey])

  // Fetch workspaces
  useEffect(() => {
    if (!apiKey) return
    fetch(`/api/proxy/workspaces?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]))
  }, [apiKey, setWorkspaces])

  // Fetch projects when workspace changes
  useEffect(() => {
    if (!apiKey || !workspaceId) return
    fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [apiKey, workspaceId, setProjects])

  // Fetch tasks when workspace or project changes
  useEffect(() => {
    if (!apiKey || !workspaceId || !projectId) return
    fetch(`/api/proxy/tasks/${workspaceId}/${projectId}?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(tasks => setTasks(projectId, tasks))
      .catch(() => setTasks(projectId, []))
  }, [apiKey, workspaceId, projectId, setTasks])

  // Fetch entries
  const [loading, setLoading] = useState(false)
  const fetchEntries = async () => {
    setLoading(true)
    setTimeEntries([])
    try {
      const start = dateRange.startDate.toISOString()
      const end = dateRange.endDate.toISOString()
      const url = `/api/proxy/time-entries/${workspaceId}?apiKey=${apiKey}&projectId=${projectId}&start=${start}&end=${end}`
      const data = await fetch(url).then(r => r.json())
      setTimeEntries(data)
    } catch {
      setTimeEntries([])
    }
    setLoading(false)
  }

  // Handle inline edit
  const handleEdit = (id: string, field: string, value: any) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    optimisticUpdate(id, { [field]: value })
  }

  // Save single row
  const saveRow = async (entry: TimeEntry) => {
    setSaving(entry.id)
    const update = { ...entry, ...editing[entry.id] }
    optimisticUpdate(entry.id, update)
    await fetch(`/api/proxy/time-entries/${workspaceId}/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, ...update })
    })
    setEditing(e => { const { [entry.id]: _, ...rest } = e; return rest })
    setSaving(null)
    fetchEntries()
  }

  // Bulk save
  const bulkSave = async () => {
    setBulkSaving(true)
    const updates = timeEntries.filter(e => editing[e.id]).map(e => ({ ...e, ...editing[e.id] }))
    updates.forEach(u => optimisticUpdate(u.id, u))
    if (updates.length === 0) return setBulkSaving(false)
    await Promise.all(updates.map(async (update) => {
      await fetch(`/api/proxy/time-entries/${workspaceId}/${update.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, ...update })
      })
    }))
    setEditing({})
    setBulkSaving(false)
    fetchEntries()
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <BulkUploadDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        workspaceId={workspaceId}
        apiKey={apiKey}
        onSuccess={fetchEntries}
      />
      <div className="flex flex-wrap gap-4 items-end">
        <Button onClick={() => setBulkDialogOpen(true)} disabled={!workspaceId || !apiKey}>
          Bulk Upload
        </Button>
        <div>
          <label className="block text-sm mb-1">API Key</label>
          <Input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Clockify API Key"
            className="w-64"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Workspace</label>
          <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className="w-48">
            <option value="">Select workspace</option>
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Project</label>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-48">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Date Range</label>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Button onClick={fetchEntries} disabled={!workspaceId || !projectId || !apiKey || loading}>
          {loading ? "Loading..." : "Fetch Entries"}
        </Button>
        <Button onClick={bulkSave} disabled={bulkSaving || Object.keys(editing).length === 0}>
          {bulkSaving ? "Saving..." : "Bulk Save"}
        </Button>
      </div>

      <div className="overflow-x-auto">
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}><span className="h-8 w-full block animate-pulse bg-gray-200 rounded" /></TableCell>
              </TableRow>
            ) : timeEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">No entries</TableCell>
              </TableRow>
            ) : timeEntries.map(entry => {
              const edit = editing[entry.id] || {}
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Input
                      value={edit.description ?? entry.description ?? ""}
                      onChange={e => handleEdit(entry.id, "description", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={edit.start ?? entry.start?.slice(0, 16)}
                      onChange={e => handleEdit(entry.id, "start", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={edit.end ?? entry.end?.slice(0, 16)}
                      onChange={e => handleEdit(entry.id, "end", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={edit.projectId ?? entry.projectId ?? ""}
                      onChange={e => handleEdit(entry.id, "projectId", e.target.value)}
                    >
                      <option value="">Select</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={edit.taskId ?? entry.taskId ?? ""}
                        onChange={e => handleEdit(entry.id, "taskId", e.target.value)}
                        className="w-32"
                      >
                        <option value="">Select</option>
                        {(tasksMap[entry.projectId || projectId] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      <Input
                        placeholder="New task name"
                        value={edit.taskName ?? ""}
                        onChange={e => handleEdit(entry.id, "taskName", e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={edit.tags?.join(",") ?? entry.tags?.join(",") ?? ""}
                      onChange={e => handleEdit(entry.id, "tags", e.target.value.split(","))}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(edit.billable ?? entry.billable ?? "")}
                      onChange={e => handleEdit(entry.id, "billable", e.target.value === "true")}
                    >
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => saveRow(entry)}
                      disabled={saving === entry.id || !editing[entry.id]}
                    >
                      {saving === entry.id ? "Saving..." : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

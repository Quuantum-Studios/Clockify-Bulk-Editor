"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useClockifyStore } from "../lib/store"
import { Sun, Moon } from "lucide-react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Select } from "../components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table"
import { DateRangePicker } from "../components/DateRangePicker"
import { BulkUploadDialog } from "../components/BulkUploadDialog"
import { Skeleton } from "../components/ui/skeleton"
import { Toast } from "../components/ui/toast"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clockify Bulk Editor"

export default function Home() {
  const router = useRouter();
  // Theme
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" && window.localStorage.getItem("theme")) || "light")
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); window.localStorage.setItem("theme", theme) }, [theme])

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Zustand store
  const {
    apiKey, setApiKey,
    workspaces, setWorkspaces,
    projects, setProjects,
    tasks, setTasks,
    timeEntries, setTimeEntries,
    updateTimeEntry, optimisticUpdate, optimisticTask
  } = useClockifyStore()

  // Local state
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [dateRange, setDateRange] = useState<null | { startDate: Date; endDate: Date }>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, any>>({})
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'settings'>('dashboard')


  // Load API key and set initial dateRange on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("clockify_api_key")
      if (stored) {
        setApiKey(stored)
        setApiKeyInput(stored)
      }
      // Set dateRange to today on client only
      const today = new Date()
      setDateRange({ startDate: today, endDate: today })
    }
  }, [setApiKey])

  // Save API key to localStorage
  const handleSaveApiKey = () => {
    if (!apiKeyInput || apiKeyInput.length < 10) {
      setToast({ type: "error", message: "Please enter a valid API key." })
      return
    }
    setApiKey(apiKeyInput)
    if (typeof window !== "undefined") window.localStorage.setItem("clockify_api_key", apiKeyInput)
    setToast({ type: "success", message: "API key saved" })
  }

  // Fetch workspaces
  useEffect(() => {
    if (!apiKey) return
    fetch(`/api/proxy/workspaces?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(data => setWorkspaces(data))
      .catch(() => setToast({ type: "error", message: "Failed to load workspaces" }))
  }, [apiKey, setWorkspaces])

  // Fetch projects when workspace changes
  useEffect(() => {
    if (!apiKey || !workspaceId) return
    fetch(`/api/proxy/projects/${workspaceId}?apiKey=${apiKey}`)
      .then(r => r.json())
      .then(data => setProjects(data))
      .catch(() => setToast({ type: "error", message: "Failed to load projects" }))
  }, [apiKey, workspaceId, setProjects])

  // Fetch time entries
  const fetchEntries = () => {
    if (!apiKey) {
      setToast({ type: "error", message: "API key required." });
      return;
    }
    if (!workspaceId) {
      setToast({ type: "error", message: "Please select a workspace." });
      return;
    }
    if (!dateRange) {
      setToast({ type: "error", message: "Please select a date range." });
      return;
    }
    setLoading(true)
    const start = dateRange.startDate.toISOString()
    const end = dateRange.endDate.toISOString()
    fetch(`/api/proxy/time-entries/${workspaceId}?apiKey=${apiKey}&projectId=${projectId}&start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => { setTimeEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setTimeEntries([]); setToast({ type: "error", message: "Failed to load entries" }); setLoading(false) })
  }

  // Inline edit handlers
  const handleEdit = (id: string, field: string, value: any) => {
    setEditing(e => ({ ...e, [id]: { ...e[id], [field]: value } }))
    setModifiedRows(s => new Set(s).add(id))
  }
  const handleSaveRow = async (entry: any) => {
    setToast(null)
    optimisticUpdate(entry.id, editing[entry.id])
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/${entry.id}`, {
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
        const entry = timeEntries.find((e: any) => e.id === id)
        if (entry) await handleSaveRow(entry)
      }
    }
    setToast({ type: "success", message: "Bulk save complete" })
    setModifiedRows(new Set())
  }

  // UI
  return (
    <div className={"min-h-screen flex flex-col bg-background text-foreground " + (theme === 'dark' ? 'dark' : '')}>
      {/* Top navbar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="font-bold text-lg">{APP_NAME}</div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full border border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      {/* Sidebar with navigation */}
      <div className="flex flex-1">
        <aside className="w-48 border-r border-border bg-sidebar p-4 hidden md:block">
          <div className="font-semibold mb-2">Menu</div>
          <ul className="space-y-2 text-sm">
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded ${activeMenu === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setActiveMenu('dashboard')}
              >Dashboard</button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded ${activeMenu === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setActiveMenu('settings')}
              >Settings</button>
            </li>
          </ul>
        </aside>
        <main className="flex-1 p-6">
          {/* API Key input */}
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <Input
              type="password"
              placeholder="Clockify API Key"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSaveApiKey}>Save API Key</Button>
          </div>
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
                      {timeEntries.map(entry => (
                        <TableRow key={entry.id} className={modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
                          <TableCell>
                            <Input
                              value={editing[entry.id]?.description ?? entry.description ?? ""}
                              onChange={e => handleEdit(entry.id, "description", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="datetime-local"
                              value={editing[entry.id]?.start ?? entry.start?.slice(0, 16) ?? ""}
                              onChange={e => handleEdit(entry.id, "start", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="datetime-local"
                              value={editing[entry.id]?.end ?? entry.end?.slice(0, 16) ?? ""}
                              onChange={e => handleEdit(entry.id, "end", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={editing[entry.id]?.projectId ?? entry.projectId ?? ""}
                              onChange={e => handleEdit(entry.id, "projectId", e.target.value)}
                            >
                              <option value="">None</option>
                            {Array.isArray(projects) ? projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : null}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editing[entry.id]?.taskName ?? entry.taskName ?? ""}
                            onChange={e => handleEdit(entry.id, "taskName", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editing[entry.id]?.tags?.join(", ") ?? (entry.tags?.join(", ") ?? "")}
                            onChange={e => handleEdit(entry.id, "tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing[entry.id]?.billable ?? entry.billable ? "true" : "false"}
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
                    ))}
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
        </main>
      </div>
      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        workspaceId={workspaceId}
        apiKey={apiKey}
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

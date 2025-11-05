"use client"
import { useEffect, useState } from "react"
import { X, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { useClockifyStore } from "../lib/store"
import type { ApiLogEntry } from "../lib/logger"

interface LogsDialogProps {
  open: boolean
  onClose: () => void
}

export default function LogsDialog({ open, onClose }: LogsDialogProps) {
  const { userProfile, apiKey } = useClockifyStore()
  const [logs, setLogs] = useState<ApiLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRawId, setShowRawId] = useState<string | null>(null)
  const [labelCache, setLabelCache] = useState<Record<string, string>>({})

  const loadLogs = async () => {
    if (!userProfile?.email && !apiKey) return

    setIsLoading(true)
    try {
      const qs = userProfile?.email
        ? `email=${encodeURIComponent(userProfile.email)}`
        : `apiKey=${encodeURIComponent(apiKey)}`
      const res = await fetch(`/api/logs?${qs}`)
      const data = await res.json() as { logs?: ApiLogEntry[] }
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to load logs:", error)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && (userProfile?.email || apiKey)) {
      loadLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userProfile?.email, apiKey])

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date)
    } catch {
      return timestamp
    }
  }

  const parseAction = (log: ApiLogEntry) => {
    const method = (log.method || "").toUpperCase()
    const endpoint = log.endpoint || ""
    const d = log.details || {}
    const req = (d.request || {}) as Record<string, unknown>

    const chips: string[] = []
    const addIf = (label: string, val?: unknown) => {
      if (val === undefined || val === null || val === "") return
      chips.push(`${label}: ${String(val)}`)
    }

    if (method === 'POST' && /\/user\/[^/]+\/time-entries$/.test(endpoint)) {
      const title = 'Created time entry'
      addIf('description', (req as Record<string, unknown>).description)
      addIf('projectId', (req as Record<string, unknown>).projectId)
      addIf('taskId', (req as Record<string, unknown>).taskId)
      addIf('start', (req as Record<string, unknown>).start)
      addIf('end', (req as Record<string, unknown>).end)
      const tagIds = (req as Record<string, unknown>).tagIds as unknown[] | undefined
      if (tagIds && Array.isArray(tagIds)) addIf('tags', tagIds.length)
      return { title, chips }
    }

    if (method === 'PUT' && /\/time-entries\//.test(endpoint)) {
      const idMatch = endpoint.match(/time-entries\/(\w+)/)
      const title = `Updated time entry${idMatch ? ` ${idMatch[1]}` : ''}`
      ;['description','projectId','taskId','start','end','billable'].forEach(k => addIf(k, (req as Record<string, unknown>)[k]))
      const tagIds = (req as Record<string, unknown>).tagIds as unknown[] | undefined
      if (tagIds && Array.isArray(tagIds)) addIf('tags', tagIds.length)
      return { title, chips }
    }

    if (method === 'DELETE' && /\/time-entries\//.test(endpoint)) {
      const idMatch = endpoint.match(/time-entries\/(\w+)/)
      const title = `Deleted time entry${idMatch ? ` ${idMatch[1]}` : ''}`
      return { title, chips }
    }

    if (method === 'PUT' && /\/user\/[^/]+\/time-entries$/.test(endpoint) && Array.isArray(req)) {
      const title = `Bulk updated time entries (${(req as unknown[]).length})`
      return { title, chips }
    }

    if (method === 'POST' && /\/tags$/.test(endpoint)) {
      const title = 'Created tag'
      addIf('name', (req as Record<string, unknown>).name)
      return { title, chips }
    }

    if (method === 'DELETE' && /\/tags\//.test(endpoint)) {
      const idMatch = endpoint.match(/tags\/(\w+)/)
      const title = `Deleted tag${idMatch ? ` ${idMatch[1]}` : ''}`
      return { title, chips }
    }

    if (method === 'POST' && /\/tasks$/.test(endpoint)) {
      const title = 'Created task'
      addIf('name', (req as Record<string, unknown>).name)
      return { title, chips }
    }

    if (method === 'DELETE' && /\/tasks\//.test(endpoint)) {
      const idMatch = endpoint.match(/tasks\/(\w+)/)
      const title = `Deleted task${idMatch ? ` ${idMatch[1]}` : ''}`
      return { title, chips }
    }

    // Fallback
    const title = `${method} ${endpoint}`
    return { title, chips }
  }

  const resolveLabelsForLog = async (log: ApiLogEntry) => {
    if (!apiKey) return
    const endpoint = log.endpoint || ""
    const wsMatch = endpoint.match(/\/workspaces\/([^/]+)/)
    const workspaceId = wsMatch?.[1]
    if (!workspaceId) return
    const d = log.details || {}
    const req = (d.request || {}) as Record<string, unknown>

    const newLabels: Record<string, string> = {}

    // Resolve project name
    const projectId = req.projectId as string | undefined
    if (projectId && !labelCache[`project:${projectId}`]) {
      try {
        const res = await fetch(`/api/proxy/projects/${workspaceId}?apiKey=${encodeURIComponent(apiKey)}`)
        const projects = (await res.json()) as { id: string; name: string }[]
        const p = projects.find(p => p.id === projectId)
        if (p) newLabels[`project:${projectId}`] = p.name
      } catch { /* noop */ }
    }

    // Resolve task name
    const taskId = req.taskId as string | undefined
    if (taskId && projectId && !labelCache[`task:${taskId}`]) {
      try {
        const res = await fetch(`/api/proxy/tasks/${workspaceId}/${projectId}?apiKey=${encodeURIComponent(apiKey)}`)
        const tasks = (await res.json()) as { id: string; name: string }[]
        const t = tasks.find(t => t.id === taskId)
        if (t) newLabels[`task:${taskId}`] = t.name
      } catch { /* noop */ }
    }

    if (Object.keys(newLabels).length) {
      setLabelCache(prev => ({ ...prev, ...newLabels }))
    }
  }

  const getStatusColor = (status?: number) => {
    if (!status) return "text-gray-500"
    if (status >= 200 && status < 300) return "text-green-600 dark:text-green-400"
    if (status >= 400 && status < 500) return "text-orange-600 dark:text-orange-400"
    if (status >= 500) return "text-red-600 dark:text-red-400"
    return "text-gray-500"
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>API Logs</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button
            onClick={loadLogs}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading && logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No logs available</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const simplified = parseAction(log)
                return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={async () => {
                    const next = expandedId === log.id ? null : log.id
                    setExpandedId(next)
                    if (next === log.id) {
                      await resolveLabelsForLog(log)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                          {log.method}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {simplified.title}
                        </span>
                        {log.status && (
                          <span className={`text-sm font-semibold ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        )}
                        {log.duration && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(log.timestamp)}
                      </div>
                      {/* Simplified chips */}
                      {simplified.chips.length > 0 && (
                        <div className="mt-2">
                          <div className="mt-1 flex flex-wrap gap-2">
                            {simplified.chips.map((c, idx) => {
                              // Replace IDs with labels when available
                              let display = c
                              const m = c.match(/^(projectId|taskId):\s*(.+)$/)
                              if (m) {
                                const key = m[1] === 'projectId' ? `project:${m[2]}` : `task:${m[2]}`
                                const label = labelCache[key]
                                if (label) display = `${m[1] === 'projectId' ? 'project' : 'task'}: ${label}`
                              }
                              return (
                              <span key={idx} className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {display}
                              </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {log.error && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {log.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedId === log.id && log.details && (
                    <div className="mt-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Details</div>
                        <button
                          className="text-xs underline"
                          onClick={(e) => { e.stopPropagation(); setShowRawId(showRawId === log.id ? null : log.id) }}
                        >
                          {showRawId === log.id ? 'Hide raw' : 'View raw'}
                        </button>
                      </div>
                      {showRawId === log.id && (
                        <div className="mt-2">
                          {log.details.summary && (
                            <div className="mb-2 font-medium">{log.details.summary}</div>
                          )}
                          {!!log.details.request && (
                            <div className="mb-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Request</div>
                              <pre className="text-xs p-2 rounded bg-gray-100 dark:bg-gray-900 overflow-auto">{JSON.stringify(log.details.request, null, 2)}</pre>
                            </div>
                          )}
                          {!!log.details.response && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response</div>
                              <pre className="text-xs p-2 rounded bg-gray-100 dark:bg-gray-900 overflow-auto">{JSON.stringify(log.details.response, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


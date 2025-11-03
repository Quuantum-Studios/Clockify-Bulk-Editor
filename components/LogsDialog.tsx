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
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                          {log.method}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {log.endpoint}
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
                      {log.error && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {log.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedId === log.id && log.details && (
                    <div className="mt-3 text-sm">
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
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


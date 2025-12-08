"use client"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
import { Skeleton } from "./ui/skeleton"
import { capture, AnalyticsEvents } from "../lib/analytics"
import { fetchProxy } from "../lib/client-api"

interface BulkDeleteTasksDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  apiKey: string
  projectId: string
  onSuccess: () => void
}

export function BulkDeleteTasksDialog({ open, onClose, workspaceId, apiKey, projectId, onSuccess }: BulkDeleteTasksDialogProps) {
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (open && workspaceId && apiKey && projectId) {
      setLoading(true)
      fetchProxy<{ id: string; name: string }[]>(`/api/proxy/tasks/${workspaceId}/${projectId}`, apiKey)
        .then((data) => setTasks(data))
        .catch(() => setToast({ type: "error", message: "Failed to load tasks." }))
        .finally(() => setLoading(false))
    }
  }, [open, workspaceId, apiKey, projectId])

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
      return next
    })
  }

  const handleDelete = async () => {
    if (selectedTasks.size === 0) { setToast({ type: "error", message: "No tasks selected." }); return }
    if (!confirm(`Delete ${selectedTasks.size} task${selectedTasks.size === 1 ? '' : 's'}? This action cannot be undone.`)) return

    setDeleting(true)
    setToast(null)
    try {
      await fetchProxy(`/api/proxy/workspaces/${workspaceId}/tasks/bulk-delete`, apiKey, {
        method: "DELETE",
        body: JSON.stringify({ projectId, taskIds: Array.from(selectedTasks) })
      })
      setToast({ type: "success", message: "Tasks deleted successfully." })
      capture(AnalyticsEvents.BULK_DELETE_TASKS, { count: selectedTasks.size })
      setSelectedTasks(new Set())
      onSuccess()
      onClose()
    } catch {
      setToast({ type: "error", message: "Bulk delete failed" })
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Bulk Delete Tasks</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <div className="relative max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTasks(new Set(tasks.map(t => t.id)))
                      else setSelectedTasks(new Set())
                    }}
                    checked={selectedTasks.size > 0 && selectedTasks.size === tasks.length}
                  />
                </TableHead>
                <TableHead>Task Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  </TableRow>
                ))
              ) : tasks.length > 0 ? (
                tasks.map(task => (
                  <TableRow key={task.id} data-state={selectedTasks.has(task.id) && "selected"}>
                    <TableCell>
                      <input type="checkbox" id={`task-${task.id}`} checked={selectedTasks.has(task.id)} onChange={() => handleSelectTask(task.id)} className="cursor-pointer" />
                    </TableCell>
                    <TableCell>
                      <label htmlFor={`task-${task.id}`} className="font-medium">{task.name}</label>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">No tasks found for this project.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleDelete} disabled={deleting || selectedTasks.size === 0} className="cursor-pointer">
            {deleting ? "Deleting..." : `Delete Selected (${selectedTasks.size})`}
          </Button>
        </DialogFooter>
        {toast && (
          <Toast
            open={!!toast}
            onClose={() => setToast(null)}
            duration={4000}
            className={toast.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}
          >
            {toast.message}
          </Toast>
        )}
      </DialogContent>
    </Dialog>
  )
}



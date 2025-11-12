"use client"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table"
import { Skeleton } from "./ui/skeleton"
import { capture, AnalyticsEvents } from "../lib/analytics"

interface BulkDeleteTagsDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  apiKey: string
  onSuccess: () => void
}

export function BulkDeleteTagsDialog({
  open,
  onClose,
  workspaceId,
  apiKey,
  onSuccess,
}: BulkDeleteTagsDialogProps) {
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    if (open && workspaceId && apiKey) {
      setLoading(true)
      fetch(`/api/proxy/tags/${workspaceId}?apiKey=${encodeURIComponent(apiKey)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({})) as { error?: string }
            throw new Error(errorData.error || `HTTP ${res.status}: Failed to load tags`)
          }
          return res.json()
        })
        .then((data: { id: string; name: string }[]) => setTags(data))
        .catch(() =>
          setToast({ type: "error", message: "Failed to load tags." })
        )
        .finally(() => setLoading(false))
    }
  }, [open, workspaceId, apiKey])

  const handleSelectTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  const handleDelete = async () => {
    if (selectedTags.size === 0) {
      setToast({ type: "error", message: "No tags selected." })
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedTags.size} tags? This action cannot be undone.`
      )
    ) {
      return
    }

    setDeleting(true)
    setToast(null)
    try {
      const res = await fetch(
        `/api/proxy/workspaces/${workspaceId}/tags/bulk-delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, tagIds: Array.from(selectedTags) }),
        }
      )
      const data = await res.json() as { 
        error?: string
        message?: string
        deleted?: number
        failed?: number
        skipped?: number
        details?: { failed?: { id: string; reason: string }[]; skipped?: { id: string; reason: string }[] }
      }
      if (res.ok || res.status === 207) {
        const deletedCount = data.deleted ?? selectedTags.size
        let message = data.message || "Tags deleted successfully."
        if (data.skipped && data.skipped > 0) {
          message += ` ${data.skipped} tag(s) skipped (not in workspace).`
        }
        if (data.failed && data.failed > 0) {
          message += ` ${data.failed} tag(s) failed to delete.`
        }
        setToast({ type: data.failed && data.failed > 0 ? "error" : "success", message })
        capture(AnalyticsEvents.BULK_DELETE_TAGS, { count: deletedCount, skipped: data.skipped || 0, failed: data.failed || 0 })
        setSelectedTags(new Set())
        onSuccess()
        onClose()
      } else {
        setToast({ type: "error", message: data.error || "Bulk delete failed" })
      }
    } catch {
      setToast({ type: "error", message: "Bulk delete failed" })
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Bulk Delete Tags</DialogTitle>
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
                      if (e.target.checked) {
                        setSelectedTags(new Set(tags.map((t) => t.id)))
                      } else {
                        setSelectedTags(new Set())
                      }
                    }}
                    checked={
                      selectedTags.size > 0 && selectedTags.size === tags.length
                    }
                  />
                </TableHead>
                <TableHead>Tag Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tags.length > 0 ? (
                tags.map((tag) => (
                  <TableRow
                    key={tag.id}
                    data-state={selectedTags.has(tag.id) && "selected"}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        id={`tag-${tag.id}`}
                        checked={selectedTags.has(tag.id)}
                        onChange={() => handleSelectTag(tag.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <label htmlFor={`tag-${tag.id}`} className="font-medium">
                        {tag.name}
                      </label>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No tags found in this workspace.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || selectedTags.size === 0}
            className="cursor-pointer"
          >
            {deleting
              ? "Deleting..."
              : `Delete Selected (${selectedTags.size})`}
          </Button>
        </DialogFooter>
        {toast && (
          <Toast
            open={!!toast}
            onClose={() => setToast(null)}
            duration={4000}
            className={
              toast.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }
          >
            {toast.message}
          </Toast>
        )}
      </DialogContent>
    </Dialog>
  )
}

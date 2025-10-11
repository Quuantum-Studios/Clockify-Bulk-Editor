"use client"
import { useRef, useState } from "react"
import Papa from "papaparse"
import { Sheet } from "./ui/sheet"
import { Button } from "./ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
// import { Input } from "./ui/input"
import { Toast } from "./ui/toast"

interface BulkUploadDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  apiKey: string
  userId: string
  onSuccess: () => void
}

export function BulkUploadDialog({ open, onClose, workspaceId, apiKey, userId, onSuccess }: BulkUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string | boolean | undefined>[]>([])
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setToast({ type: "error", message: "No file selected." })
      return
    }
    if (!file.name.endsWith('.csv')) {
      setToast({ type: "error", message: "Please upload a CSV file." })
      return
    }
    setParsing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data as Record<string, string>[])
        setParsing(false)
      },
      error: () => {
        setToast({ type: "error", message: "Failed to parse CSV" })
        setParsing(false)
      }
    })
  }

  const handleUpload = async () => {
    if (!rows.length) {
      setToast({ type: "error", message: "No data to upload. Please select a CSV file." })
      return;
    }
    if (!userId) {
      setToast({ type: "error", message: "User ID not loaded." })
      return;
    }
    setUploading(true)
    setToast(null)
    try {
      const normalized = rows.map(r => {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          // normalize empty strings to undefined
          if (v === "" || v === undefined) {
            out[k] = undefined
            continue
          }
          if (k === 'tags' && typeof v === 'string') {
            const s = v.trim()
            if (!s) {
              out[k] = undefined
            } else if (s.startsWith('[') && s.endsWith(']')) {
              try { out[k] = JSON.parse(s) } catch { out[k] = s }
            } else {
              // Support comma, semicolon or pipe as separators for multiple tags
              out[k] = s.split(/[,;|]\s*/).filter(Boolean)
            }
            continue
          }
          if (k === 'billable' && typeof v === 'string') {
            out[k] = v.toLowerCase() === 'true'
            continue
          }
          out[k] = v
        }
        return out
      })

      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, userId, entries: normalized })
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: "success", message: "Bulk upload successful" })
        setRows([])
        onSuccess()
      } else {
        setToast({ type: "error", message: data.error || "Bulk upload failed" })
      }
    } catch {
      setToast({ type: "error", message: "Bulk upload failed" })
    }
    setUploading(false)
  }

  if (!open) return null;
  return (
    <Sheet onClick={onClose}>
      <div
        className="bg-background rounded-lg w-[95vw] max-w-2xl flex flex-col gap-4 p-6 shadow-xl relative"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">Bulk Upload CSV</h2>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="mb-2 md:mb-0"
            onChange={handleFile}
            disabled={parsing || uploading}
          />
          <div className="flex flex-col md:flex-row items-center gap-3">
            <span className="text-xs text-muted-foreground">Only .csv files are supported</span>
            <a
              href="/sample-bulk-upload.csv"
              download
              className="text-xs text-primary underline"
              aria-label="Download sample CSV file"
            >
              Download sample CSV
            </a>
          </div>
        </div>
        {rows.length > 0 && (
          <div className="overflow-x-auto max-h-64 mb-2 border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(rows[0]).map(col => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    {Object.keys(rows[0]).map(col => (
                      <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex gap-2 justify-end mt-2">
          <Button onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || rows.length === 0}>
            {uploading ? "Uploading..." : "Confirm Upload"}
          </Button>
        </div>
        {toast && (
          <Toast open={!!toast} onClose={() => setToast(null)} duration={4000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {toast.message}
          </Toast>
        )}
      </div>
    </Sheet>
  )
}

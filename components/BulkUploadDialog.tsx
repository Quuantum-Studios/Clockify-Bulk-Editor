"use client"
import { useRef, useState } from "react"
import Papa from "papaparse"
import { Dialog } from "./ui/dialog"
import { Button } from "./ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
// import { Input } from "./ui/input"
import { Toast } from "./ui/toast"

export function BulkUploadDialog({ open, onClose, workspaceId, apiKey, onSuccess }: {
  open: boolean
  onClose: () => void
  workspaceId: string
  apiKey: string
  onSuccess: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
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
    setUploading(true)
    setToast(null)
    try {
      const res = await fetch(`/api/proxy/time-entries/${workspaceId}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, entries: rows })
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

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 bg-background rounded-lg w-[95vw] max-w-2xl flex flex-col gap-4">
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
          <span className="text-xs text-muted-foreground">Only .csv files are supported</span>
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
          <Toast open={!!toast} onClose={() => setToast(null)} duration={3000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {toast.message}
          </Toast>
        )}
      </div>
    </Dialog>
  )
}

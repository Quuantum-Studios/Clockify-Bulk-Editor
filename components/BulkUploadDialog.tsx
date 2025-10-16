"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import Papa from "papaparse"
import { Sheet } from "./ui/sheet"
import { Button } from "./ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
import { Toast } from "./ui/toast"

interface BulkUploadDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  apiKey: string
  userId: string
  onSuccess: () => void
  onPopulate?: (entries: Record<string, unknown>[]) => void
  initialCsv?: string | null
}

export function BulkUploadDialog({ open, onClose, workspaceId, apiKey, userId, onSuccess, onPopulate, initialCsv }: BulkUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  type CSVRow = Record<string, string | string[] | undefined>
  const [rows, setRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [verifyingProjects, setVerifyingProjects] = useState(false)
  const [verifyingAllTasks, setVerifyingAllTasks] = useState(false)
  const [verifyingTags, setVerifyingTags] = useState(false)
  const [step, setStep] = useState<1|2|3|4|5>(1)
  const [projectCheck, setProjectCheck] = useState<{ existing: { id: string; name: string }[]; missing: string[] } | null>(null)
  const [projectsMap, setProjectsMap] = useState<Record<string, string | undefined>>({})
  const [taskCheck, setTaskCheck] = useState<Record<string, { existing: string[]; missing: string[] }>>({})
  const [tagCheck, setTagCheck] = useState<{ existing: string[]; missing: string[] } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Parse initial CSV content when provided and dialog opens
  useEffect(() => {
    if (!open) return
    if (!initialCsv || typeof initialCsv !== 'string' || !initialCsv.trim()) return
    try {
      setParsing(true)
      // Strip markdown code fences if present
      const cleaned = initialCsv.replace(/^```[a-zA-Z]*\n?/m, '').replace(/\n?```$/m, '')
      const result = Papa.parse(cleaned, { header: true, skipEmptyLines: true }) as unknown as { data: CSVRow[]; errors?: unknown[] }
      const parsed = (result?.data || []) as CSVRow[]
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        setRows(parsed)
        setFileName('AI-generated.csv')
        setToast({ type: 'success', message: `Imported ${parsed.length} rows from AI` })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to parse AI CSV' })
    } finally {
      setParsing(false)
    }
  }, [open, initialCsv])

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
    setFileName(file.name)
    setParsing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: unknown) => {
        const parsed = (result as { data: CSVRow[] }).data
        setRows(parsed)
        setParsing(false)
      },
      error: () => {
        console.error('[BulkUploadDialog] handleFile: parse error')
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
      const normalized = getNormalizedEntries()

      // If caller provided onPopulate, return normalized entries for manual review instead of creating them
      if (typeof onPopulate === 'function') {
        try {
          onPopulate(normalized)
          setToast({ type: "success", message: "Entries added to dashboard for review" })
          setRows([])
          onClose()
        } catch (e) {
          console.error('[BulkUploadDialog] handleUpload: onPopulate error', e)
          setToast({ type: "error", message: (e as Error).message || "Failed to populate entries" })
        }
        setUploading(false)
        return
      } else {
        if (!userId) {
          setToast({ type: "error", message: "User ID not loaded." })
          setUploading(false)
          return
        }
        const res = await fetch(`/api/proxy/time-entries/${workspaceId}/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, userId, entries: normalized })
        })
        const data = await res.json() as { error?: string }
        if (res.ok) {
          setToast({ type: "success", message: "Bulk upload successful" })
          setRows([])
          onSuccess()
        } else {
          setToast({ type: "error", message: data.error || "Bulk upload failed" })
        }
      }
    } catch {
      console.error('[BulkUploadDialog] handleUpload: unexpected error')
      setToast({ type: "error", message: "Bulk upload failed" })
    }
    setUploading(false)
  }

  const getNormalizedEntries = () => {
    return rows.map(r => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(r)) {
        if (v === "" || v === undefined) {
          out[k] = undefined
          continue
        }
        if (k === 'tags' && typeof v === 'string') {
          const s = v.trim()
          if (!s) out[k] = undefined
          else if (s.startsWith('[') && s.endsWith(']')) {
            try { out[k] = JSON.parse(s) } catch { out[k] = s }
          } else {
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
  }

  const extractProjectNames = (data: CSVRow[]) => {
    const names = new Set<string>()
    for (const r of data) {
      const v = (r['projectName'] ?? '')
      if (typeof v === 'string' && v.trim()) names.add(v.trim())
    }
    return Array.from(names)
  }
  const extractTagNames = (data: CSVRow[]) => {
    const set = new Set<string>()
    for (const r of data) {
      const t = r['tags']
      if (Array.isArray(t)) for (const tag of t) if (tag && typeof tag === 'string') set.add(tag.trim())
      if (typeof t === 'string' && t.trim()) {
        (t as string).split(/[,;|]\s*/).forEach((s: string) => s && set.add(s.trim()))
      }
    }
    return Array.from(set)
  }

  const getHeaderKeys = (): string[] => rows.length ? Object.keys(rows[0]) : []
  const requiredHeaders = ['description', 'start', 'end']
  const missingHeaders = requiredHeaders.filter(h => !getHeaderKeys().some(k => k.trim().toLowerCase() === h))

  // API calls for checks
  const verifyProjects = async () => {
    try {
      setVerifyingProjects(true)
      const projectNames = extractProjectNames(rows)
      const res = await fetch(`/api/proxy/workspaces/${workspaceId}/projects/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, projectNames }) })
      const data = await res.json() as { error?: string; existing?: { id: string; name: string }[]; missing?: string[] }
      if (!res.ok) {
        console.error('[BulkUploadDialog] verifyProjects: error response', data)
        throw new Error(data.error || 'Project check failed')
      }
      const existing: { id: string; name: string }[] = (data.existing || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      const map: Record<string, string | undefined> = {}
      for (const p of existing) map[p.name.toLowerCase().trim()] = p.id
      setProjectsMap(map)
      setProjectCheck({ existing, missing: data.missing || [] })
      return data
    } catch (e) {
      console.error('[BulkUploadDialog] verifyProjects: caught', e)
      throw e
    } finally {
      setVerifyingProjects(false)
    }
  }

  const reverifyProjects = async () => {
    setProjectCheck(null)
    await verifyProjects()
  }

  const verifyTasksForProject = async (projectNameOrId: string, projectId?: string) => {
    try {
      setVerifyingAllTasks(true)

      const tasks = rows
        .filter(r => {
          const rowProjName = (r.projectName ?? '').toString().trim()
          const rowProjId = (r.projectId ?? '').toString().trim()
          const target = (projectNameOrId || '').toString().trim()
          if (target === '') return (rowProjName === '' && rowProjId === '')
          return rowProjName === target || rowProjId === target
        })
        .map(r => (r.taskName ?? '').toString())
        .filter(Boolean)
      const taskNames = Array.from(new Set(tasks))
      const res = await fetch(`/api/proxy/workspaces/${workspaceId}/tasks/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, projectId, taskNames }) })
      const data = await res.json() as { error?: string; existing?: { id: string; name: string }[]; missing?: string[] }
      if (!res.ok) {
        console.error('[BulkUploadDialog] verifyTasksForProject: error', data)
        throw new Error(data.error || 'Task check failed')
      }
      setTaskCheck(prev => ({ ...prev, [projectNameOrId]: { existing: (data.existing || []).map((t: { id: string; name: string }) => t.name), missing: data.missing || [] } }))
      return data
    } catch (e) {
      console.error('[BulkUploadDialog] verifyTasksForProject: caught', e)
      throw e
    } finally {
      setVerifyingAllTasks(false)
    }
  }

  const createTasksForProject = async (projectId: string, projectKey: string) => {
    const missing = taskCheck[projectKey]?.missing || []
    if (!missing.length) return
    const res = await fetch(`/api/proxy/workspaces/${workspaceId}/tasks/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, projectId, taskNames: missing }) })
    const data = await res.json() as { error?: string }
    if (!res.ok) throw new Error(data.error || 'Task create failed')
    // refresh check
    await verifyTasksForProject(projectKey, projectId)
    return data
  }

  const createAllMissingTasks = async () => {
    const skipped: string[] = []
    for (const [projectKey, check] of Object.entries(taskCheck)) {
      const missing = check.missing || []
      if (!missing.length) continue

      let projectId = projectsMap[projectKey.toLowerCase().trim()]
      if (!projectId) {

        if (typeof projectKey === 'string' && projectKey.length > 8 && /[0-9a-fA-F-]/.test(projectKey)) {
          projectId = projectKey
        } else {
          try {
            const projectRes = await fetch(`/api/proxy/workspaces/${workspaceId}/projects/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, projectNames: [projectKey] }) })
            const pd = await projectRes.json() as { existing?: { id: string; name: string }[] }
            if (projectRes.ok && pd.existing && pd.existing[0]) {
              projectId = pd.existing[0].id
              setProjectsMap(prev => ({ ...prev, [projectKey.toLowerCase().trim()]: projectId }))
            }
          } catch { /* ignore */ }
        }
      }

      if (!projectId) {
        skipped.push(projectKey)
        continue
      }

      await createTasksForProject(projectId, projectKey)
    }
    if (skipped.length) throw new Error(`Could not resolve project IDs for: ${skipped.join(', ')}`)
  }

  const refreshAllTasks = async () => {
    try {
      const projectsToCheck = projectCheck ? projectCheck.existing.map(p => p.name) : extractProjectNames(rows)
      for (const p of projectsToCheck) {
        const projectId = projectsMap[p.toLowerCase().trim()]
        await verifyTasksForProject(p, projectId)
      }
      setToast({ type: 'success', message: 'Tasks refreshed' })
    } catch (e) {
      setToast({ type: 'error', message: (e as Error).message })
    }
  }

  const verifyTags = async () => {
    try {
      setVerifyingTags(true)
      const tagNames = extractTagNames(rows)
      const res = await fetch(`/api/proxy/workspaces/${workspaceId}/tags/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, tagNames }) })
      const data = await res.json() as { error?: string; existing?: { id: string; name: string }[]; missing?: string[] }
      if (!res.ok) {
        console.error('[BulkUploadDialog] verifyTags: error', data)
        throw new Error(data.error || 'Tag check failed')
      }
      setTagCheck({ existing: (data.existing || []).map((t: { id: string; name: string }) => t.name), missing: data.missing || [] })
      return data
    } catch (e) {
      console.error('[BulkUploadDialog] verifyTags: caught', e)
      throw e
    } finally {
      setVerifyingTags(false)
    }
  }

  const createTags = async () => {
    const missing = tagCheck?.missing || []
    if (!missing.length) return
    const res = await fetch(`/api/proxy/workspaces/${workspaceId}/tags/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, tagNames: missing }) })
    const data = await res.json() as { error?: string }
    if (!res.ok) throw new Error(data.error || 'Tag create failed')
    await verifyTags()
    return data
  }

  if (!open) return null;
  const stepTitles = ['Upload', 'Projects', 'Tasks', 'Tags', 'Preview']
  const stepDescriptions: Record<number, string> = {
    1: 'Select a CSV file. Required headers: description, start, end. Optional: projectName/projectId, taskName, tags, billable.',
    2: 'Verify that referenced projects exist in the workspace.',
    3: 'Verify tasks across projects. Create missing tasks if needed.',
    4: 'Verify tags. Create missing tags if needed.',
    5: 'Preview normalized entries before populating/uploading.'
  }

  const progressPercent = Math.round(((step - 1) / (stepTitles.length - 1)) * 100)

  const renderStepper = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {stepTitles.map((title, i) => {
          const idx = i + 1
          const completed = idx < step
          const active = idx === step
          const badge = (() => {
            if (idx === 1) return rows.length ? `${rows.length}` : undefined
            if (idx === 2) return projectCheck ? String(projectCheck.missing.length || 0) : undefined
            if (idx === 3) return Object.keys(taskCheck).length ? String(Object.values(taskCheck).reduce((a, v) => a + (v.missing?.length || 0), 0)) : undefined
            if (idx === 4) return tagCheck ? String(tagCheck.missing.length || 0) : undefined
            return undefined
          })()
          return (
            <div key={title} className="flex items-center gap-3">
              <div className={"flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium " + (completed ? 'bg-green-600 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                {completed ? '✓' : idx}
              </div>
              <div className="hidden md:block text-sm " aria-current={active ? 'step' : undefined}>
                <div className={active ? 'font-semibold flex items-center gap-2' : 'text-muted-foreground flex items-center gap-2'}>
                  <span>{title}</span>
                  {typeof badge !== 'undefined' && (
                    <span className={"inline-flex items-center justify-center h-5 px-2 rounded-full text-xs " + ((idx === 2 || idx === 3 || idx === 4) && Number(badge) > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground')}>
                      {badge}
                    </span>
                  )}
                </div>
              </div>
              {i < stepTitles.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          )
        })}
      </div>
      <div className="w-full bg-border rounded h-1 overflow-hidden">
        <div className="h-1 bg-primary" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="text-sm text-muted-foreground">{stepDescriptions[step]}</div>
    </div>
  )
  // Step UI rendering helpers
  const allTasksMissingCount = Object.values(taskCheck).reduce((acc, v) => acc + (v?.missing?.length || 0), 0)
  const allTasksOK = Object.values(taskCheck).length > 0 && allTasksMissingCount === 0

  const renderStepControls = () => {
    const left: ReactNode[] = []
    const right: ReactNode[] = []

    if (step > 1) {
      left.push(
        <Button key="back" onClick={() => {
          if (step === 2) setStep(1)
          if (step === 3) { setTaskCheck({}); setStep(2) }
          if (step === 4) setStep(3)
        }}>Back</Button>
      )
    } else {
      left.push(
        <Button key="cancel" variant="secondary" onClick={onClose}>Cancel</Button>
      )
    }

    if (step === 1) {
      right.push(
        <Button key="next" onClick={async () => { try { await verifyProjects(); setStep(2) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }} disabled={rows.length === 0 || missingHeaders.length > 0}>
          {verifyingProjects ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Next: Verify Projects'}
        </Button>
      )
    }

    if (step === 2) {
      right.push(
        <Button key="reverify" onClick={reverifyProjects}>
          {verifyingProjects ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reverify'}
        </Button>
      )
      right.push(
        <Button key="toTasks" onClick={async () => {
          try {
            const projectsToCheck = projectCheck ? projectCheck.existing.map(p => p.name) : extractProjectNames(rows)
            for (const p of projectsToCheck) {
              const projectId = projectsMap[p.toLowerCase().trim()]
              await verifyTasksForProject(p, projectId)
            }
            setStep(3)
          } catch (e) { setToast({ type: 'error', message: (e as Error).message }) }
        }}>
          Next: Verify Tasks
        </Button>
      )
    }

    if (step === 3) {
      right.push(
        <Button key="reverifyTasks" onClick={refreshAllTasks}>
          {verifyingAllTasks ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reverify'}
        </Button>
      )
      const anyMissingTasks = Object.values(taskCheck).some(v => (v.missing?.length || 0) > 0)
      if (anyMissingTasks) {
        right.push(
          <Button key="createMissingTasks" onClick={async () => { try { await createAllMissingTasks(); setToast({ type: 'success', message: 'Tasks created' }); } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>
            Create missing tasks
          </Button>
        )
      }
      right.push(
        <Button key="toTags" onClick={async () => { try { await verifyTags(); setStep(4) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>
          Next: Verify Tags
        </Button>
      )
    }

    if (step === 4) {
      right.push(
        <Button key="reverifyTags" onClick={async () => { try { await verifyTags(); } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>
          {verifyingTags ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reverify'}
        </Button>
      )
      if (tagCheck && tagCheck.missing.length > 0) {
        right.push(
          <Button key="createMissingTags" onClick={async () => { try { await createTags(); setToast({ type: 'success', message: 'Tags created' }) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>
            Create missing tags
          </Button>
        )
      }
      right.push(
        <Button key="toPreview" onClick={() => setStep(5)}>
          Next: Preview
        </Button>
      )
    }

    if (step === 5) {
      right.push(
        <Button key="populate" onClick={handleUpload}>
          {uploading ? 'Uploading...' : (typeof onPopulate === 'function' ? 'Populate to Dashboard' : 'Proceed to Upload')}
        </Button>
      )
    }

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">{left}</div>
        <div className="flex gap-2">{right}</div>
      </div>
    )
  }

  return (
    <Sheet onClick={onClose}>
      <div
        className="bg-background rounded-lg w-[98vw] max-w-4xl flex flex-col gap-4 p-6 shadow-xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Bulk Upload CSV</h2>
            <div className="text-sm text-muted-foreground">A guided, step-by-step assistant to verify and upload many time entries at once.</div>
          </div>
          <div className="md:w-1/2">{renderStepper()}</div>
        </div>

        <div className="pt-2">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="mb-2 md:mb-0"
                onChange={handleFile}
                disabled={parsing || uploading}
                aria-label="Upload CSV file"
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
          )}
        </div>
        {rows.length > 0 && step === 1 && (
          <div className="overflow-x-auto max-h-64 mb-2 border rounded">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 text-xs border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="font-medium">File:</span>
                <span className="text-muted-foreground">{fileName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span><span className="font-medium">Rows:</span> {rows.length}</span>
                <span className={missingHeaders.length ? 'text-red-700' : 'text-green-700'}>
                  {missingHeaders.length ? `Missing headers: ${missingHeaders.join(', ')}` : 'All required headers present'}
                </span>
              </div>
            </div>
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
        {/* Step controls moved to footer */}

        {/* Step detail panels */}
        {step === 2 && projectCheck && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Project verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="p-2 border rounded bg-background">
                <div className="text-sm font-medium mb-1">Existing ({projectCheck.existing.length})</div>
                {projectCheck.existing.length ? (
                  <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">
                    {projectCheck.existing.map(p => <li key={p.id}>{p.name}</li>)}
                  </ul>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
              <div className="p-2 border rounded bg-background">
                <div className="text-sm font-medium mb-1">Missing ({projectCheck.missing.length})</div>
                {projectCheck.missing.length ? (
                  <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">
                    {projectCheck.missing.map(p => <li key={p}>{p}</li>)}
                  </ul>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Task verification</h3>
            {Object.keys(taskCheck).length === 0 ? <p className="text-sm">No tasks verified yet. Use Reverify to fetch status.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="p-2 border rounded bg-background">
                  <div className="text-sm font-medium mb-1">Existing ({Array.from(new Set(Object.values(taskCheck).flatMap(v => v.existing || []))).length})</div>
                  {(() => { const list = Array.from(new Set(Object.values(taskCheck).flatMap(v => v.existing || []))); return list.length ? (
                    <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">{list.map(t => <li key={t}>{t}</li>)}</ul>
                  ) : <div className="text-sm text-muted-foreground">None</div> })()}
                </div>
                <div className="p-2 border rounded bg-background">
                  <div className="text-sm font-medium mb-1">Missing ({Array.from(new Set(Object.values(taskCheck).flatMap(v => v.missing || []))).length})</div>
                  {(() => { const list = Array.from(new Set(Object.values(taskCheck).flatMap(v => v.missing || []))); return list.length ? (
                    <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">{list.map(t => <li key={t}>{t}</li>)}</ul>
                  ) : <div className="text-sm text-muted-foreground">None</div> })()}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && tagCheck && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Tag verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="p-2 border rounded bg-background">
                <div className="text-sm font-medium mb-1">Existing ({tagCheck.existing.length})</div>
                {tagCheck.existing.length ? (
                  <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">{tagCheck.existing.map(t => <li key={t}>{t}</li>)}</ul>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
              <div className="p-2 border rounded bg-background">
                <div className="text-sm font-medium mb-1">Missing ({tagCheck.missing.length})</div>
                {tagCheck.missing.length ? (
                  <ul className="text-sm list-disc pl-5 max-h-40 overflow-auto">{tagCheck.missing.map(t => <li key={t}>{t}</li>)}</ul>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Preview entries (first 10)</h3>
            <div className="overflow-x-auto max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Project (resolved id)</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getNormalizedEntries().slice(0, 10).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{String(e.description ?? '')}</TableCell>
                      <TableCell>{String(e.start ?? '')}</TableCell>
                      <TableCell>{String(e.end ?? '')}</TableCell>
                      <TableCell>{String((e.projectId ?? projectsMap[(String(e.projectName || '')).toLowerCase().trim()]) || '')}</TableCell>
                      <TableCell>{String(e.taskName ?? '')}</TableCell>
                      <TableCell>{Array.isArray(e.tags) ? (e.tags as string[]).join(', ') : String(e.tags ?? '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Showing 10 of {rows.length} rows.</div>
          </div>
        )}
        {toast && (
          <Toast open={!!toast} onClose={() => setToast(null)} duration={4000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {toast.message}
          </Toast>
        )}
        <div className="sticky bottom-0 left-0 right-0 -mx-6 mt-4 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-4 flex justify-end">
            {renderStepControls()}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

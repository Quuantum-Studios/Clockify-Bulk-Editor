"use client"
import { useRef, useState } from "react"
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
}

export function BulkUploadDialog({ open, onClose, workspaceId, apiKey, userId, onSuccess, onPopulate }: BulkUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  type CSVRow = Record<string, string | string[] | undefined>
  const [rows, setRows] = useState<CSVRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [verifyingProjects, setVerifyingProjects] = useState(false)
  const [verifyingAllTasks, setVerifyingAllTasks] = useState(false)
  const [verifyingTags, setVerifyingTags] = useState(false)
  const [step, setStep] = useState<1|2|3|4>(1)
  const [projectCheck, setProjectCheck] = useState<{ existing: { id: string; name: string }[]; missing: string[] } | null>(null)
  const [projectsMap, setProjectsMap] = useState<Record<string, string | undefined>>({})
  const [taskCheck, setTaskCheck] = useState<Record<string, { existing: string[]; missing: string[] }>>({})
  const [tagCheck, setTagCheck] = useState<{ existing: string[]; missing: string[] } | null>(null)
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
        const data = await res.json()
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

  // API calls for checks
  const verifyProjects = async () => {
    try {
      setVerifyingProjects(true)
      const projectNames = extractProjectNames(rows)
      const res = await fetch(`/api/proxy/workspaces/${workspaceId}/projects/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, projectNames }) })
      const data = await res.json()
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
      const data = await res.json()
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
    const data = await res.json()
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
            const pd = await projectRes.json()
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
      const data = await res.json()
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
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Tag create failed')
    await verifyTags()
    return data
  }

  if (!open) return null;
  const stepTitles = ['Upload', 'Projects', 'Tasks', 'Tags & Preview']
  const stepDescriptions: Record<number, string> = {
    1: 'Select a CSV file. The file must have headers matching Clockify fields (description, start, end, projectName, taskName, tags, billable).',
    2: 'Verify that referenced projects exist in the workspace. Missing projects must be created before continuing.',
    3: 'Verify tasks for each project. You can create any missing tasks automatically here.',
    4: 'Verify tags, review a preview of the first 10 entries, then upload or populate the dashboard.'
  }

  const progressPercent = Math.round(((step - 1) / (stepTitles.length - 1)) * 100)

  const renderStepper = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {stepTitles.map((title, i) => {
          const idx = i + 1
          const completed = idx < step
          const active = idx === step
          return (
            <div key={title} className="flex items-center gap-3">
              <div className={"flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium " + (completed ? 'bg-green-600 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                {completed ? '✓' : idx}
              </div>
              <div className="hidden md:block text-sm " aria-current={active ? 'step' : undefined}>
                <div className={active ? 'font-semibold' : 'text-muted-foreground'}>{title}</div>
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
    if (step === 1) {
      return (
        <div className="flex gap-2 justify-end mt-2">
          <Button onClick={async () => { try { await verifyProjects(); setStep(2) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }} disabled={rows.length === 0}>{verifyingProjects ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Next: Verify Projects'}</Button>
        </div>
      )
    }
    if (step === 2) {
      return (
        <div className="flex gap-2 justify-end mt-2">
          <Button onClick={reverifyProjects}>{verifyingProjects ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reverify'}</Button>
          <Button onClick={async () => { if (!projectCheck && typeof onPopulate !== 'function') { setToast({ type: 'error', message: 'Run verification first' }); return } if (projectCheck && projectCheck.missing.length > 0 && typeof onPopulate !== 'function') { setToast({ type: 'error', message: 'Please create missing projects first' }); return } setStep(3) }} disabled={typeof onPopulate === 'function' ? false : (!projectCheck || projectCheck.missing.length > 0)}>Proceed to Tasks</Button>
        </div>
      )
    }
    if (step === 3) {
      return (
        <div className="flex gap-2 justify-end mt-2">
          <Button onClick={() => { setTaskCheck({}); setStep(2) }}>Back</Button>
          <Button onClick={async () => {
            try {
              const projectsToCheck = projectCheck ? projectCheck.existing.map(p => p.name) : extractProjectNames(rows)
              for (const p of projectsToCheck) {
                const projectId = projectsMap[p.toLowerCase().trim()]
                await verifyTasksForProject(p, projectId)
              }
            } catch (e) { setToast({ type: 'error', message: (e as Error).message }) }
          }}>{verifyingAllTasks ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify Tasks'}</Button>
          <Button onClick={async () => {
            // allow proceeding only when tasks have been checked and no missing tasks remain
            if (Object.keys(taskCheck).length === 0 && typeof onPopulate !== 'function') {
              setToast({ type: 'error', message: 'Please verify tasks first' })
              return
            }
            if (!allTasksOK && typeof onPopulate !== 'function') {
              setToast({ type: 'error', message: 'Some tasks are missing. Create or refresh tasks before proceeding.' })
              return
            }
            setStep(4)
          }} disabled={!allTasksOK}>Proceed to Tags</Button>
        </div>
      )
    }
    if (step === 4) {
      const finalDisabled = typeof onPopulate === 'function'
        ? false
        : !(projectCheck && projectCheck.missing.length === 0 && (tagCheck && tagCheck.missing.length === 0) && allTasksOK)
      return (
        <div className="flex gap-2 justify-end mt-2">
          <Button onClick={() => setStep(3)}>Back</Button>
          <Button onClick={async () => { try { await verifyTags(); } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>{verifyingTags ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (tagCheck && tagCheck.missing.length ? 'Refresh Tags' : 'Verify Tags')}</Button>
          <Button onClick={handleUpload} disabled={finalDisabled}>{uploading ? 'Uploading...' : (typeof onPopulate === 'function' ? 'Populate to Dashboard' : 'Proceed to Upload')}</Button>
        </div>
      )
    }
    return null
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
        {/* Step controls */}
        <div className="mt-2">{renderStepControls()}</div>

        {/* Step detail panels */}
        {step === 2 && projectCheck && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Project verification</h3>
            {projectCheck.missing.length > 0 ? (
              <div>
                <p className="text-sm">The following projects are missing. Please create them first (manually), then click Reverify.</p>
                <ul className="list-disc pl-5 mt-2">
                  {projectCheck.missing.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm">All projects exist.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Task verification</h3>
            {Object.keys(taskCheck).length === 0 ? <p className="text-sm">No tasks verified yet. Click Verify Tasks.</p> : (
              <div className="space-y-2">
                {Object.entries(taskCheck).map(([proj, chk]) => (
                  <div key={proj} className="p-2 border rounded">
                    <strong>{proj}</strong>
                    {chk.missing.length > 0 ? (
                      <div>
                        <p className="text-sm">Missing tasks:</p>
                        <ul className="list-disc pl-5">
                          {chk.missing.map(t => <li key={t}>{t}</li>)}
                        </ul>
                      </div>
                    ) : <p className="text-sm">All tasks exist for this project.</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button onClick={async () => { try { await createAllMissingTasks(); setToast({ type: 'success', message: 'Tasks created' }); } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>Create missing tasks</Button>
              <Button onClick={refreshAllTasks}>Refresh</Button>
            </div>
          </div>
        )}

        {step === 4 && tagCheck && (
          <div className="p-3 border rounded bg-muted">
            <h3 className="font-medium">Tag verification</h3>
            {tagCheck.missing.length > 0 ? (
              <div>
                <p className="text-sm">Missing tags:</p>
                <ul className="list-disc pl-5">
                  {tagCheck.missing.map(t => <li key={t}>{t}</li>)}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button onClick={async () => { try { await createTags(); setToast({ type: 'success', message: 'Tags created' }) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>Create missing tags</Button>
                  <Button onClick={async () => { try { await verifyTags(); setToast({ type: 'success', message: 'Tags refreshed' }) } catch (e) { setToast({ type: 'error', message: (e as Error).message }) } }}>Refresh</Button>
                </div>
              </div>
            ) : <p className="text-sm">All tags exist.</p>}
          </div>
        )}
        {step === 4 && (
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
          </div>
        )}
        {toast && (
          <Toast open={!!toast} onClose={() => setToast(null)} duration={4000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {toast.message}
          </Toast>
        )}
      </div>
    </Sheet>
  )
}

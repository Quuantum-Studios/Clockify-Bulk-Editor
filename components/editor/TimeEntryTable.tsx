"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select } from "../ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { TagSelector } from "../TagSelector"
import { Calendar, DollarSign, RotateCcw, Save, Trash2, XCircle } from "lucide-react"
import { TimeEntry, Task } from "../../lib/store"

interface TimeEntryTableProps {
  timeEntries: TimeEntry[]
  projects: { id: string; name: string }[]
  tasks: Record<string, Task[]>
  tags: { id: string; name: string }[]
  
  editing: Record<string, Partial<TimeEntry>>
  modifiedRows: Set<string>
  savingRows: Set<string>
  
  selectionMode: boolean
  selectedIds: Set<string>
  
  createTaskState: Record<string, { showCreate: boolean; name: string; loading: boolean }>
  
  onSelectAll: () => void
  onSelectOne: (id: string) => void
  
  onEdit: (id: string, field: keyof TimeEntry | 'tags' | 'taskName', value: unknown) => void
  onSaveRow: (entry: TimeEntry) => void
  onDeleteRow: (entry: TimeEntry) => void
  onUndoEdits: (id: string) => void
  onRemoveRow: (id: string) => void
  
  onCreateTag: (name: string) => Promise<{ id: string; name: string }>
  onFetchTasksForProject: (projectId: string) => void
  
  onCreateTask: (entryId: string, projectId?: string) => void
  onToggleCreateTaskUI: (entryId: string, show: boolean) => void
  onSetCreateTaskName: (entryId: string, name: string) => void
}

export function TimeEntryTable({
  timeEntries,
  projects,
  tasks,
  tags,
  editing,
  modifiedRows,
  savingRows,
  selectionMode,
  selectedIds,
  createTaskState,
  onSelectAll,
  onSelectOne,
  onEdit,
  onSaveRow,
  onDeleteRow,
  onUndoEdits,
  onRemoveRow,
  onCreateTag,
  onFetchTasksForProject,
  onCreateTask,
  onToggleCreateTaskUI,
  onSetCreateTaskName
}: TimeEntryTableProps) {
  const [timeEditOpen, setTimeEditOpen] = useState<Record<string, { start: boolean; end: boolean }>>({})
  const [projectTaskEditOpen, setProjectTaskEditOpen] = useState<Record<string, boolean>>({})
  const [tagsEditOpen, setTagsEditOpen] = useState<Record<string, boolean>>({})
  const [descriptionEditOpen, setDescriptionEditOpen] = useState<Record<string, boolean>>({})

  const timeEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const projectTaskEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tagsEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const descriptionEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const toggleTimeEditor = (entryId: string, field: 'start' | 'end', open?: boolean) => {
    setTimeEditOpen(prev => {
      const cur = prev[entryId] || { start: false, end: false }
      const next = { ...cur, [field]: typeof open === 'boolean' ? open : !cur[field] }
      return { ...prev, [entryId]: next }
    })
  }

  // Close inline editors when clicking outside
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const targetNode = e.target as Node
      
      // Time editors
      Object.keys(timeEditorRefs.current).forEach(id => {
        if (timeEditOpen[id]?.start || timeEditOpen[id]?.end) {
          const el = timeEditorRefs.current[id]
          if (el && !el.contains(targetNode)) {
             // Do not close if interact with date picker provided by browser? 
             // Actually, click outside logic for simple container check is fine.
             setTimeEditOpen(prev => ({ ...prev, [id]: { start: false, end: false } }))
          }
        }
      })

      // Project/Task editors
      Object.keys(projectTaskEditorRefs.current).forEach(id => {
        if (projectTaskEditOpen[id]) {
          const el = projectTaskEditorRefs.current[id]
          if (el && !el.contains(targetNode)) {
            setProjectTaskEditOpen(prev => ({ ...prev, [id]: false }))
            // Reset task create UI if open
            if (createTaskState[id]?.showCreate) {
              onToggleCreateTaskUI(id, false)
            }
          }
        }
      })

      // Tags editors
      Object.keys(tagsEditorRefs.current).forEach(id => {
        if (tagsEditOpen[id]) {
          const el = tagsEditorRefs.current[id]
          if (el && !el.contains(targetNode)) {
            setTagsEditOpen(prev => ({ ...prev, [id]: false }))
          }
        }
      })

       // Description editors
       Object.keys(descriptionEditorRefs.current).forEach(id => {
        if (descriptionEditOpen[id]) {
          const el = descriptionEditorRefs.current[id]
          if (el && !el.contains(targetNode)) {
            setDescriptionEditOpen(prev => ({ ...prev, [id]: false }))
          }
        }
      })
    }

    document.addEventListener("mousedown", handleDocClick)
    return () => document.removeEventListener("mousedown", handleDocClick)
  }, [timeEditOpen, projectTaskEditOpen, tagsEditOpen, descriptionEditOpen, createTaskState, onToggleCreateTaskUI])

  const areAllSelected = timeEntries.length > 0 && selectedIds.size === timeEntries.length

  return (
    <Table className="entries-table w-full min-w-[1000px]">
      <TableHeader>
        <TableRow>
          {selectionMode && (
            <TableHead className="w-12 text-center sticky left-0 z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
              <input type="checkbox" checked={areAllSelected} onChange={onSelectAll} className="cursor-pointer w-4 h-4" />
            </TableHead>
          )}
          <TableHead className={`w-12 text-center sticky ${selectionMode ? "left-12" : "left-0"} z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}></TableHead>
          <TableHead className="min-w-[200px] max-w-[300px]">Description</TableHead>
          <TableHead className="min-w-[200px] max-w-[280px] whitespace-nowrap">Time (UTC)</TableHead>
          <TableHead className="min-w-[250px] max-w-[420px]">Project / Task</TableHead>
          <TableHead className="min-w-[100px] max-w-[150px]">Tags</TableHead>
          <TableHead className="text-center w-[180px] whitespace-nowrap sticky right-0 z-20 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.1)]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timeEntries.map(entry => {
          const editingEntry = (editing[entry.id] || {}) as Record<string, unknown>;
          const timeInterval = (entry as unknown as { timeInterval?: { start?: string; end?: string } }).timeInterval;
          const tiStart = timeInterval?.start;
          const tiEnd = timeInterval?.end;
          const taskName = (editing[entry.id]?.taskName as string | undefined) ?? (entry.taskName ?? "");

          // Get task name from taskId if taskName is not available
          let resolvedTaskName = taskName;
          const entryTyped = entry as TimeEntry;
          if (!resolvedTaskName && entryTyped.taskId) {
            const projectTasks = (tasks[entryTyped.projectId || ""] || []) as Task[];
            const task = projectTasks.find((t) => t.id === entryTyped.taskId);
            resolvedTaskName = task?.name || "";
          }
          let tagLabels: string[] = [];
          if (editing[entry.id]?.tags) {
            tagLabels = editing[entry.id]?.tags as string[];
          } else if (entry.tags) {
            tagLabels = entry.tags as string[];
          } else if ((entry as unknown as { tagIds?: string[] }).tagIds && Array.isArray((entry as unknown as { tagIds?: string[] }).tagIds)) {
            tagLabels = ((entry as unknown as { tagIds?: string[] }).tagIds || []).map((id: string) => tags.find(t => t.id === id)?.name || id);
          }
          const rowStart = (editing[entry.id]?.start as string | undefined) ?? tiStart ?? entry.start
          const rowEnd = (editing[entry.id]?.end as string | undefined) ?? tiEnd ?? entry.end
          const hasStart = !!rowStart
          const startDate = rowStart ? new Date(rowStart) : null
          const endDate = rowEnd ? new Date(rowEnd) : null
          const timeError = startDate && endDate ? startDate.getTime() >= endDate.getTime() : false
          const rowHasErrors = !hasStart || timeError
          const isBillable = (editingEntry.billable !== undefined ? Boolean(editingEntry.billable) : Boolean(entry.billable))
          return (
            <TableRow key={entry.id} className={`entries-table-row ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : ""} ${rowHasErrors ? "border border-red-200" : ""} relative`}>
              {selectionMode && (
                <TableCell data-label="Select" className={`text-center w-12 sticky left-0 z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-r border-gray-200 dark:border-gray-700`}>
                  <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => onSelectOne(entry.id)} className="cursor-pointer w-4 h-4" />
                </TableCell>
              )}
              <TableCell data-label="Billable" className={`text-center p-2 w-12 sticky ${selectionMode ? "left-12" : "left-0"} z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-r border-gray-200 dark:border-gray-700`}>
                <button
                  type="button"
                  onClick={() => onEdit(entry.id, 'billable', !isBillable)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${isBillable ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  title={isBillable ? 'Billable (click to mark non-billable)' : 'Non-billable (click to mark billable)'}
                  aria-label={isBillable ? 'Toggle to non-billable' : 'Toggle to billable'}
                >
                  <DollarSign className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell data-label="Description" className="overflow-hidden min-w-[200px] max-w-[300px]" ref={el => { descriptionEditorRefs.current[entry.id] = el }}>
                {descriptionEditOpen[entry.id] ? (
                  <Input
                    value={editingEntry.description !== undefined ? String(editingEntry.description) : (entry.description ?? "")}
                    onChange={e => onEdit(entry.id, "description", e.target.value)}
                    onBlur={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: false }))}
                    className="w-full min-w-0 cursor-text text-xs h-7"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="text-xs text-gray-700 dark:text-gray-200 hover:underline w-full text-left cursor-pointer min-h-[20px] break-words"
                    onClick={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                    title="Edit description"
                  >
                    {(() => {
                      const desc = editingEntry.description !== undefined 
                        ? String(editingEntry.description) 
                        : (entry.description ?? "")
                      return desc.trim() || 'No description'
                    })()}
                  </button>
                )}
              </TableCell>
              <TableCell data-label="Time (UTC)" className="whitespace-nowrap overflow-hidden min-w-[200px] max-w-[280px]" ref={el => { timeEditorRefs.current[entry.id] = el }}>
                {(() => {
                  const open = timeEditOpen[entry.id] || { start: false, end: false }
                  const startVal = editingEntry.start
                    ? (typeof editingEntry.start === "string" ? editingEntry.start.slice(0, 16) : "")
                    : (tiStart
                      ? new Date(tiStart).toISOString().slice(0, 16)
                      : (entry.start ? new Date(entry.start).toISOString().slice(0, 16) : "")
                    )
                  const endVal = editingEntry.end
                    ? (typeof editingEntry.end === "string" ? editingEntry.end.slice(0, 16) : "")
                    : (tiEnd
                      ? new Date(tiEnd).toISOString().slice(0, 16)
                      : (entry.end ? new Date(entry.end).toISOString().slice(0, 16) : "")
                    )
                  const displayStart = startVal ? startVal.replace('T', ' ') : ""
                  const displayEnd = endVal ? endVal.replace('T', ' ') : ""
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Start */}
                      {open.start ? (
                        <Input
                          type="datetime-local"
                          className="w-[130px] cursor-text text-xs h-7"
                          value={startVal}
                          onChange={e => onEdit(entry.id, "start", e.target.value)}
                          onBlur={() => toggleTimeEditor(entry.id, 'start', false)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                          onClick={() => toggleTimeEditor(entry.id, 'start', true)}
                          title="Edit start"
                        >{displayStart || '—'}</button>
                      )}
                      <span className="text-muted-foreground text-xs">→</span>
                      {/* End */}
                      {open.end ? (
                        <Input
                          type="datetime-local"
                          className="w-[130px] cursor-text text-xs h-7"
                          value={endVal}
                          onChange={e => onEdit(entry.id, "end", e.target.value)}
                          onBlur={() => toggleTimeEditor(entry.id, 'end', false)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                          onClick={() => toggleTimeEditor(entry.id, 'end', true)}
                          title="Edit end"
                        >{displayEnd || '—'}</button>
                      )}
                      <Button
                        type="button"
                        className="h-7 w-7 p-0 rounded-full bg-transparent cursor-pointer"
                        onClick={() => setTimeEditOpen(prev => ({ ...prev, [entry.id]: { start: true, end: true } }))}
                        title="Open date editors"
                        aria-label="Open date editors"
                      >
                        <Calendar className="h-3.5 w-3.5 text-blue-700" />
                      </Button>
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell data-label="Project / Task" className="overflow-hidden min-w-[250px] max-w-[420px]" ref={el => { projectTaskEditorRefs.current[entry.id] = el }}>
                {(() => {
                  const entryProjectId = String(editingEntry.projectId ?? entry.projectId ?? "")
                  const projectObj = Array.isArray(projects) ? projects.find((p: { id: string; name: string }) => p.id === entryProjectId) : null
                  const projectLabel = projectObj?.name || "None"
                  const taskIdSelected = (editingEntry.taskId !== undefined ? (editingEntry.taskId as string) : (entry as TimeEntry).taskId) || ""
                  const taskList = (tasks && tasks[entryProjectId] || []) as Task[]
                  const taskObj = taskList.find(t => t.id === taskIdSelected)
                  const taskLabel = (editingEntry.taskName as string) || taskObj?.name || (entry as TimeEntry).taskName || "None"
                  const isOpen = !!projectTaskEditOpen[entry.id]
                  const state = createTaskState[entry.id] || { showCreate: false, name: "", loading: false }
                  if (!isOpen) {
                    return (
                      <button
                        type="button"
                        className="text-xs text-gray-700 dark:text-gray-200 hover:underline break-words cursor-pointer"
                        onClick={() => {
                          setProjectTaskEditOpen(prev => ({ ...prev, [entry.id]: true }))
                          // Lazy load tasks for this entry's project if not already loaded
                          if (entryProjectId) {
                            onFetchTasksForProject(entryProjectId)
                          }
                        }}
                        title="Edit project and task"
                      >{projectLabel}{taskLabel && taskLabel !== 'None' ? ` • ${taskLabel}` : ''}</button>
                    )
                  }
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Select
                        value={entryProjectId}
                        onChange={e => {
                          const newProjectId = e.target.value
                          onEdit(entry.id, "projectId", newProjectId)
                          // Lazy load tasks for the newly selected project
                          if (newProjectId) {
                            onFetchTasksForProject(newProjectId)
                          }
                        }}
                        className="w-full sm:w-[150px] text-xs h-8 leading-tight py-1.5 cursor-pointer"
                        title={projectLabel}
                      >
                        <option value="">None</option>
                        {Array.isArray(projects) ? projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        )) : null}
                      </Select>
                      <Select
                        value={taskIdSelected}
                        onChange={e => {
                          const v = e.target.value
                          if (v === "__create_new__") {
                            onToggleCreateTaskUI(entry.id, true)
                          } else {
                            onEdit(entry.id, "taskId", v)
                            const t = taskList.find((tt) => tt.id === v)
                            onEdit(entry.id, "taskName", t ? t.name : "")
                          }
                        }}
                        className="w-full sm:w-[150px] text-xs h-8 leading-tight py-1.5 cursor-pointer"
                        title={taskLabel}
                      >
                        <option value="">None</option>
                        {Array.isArray(taskList) && taskList.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        <option value="__create_new__">Create new...</option>
                      </Select>                                
                      {state.showCreate && (
                        <div className="w-full mt-1 flex gap-1.5">
                          <Input value={state.name} onChange={e => onSetCreateTaskName(entry.id, e.target.value)} placeholder="New task name" className="cursor-text text-xs h-7 flex-1" />
                          <Button onClick={() => onCreateTask(entry.id, entryProjectId)} disabled={state.loading} className="cursor-pointer text-xs h-7 px-2">{state.loading ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create'}</Button>
                          <Button className="bg-transparent text-xs h-7 px-2 cursor-pointer" onClick={() => onToggleCreateTaskUI(entry.id, false)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell data-label="Tags" className="min-w-[100px] max-w-[150px] overflow-visible" ref={el => { tagsEditorRefs.current[entry.id] = el }}>
                {tagsEditOpen[entry.id] ? (
                  <TagSelector
                    selectedTags={tagLabels}
                    availableTags={tags}
                    onChange={(newTags) => onEdit(entry.id, "tags", newTags)}
                    onCreateTag={onCreateTag}
                    placeholder="Select tags..."
                    className="w-full text-xs h-7 cursor-pointer"
                  />
                ) : (
                  <button
                    type="button"
                    className="text-xs text-gray-700 dark:text-gray-200 hover:underline cursor-pointer"
                    onClick={() => setTagsEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                    title="Edit tags"
                  >{tagLabels && tagLabels.length > 0 ? tagLabels.join(", ") : 'No tags'}</button>
                )}
              </TableCell>
              <TableCell data-label="Actions" className={`entries-table-actions flex items-center gap-2 w-[180px] text-center justify-center sticky right-0 z-10 ${modifiedRows.has(entry.id) ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-white dark:bg-gray-900"} border-l border-gray-200 dark:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.1)]`}>
                <Button
                  onClick={() => onSaveRow(entry)}
                  disabled={!modifiedRows.has(entry.id)}
                  className={`h-8 w-8 p-0 rounded-full cursor-pointer ${modifiedRows.has(entry.id) ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-transparent"}`}
                  title="Save"
                  aria-label="Save"
                >
                  {savingRows.has(entry.id)
                    ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Save className="h-4 w-4 text-green-700" />}
                </Button>

                <Button
                  className={`h-8 w-8 p-0 rounded-full bg-transparent cursor-pointer ${modifiedRows.has(entry.id) ? "ring-2 ring-amber-400 bg-amber-50 text-amber-700" : ""}`}
                  onClick={() => onUndoEdits(entry.id)}
                  title="Undo changes"
                  aria-label="Undo changes"
                >
                  <RotateCcw className="h-4 w-4 text-amber-700" />
                </Button>

                {((entry as unknown as { _isNew?: boolean })._isNew) && (
                  <Button
                    className="h-8 w-8 p-0 rounded-full bg-transparent text-red-600 hover:bg-red-50 cursor-pointer"
                    onClick={() => onRemoveRow(entry.id)}
                    title="Remove new row"
                    aria-label="Remove new row"
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                )}

                <Button
                  className="h-8 w-8 p-0 rounded-full bg-transparent text-red-600 hover:bg-red-50 cursor-pointer"
                  onClick={() => onDeleteRow(entry)}
                  disabled={savingRows.has(entry.id)}
                  title="Delete"
                  aria-label="Delete"
                >
                  {savingRows.has(entry.id)
                    ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="h-4 w-4 text-red-600" />}
                </Button>
                {rowHasErrors && (
                  <span className="ml-2 inline-block align-middle text-sm text-red-600" title={`${!hasStart ? 'Start time is missing.' : ''}${timeError ? ' Start must be before End.' : ''}`}>
                    ⚠️
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  )
}

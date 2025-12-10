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
    <Table className="entries-table w-full min-w-[1000px] border-separate border-spacing-0">
      <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TableRow className="hover:bg-transparent">
          {selectionMode && (
            <TableHead className="w-12 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800">
              <input type="checkbox" checked={areAllSelected} onChange={onSelectAll} className="cursor-pointer w-4 h-4 accent-blue-600 rounded" />
            </TableHead>
          )}
          <TableHead className={`w-12 text-center sticky ${selectionMode ? "left-12" : "left-0"} z-20 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800`}></TableHead>
          <TableHead className="min-w-[200px] max-w-[300px] font-medium text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Description</TableHead>
          <TableHead className="min-w-[200px] max-w-[280px] whitespace-nowrap font-medium text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Time (UTC)</TableHead>
          <TableHead className="min-w-[250px] max-w-[420px] font-medium text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Project / Task</TableHead>
          <TableHead className="min-w-[100px] max-w-[150px] font-medium text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Tags</TableHead>
          <TableHead className="text-center w-[180px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-slate-900 border-l border-b border-slate-200 dark:border-slate-800 shadow-[0_0_10px_rgba(0,0,0,0.05)] font-medium text-slate-700 dark:text-slate-200">Actions</TableHead>
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

          // Determine row background for sticky columns
          const isModified = modifiedRows.has(entry.id);
          const rowBgClass = isModified
            ? "bg-amber-50 dark:bg-amber-950/30"
            : "bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50";

          return (
            <TableRow key={entry.id} className={`group transition-colors ${isModified ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"} ${rowHasErrors ? "bg-red-50/50 dark:bg-red-900/10" : ""} border-b border-slate-100 dark:border-slate-800`}>
              {selectionMode && (
                <TableCell data-label="Select" className={`text-center w-12 sticky left-0 z-10 ${rowBgClass} border-r border-slate-100 dark:border-slate-800 p-2`}>
                  <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => onSelectOne(entry.id)} className="cursor-pointer w-4 h-4 accent-blue-600 rounded" />
                </TableCell>
              )}
              <TableCell data-label="Billable" className={`text-center p-2 w-12 sticky ${selectionMode ? "left-12" : "left-0"} z-10 ${rowBgClass} border-r border-slate-100 dark:border-slate-800`}>
                <button
                  type="button"
                  onClick={() => onEdit(entry.id, 'billable', !isBillable)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${isBillable ? 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title={isBillable ? 'Billable (click to mark non-billable)' : 'Non-billable (click to mark billable)'}
                  aria-label={isBillable ? 'Toggle to non-billable' : 'Toggle to billable'}
                >
                  <DollarSign className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell data-label="Description" className="overflow-hidden min-w-[200px] max-w-[300px] p-2" ref={el => { descriptionEditorRefs.current[entry.id] = el }}>
                {descriptionEditOpen[entry.id] ? (
                  <Input
                    value={editingEntry.description !== undefined ? String(editingEntry.description) : (entry.description ?? "")}
                    onChange={e => onEdit(entry.id, "description", e.target.value)}
                    onBlur={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: false }))}
                    className="w-full min-w-0 cursor-text text-sm h-9 bg-white dark:bg-slate-950"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                      className="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 w-full text-left cursor-pointer min-h-[32px] px-2 py-1 rounded hover:bg-white/50 dark:hover:bg-slate-800/50 break-words transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    onClick={() => setDescriptionEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                    title="Edit description"
                  >
                    {(() => {
                      const desc = editingEntry.description !== undefined 
                        ? String(editingEntry.description) 
                        : (entry.description ?? "")
                        return desc.trim() || <span className="text-slate-400 italic">No description</span>
                    })()}
                  </button>
                )}
              </TableCell>
              <TableCell data-label="Time (UTC)" className="whitespace-nowrap overflow-hidden min-w-[200px] max-w-[280px] p-2" ref={el => { timeEditorRefs.current[entry.id] = el }}>
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

                  const TimeButton = ({ children, onClick, title, className }: { children: React.ReactNode, onClick: () => void, title: string, className?: string }) => (
                    <button
                      type="button"
                      className={`text-xs font-mono px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors ${className}`}
                      onClick={onClick}
                      title={title}
                    >
                      {children}
                    </button>
                  );

                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Start */}
                      {open.start ? (
                        <Input
                          type="datetime-local"
                          className="w-[140px] cursor-text text-xs h-8 bg-white dark:bg-slate-950 font-mono"
                          value={startVal}
                          onChange={e => onEdit(entry.id, "start", e.target.value)}
                          onBlur={() => toggleTimeEditor(entry.id, 'start', false)}
                          autoFocus
                        />
                      ) : (
                          <TimeButton onClick={() => toggleTimeEditor(entry.id, 'start', true)} title="Edit start">
                            {displayStart || '—'}
                          </TimeButton>
                      )}
                      <span className="text-slate-400 text-xs">→</span>
                      {/* End */}
                      {open.end ? (
                        <Input
                          type="datetime-local"
                          className="w-[140px] cursor-text text-xs h-8 bg-white dark:bg-slate-950 font-mono"
                          value={endVal}
                          onChange={e => onEdit(entry.id, "end", e.target.value)}
                          onBlur={() => toggleTimeEditor(entry.id, 'end', false)}
                          autoFocus
                        />
                      ) : (
                          <TimeButton onClick={() => toggleTimeEditor(entry.id, 'end', true)} title="Edit end">
                            {displayEnd || '—'}
                          </TimeButton>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-slate-400 hover:text-blue-600"
                        onClick={() => setTimeEditOpen(prev => ({ ...prev, [entry.id]: { start: true, end: true } }))}
                        title="Open date editors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell data-label="Project / Task" className="overflow-hidden min-w-[250px] max-w-[420px] p-2" ref={el => { projectTaskEditorRefs.current[entry.id] = el }}>
                {(() => {
                  const entryProjectId = String(editingEntry.projectId ?? entry.projectId ?? "")
                  const projectObj = Array.isArray(projects) ? projects.find((p: { id: string; name: string }) => p.id === entryProjectId) : null
                  const projectLabel = projectObj?.name || <span className="text-slate-400 italic">No Project</span>
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
                        className={`text-sm ${projectObj ? "text-slate-700 dark:text-slate-200" : "text-slate-400"} hover:text-blue-600 dark:hover:text-blue-400 w-full text-left cursor-pointer min-h-[32px] px-2 py-1 rounded hover:bg-white/50 dark:hover:bg-slate-800/50 break-words transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700`}
                        onClick={() => {
                          setProjectTaskEditOpen(prev => ({ ...prev, [entry.id]: true }))
                          // Lazy load tasks for this entry's project if not already loaded
                          if (entryProjectId) {
                            onFetchTasksForProject(entryProjectId)
                          }
                        }}
                        title="Edit project and task"
                      >
                        <span className="font-medium">{projectLabel}</span>
                        {taskLabel && taskLabel !== 'None' && <span className="text-slate-500 font-normal"> • {taskLabel}</span>}
                      </button>
                    )
                  }
                  return (
                    <div className="flex flex-wrap items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
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
                        className="w-full sm:w-[150px] text-xs h-8 cursor-pointer focus:ring-1"
                        title="Select Project"
                      >
                        <option value="">No Project</option>
                        {Array.isArray(projects) ? projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        )) : null}
                      </Select>
                      <span className="text-slate-300">/</span>
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
                        className="w-full sm:w-[150px] text-xs h-8 cursor-pointer focus:ring-1"
                        title="Select Task"
                      >
                        <option value="">No Task</option>
                        {Array.isArray(taskList) && taskList.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        <option value="__create_new__" className="font-semibold text-blue-600">+ Create new task</option>
                      </Select>                                
                      {state.showCreate && (
                        <div className="w-full flex gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          <Input value={state.name} onChange={e => onSetCreateTaskName(entry.id, e.target.value)} placeholder="Task name" className="cursor-text text-xs h-7 flex-1 bg-white dark:bg-slate-900" autoFocus />
                          <Button onClick={() => onCreateTask(entry.id, entryProjectId)} disabled={state.loading} size="sm" className="h-7 px-2">{state.loading ? '...' : 'Create'}</Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onToggleCreateTaskUI(entry.id, false)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell data-label="Tags" className="min-w-[100px] max-w-[150px] overflow-visible p-2" ref={el => { tagsEditorRefs.current[entry.id] = el }}>
                {tagsEditOpen[entry.id] ? (
                  <TagSelector
                    selectedTags={tagLabels}
                    availableTags={tags}
                    onChange={(newTags) => onEdit(entry.id, "tags", newTags)}
                    onCreateTag={onCreateTag}
                    placeholder="Select tags..."
                    className="w-full text-xs h-8 cursor-pointer"
                  />
                ) : (
                  <button
                    type="button"
                      className="text-xs text-left w-full cursor-pointer min-h-[32px] px-2 py-1 rounded hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    onClick={() => setTagsEditOpen(prev => ({ ...prev, [entry.id]: true }))}
                    title="Edit tags"
                    >
                      {tagLabels && tagLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tagLabels.map(tag => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No tags</span>
                      )}
                    </button>
                )}
              </TableCell>
              <TableCell data-label="Actions" className={`entries-table-actions flex items-center gap-1 w-[180px] p-2 text-center justify-center sticky right-0 z-10 ${rowBgClass} border-l border-slate-100 dark:border-slate-800 shadow-[0_0_10px_rgba(0,0,0,0.05)]`}>
                <Button
                  onClick={() => onSaveRow(entry)}
                  disabled={!modifiedRows.has(entry.id)}
                  size="icon"
                  className={`h-8 w-8 rounded-full transition-all ${modifiedRows.has(entry.id) ? "bg-green-500 text-white hover:bg-green-600 shadow-md transform scale-105" : "bg-transparent text-slate-300 hover:text-slate-500"}`}
                  title={modifiedRows.has(entry.id) ? "Save changes" : "No changes to save"}
                >
                  {savingRows.has(entry.id)
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save className="h-4 w-4" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 rounded-full hover:bg-amber-50 text-slate-400 hover:text-amber-600 ${modifiedRows.has(entry.id) ? "text-amber-500" : ""}`}
                  onClick={() => onUndoEdits(entry.id)}
                  title="Undo changes"
                  aria-label="Undo changes"
                  disabled={!modifiedRows.has(entry.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                {((entry as unknown as { _isNew?: boolean })._isNew) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveRow(entry.id)}
                    title="Remove new row"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDeleteRow(entry)}
                  disabled={savingRows.has(entry.id)}
                  title="Delete entry"
                >
                  {savingRows.has(entry.id)
                    ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </Button>
                {rowHasErrors && (
                  <span className="ml-1 text-red-500 text-lg" title={`${!hasStart ? 'Start time is missing.' : ''}${timeError ? ' Start must be before End.' : ''}`}>
                    •
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

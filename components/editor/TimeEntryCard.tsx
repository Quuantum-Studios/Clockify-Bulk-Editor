"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select } from "../ui/select"
import { TagSelector } from "../TagSelector"
import { TimeEntry, Task } from "../../lib/store"
import { Calendar, Save, RotateCcw, Trash2, XCircle, DollarSign, Clock } from "lucide-react"

interface TimeEntryCardProps {
  entry: TimeEntry
  projects: { id: string; name: string }[]
  tasks: Record<string, Task[]>
  tags: { id: string; name: string }[]
  editing: Record<string, Partial<TimeEntry>>
  isModified: boolean
  isSaving: boolean
  isSelected: boolean
  selectionMode: boolean
  
  onSelect: () => void
  onEdit: (id: string, field: keyof TimeEntry | 'tags' | 'taskName', value: unknown) => void
  onSave: () => void
  onUndo: () => void
  onDelete: () => void
  onRemove: () => void
  
  onCreateTag: (name: string) => Promise<{ id: string; name: string }>
  onFetchTasksForProject: (projectId: string) => void
  
  onCreateTask: (projectId?: string) => void
  createTaskState: { showCreate: boolean; name: string; loading: boolean }
  onSetCreateTaskName: (name: string) => void
  onToggleCreateTaskUI: (show: boolean) => void
}

export function TimeEntryCard({
  entry,
  projects,
  tasks,
  tags,
  editing,
  isModified,
  isSaving,
  isSelected,
  selectionMode,
  onSelect,
  onEdit,
  onSave,
  onUndo,
  onDelete,
  onRemove,
  onCreateTag,
  onFetchTasksForProject,
  onCreateTask,
  createTaskState,
  onSetCreateTaskName,
  onToggleCreateTaskUI
}: TimeEntryCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const editingEntry = editing[entry.id] || {}
  
  // Resolve Values (Edited > Original)
  const description = editingEntry.description !== undefined ? String(editingEntry.description) : (entry.description ?? "")
  
  const entryProjectId = String(editingEntry.projectId ?? entry.projectId ?? "")
  const projectObj = Array.isArray(projects) ? projects.find((p: { id: string, name: string }) => p.id === entryProjectId) : null
  const projectLabel = projectObj?.name || "No Project"
  
  const taskIdSelected = (editingEntry.taskId !== undefined ? (editingEntry.taskId as string) : entry.taskId) || ""
  const taskList = (tasks && tasks[entryProjectId] || []) as Task[]
  const taskObj = taskList.find(t => t.id === taskIdSelected)
  const taskLabel = (editingEntry.taskName as string) || taskObj?.name || entry.taskName || "No Task"
  
  const isBillable = editingEntry.billable !== undefined ? Boolean(editingEntry.billable) : Boolean(entry.billable)
  
  // Time Resolution
  const timeInterval = (entry as unknown as { timeInterval?: { start?: string; end?: string } }).timeInterval
  const startRaw = (editingEntry.start as string) ?? timeInterval?.start ?? entry.start
  const endRaw = (editingEntry.end as string) ?? timeInterval?.end ?? entry.end
  
  const startDate = startRaw ? new Date(startRaw) : null
  const endDate = endRaw ? new Date(endRaw) : null
  
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
  const startDisplay = formatTime(startDate)
  const endDisplay = formatTime(endDate)
  
  const startIso = startRaw ? (typeof startRaw === 'string' ? startRaw.slice(0, 16) : new Date(startRaw).toISOString().slice(0, 16)) : ""
  const endIso = endRaw ? (typeof endRaw === 'string' ? endRaw.slice(0, 16) : new Date(endRaw).toISOString().slice(0, 16)) : ""

  // Tags
  let tagLabels: string[] = []
  if (editingEntry.tags) tagLabels = editingEntry.tags as string[]
  else if (entry.tags) tagLabels = entry.tags as string[]
  else if ((entry as any).tagIds) tagLabels = ((entry as any).tagIds || []).map((id: string) => tags.find(t => t.id === id)?.name || id)

  const isNew = (entry as any)._isNew

  return (
    <div className={`
      bg-white dark:bg-slate-900 rounded-xl border shadow-sm transition-all duration-200
      ${isModified ? 'border-amber-300 dark:border-amber-700 bg-amber-50/10' : 'border-slate-200 dark:border-slate-800'}
      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : ''}
      ${expanded ? 'ring-1 ring-blue-500/50' : ''}
    `}>
      {/* CARD HEADER (Collapsed View) */}
      <div className="p-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start gap-2 mb-2">
          {selectionMode && (
             <div onClick={(e) => { e.stopPropagation(); onSelect(); }} className="mt-0.5 cursor-pointer">
               <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
             </div>
          )}
          <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate flex-1">
             {description || <span className="text-slate-400 italic">No description</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
             <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 ${!startDate ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
               {startDisplay} - {endDisplay}
             </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
           <div className="flex items-center gap-1.5 truncate max-w-[70%]">
             <span className={`w-2 h-2 rounded-full ${projectObj ? 'bg-blue-500' : 'bg-slate-300'}`} />
             <span className="truncate">{projectLabel}</span>
             {taskLabel !== 'No Task' && (
               <>
                <span>•</span>
                <span className="truncate text-slate-400">{taskLabel}</span>
               </>
             )}
           </div>
           {/* Tags count badge if collapsed and tags exist */}
           {!expanded && tagLabels.length > 0 && (
             <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-[10px]">
               {tagLabels.length} tags
             </span>
           )}
        </div>
      </div>

      {/* EXPANDED EDIT VIEW */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
            
            {/* Description Input */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Description</label>
              <Input 
                value={description}
                onChange={e => onEdit(entry.id, 'description', e.target.value)}
                className="h-8 text-sm"
                placeholder="What are you working on?"
              />
            </div>

            {/* Project / Task */}
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Project</label>
                <Select
                  value={entryProjectId}
                  onChange={e => {
                    const pid = e.target.value
                    onEdit(entry.id, 'projectId', pid)
                    if (pid) onFetchTasksForProject(pid)
                  }}
                  className="h-8 text-sm w-full"
                >
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Task</label>
                <Select
                  value={taskIdSelected}
                  onChange={e => {
                     const v = e.target.value
                     if (v === '__create__') onToggleCreateTaskUI(true)
                     else {
                        onEdit(entry.id, 'taskId', v)
                        const t = taskList.find(tt => tt.id === v)
                        onEdit(entry.id, 'taskName', t ? t.name : '')
                     }
                  }}
                  className="h-8 text-sm w-full"
                  disabled={!entryProjectId}
                >
                  <option value="">No Task</option>
                  {taskList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="__create__" className="text-blue-600 font-bold">+ Create Task</option>
                </Select>
                {createTaskState.showCreate && (
                  <div className="mt-2 flex gap-2">
                    <Input value={createTaskState.name} onChange={e => onSetCreateTaskName(e.target.value)} placeholder="New task name" className="h-8 text-sm" />
                    <Button onClick={() => onCreateTask(entryProjectId)} size="sm" className="h-8">Create</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Time & Billable */}
            <div className="flex gap-2">
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Start</label>
                 <Input 
                   type="datetime-local" 
                   value={startIso}
                   onChange={e => onEdit(entry.id, 'start', e.target.value)}
                   className="h-8 text-xs font-mono"
                 />
               </div>
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">End</label>
                 <Input 
                   type="datetime-local" 
                   value={endIso}
                   onChange={e => onEdit(entry.id, 'end', e.target.value)}
                   className="h-8 text-xs font-mono"
                 />
               </div>
               <div className="w-10">
                 <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block text-center">$</label>
                 <button 
                   onClick={() => onEdit(entry.id, 'billable', !isBillable)}
                   className={`w-full h-8 flex items-center justify-center rounded border ${isBillable ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                 >
                   <DollarSign className="w-4 h-4" />
                 </button>
               </div>
            </div>

            {/* Tags */}
            <div>
               <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Tags</label>
               <TagSelector 
                 selectedTags={tagLabels}
                 availableTags={tags}
                 onChange={t => onEdit(entry.id, 'tags', t)}
                 onCreateTag={onCreateTag}
                 className="w-full text-sm min-h-[32px]"
               />
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
               {isNew ? (
                  <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2">
                    <XCircle className="w-4 h-4 mr-1" /> Remove
                  </Button>
               ) : (
                  <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
               )}
               
               <div className="flex gap-2">
                 {isModified && (
                   <Button variant="ghost" size="sm" onClick={onUndo} className="h-8 px-2 text-slate-500">
                     <RotateCcw className="w-4 h-4 mr-1" /> Undo
                   </Button>
                 )}
                 <Button 
                   size="sm" 
                   onClick={onSave} 
                   disabled={!isModified || isSaving}
                   className={`h-8 px-4 ${isModified ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'}`}
                 >
                   {isSaving ? 'Saving...' : 'Save'}
                 </Button>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

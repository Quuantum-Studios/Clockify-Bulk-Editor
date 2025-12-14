"use client"

import { TimeEntry, Task } from "../../lib/store"
import { TimeEntryCard } from "./TimeEntryCard"

interface TimeEntryListProps {
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

export function TimeEntryList({
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
}: TimeEntryListProps) {
  
  if (!timeEntries || timeEntries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-slate-500 dark:text-slate-400">No time entries found.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust filters or create a new entry.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-32 md:pb-24">
      {timeEntries.map((entry, index) => (
        <div key={entry.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
          <TimeEntryCard
            entry={entry}
            projects={projects}
            tasks={tasks}
            tags={tags}
            editing={editing}
            isModified={modifiedRows.has(entry.id)}
            isSaving={savingRows.has(entry.id)}
            isSelected={selectedIds.has(entry.id)}
            selectionMode={selectionMode}

            onSelect={() => onSelectOne(entry.id)}
            onEdit={onEdit}
            onSave={() => onSaveRow(entry)}
            onUndo={() => onUndoEdits(entry.id)}
            onDelete={() => onDeleteRow(entry)}
            onRemove={() => onRemoveRow(entry.id)}

            onCreateTag={onCreateTag}
            onFetchTasksForProject={onFetchTasksForProject}

            createTaskState={createTaskState[entry.id] || { showCreate: false, name: "", loading: false }}
            onCreateTask={(pid) => onCreateTask(entry.id, pid)}
            onToggleCreateTaskUI={(show) => onToggleCreateTaskUI(entry.id, show)}
            onSetCreateTaskName={(name) => onSetCreateTaskName(entry.id, name)}
          />
        </div>
      ))}
    </div>
  )
}

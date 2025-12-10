"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { ProjectSelector } from "../ProjectSelector"
import { DateRangePicker } from "../DateRangePicker"
import { RotateCcw } from "lucide-react"

interface FilterBarProps {
  workspaces: { id: string; name: string }[]
  workspaceId: string
  onWorkspaceChange: (id: string) => void
  projects: { id: string; name: string }[]
  projectIds: string[]
  onProjectsChange: (ids: string[]) => void
  dateRange: { startDate: Date; endDate: Date } | null
  defaultDateRange: { startDate: Date; endDate: Date }
  onDateRangeChange: (range: { startDate: Date; endDate: Date } | null) => void
  onRefresh: () => void
  refreshing: boolean
  onManageTags: () => void
  onManageTasks: () => void
}

export function FilterBar({
  workspaces,
  workspaceId,
  onWorkspaceChange,
  projects,
  projectIds,
  onProjectsChange,
  dateRange,
  defaultDateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onManageTags,
  onManageTasks
}: FilterBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Close date picker when clicking outside
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const targetNode = e.target as Node
      if (showDatePicker) {
        const datePickerContainer = document.querySelector('.date-picker-container')
        if (datePickerContainer && !datePickerContainer.contains(targetNode)) {
          setShowDatePicker(false)
        }
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [showDatePicker])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Workspace */}
          <Select value={workspaceId} onChange={e => onWorkspaceChange(e.target.value)} className="h-10 w-full sm:w-[200px] cursor-pointer bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-blue-500 rounded-lg">
            <option value="">Select Workspace</option>
            {Array.isArray(workspaces) && workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </Select>
          {/* Project */}
          <div className="flex-1 w-full sm:max-w-md">
            <ProjectSelector
              selectedProjectIds={projectIds}
              availableProjects={projects}
              onChange={onProjectsChange}
              placeholder="Search projects..."
              className="h-10 w-full"
              onSelectAll={() => onProjectsChange(projects.map(p => p.id))}
            />
          </div>
          {/* Date Range */}
          <div className="relative date-picker-container w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowDatePicker(v => !v)}
              className="h-10 w-full sm:w-[240px] px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center justify-between"
            >
              <span className="truncate">
                {dateRange
                  ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                  : 'Pick Date Range'}
              </span>
              <span className="text-slate-400">📅</span>
            </button>
            {showDatePicker && (
              <div className="absolute z-50 mt-2 left-0 sm:left-auto sm:right-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 min-w-[300px]">
                <DateRangePicker value={dateRange || defaultDateRange} onChange={val => { onDateRangeChange(val); }} />
              </div>
            )}
          </div>
        </div>

        {/* Actions Separator */}
        <div className="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
          <Button onClick={onRefresh} type="button" variant="ghost" className="h-10 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Refresh data" disabled={refreshing}>
            {refreshing ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button onClick={onManageTags} type="button" variant="outline" className="h-10 cursor-pointer border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200">
            <span className="mr-2">🏷️</span> Manage Tags
          </Button>
          <Button onClick={onManageTasks} type="button" variant="outline" className="h-10 cursor-pointer border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200" disabled={projectIds.length === 0}>
            <span className="mr-2">✅</span> Manage Tasks
          </Button>
        </div>
      </div>
    </div>
  )
}

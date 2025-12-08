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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Workspace */}
          <Select value={workspaceId} onChange={e => onWorkspaceChange(e.target.value)} className="h-9 w-full sm:w-[200px] cursor-pointer">
            <option value="">Workspace</option>
            {Array.isArray(workspaces) && workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </Select>
          {/* Project */}
          <ProjectSelector
            selectedProjectIds={projectIds}
            availableProjects={projects}
            onChange={onProjectsChange}
            placeholder="Select project"
            className="h-9 w-full sm:w-[220px]"
            onSelectAll={() => onProjectsChange(projects.map(p => p.id))}
          />
          {/* Date Range */}
          <div className="relative date-picker-container">
            <button
              type="button"
              onClick={() => setShowDatePicker(v => !v)}
              className="h-9 w-full sm:w-[200px] px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              {dateRange
                ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                : 'Pick Date Range'}
            </button>
            {showDatePicker && (
              <div className="absolute z-20 mt-2 left-0 right-0 sm:right-auto bg-white dark:bg-gray-900 rounded shadow-lg border p-2">
                <DateRangePicker value={dateRange || defaultDateRange} onChange={val => { onDateRangeChange(val); }} />
              </div>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Button onClick={onRefresh} type="button" variant="outline" className="h-9 cursor-pointer" title="Refresh data" disabled={refreshing}>
            {refreshing ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={onManageTags} type="button" variant="outline" className="h-9 cursor-pointer">
            <span className="hidden sm:inline">🏷️ Manage Tags</span>
            <span className="sm:hidden">🏷️</span>
          </Button>
          <Button onClick={onManageTasks} type="button" variant="outline" className="h-9 cursor-pointer" disabled={projectIds.length === 0}>
            <span className="hidden sm:inline">✅ Manage Tasks</span>
            <span className="sm:hidden">✅</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

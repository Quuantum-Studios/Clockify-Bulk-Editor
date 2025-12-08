"use client"

import { Button } from "../ui/button"
import { TimeEntry } from "../../lib/store"

interface BulkActionsProps {
  timeEntries: TimeEntry[]
  selectedCount: number
  savingCount: number
  modifiedCount: number
  onBulkDelete: () => void
  onBulkSave: () => void
}

export function BulkActions({
  timeEntries,
  selectedCount,
  savingCount,
  modifiedCount,
  onBulkDelete,
  onBulkSave
}: BulkActionsProps) {
  if (!Array.isArray(timeEntries) || timeEntries.length === 0) return null

  return (
    <div className="flex flex-col sm:flex-row justify-between mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-muted-foreground">
        <span>Selected: {selectedCount}</span>
        <Button 
          className="bg-transparent text-red-600 cursor-pointer" 
          onClick={onBulkDelete} 
          disabled={selectedCount === 0 || savingCount > 0}
        >
          {savingCount > 0 ? (
            <span className="inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            'Bulk Delete Selected'
          )}
        </Button>
      </div>
      <Button 
        onClick={onBulkSave} 
        disabled={modifiedCount === 0} 
        className="cursor-pointer"
      >
        {/* show spinner if any rows saving */}
        {savingCount > 0 ? (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Bulk Save All'
        )}
      </Button>
    </div>
  )
}

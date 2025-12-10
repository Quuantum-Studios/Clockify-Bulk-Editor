"use client"

import { Button } from "../ui/button"
import { CheckSquare, Save, Trash2, X } from "lucide-react"

interface BulkActionsProps {
  selectedCount: number
  hasModified: boolean
  onDelete: () => void
  onSaveAll: () => void
  onToggleSelectionMode: () => void
  selectionMode: boolean
}

export function BulkActions({
  selectedCount,
  hasModified,
  onDelete,
  onSaveAll,
  onToggleSelectionMode,
  selectionMode
}: BulkActionsProps) {
  // Only show if there's something to do
  if (!selectionMode && !hasModified) return null

  return (
    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-full shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">

      {selectionMode && (
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/50">
          <span className="text-xs font-medium text-slate-300 pl-1">{selectedCount} Selected</span>
          {selectedCount > 0 && (
            <Button 
              onClick={onDelete}
              variant="destructive"
              size="sm"
              className="h-8 px-3 rounded-full text-xs hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      )}

      {hasModified && (
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xs font-medium text-slate-300">Unsaved Changes</span>
          <Button
            onClick={onSaveAll}
            size="sm"
            className="h-8 px-3 rounded-full text-xs bg-green-500 hover:bg-green-600 text-white border-none font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save All
          </Button>
        </div>
      )}

      <div className="pl-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSelectionMode}
          className="h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={selectionMode ? "Cancel selection mode" : "Enable selection mode"}
        >
          {selectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

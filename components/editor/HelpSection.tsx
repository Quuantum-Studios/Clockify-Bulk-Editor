"use client"

import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { Button } from "../ui/button"

interface HelpSectionProps {
  open: boolean
  onToggle: () => void
}

export function HelpSection({ open, onToggle }: HelpSectionProps) {
  return (
    <div className="mt-6 transition-all duration-200">
      {/* Toggle Button */}
      <Button
        onClick={onToggle}
        variant="outline"
        className="w-full sm:w-auto cursor-pointer border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        How to use the editor
        {open ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📖 Quick Guide
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <li>
              • <strong>Click on any field</strong> to edit it inline (description, time, project/task, tags)
            </li>
            <li>
              • <strong>Time editing:</strong> Click on start/end times or use the calendar icon to open date pickers
            </li>
            <li>
              • <strong>Project/Task:</strong> Click to select from dropdowns or create new tasks on the fly
            </li>
            <li>
              • <strong>Tags:</strong> Click to select existing tags or create new ones
            </li>
            <li>
              • <strong>Save:</strong> Click the green save button (✓) to save individual changes
            </li>
            <li>
              • <strong>Bulk actions:</strong> Use the selection mode toggle to select multiple entries for bulk save/delete
            </li>
            <li>
              • <strong>Billable toggle:</strong> Click the $ icon on the left of each row to mark as billable/non-billable
            </li>
            <li>
              • <strong>Voice Upload:</strong> Use the Magic Upload button to add entries via voice commands
            </li>
            <li>
              • <strong>CSV Import:</strong> Click "Import CSV" to bulk upload time entries from a CSV file
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

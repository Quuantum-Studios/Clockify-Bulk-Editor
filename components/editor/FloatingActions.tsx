"use client"

import { useState } from "react"
import { Plus, FileSpreadsheet, Sparkles, Mic } from "lucide-react"
import VoiceDialog from "@/components/VoiceDialog"

interface FloatingActionsProps {
  onAddEntry: () => void
  onImportCSV: () => void
}

export function FloatingActions({ onAddEntry, onImportCSV }: FloatingActionsProps) {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Speed Dial Actions */}
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}`}>

          {/* Add Entry Manually */}
          <button
            onClick={() => { onAddEntry(); setIsOpen(false); }}
            className="group flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            title="Add Entry Manually"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">Add Entry</span>
          </button>

          {/* Magic Upload */}
          <button
            onClick={() => { setVoiceOpen(true); setIsOpen(false); }}
            className="group flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            title="Magic Upload"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">Magic Upload</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => { onImportCSV(); setIsOpen(false); }}
            className="group flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            title="Import CSV"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">Import CSV</span>
          </button>
        </div>

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group relative w-14 h-14 flex items-center justify-center rounded-full text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-50 ${isOpen ? 'bg-slate-700 rotate-45' : 'bg-blue-600'}`}
          title={isOpen ? "Close Menu" : "Add New"}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      <VoiceDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  )
}

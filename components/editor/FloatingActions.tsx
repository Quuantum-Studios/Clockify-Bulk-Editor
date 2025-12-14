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
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Secondary actions - shown when expanded or always on desktop */}
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${expanded ? 'opacity-100 translate-y-0' : 'sm:opacity-100 sm:translate-y-0 opacity-0 translate-y-4 pointer-events-none sm:pointer-events-auto'}`}>
          
          {/* Magic Upload */}
          <button
            onClick={() => setVoiceOpen(true)}
            className="group relative flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden"
            title="Magic Upload"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Sparkles className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10 font-medium text-sm whitespace-nowrap">Magic Upload</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={onImportCSV}
            className="group flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            title="Import CSV"
          >
            <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm whitespace-nowrap">Import CSV</span>
          </button>
        </div>

        {/* Primary FAB - Add Entry */}
        <button
          onClick={onAddEntry}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className="group relative w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          title="Add Entry"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
          <Plus className="w-7 h-7 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Mobile expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="sm:hidden absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-700 text-white text-xs flex items-center justify-center shadow-lg"
        >
          {expanded ? '×' : '⋯'}
        </button>
      </div>

      <VoiceDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  )
}

"use client"
import { useState } from "react"
import { Sparkles } from "lucide-react"
import VoiceDialog from "./VoiceDialog"

export default function MagicButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Open Magic"
      >
        {/* Animated gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Content */}
        <Sparkles size={18} className="relative z-10 group-hover:rotate-12 transition-transform duration-300" />
        <span className="relative z-10">Magic Upload</span>
      </button>
      <VoiceDialog open={open} onOpenChange={setOpen} />
    </>
  )
}



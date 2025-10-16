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
        className="fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-lg hover:opacity-90 active:opacity-80 transition px-5 py-3 flex items-center gap-2"
        aria-label="Open Magic"
      >
        <Sparkles size={18} />
        <span>Magic</span>
      </button>
      <VoiceDialog open={open} onOpenChange={setOpen} />
    </>
  )
}



"use client"
import { Sun, Moon, Settings, FileText } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import SettingsDialog from "./SettingsDialog"
import LogsDialog from "./LogsDialog"
import { useClockifyStore } from "../lib/store"
import Link from "next/link"
import Image from "next/image"
import Logo from "./Logo"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"

export default function AppNavLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { apiKey, userProfile } = useClockifyStore()
  const userOpenedSettings = useRef(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = window.localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
  }, [])

  useEffect(() => {
    if (!apiKey && !userOpenedSettings.current) {
      setSettingsOpen(true)
    }
  }, [apiKey]) 

  // Auto-close settings when API key is set (but not if user manually opened it)
  useEffect(() => {
    if (apiKey && settingsOpen && !userOpenedSettings.current) {
      setSettingsOpen(false)
    }
  }, [apiKey, settingsOpen])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      window.localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

  const handleCloseSettings = () => {
    userOpenedSettings.current = false
    if (apiKey) {
      setSettingsOpen(false)
    }
  }

  return (
    <div className={"min-h-screen flex flex-col bg-background text-foreground " + (theme === 'dark' ? 'dark' : '')}>
      {/* Top navbar */}
      {/* Top navbar removed (handled by page specific headers) */}

      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
      {/* <div className="fixed bottom-6 right-6 z-50">
      <MagicButton />
      </div> */}

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={handleCloseSettings}
        canClose={!!apiKey}
      />
      {/* Logs Dialog */}
      <LogsDialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </div>
  )
}

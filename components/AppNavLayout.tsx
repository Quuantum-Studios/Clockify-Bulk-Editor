"use client"
import { Sun, Moon, Settings, Clock, FileText } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import SettingsDialog from "./SettingsDialog"
import LogsDialog from "./LogsDialog"
import { useClockifyStore } from "../lib/store"
import Link from "next/link"
import Image from "next/image"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "ClockifyManager"

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
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <Link href="/">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">{APP_NAME}</span>
          </div>
          {/* <div className="font-bold text-xl text-primary">{APP_NAME}</div> */}
        </Link>
        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
              {userProfile.profilePicture && (
                <Image
                  src={userProfile.profilePicture}
                  alt={userProfile.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full"
                  priority
                />
              )}
              <div className="text-sm">
                <div className="font-medium">{userProfile.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{userProfile.email}</div>
              </div>
            </div>
          )}
          <button
            className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="View Logs"
            onClick={() => setLogsOpen(true)}
          >
            <FileText size={18} />
          </button>
          <button
            className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Settings"
            onClick={() => {
              userOpenedSettings.current = true
              setSettingsOpen(true)
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>
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

"use client"
import { Sun, Moon, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import SettingsDialog from "./SettingsDialog"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clockify Manager"

export default function AppNavLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" && window.localStorage.getItem("theme")) || "light")
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); window.localStorage.setItem("theme", theme) }, [theme])

  return (
    <div className={"min-h-screen flex flex-col bg-background text-foreground " + (theme === 'dark' ? 'dark' : '')}>
      {/* Top navbar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <div className="font-bold text-xl text-primary">{APP_NAME}</div>
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
      
      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

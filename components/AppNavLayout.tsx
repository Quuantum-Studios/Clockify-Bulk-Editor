"use client"
import { Sun, Moon, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import SettingsDialog from "./SettingsDialog"
import MagicButton from "./MagicButton"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clockify Manager"

export default function AppNavLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = window.localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
  }, [])

  useEffect(() => { 
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      window.localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

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
      {/* <div className="fixed bottom-6 right-6 z-50">
      <MagicButton />
      </div> */}
      
      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

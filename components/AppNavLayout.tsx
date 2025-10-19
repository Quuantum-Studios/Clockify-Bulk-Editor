"use client"
import { Sun, Moon, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import SettingsDialog from "./SettingsDialog"
import MagicButton from "./MagicButton"
import { useClockifyStore } from "../lib/store"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clockify Manager"

export default function AppNavLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { apiKey, userProfile } = useClockifyStore()

  useEffect(() => {
    setMounted(true)
    const savedTheme = window.localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
    
    // Auto-open settings if no API key
    if (!apiKey) {
      setSettingsOpen(true)
    }
  }, [])

  useEffect(() => { 
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      window.localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

  const handleCloseSettings = () => {
    if (apiKey) {
      setSettingsOpen(false)
    }
  }

  return (
    <div className={"min-h-screen flex flex-col bg-background text-foreground " + (theme === 'dark' ? 'dark' : '')}>
      {/* Top navbar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <div className="font-bold text-xl text-primary">{APP_NAME}</div>
        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
              {userProfile.profilePicture && (
                <img 
                  src={userProfile.profilePicture} 
                  alt={userProfile.name}
                  className="w-6 h-6 rounded-full"
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
      <SettingsDialog 
        open={settingsOpen} 
        onClose={handleCloseSettings}
        canClose={!!apiKey}
      />
    </div>
  )
}

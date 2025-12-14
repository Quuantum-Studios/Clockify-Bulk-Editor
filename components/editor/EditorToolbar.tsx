"use client"

import { useState, useEffect } from "react"
import { Settings, FileText, Sun, Moon, RotateCcw, Tag, ListTodo } from "lucide-react"
import { useClockifyStore } from "../../lib/store"

interface EditorToolbarProps {
  onOpenSettings: () => void
  onOpenLogs: () => void
  onRefresh: () => void
  refreshing: boolean
  onManageTags: () => void
  onManageTasks: () => void
  tasksDisabled: boolean
}

export function EditorToolbar({ 
  onOpenSettings, 
  onOpenLogs,
  onRefresh,
  refreshing,
  onManageTags,
  onManageTasks,
  tasksDisabled
}: EditorToolbarProps) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem("theme") || "light"
    }
    return "light"
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    window.localStorage.setItem("theme", newTheme)
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-14 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col items-center py-4 gap-1 z-40">
      {/* Top Actions */}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        title="Refresh data"
      >
        {refreshing ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4" />
        )}
      </button>

      <button
        onClick={onManageTags}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Manage Tags"
      >
        <Tag className="w-4 h-4" />
      </button>

      <button
        onClick={onManageTasks}
        disabled={tasksDisabled}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        title="Manage Tasks"
      >
        <ListTodo className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      {/* Bottom Actions */}
      <button
        onClick={onOpenSettings}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      <button
        onClick={onOpenLogs}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Activity Logs"
      >
        <FileText className="w-4 h-4" />
      </button>

      <button
        onClick={toggleTheme}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Toggle theme"
      >
        {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* User Avatar */}
      <UserAvatar />
    </aside>
  )
}

function UserAvatar() {
  const userProfile = useClockifyStore(state => state.userProfile)

  if (!userProfile) return null

  return (
    <div className="mt-1" title={userProfile.name}>
      {userProfile.profilePicture ? (
        <img
          src={userProfile.profilePicture}
          alt={userProfile.name}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

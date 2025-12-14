"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { ProjectSelector } from "../ProjectSelector"
import { DateRangePicker } from "../DateRangePicker"
import Logo from "../Logo"
import { X, Menu, RotateCcw, Tag, ListTodo, Sun, Moon, Settings, FileText } from "lucide-react"

interface EditorHeaderProps {
  workspaces: { id: string; name: string }[]
  workspaceId: string
  onWorkspaceChange: (id: string) => void
  projects: { id: string; name: string }[]
  projectIds: string[]
  onProjectsChange: (ids: string[]) => void
  dateRange: { startDate: Date; endDate: Date } | null
  defaultDateRange: { startDate: Date; endDate: Date }
  onDateRangeChange: (range: { startDate: Date; endDate: Date } | null) => void
  onRefresh: () => void
  refreshing: boolean
  onManageTags: () => void
  onManageTasks: () => void
}

export function EditorHeader({
  workspaces,
  workspaceId,
  onWorkspaceChange,
  projects,
  projectIds,
  onProjectsChange,
  dateRange,
  defaultDateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onManageTags,
  onManageTasks
}: EditorHeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [theme, setTheme] = useState("light")
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Close date picker when clicking outside
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const targetNode = e.target as Node
      if (showDatePicker) {
        const datePickerContainer = document.querySelector('.date-picker-container')
        if (datePickerContainer && !datePickerContainer.contains(targetNode)) {
          setShowDatePicker(false)
        }
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [showDatePicker])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Main Header Row */}
        <div className="h-14 max-w-[1920px] mx-auto px-4 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo className="h-6 w-auto text-gray-900 dark:text-white" />
          </Link>

          <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

          {/* Filters - Desktop */}
          <div className="hidden md:flex items-center gap-3 flex-1">
            <Select 
              value={workspaceId} 
              onChange={e => onWorkspaceChange(e.target.value)} 
              className="h-8 w-[140px] text-sm cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-md"
            >
              <option value="">Workspace</option>
              {Array.isArray(workspaces) && workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </Select>

            <div className="w-[180px]">
              <ProjectSelector
                selectedProjectIds={projectIds}
                availableProjects={projects}
                onChange={onProjectsChange}
                placeholder="Projects..."
                className="h-8 w-full text-sm"
                onSelectAll={() => onProjectsChange(projects.map(p => p.id))}
              />
            </div>

            <div className="relative date-picker-container">
              <button
                type="button"
                onClick={() => setShowDatePicker(v => !v)}
                className="h-8 w-[160px] px-3 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <span className="truncate text-xs">
                  {dateRange
                    ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                    : 'Date Range'}
                </span>
                <span className="text-slate-400">📅</span>
              </button>
              {showDatePicker && (
                <div className="absolute z-50 mt-2 right-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 min-w-[300px]">
                  <DateRangePicker value={dateRange || defaultDateRange} onChange={val => { onDateRangeChange(val); }} />
                </div>
              )}
            </div>
          </div>

          {/* Actions - Only on tablet, hidden on desktop (actions in sidebar) */}
          <div className="hidden md:flex lg:hidden items-center gap-1">
            <Button 
              onClick={onRefresh} 
              type="button" 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" 
              title="Refresh data" 
              disabled={refreshing}
            >
              {refreshing ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              onClick={onManageTags} 
              type="button" 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Manage Tags"
            >
              <Tag className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={onManageTasks} 
              type="button" 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" 
              title="Manage Tasks"
              disabled={projectIds.length === 0}
            >
              <ListTodo className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Exit Button */}
            <Link href="/">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                title="Exit to home"
              >
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden ml-auto h-8 w-8 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Filters Row */}
        <div className="md:hidden px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
          <Select 
            value={workspaceId} 
            onChange={e => onWorkspaceChange(e.target.value)} 
            className="h-8 min-w-[120px] text-xs cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-md"
          >
            <option value="">Workspace</option>
            {Array.isArray(workspaces) && workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </Select>

          <div className="min-w-[140px]">
            <ProjectSelector
              selectedProjectIds={projectIds}
              availableProjects={projects}
              onChange={onProjectsChange}
              placeholder="Projects..."
              className="h-8 w-full text-xs"
              onSelectAll={() => onProjectsChange(projects.map(p => p.id))}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowDatePicker(v => !v)}
            className="h-8 px-2 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs cursor-pointer whitespace-nowrap"
          >
            📅 Date
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-slate-900 dark:text-white">Menu</span>
              <button onClick={() => setShowMobileMenu(false)} className="p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => { onRefresh(); setShowMobileMenu(false); }}
              disabled={refreshing}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => { onManageTags(); setShowMobileMenu(false); }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Tag className="h-4 w-4" />
              <span>Manage Tags</span>
            </button>

            <button
              onClick={() => { onManageTasks(); setShowMobileMenu(false); }}
              disabled={projectIds.length === 0}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <ListTodo className="h-4 w-4" />
              <span>Manage Tasks</span>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Activity Logs</span>
            </button>

            <button
              onClick={() => { toggleTheme(); }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="flex-1" />

            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer">
              <X className="h-4 w-4" />
              <span>Exit Editor</span>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

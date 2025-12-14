"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { ProjectSelector } from "../ProjectSelector"
import { DateRangePicker } from "../DateRangePicker"
import Logo from "../Logo"

import { X, Menu, RotateCcw, Tag, ListTodo, Sun, Moon, Settings, FileText, Filter, Plus, Sparkles, FileSpreadsheet } from "lucide-react"
import VoiceDialog from "../VoiceDialog"

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
  onAddEntry: () => void
  onOpenSettings: () => void
  onImportCSV: () => void
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
  onManageTasks,
  onAddEntry,
  onOpenSettings,
  onImportCSV
}: EditorHeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
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
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                title="Exit Editor"
              >
                <X className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/" className="flex-shrink-0">
              <Logo className="h-6 w-auto text-gray-900 dark:text-white" />
            </Link>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

          {/* Filters - Desktop Only */}
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

          {/* Actions - Visible on Desktop */}
          <div className="hidden md:flex items-center gap-1">
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
          </div>

          {/* Mobile Menu Button - Left aligned or Right aligned? Image shows Right aligned */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden ml-auto h-8 w-8 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 flex items-center justify-around px-2 pb-safe">
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="flex flex-col items-center gap-1 p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <div className={`p-1 rounded-md ${projectIds.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}>
            <Filter className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Filter</span>
        </button>

        <button
          onClick={onManageTags}
          className="flex flex-col items-center gap-1 p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Tag className="h-5 w-5" />
          <span className="text-[10px] font-medium">Tags</span>
        </button>

        <div className="relative flex flex-col items-center justify-center -mt-6">
          {/* Action Menu */}
          <div className={`absolute bottom-full mb-4 flex flex-col gap-3 items-center transition-all duration-300 ${showAddMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'}`}>
            <button onClick={() => { onAddEntry(); setShowAddMenu(false); }} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg px-4 py-2.5 rounded-full whitespace-nowrap active:scale-95 transition-transform">
              <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Plus className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Entry</span>
            </button>
            <button onClick={() => { setVoiceOpen(true); setShowAddMenu(false); }} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg px-4 py-2.5 rounded-full whitespace-nowrap active:scale-95 transition-transform">
              <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"><Sparkles className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Magic Upload</span>
            </button>
            <button onClick={() => { onImportCSV(); setShowAddMenu(false); }} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg px-4 py-2.5 rounded-full whitespace-nowrap active:scale-95 transition-transform">
              <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><FileSpreadsheet className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Import CSV</span>
            </button>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${showAddMenu ? 'bg-slate-700 rotate-45' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'} text-white`}
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        <button
          onClick={onManageTasks}
          disabled={projectIds.length === 0}
          className={`flex flex-col items-center gap-1 p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ${projectIds.length === 0 ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <ListTodo className="h-5 w-5" />
          <span className="text-[10px] font-medium">Tasks</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilterDrawer && (
        <div className="md:hidden fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={() => setShowFilterDrawer(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full p-4 rounded-t-xl shadow-xl pointer-events-auto animate-in slide-in-from-bottom-10 mb-0 pb-8 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center shrink-0">
              <span className="font-semibold text-lg text-slate-900 dark:text-white">Filters</span>
              <button onClick={() => setShowFilterDrawer(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase">Workspace</label>
                <Select
                  value={workspaceId}
                  onChange={e => onWorkspaceChange(e.target.value)}
                  className="w-full text-sm h-10 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select Workspace</option>
                  {Array.isArray(workspaces) && workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase">Projects</label>
                <div className="min-h-[40px]">
                  <ProjectSelector
                    selectedProjectIds={projectIds}
                    availableProjects={projects}
                    onChange={onProjectsChange}
                    placeholder="Select Projects..."
                    onSelectAll={() => onProjectsChange(projects.map(p => p.id))}
                    className="w-full text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase">Date Range</label>
                <div className="flex justify-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                  <DateRangePicker
                    value={dateRange || defaultDateRange}
                    onChange={val => onDateRangeChange(val)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => setShowFilterDrawer(false)} className="w-full h-10">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer (Existing) */}
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
              onClick={onOpenSettings}
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
      <VoiceDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  )
}

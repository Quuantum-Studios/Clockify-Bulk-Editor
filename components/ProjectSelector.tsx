"use client"
import { useState, useRef, useEffect } from "react"
import { Input } from "./ui/input"

interface Project {
  id: string
  name: string
}

interface ProjectSelectorProps {
  selectedProjectIds: string[]
  availableProjects: Project[]
  onChange: (projectIds: string[]) => void
  placeholder?: string
  className?: string
  onSelectAll?: () => void
}

export function ProjectSelector({ 
  selectedProjectIds, 
  availableProjects, 
  onChange, 
  placeholder = "Select project",
  className = "",
  onSelectAll
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleProjectToggle = (projectId: string) => {
    if (projectId === "__all__") {
      if (onSelectAll) {
        onSelectAll()
      }
      return
    }
    
    if (selectedProjectIds.includes(projectId)) {
      onChange(selectedProjectIds.filter(id => id !== projectId))
    } else {
      onChange([...selectedProjectIds, projectId])
    }
  }

  const filteredProjects = availableProjects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedProjectsData = selectedProjectIds.map(projectId => 
    availableProjects.find(project => project.id === projectId)
  ).filter(Boolean) as Project[]

  const isAllSelected = selectedProjectIds.length === availableProjects.length && availableProjects.length > 0

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ overflow: "visible" }}>
      {/* Selected projects display */}
      <div 
        className="min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex flex-wrap gap-1 items-center relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-1 min-w-0">
          {selectedProjectsData.length > 0 ? (
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {selectedProjectsData.length} {selectedProjectsData.length === 1 ? 'project' : 'projects'} selected
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="shrink-0 ml-2">
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto" style={{ zIndex: 60 }}>
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="text-sm cursor-text"
              autoFocus
            />
          </div>

          {/* All projects option */}
          {onSelectAll && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleProjectToggle("__all__")}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between cursor-pointer ${isAllSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <span className="font-medium">All projects</span>
                {isAllSelected && <span className="text-blue-600 dark:text-blue-400">✓</span>}
              </button>
            </div>
          )}

          {/* Available projects */}
          {filteredProjects.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available projects:</div>
              <div className="space-y-1">
                {filteredProjects.map(project => {
                  const isSelected = selectedProjectIds.includes(project.id)
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectToggle(project.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <span>{project.name}</span>
                      {isSelected && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* No results */}
          {filteredProjects.length === 0 && searchTerm && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No projects found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}

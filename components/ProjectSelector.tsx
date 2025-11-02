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
}

export function ProjectSelector({ 
  selectedProjectIds, 
  availableProjects, 
  onChange, 
  placeholder = "Select projects...",
  className = ""
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    if (selectedProjectIds.includes(projectId)) {
      onChange(selectedProjectIds.filter(id => id !== projectId))
    } else {
      onChange([...selectedProjectIds, projectId])
    }
  }

  const filteredProjects = availableProjects.filter(project => 
    !selectedProjectIds.includes(project.id) && 
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedProjectsData = selectedProjectIds.map(projectId => 
    availableProjects.find(p => p.id === projectId)
  ).filter(Boolean) as Project[]

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ overflow: "visible" }}>
      <div 
        className="min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedProjectsData.length > 0 ? (
          selectedProjectsData.map(project => (
            <span
              key={project.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {project.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProjectToggle(project.id)
                }}
                className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <div className="ml-auto">
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto" style={{ zIndex: 60 }}>
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="text-sm cursor-text"
              autoFocus
            />
          </div>

          {filteredProjects.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available projects:</div>
              <div className="space-y-1">
                {filteredProjects.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleProjectToggle(project.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between cursor-pointer"
                  >
                    <span>{project.name}</span>
                    <span className="text-gray-400">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProjects.length === 0 && searchTerm && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No projects found matching &quot;{searchTerm}&quot;
            </div>
          )}
          {filteredProjects.length === 0 && !searchTerm && availableProjects.length > 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              All projects selected
            </div>
          )}
          {availableProjects.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No projects available
            </div>
          )}
        </div>
      )}
    </div>
  )
}

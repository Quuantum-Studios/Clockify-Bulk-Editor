"use client"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface Tag {
  id: string
  name: string
}

interface TagSelectorProps {
  selectedTags: string[]
  availableTags: Tag[]
  onChange: (tags: string[]) => void
  onCreateTag?: (name: string) => Promise<Tag>
  placeholder?: string
  className?: string
}

export function TagSelector({ 
  selectedTags, 
  availableTags, 
  onChange, 
  onCreateTag, 
  placeholder = "Select tags...",
  className = ""
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newTagName, setNewTagName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0, width: 0 })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideTrigger = dropdownRef.current?.contains(target)
      const clickedInsideContent = dropdownContentRef.current?.contains(target)

      if (!clickedInsideTrigger && !clickedInsideContent) {
        setIsOpen(false)
        setSearchTerm("")
        setNewTagName("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName))
    } else {
      onChange([...selectedTags, tagName])
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return
    
    setIsCreating(true)
    try {
      const newTag = await onCreateTag(newTagName.trim())
      onChange([...selectedTags, newTag.name])
      setNewTagName("")
      setSearchTerm("")
    } catch (error) {
      console.error("Failed to create tag:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      e.preventDefault()
      if (newTagName.trim()) {
        handleCreateTag()
      }
    }
  }

  const tagsWithSelections = [
    ...availableTags,
    ...selectedTags
      .filter(tagName => !availableTags.some(tag => tag.name === tagName))
      .map(tagName => ({ id: tagName, name: tagName })),
  ]

  const filteredTags = tagsWithSelections.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (!isOpen) return

    const updateDropdownPosition = () => {
      if (!dropdownRef.current) return
      const rect = dropdownRef.current.getBoundingClientRect()
      setDropdownStyles({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      })
    }

    updateDropdownPosition()
    window.addEventListener("resize", updateDropdownPosition)
    window.addEventListener("scroll", updateDropdownPosition, true)

    return () => {
      window.removeEventListener("resize", updateDropdownPosition)
      window.removeEventListener("scroll", updateDropdownPosition, true)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ overflow: "visible" }}>
      {/* Selected tags display */}
      <div 
        className="min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-1 min-w-0">
          {selectedTags.length > 0 ? (
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {selectedTags.length} {selectedTags.length === 1 ? "tag" : "tags"} selected
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="ml-auto shrink-0">
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
      {isOpen && createPortal(
        <div
          ref={dropdownContentRef}
          className="fixed z-9999 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ top: dropdownStyles.top, left: dropdownStyles.left, width: dropdownStyles.width }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tags..."
              className="text-sm cursor-text"
              autoFocus
            />
          </div>

          {/* Available tags */}
          {filteredTags.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available tags:</div>
              <div className="space-y-1">
                {filteredTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <span>{tag.name}</span>
                      {isSelected && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Create new tag */}
          {onCreateTag && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Create new tag:</div>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="New tag name..."
                  className="text-sm cursor-text"
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreating}
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                >
                  {isCreating ? "..." : "Add"}
                </Button>
              </div>
            </div>
          )}

          {/* No results */}
          {filteredTags.length === 0 && searchTerm && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No tags found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

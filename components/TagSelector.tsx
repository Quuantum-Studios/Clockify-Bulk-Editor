"use client"
import { useState, useRef, useEffect } from "react"
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const filteredTags = availableTags.filter(tag => 
    !selectedTags.includes(tag.name) && 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedTagsData = selectedTags.map(tagName => 
    availableTags.find(tag => tag.name === tagName) || { id: tagName, name: tagName }
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected tags display */}
      <div 
        className="min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTagsData.length > 0 ? (
          selectedTagsData.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTagToggle(tag.name)
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

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tags..."
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Available tags */}
          {filteredTags.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available tags:</div>
              <div className="space-y-1">
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between"
                  >
                    <span>{tag.name}</span>
                    <span className="text-gray-400">+</span>
                  </button>
                ))}
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
                  className="text-sm"
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreating}
                  size="sm"
                  variant="outline"
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
        </div>
      )}
    </div>
  )
}

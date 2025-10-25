"use client"
import { useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface Tag {
  id: string
  name: string
}

interface TagCloudProps {
  selectedTags: string[]
  availableTags: Tag[]
  onChange: (tags: string[]) => void
  onCreateTag?: (name: string) => Promise<Tag>
}

export function TagCloud({ selectedTags, availableTags, onChange, onCreateTag }: TagCloudProps) {
  const [newTagName, setNewTagName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

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
    } catch (error) {
      console.error("Failed to create tag:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      e.preventDefault()
      handleCreateTag()
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tagName => (
            <span
              key={tagName}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tagName}
              <button
                type="button"
                onClick={() => handleTagToggle(tagName)}
                className="ml-1 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Available tags */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableTags
            .filter(tag => !selectedTags.includes(tag.name))
            .map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.name)}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 cursor-pointer"
              >
                {tag.name}
              </button>
            ))}
        </div>
      )}

      {/* Create new tag */}
      {onCreateTag && (
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add new tag..."
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
      )}
    </div>
  )
}

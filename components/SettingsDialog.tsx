"use client"
import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useClockifyStore } from "../lib/store"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { apiKey, setApiKey, userPrompt, setUserPrompt, defaultTimezone, setDefaultTimezone } = useClockifyStore()
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [tzInput, setTzInput] = useState("")
  const tzOptions: string[] = (() => {
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
      if (sv) return sv('timeZone') || []
    } catch {}
    return [
      "UTC",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney"
    ]
  })()
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    setApiKeyInput(apiKey || "")
    setPromptInput(userPrompt || "")
    setTzInput(defaultTimezone || "")
  }, [apiKey, userPrompt, defaultTimezone])

  const handleSaveSettings = async () => {
    if (apiKeyInput && apiKeyInput.length >= 10) {
      try {
        const res = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKeyInput })
        })
        const data = await res.json() as { valid: boolean; error?: string }
        if (!data.valid) {
          setToast({ type: "error", message: data.error || "Invalid API key" })
          return
        }
        setApiKey(apiKeyInput)
      } catch (e) {
        setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to validate API key" })
        return
      }
    }
    setUserPrompt(promptInput || "")
    setDefaultTimezone(tzInput || (Intl && new Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC")
    setToast({ type: "success", message: "Settings saved" })
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clockify API Key
            </label>
            <Input
              type="password"
              placeholder="Enter your Clockify API key"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your API key from Clockify Settings → API
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Magic Assistant Prompt (optional)
            </label>
            <Input
              type="text"
              placeholder="Give the AI extra context for your workspace"
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Timezone
            </label>
            <Select
              value={tzInput}
              onChange={e => setTzInput(e.target.value)}
              className="w-full"
            >
              <option value="">Select a timezone</option>
              {tzOptions.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for displaying and interpreting times.</p>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </div>
        
        {toast && (
          <Toast 
            open={!!toast} 
            onClose={() => setToast(null)} 
            duration={4000} 
            className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
          >
            {toast.message}
          </Toast>
        )}
      </DialogContent>
    </Dialog>
  )
}

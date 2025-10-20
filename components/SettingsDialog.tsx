"use client"
import { useEffect, useState, useCallback } from "react"
import { X } from "lucide-react"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useClockifyStore } from "../lib/store"
import WelcomeDialog from "./WelcomeDialog"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  canClose?: boolean
}

export default function SettingsDialog({ open, onClose, canClose = true }: SettingsDialogProps) {
  const { apiKey, setApiKey, userPrompt, setUserPrompt, defaultTimezone, setDefaultTimezone, setUserProfile } = useClockifyStore()
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [tzInput, setTzInput] = useState("")
  const [isValidated, setIsValidated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const tzOptions: string[] = (() => {
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
      if (sv) return sv('timeZone') || []
    } catch { }
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
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeName, setWelcomeName] = useState("")

  useEffect(() => {
    setApiKeyInput(apiKey || "")
    setIsValidated(!!apiKey)
  }, [apiKey])

  const loadSettings = useCallback(async (key?: string) => {
    const keyToUse = key || apiKey
    if (!keyToUse || keyToUse.length < 10) {
      setPromptInput(userPrompt || "")
      setTzInput(defaultTimezone || "")
      return
    }
    try {
      const res = await fetch(`/api/kv/settings?apiKey=${encodeURIComponent(keyToUse)}`)
      const data = await res.json() as { settings?: { userPrompt?: string; defaultTimezone?: string } }
      if (data.settings) {
        setPromptInput(data.settings.userPrompt || "")
        setTzInput(data.settings.defaultTimezone || "")
        setUserPrompt(data.settings.userPrompt || "")
        setDefaultTimezone(data.settings.defaultTimezone || "")
      } else {
        setPromptInput(userPrompt || "")
        setTzInput(defaultTimezone || "")
      }
    } catch {
      setPromptInput(userPrompt || "")
      setTzInput(defaultTimezone || "")
    }
  }, [apiKey, userPrompt, defaultTimezone, setUserPrompt, setDefaultTimezone])

  useEffect(() => {
    if (apiKey && open) {
      loadSettings()
    }
  }, [apiKey, open, loadSettings])

  const handleSaveSettings = async () => {
    if (!apiKeyInput || apiKeyInput.length < 10) {
      setToast({ type: "error", message: "Please enter a valid API key" })
      return
    }

    setIsLoading(true)
    try {
      // Step 1: Validate API key if not already validated
      if (!isValidated) {
        const res = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKeyInput })
        })
        const data = await res.json() as { valid: boolean; error?: string; user?: { id: string; email: string; name: string; profilePicture?: string } }
        if (!data.valid) {
          setToast({ type: "error", message: data.error || "Invalid API key" })
          setIsLoading(false)
          return
        }

        setApiKey(apiKeyInput)
        setIsValidated(true)

        if (data.user) {
          setUserProfile({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            profilePicture: data.user.profilePicture
          })
        }

        await loadSettings(apiKeyInput)

        // Show welcome popup (settings will auto-close via parent useEffect)
        setWelcomeName(data.user?.name || "User")
        setShowWelcome(true)
      } else {
        // Step 2: Save settings if already validated
        const tz = tzInput || (Intl && new Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC"

        await fetch("/api/kv/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeyInput,
            userPrompt: promptInput,
            defaultTimezone: tz
          })
        })

        setUserPrompt(promptInput || "")
        setDefaultTimezone(tz)
        setToast({ type: "success", message: "Settings saved successfully" })

        setTimeout(() => {
          onClose()
        }, 3000)
      }
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to save settings" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && canClose && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            {canClose && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
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
                disabled={isValidated}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get your API key from Clockify Settings → API
              </p>
            </div>

            {isValidated && (
              <>
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
              </>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isLoading} className="w-full">
                {isLoading ? (isValidated ? "Saving..." : "Validating...") : (isValidated ? "Save Settings" : "Validate & Continue")}
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
      <WelcomeDialog
        open={showWelcome}
        userName={welcomeName}
        onClose={() => setShowWelcome(false)}
      />
    </>
  )
}

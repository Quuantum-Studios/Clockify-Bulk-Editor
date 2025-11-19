"use client"
import { useEffect, useState, useCallback } from "react"
import { X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useClockifyStore } from "../lib/store"
import { capture, identify, AnalyticsEvents } from "../lib/analytics"
import WelcomeDialog from "./WelcomeDialog"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  canClose?: boolean
}

export default function SettingsDialog({ open, onClose, canClose = true }: SettingsDialogProps) {
  const { apiKey, setApiKey, userPrompt, setUserPrompt, defaultTimezone, setDefaultTimezone, setUserProfile, resetUserData } = useClockifyStore()
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [tzInput, setTzInput] = useState("")
  const [isValidated, setIsValidated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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
  const [showApiKeySteps, setShowApiKeySteps] = useState(false)

  useEffect(() => {
    setApiKeyInput(apiKey || "")
    setIsValidated(!!apiKey)
  }, [apiKey])

  const loadSettings = useCallback(async () => {
    const apiKeyToUse = apiKey || apiKeyInput
    if (!apiKeyToUse) {
      setPromptInput(userPrompt || "")
      setTzInput(defaultTimezone || "")
      return
    }
    try {
      const res = await fetch(`/api/settings?apiKey=${encodeURIComponent(apiKeyToUse)}`)
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
  }, [apiKey, apiKeyInput, userPrompt, defaultTimezone, setUserPrompt, setDefaultTimezone])

  useEffect(() => {
    if (open && (apiKey || apiKeyInput)) {
      loadSettings()
    }
  }, [open, apiKey, apiKeyInput, loadSettings])

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
        const data = await res.json() as {
          valid: boolean;
          error?: string;
          user?: {
            id: string;
            email: string;
            name: string;
            profilePicture?: string;
            activeWorkspace?: string;
            settings?: {
              timeZone?: string;
            }
          }
        }
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
            profilePicture: data.user.profilePicture,
            activeWorkspace: data.user.activeWorkspace
          })
          // Identify user in analytics and capture validation event
          identify(data.user.id, { email: data.user.email, name: data.user.name })
          capture(AnalyticsEvents.API_KEY_VALIDATED, { hasActiveWorkspace: !!data.user.activeWorkspace })

          // Set default timezone from Clockify account settings
          if (data.user.settings?.timeZone) {
            const clockifyTz = data.user.settings.timeZone
            if (!defaultTimezone) {
              setDefaultTimezone(clockifyTz)
            }
            // Always pre-fill the input with Clockify timezone if not already set
            if (!tzInput) {
              setTzInput(clockifyTz)
            }
          }
        }

        if (data.user) {
          // Show welcome popup (settings will auto-close via parent useEffect)
          setWelcomeName(data.user.name || "User")
          setShowWelcome(true)

          await loadSettings()
        }
      } else {
        // Step 2: Save settings if already validated
        const tz = tzInput || (Intl && new Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC"
        const apiKeyToUse = apiKey || apiKeyInput
        if (!apiKeyToUse) {
          setToast({ type: "error", message: "Missing API key" })
          setIsLoading(false)
          return
        }

        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeyToUse,
            userPrompt: promptInput,
            defaultTimezone: tz
          })
        })

        const data = await res.json() as { success?: boolean; error?: string; issues?: Array<{ message: string }> }

        if (!res.ok || data.error || data.success === false) {
          const issueMessage = data.issues && data.issues.length > 0 ? data.issues[0].message : null
          setToast({
            type: "error",
            message: issueMessage || data.error || "Failed to save settings",
          })
          setIsLoading(false)
          return
        }

        setUserPrompt(promptInput || "")
        setDefaultTimezone(tz)
        setToast({ type: "success", message: "Settings saved successfully" })
        capture(AnalyticsEvents.SETTINGS_SAVED, { tzSet: !!tz, hasPrompt: !!promptInput })

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

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      resetUserData()
      setApiKeyInput("")
      setPromptInput("")
      setTzInput("")
      setIsValidated(false)
      setToast({ type: "success", message: "Logged out successfully" })
      if (canClose) {
        onClose()
      }
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && canClose && onClose()}>
        <DialogContent className={showApiKeySteps ? "max-w-3xl" : "max-w-md"}>
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
                className="w-full cursor-text"
                disabled={isValidated}
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeySteps(!showApiKeySteps)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {showApiKeySteps ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide steps to get API key
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show steps to get API key
                    </>
                  )}
                </button>
                
                {showApiKeySteps && (
                  <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                      How to get your Clockify API Key:
                    </h4>
                    <ol className="space-y-3 text-xs text-blue-800 dark:text-blue-200">
                      <li className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">1</span>
                        <div>
                          <span className="font-medium">Go to account menu</span>
                          <p className="text-blue-700 dark:text-blue-300 mt-0.5">Click on your account menu in the top-right corner of Clockify</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">2</span>
                        <div>
                          <span className="font-medium">Select Preferences</span>
                          <p className="text-blue-700 dark:text-blue-300 mt-0.5">From the dropdown menu, select <strong>&quot;Preferences&quot;</strong></p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">3</span>
                        <div>
                          <span className="font-medium">Open Advanced tab</span>
                          <p className="text-blue-700 dark:text-blue-300 mt-0.5">In the Preferences menu, click on the <strong>&quot;Advanced&quot;</strong> tab</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">4</span>
                        <div>
                          <span className="font-medium">Generate API Key</span>
                          <p className="text-blue-700 dark:text-blue-300 mt-0.5">In the API Key section, click the <strong>&quot;Generate New&quot;</strong> button and enter any key name and click <strong>&quot;Generate&quot;</strong></p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">5</span>
                        <div>
                          <span className="font-medium">Copy and paste</span>
                          <p className="text-blue-700 dark:text-blue-300 mt-0.5">Copy the API key and paste it in the input field above.</p>
                        </div>
                      </li>
                    </ol>
                    
                    <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Watch tutorial video:</p>
                      <div className="relative w-full rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <video
                          src="/bulkifyai-tutorial-to-get-clockify-api-key.mp4"
                          controls
                          loop
                          className="w-full max-h-[600px] rounded-lg"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <a 
                        href="https://app.clockify.me/user/preferences" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Open Clockify Preferences <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
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
                    className="w-full cursor-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Timezone
                  </label>
                  <Select
                    value={tzInput}
                    onChange={e => setTzInput(e.target.value)}
                    className="w-full cursor-pointer"
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

            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveSettings} disabled={isLoading} className="w-full">
                {isLoading ? (isValidated ? "Saving..." : "Validating...") : (isValidated ? "Save Settings" : "Save & Continue")}
              </Button>
              {(apiKey) && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={isLoading || isLoggingOut}
                  className="w-full cursor-pointer text-accent"
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <WelcomeDialog
        open={showWelcome}
        userName={welcomeName}
        onClose={() => setShowWelcome(false)}
      />
    </>
  )
}

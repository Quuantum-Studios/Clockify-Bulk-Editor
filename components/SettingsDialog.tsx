"use client"
import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Toast } from "./ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useClockifyStore } from "../lib/store"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { apiKey, setApiKey } = useClockifyStore()
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    setApiKeyInput(apiKey || "")
  }, [apiKey])

  const handleSaveApiKey = () => {
    if (!apiKeyInput || apiKeyInput.length < 10) {
      setToast({ type: "error", message: "Please enter a valid API key." })
      return
    }
    setApiKey(apiKeyInput)
    setToast({ type: "success", message: "API key saved" })
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
          
          <div className="flex justify-end">
            <Button onClick={handleSaveApiKey} className="w-full">
              Save API Key
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

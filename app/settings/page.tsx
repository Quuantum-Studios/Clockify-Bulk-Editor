"use client"
import { useEffect, useState } from "react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Toast } from "../../components/ui/toast"
import { useClockifyStore } from "../../lib/store"

export default function SettingsPage() {
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
    <div className="max-w-lg mx-auto mt-10 p-6 bg-card rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <Input
          type="password"
          placeholder="Clockify API Key"
          value={apiKeyInput}
          onChange={e => setApiKeyInput(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleSaveApiKey}>Save API Key</Button>
      </div>
      {toast && (
        <Toast open={!!toast} onClose={() => setToast(null)} duration={4000} className={toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {toast.message}
        </Toast>
      )}
    </div>
  )
}

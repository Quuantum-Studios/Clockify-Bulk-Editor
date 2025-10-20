"use client"
import { useEffect } from "react"
import { CheckCircle } from "lucide-react"
import { Dialog, DialogContent } from "./ui/dialog"

interface WelcomeDialogProps {
  open: boolean
  userName: string
  onClose: () => void
}

export default function WelcomeDialog({ open, userName, onClose }: WelcomeDialogProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [open, onClose])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            <CheckCircle className="h-24 w-24 text-green-600 dark:text-green-400 animate-[scale-in_0.5s_ease-out]" />
            <div className="absolute inset-0 h-24 w-24 rounded-full bg-green-400/20 animate-[ping_1s_ease-out]" />
          </div>
          
          <div className="space-y-2 animate-[fade-in_0.5s_ease-out_0.3s_both]">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome!
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              {userName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
              Your account has been successfully connected
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


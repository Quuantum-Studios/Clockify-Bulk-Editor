import * as React from "react"
import { cn } from "../../lib/utils"

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onClose?: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ open, onClose, duration = 3000, className, children, ...props }) => {
  const [visible, setVisible] = React.useState(open)
  React.useEffect(() => {
    setVisible(open)
  }, [open])
  React.useEffect(() => {
    if (visible && duration) {
      const timer = setTimeout(() => {
        setVisible(false)
        onClose?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])
  if (!visible) return null
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 min-w-[200px] rounded-md bg-background px-4 py-2 shadow-lg border border-border animate-in fade-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
export { Toast }

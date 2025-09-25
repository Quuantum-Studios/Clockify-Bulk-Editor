import * as React from "react"
import { cn } from "../../lib/utils"


const Dialog = React.forwardRef<HTMLDialogElement, React.DialogHTMLAttributes<HTMLDialogElement>>(({ className, ...props }, ref) => (
  <dialog
    className={cn(
      "rounded-lg shadow-lg bg-background p-6 border border-border w-full max-w-lg",
      className
    )}
    ref={ref}
    {...props}
  />
))
Dialog.displayName = "Dialog"
export { Dialog }

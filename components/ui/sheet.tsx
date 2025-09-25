import * as React from "react"
import { cn } from "../../lib/utils"


const Sheet = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
      className
    )}
    ref={ref}
    {...props}
  />
))
Sheet.displayName = "Sheet"
export { Sheet }

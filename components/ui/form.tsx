import * as React from "react"
import { cn } from "../../lib/utils"


const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(({ className, ...props }, ref) => (
  <form
    className={cn(
      "space-y-4",
      className
    )}
    ref={ref}
    {...props}
  />
))
Form.displayName = "Form"
export { Form }

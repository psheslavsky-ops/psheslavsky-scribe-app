// Minimal toast type stubs — actual toasting is handled by sonner
import * as React from "react"

export type ToastProps = {
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement

// src/components/tutorial/TutorialLauncher.tsx
// Reusable tutorial launcher component with built-in button and modal.
// Works across pages. No `any`. Fully typed and accessible.

import React, { useMemo, useState } from "react"
import Tutorial from "./Tutorial"
import type { TutorialStep } from "./Tutorial"

type Placement = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "inline"

type Props = {
  /** Provide tutorial steps or a factory that returns steps */
  steps: TutorialStep[] | (() => TutorialStep[])
  /** Visible button label */
  label?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** Button placement. `inline` renders in normal flow; others use absolute positioning */
  placement?: Placement
  /** Optional extra class on the button wrapper (useful for fine-grained layout) */
  className?: string
  /** Outline or filled look */
  variant?: "outline" | "filled"
  /** Optional leading icon; if not provided, a default info icon is used */
  icon?: React.ReactNode
}

/** Map placement to positioning classes */
const placementClass: Record<Exclude<Placement, "inline">, string> = {
  "top-right": "absolute top-4 right-4 sm:top-6 sm:right-6",
  "top-left": "absolute top-4 left-4 sm:top-6 sm:left-6",
  "bottom-right": "absolute bottom-4 right-4 sm:bottom-6 sm:right-6",
  "bottom-left": "absolute bottom-4 left-4 sm:bottom-6 sm:left-6",
}

/** Default info icon (stroke) */
function InfoIcon(): React.ReactElement {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-hidden="true"
    >
      <path
        d="M12 8.5h.01M12 17v-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} />
    </svg>
  )
}

/** Button styles for two variants */
const baseBtn =
  "inline-flex items-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
const outlineBtn =
  "border-2 border-primary bg-white text-primary hover:bg-primary hover:text-white shadow-md px-5 py-3"
const filledBtn =
  "bg-primary text-white hover:bg-primary/90 shadow-md px-5 py-3"

export default function TutorialLauncher({
  steps,
  label = "View Tutorial",
  ariaLabel = "View Tutorial",
  placement = "top-right",
  className = "",
  variant = "outline",
  icon,
}: Props): React.ReactElement {
  // Local open/close state
  const [open, setOpen] = useState(false)

  // Normalize steps input to an array and memoize
  const resolvedSteps: TutorialStep[] = useMemo(
    () => (typeof steps === "function" ? steps() : steps),
    [steps]
  )

  // Decide wrapper positioning
  const wrapperClass =
    placement === "inline"
      ? className
      : `${placementClass[placement as Exclude<Placement, "inline">]} ${className}`

  // Compose button styles
  const variantClass = variant === "filled" ? filledBtn : outlineBtn

  return (
    <>
      {/* Launcher button */}
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${baseBtn} ${variantClass}`}
          aria-label={ariaLabel}
        >
          {icon ?? <InfoIcon />}
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Tutorial</span>
        </button>
      </div>

      {/* Tutorial modal overlay */}
      <Tutorial steps={resolvedSteps} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

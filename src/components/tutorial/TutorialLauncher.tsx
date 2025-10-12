// src/components/tutorial/TutorialLauncher.tsx
// Reusable tutorial launcher component with built-in button and modal
// Mobile optimized: shows icon-only button on small screens
// Desktop: shows full button with text
// Works across all pages with consistent styling

import React, { useMemo, useState } from "react"
import Tutorial from "./Tutorial"
import type { TutorialStep } from "./Tutorial"

/**
 * Button placement options
 * - Absolute positions: places button absolutely in corners
 * - inline: renders button in normal document flow
 */
type Placement = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "inline"

/**
 * Props for TutorialLauncher component
 */
type Props = {
  /** Tutorial steps array or factory function that returns steps */
  steps: TutorialStep[] | (() => TutorialStep[])
  /** Button text label (hidden on mobile, shown on desktop) */
  label?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** Button placement strategy */
  placement?: Placement
  /** Optional extra CSS class for the wrapper */
  className?: string
  /** Button visual style variant */
  variant?: "outline" | "filled"
  /** Optional custom icon (defaults to info icon) */
  icon?: React.ReactNode
}

/**
 * Map placement to Tailwind positioning classes
 */
const placementClass: Record<Exclude<Placement, "inline">, string> = {
  "top-right": "absolute top-4 right-4 sm:top-6 sm:right-8",
  "top-left": "absolute top-4 left-4 sm:top-6 sm:left-8",
  "bottom-right": "absolute bottom-4 right-4 sm:bottom-6 sm:right-8",
  "bottom-left": "absolute bottom-4 left-4 sm:bottom-6 sm:left-8",
}

/**
 * Default info/help icon component (SVG)
 * Used when no custom icon is provided
 */
function InfoIcon(): React.ReactElement {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * TutorialLauncher Component
 * 
 * Renders a button that launches the tutorial overlay when clicked.
 * Automatically adjusts for mobile (icon-only) and desktop (icon + text).
 * 
 * Features:
 * - Mobile: Circular icon-only button for minimal footprint
 * - Desktop: Full button with icon and text
 * - Flexible placement (absolute positioning or inline)
 * - Two style variants (outline/filled)
 * - Fully accessible with ARIA labels
 * - Manages tutorial open/close state internally
 * 
 * @example
 * ```tsx
 * // Top-right corner with outline style
 * <TutorialLauncher
 *   steps={getProfileTutorialSteps()}
 *   placement="top-right"
 *   label="View Tutorial"
 *   variant="outline"
 * />
 * 
 * // Inline with filled style
 * <TutorialLauncher
 *   steps={tutorialSteps}
 *   placement="inline"
 *   variant="filled"
 * />
 * ```
 */
export default function TutorialLauncher({
  steps,
  label = "View Tutorial",
  ariaLabel = "View Tutorial",
  placement = "top-right",
  className = "",
  variant = "outline",
  icon,
}: Props): React.ReactElement {
  // Internal state for tutorial open/close
  const [open, setOpen] = useState(false)

  // Normalize steps input (handle both array and factory function)
  const resolvedSteps: TutorialStep[] = useMemo(
    () => (typeof steps === "function" ? steps() : steps),
    [steps]
  )

  // Determine wrapper positioning class
  const wrapperClass =
    placement === "inline"
      ? className
      : `${placementClass[placement as Exclude<Placement, "inline">]} ${className}`

  // Get the icon to display (custom or default)
  const displayIcon = icon ?? <InfoIcon />

  return (
    <>
      {/* Launcher button wrapper */}
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          className={
            variant === "outline"
              ? // Outline variant styling
                "inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 " +
                "border-2 border-primary bg-white text-primary shadow-lg " +
                "hover:bg-primary hover:text-white " +
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 " +
                // Mobile: icon-only circular button (40px)
                "w-10 h-10 justify-center sm:w-auto sm:h-auto sm:px-5 sm:py-3 sm:justify-start"
              : // Filled variant styling
                "inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 " +
                "bg-primary text-white shadow-lg " +
                "hover:bg-primary/90 " +
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 " +
                // Mobile: icon-only circular button (40px)
                "w-10 h-10 justify-center sm:w-auto sm:h-auto sm:px-5 sm:py-3 sm:justify-start"
          }
        >
          {/* Icon - always visible */}
          {displayIcon}
          
          {/* Text label - hidden on mobile, visible on desktop */}
          <span className="hidden sm:inline">{label}</span>
        </button>
      </div>

      {/* Tutorial modal overlay */}
      <Tutorial
        steps={resolvedSteps}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
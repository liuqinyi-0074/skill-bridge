// src/components/tutorial/TutorialLauncher.tsx
// Tutorial launcher with headerOffset-aware absolute positioning.
// - Mobile: icon-only circular button
// - Desktop: icon + label
// - Top placements: override `top` per breakpoint to avoid fixed header
// - Higher z-index than common headers
// - New: auto-open once per browser via localStorage key

import React, { useEffect, useMemo, useState } from "react";
import Tutorial from "./Tutorial";
import type { TutorialStep } from "./Tutorial";

type Placement = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "inline";

type Props = {
  steps: TutorialStep[] | (() => TutorialStep[]);
  label?: string;
  ariaLabel?: string;
  placement?: Placement;
  className?: string;
  variant?: "outline" | "filled";
  icon?: React.ReactNode;
  /** Fixed header height in px, e.g., 64 for h-16. */
  headerOffset?: number;
  /** z-index for the launcher wrapper; default higher than header (z-40). */
  zIndex?: number;
  /** Pass-through to Tutorial for scroll-centering. */
  tutorialHeaderOffset?: number;
  /** Auto open once per browser session based on a stable key. */
  autoOpenOnceKey?: string;
  /** Optional delay before auto open (ms). */
  autoOpenDelayMs?: number;
};

const placementBase: Record<Exclude<Placement, "inline">, string> = {
  "top-right": "absolute right-4 sm:right-8",
  "top-left": "absolute left-4 sm:left-8",
  "bottom-right": "absolute bottom-4 right-4 sm:bottom-6 sm:right-8",
  "bottom-left": "absolute bottom-4 left-4 sm:bottom-6 sm:left-8",
};

function InfoIcon(): React.ReactElement {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function TutorialLauncher({
  steps,
  label = "View Tutorial",
  ariaLabel = "View Tutorial",
  placement = "top-right",
  className = "",
  variant = "outline",
  icon,
  headerOffset = 0,
  zIndex = 60,
  tutorialHeaderOffset,
  autoOpenOnceKey,
  autoOpenDelayMs = 0,
}: Props): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  const resolvedSteps: TutorialStep[] = useMemo(
    () => (typeof steps === "function" ? (steps as () => TutorialStep[])() : steps),
    [steps]
  );

  const isInline = placement === "inline";
  const isTop = placement === "top-right" || placement === "top-left";

  const baseClass = isInline ? className : `${placementBase[placement as Exclude<Placement, "inline">]} ${className}`;
  const displayIcon = icon ?? <InfoIcon />;

  const btnClass =
    variant === "outline"
      ? "inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 " +
        "border-2 border-primary bg-white text-primary shadow-lg " +
        "hover:bg-primary hover:text-white " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 " +
        "w-10 h-10 justify-center sm:w-auto sm:h-auto sm:px-5 sm:py-3 sm:justify-start"
      : "inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 " +
        "bg-primary text-white shadow-lg " +
        "hover:bg-primary/90 " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 " +
        "w-10 h-10 justify-center sm:w-auto sm:h-auto sm:px-5 sm:py-3 sm:justify-start";

  // Auto open once per browser based on a stable key
  useEffect(() => {
    if (!autoOpenOnceKey) return;
    const seen = localStorage.getItem(autoOpenOnceKey) === "1";
    if (seen) return;
    const t = window.setTimeout(() => {
      setOpen(true);
      localStorage.setItem(autoOpenOnceKey, "1");
    }, Math.max(0, autoOpenDelayMs));
    return () => window.clearTimeout(t);
  }, [autoOpenOnceKey, autoOpenDelayMs]);

  if (!isInline && isTop) {
    const topMobile = headerOffset + 16; // top-4 = 16px
    const topDesktop = headerOffset + 24; // sm:top-6 = 24px

    return (
      <>
        {/* mobile wrapper */}
        <div
          className={`${baseClass} sm:hidden`}
          style={{ position: "absolute", top: topMobile, zIndex, pointerEvents: "auto" }}
        >
          <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className={btnClass}>
            {displayIcon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        </div>

        {/* ≥sm wrapper */}
        <div
          className={`${baseClass} hidden sm:block`}
          style={{ position: "absolute", top: topDesktop, zIndex, pointerEvents: "auto" }}
        >
          <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className={btnClass}>
            {displayIcon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        </div>

        <Tutorial
          steps={resolvedSteps}
          isOpen={open}
          onClose={() => setOpen(false)}
          headerOffset={tutorialHeaderOffset ?? headerOffset}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={isInline ? className : baseClass}
        style={!isInline ? { position: "absolute", zIndex, pointerEvents: "auto" } : undefined}
      >
        <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className={btnClass}>
          {displayIcon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      </div>

      <Tutorial
        steps={resolvedSteps}
        isOpen={open}
        onClose={() => setOpen(false)}
        headerOffset={tutorialHeaderOffset ?? headerOffset}
      />
    </>
  );
}

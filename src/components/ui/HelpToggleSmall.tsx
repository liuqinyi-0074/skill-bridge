// src/components/ui/HelpToggleSmall.tsx
// Lightweight tooltip component for contextual help
// Fixed: No more bouncing/flickering on small screens
// All English comments

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { HelpCircle } from "lucide-react";

type Placement = "top" | "bottom" | "left" | "right";
type OpenOn = "hover" | "click" | "both";

type Props = {
  /** Text or rich content inside the tooltip */
  text: ReactNode;
  /** Where the tooltip should appear relative to the trigger */
  placement?: Placement;
  /** Optional custom trigger; defaults to a small help icon */
  trigger?: ReactNode;
  /** Control how the tooltip opens */
  openOn?: OpenOn;
  /** Optional extra class for the root wrapper */
  className?: string;
  /** Optional delay in ms before showing on hover */
  hoverDelay?: number;
};

/**
 * HelpToggleSmall Component
 * 
 * A lightweight, responsive tooltip component for displaying contextual help.
 * 
 * Features:
 * - Fully responsive across all screen sizes (mobile to desktop)
 * - Smart positioning that adjusts to viewport boundaries
 * - Full keyboard navigation (Tab to focus, Escape to close)
 * - Screen reader accessible with proper ARIA attributes
 * - Flexible interaction modes: hover, click, or both
 * - Smooth animations with Tailwind
 * - Fixed: No infinite re-positioning loops on small screens
 * 
 * @example
 * <HelpToggleSmall
 *   text="This is helpful information"
 *   placement="top"
 *   openOn="both"
 * />
 */
export default function HelpToggleSmall({
  text,
  placement = "top",
  trigger,
  openOn = "hover",
  className,
  hoverDelay = 80,
}: Props) {
  // State management
  const [open, setOpen] = useState<boolean>(false);
  const [adjustedPlacement, setAdjustedPlacement] = useState<Placement>(placement);
  
  // Refs for DOM manipulation and cleanup
  const hoverTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isAdjustingRef = useRef<boolean>(false); // Prevent infinite adjustment loops
  
  // Unique ID for ARIA relationship
  const id = useId();

  /**
   * Smart positioning: Adjust tooltip position to stay within viewport
   * Prevents tooltip from being cut off at screen edges
   * 
   * FIXED: Use requestAnimationFrame to prevent infinite loops
   * and add threshold to avoid micro-adjustments
   */
  useEffect(() => {
    if (!open || !tooltipRef.current || !triggerRef.current) return;
    if (isAdjustingRef.current) return; // Prevent re-entrant calls

    isAdjustingRef.current = true;

    // Use RAF to batch DOM reads and prevent layout thrashing
    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      
      if (!tooltip || !trigger) {
        isAdjustingRef.current = false;
        return;
      }

      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Add threshold to prevent micro-adjustments (10px buffer)
      const threshold = 10;
      let newPlacement = placement;

      // Check horizontal boundaries with threshold
      if (tooltipRect.right > viewportWidth - threshold) {
        newPlacement = "left";
      } else if (tooltipRect.left < threshold) {
        newPlacement = "right";
      }

      // Check vertical boundaries with threshold
      // Only override horizontal adjustment if necessary
      if (tooltipRect.bottom > viewportHeight - threshold) {
        newPlacement = "top";
      } else if (tooltipRect.top < threshold) {
        newPlacement = "bottom";
      }

      // Only update if placement actually changed
      if (newPlacement !== adjustedPlacement) {
        setAdjustedPlacement(newPlacement);
      }

      isAdjustingRef.current = false;
    });
  }, [open, placement, adjustedPlacement]);

  /**
   * Cleanup: Clear any pending hover timers on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /**
   * Outside click handler: Close tooltip when clicking outside
   */
  useEffect(() => {
    if (!open) return;
    
    const onDocClick = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  /**
   * Escape key handler: Close tooltip and return focus to trigger
   * Essential for keyboard accessibility
   */
  useEffect(() => {
    if (!open) return;
    
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Schedule tooltip opening with delay to prevent flickering
   */
  const scheduleOpen = (): void => {
    if (open) return;
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setOpen(true), hoverDelay);
  };

  /**
   * Immediately close tooltip and clear timers
   */
  const closeNow = (): void => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    setOpen(false);
  };

  /**
   * Handle click toggle (when enabled)
   */
  const onClickToggle = (): void => {
    if (openOn === "click" || openOn === "both") {
      setOpen((v) => !v);
    }
  };

  /**
   * Handle mouse enter for hover interactions
   */
  const onMouseEnter = (): void => {
    if (openOn === "hover" || openOn === "both") {
      scheduleOpen();
    }
  };

  /**
   * Handle mouse leave for hover interactions
   */
  const onMouseLeave = (): void => {
    if (openOn === "hover" || openOn === "both") {
      closeNow();
    }
  };

  /**
   * Handle focus for keyboard navigation
   */
  const onFocus = (): void => {
    if (openOn === "hover" || openOn === "both") {
      setOpen(true);
    }
  };

  /**
   * Handle blur - close only if focus moves outside component
   */
  const onBlur = (e: React.FocusEvent): void => {
    if (!rootRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  /**
   * Get responsive width classes
   * Mobile: 90vw max 280px
   * Tablet (sm): max 320px
   * Desktop (md+): max 384-448px
   */
  const getResponsiveWidth = (): string => {
    return "w-[90vw] max-w-[280px] sm:max-w-[320px] md:max-w-sm lg:max-w-md";
  };

  /**
   * Compute tooltip position classes based on adjusted placement
   */
  const placementBox = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[adjustedPlacement];

  /**
   * Compute arrow position classes
   */
  const placementArrow = {
    top: "top-full left-1/2 -translate-x-1/2 -mt-[1px]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-[1px]",
    left: "left-full top-1/2 -translate-y-1/2 -ml-[1px]",
    right: "right-full top-1/2 -translate-y-1/2 -mr-[1px]",
  }[adjustedPlacement];

  /**
   * Arrow border classes - hide specific sides for visual merging
   */
  const arrowBorder = {
    top: "border-t-0 border-l-0",
    bottom: "border-b-0 border-r-0",
    left: "border-l-0 border-b-0",
    right: "border-r-0 border-t-0",
  }[adjustedPlacement];

  return (
    <span
      ref={rootRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onBlur={onBlur}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label="Show help information"
        onClick={onClickToggle}
        onFocus={onFocus}
        className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full 
                   bg-primary text-white shadow-sm transition-all duration-200
                   hover:bg-primary/90 hover:shadow-md
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40
                   active:scale-95"
        title="Help"
      >
        {trigger ?? <HelpCircle size={14} />}
      </button>

      {/* Tooltip content */}
      {open && (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={clsx(
            "absolute z-[9999]",
            getResponsiveWidth(),
            "rounded-lg border border-gray-200 bg-white shadow-xl",
            "px-3 py-2.5 sm:px-3.5 sm:py-3",
            "text-xs sm:text-sm leading-relaxed text-ink",
            "break-words hyphens-auto",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            placementBox
          )}
        >
          {/* Text content */}
          <div className="space-y-1">{text}</div>

          {/* Tooltip arrow */}
          <span
            className={clsx(
              "pointer-events-none absolute h-2 w-2 rotate-45",
              "border border-gray-200 bg-white",
              arrowBorder,
              placementArrow
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </span>
  );
}
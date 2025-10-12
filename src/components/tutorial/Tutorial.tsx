// src/components/tutorial/Tutorial.tsx
// Reusable tutorial/onboarding component with spotlight effect
// Optimized for mobile with fixed bottom positioning and scrollable content

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Single tutorial step definition
 */
export interface TutorialStep {
  /** Unique identifier for this step */
  id: string;
  /** CSS selector for the element to highlight (e.g., "#stats-section") */
  target: string;
  /** Title of the tutorial step */
  title: string;
  /** Description/content of the tutorial step */
  content: string;
  /** Optional: Position of the tooltip relative to highlighted element */
  placement?: "top" | "bottom" | "left" | "right";
}

/**
 * Props for Tutorial component
 */
export interface TutorialProps {
  /** Array of tutorial steps */
  steps: TutorialStep[];
  /** Whether tutorial is active/visible */
  isOpen: boolean;
  /** Callback when tutorial is closed/completed */
  onClose: () => void;
  /** Optional: Custom z-index for overlay (default: 9999) */
  zIndex?: number;
}

/**
 * Tutorial Component
 * 
 * Creates an interactive tutorial overlay with spotlight effect.
 * Highlights specific elements on the page and guides users through them.
 * 
 * Features:
 * - Full-page overlay with darkened background
 * - Spotlight effect on target elements
 * - Step-by-step navigation
 * - Keyboard support (ESC to close, Arrow keys to navigate)
 * - Responsive tooltip positioning
 * - Mobile-optimized: fixed bottom position with scrollable content
 * - Smooth transitions
 * 
 * @example
 * ```tsx
 * const steps: TutorialStep[] = [
 *   {
 *     id: "step-1",
 *     target: "#hero-section",
 *     title: "Welcome!",
 *     content: "This is your personalized career insights dashboard.",
 *     placement: "bottom"
 *   }
 * ];
 * 
 * <Tutorial steps={steps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
 * ```
 */
export default function Tutorial({
  steps,
  isOpen,
  onClose,
  zIndex = 9999,
}: TutorialProps): React.ReactElement | null {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const totalSteps = steps.length;
  const step = steps[currentStep];

  /**
   * Update highlighted element position and scroll to it
   * Mobile optimized: gentle scrolling with space for tooltip
   */
  const updateHighlight = useCallback(() => {
    if (!step?.target) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      console.warn(`Tutorial: Element not found for selector "${step.target}"`);
      setHighlightRect(null);
      return;
    }

    const currentScrollY = window.scrollY;
    const elementRect = element.getBoundingClientRect();
    const absoluteTop = elementRect.top + currentScrollY;
    const elementHeight = elementRect.height;
    const viewportHeight = window.innerHeight;
    
    // Detect mobile viewport
    const isMobile = window.innerWidth < 640;
    
    // Calculate scroll position
    let targetScrollY;
    
    if (isMobile) {
      // Mobile: scroll element to upper 20% of viewport, leaving space for tooltip at bottom
      targetScrollY = absoluteTop - (viewportHeight * 0.2);
      
      // For large elements, align to top instead
      if (elementHeight > viewportHeight * 0.3) {
        targetScrollY = absoluteTop - 80;
      }
    } else if (elementHeight > viewportHeight * 0.7) {
      // Desktop large element: align to top
      targetScrollY = absoluteTop - 80;
    } else {
      // Desktop small element: center in viewport
      targetScrollY = absoluteTop - (viewportHeight / 2) + (elementHeight / 2);
    }
    
    // Instant scroll for better performance
    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: "auto",
    });
    
    // Get rect after scroll completes
    requestAnimationFrame(() => {
      const newRect = element.getBoundingClientRect();
      setHighlightRect(newRect);
    });
  }, [step]);

  /**
   * Calculate tooltip position style
   * Mobile: fixed at bottom with limited height
   * Desktop: smart positioning around highlighted element
   */
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      return { display: "none" };
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Responsive breakpoints (Tailwind-style)
    const isMobile = viewportWidth < 640; // < sm
    const isTablet = viewportWidth >= 640 && viewportWidth < 1024; // sm to lg

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: (zIndex || 9999) + 2,
    };

    // Mobile: fixed bottom with limited height and scrollable content
    if (isMobile) {
      return {
        ...style,
        bottom: "16px",
        left: "16px",
        right: "16px",
        width: "auto",
        maxHeight: "40vh", // Limited height to ensure element visibility
        display: "flex",
        flexDirection: "column",
      };
    }

    // Tablet: bottom center with moderate width
    if (isTablet) {
      return {
        ...style,
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 60px)",
        maxWidth: "500px",
        maxHeight: "50vh",
      };
    }

    // Desktop: smart positioning based on available space
    const isLargeElement = highlightRect.height > viewportHeight * 0.6;
    const padding = 24;
    
    if (isLargeElement) {
      const spaceRight = viewportWidth - highlightRect.right;
      
      
      // Large element: prefer right side, fallback to bottom center
      if (spaceRight > 420) {
        return {
          ...style,
          left: `${highlightRect.right + padding}px`,
          top: `${Math.max(20, highlightRect.top)}px`,
          width: "400px",
          maxWidth: `${spaceRight - padding - 20}px`,
          maxHeight: "60vh",
        };
      }
      
      // Not enough space on right: bottom center with backdrop
      return {
        ...style,
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "450px",
        maxWidth: "calc(100vw - 80px)",
        maxHeight: "60vh",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(8px)",
      };
    }

    // Normal elements: position relative to highlight based on placement
    const placement = step.placement || "bottom";
    const spaceTop = highlightRect.top;
    const spaceBottom = viewportHeight - highlightRect.bottom;
    const spaceLeft = highlightRect.left;
    const spaceRight = viewportWidth - highlightRect.right;

    // Check available space in each direction
    const hasSpaceBottom = spaceBottom > 220;
    const hasSpaceTop = spaceTop > 220;
    const hasSpaceRight = spaceRight > 420;
    const hasSpaceLeft = spaceLeft > 420;
    
    // No space available: center overlay with backdrop
    if (!hasSpaceBottom && !hasSpaceTop && !hasSpaceRight && !hasSpaceLeft) {
      return {
        ...style,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(450px, calc(100vw - 40px))",
        maxHeight: "70vh",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(8px)",
      };
    }

    // Auto-adjust placement based on available space
    let finalPlacement = placement;
    if (placement === "bottom" && !hasSpaceBottom) {
      finalPlacement = hasSpaceTop ? "top" : (hasSpaceRight ? "right" : "left");
    } else if (placement === "top" && !hasSpaceTop) {
      finalPlacement = hasSpaceBottom ? "bottom" : (hasSpaceRight ? "right" : "left");
    }

    // Apply positioning based on final placement
    switch (finalPlacement) {
      case "top":
        return {
          ...style,
          bottom: `${viewportHeight - highlightRect.top + padding}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(450px, calc(100vw - 40px))",
          maxHeight: `min(${spaceTop - padding - 20}px, 60vh)`,
        };
      case "bottom":
        return {
          ...style,
          top: `${highlightRect.bottom + padding}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(450px, calc(100vw - 40px))",
          maxHeight: `min(${spaceBottom - padding - 20}px, 60vh)`,
        };
      case "left":
        return {
          ...style,
          right: `${viewportWidth - highlightRect.left + padding}px`,
          top: `${Math.max(20, Math.min(highlightRect.top, viewportHeight - 300))}px`,
          width: `min(${spaceLeft - padding - 20}px, 450px)`,
          maxHeight: "min(calc(100vh - 40px), 60vh)",
        };
      case "right":
        return {
          ...style,
          left: `${highlightRect.right + padding}px`,
          top: `${Math.max(20, Math.min(highlightRect.top, viewportHeight - 300))}px`,
          width: `min(${spaceRight - padding - 20}px, 450px)`,
          maxHeight: "min(calc(100vh - 40px), 60vh)",
        };
    }

    return style;
  };

  /**
   * Navigate to next step or close on final step
   */
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentStep, totalSteps, onClose]);

  /**
   * Navigate to previous step
   */
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  /**
   * Skip tutorial and close
   */
  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Update highlight when step changes
   * Includes delay to ensure DOM stability
   */
  useEffect(() => {
    if (isOpen && step) {
      const timer = setTimeout(() => {
        updateHighlight();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step, updateHighlight]);

  /**
   * Update highlight on window resize or DOM changes
   * Uses MutationObserver to detect layout changes
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updateHighlight();
    
    // Observer to detect DOM mutations (e.g., error banner appearing)
    const observer = new MutationObserver(() => {
      updateHighlight();
    });

    // Observe body for layout changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [isOpen, updateHighlight]);

  /**
   * Keyboard navigation
   * - Escape: close tutorial
   * - ArrowRight/Enter: next step
   * - ArrowLeft: previous step
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  // Don't render if not open or no step
  if (!isOpen || !step) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="tutorial-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: zIndex || 9999,
        pointerEvents: "none",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
    >
      {/* Dark backdrop overlay */}
      <div
        className="tutorial-backdrop"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          transition: "opacity 0.3s ease",
          pointerEvents: "auto",
        }}
        onClick={handleSkip}
      />

      {/* Spotlight highlight box around target element */}
      {highlightRect && (
        <div
          className="tutorial-spotlight"
          style={{
            position: "absolute",
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            border: "3px solid #3b82f6",
            borderRadius: "8px",
            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.2)",
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip card with content and controls */}
      <div
        ref={tooltipRef}
        className="tutorial-tooltip"
        style={{ ...getTooltipStyle(), pointerEvents: "auto" }}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {/* Header section */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h3
                  id="tutorial-title"
                  className="text-base sm:text-lg font-bold text-slate-900 mb-1"
                >
                  {step.title}
                </h3>
                <div className="text-xs sm:text-sm text-slate-500">
                  Step {currentStep + 1} of {totalSteps}
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close tutorial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content text */}
            <p id="tutorial-content" className="text-sm sm:text-base text-slate-700 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Fixed footer with navigation buttons */}
          <div className="flex-shrink-0 border-t border-slate-200 p-3 sm:p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              {/* Previous button */}
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg
                         hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Previous step"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              
              {/* Skip button */}
              <button
                onClick={handleSkip}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Skip tutorial"
              >
                Skip
              </button>

              {/* Next/Finish button */}
              <button
                onClick={handleNext}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                         hover:bg-blue-700 transition-all shadow-sm"
                aria-label={currentStep === totalSteps - 1 ? "Finish tutorial" : "Next step"}
              >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
// ============================================================================
// FILE 1: src/components/tutorial/Tutorial.tsx
// Reusable tutorial/onboarding component with spotlight effect
// ============================================================================

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

  const totalSteps = steps.length;
  const step = steps[currentStep];

  /**
   * Update highlighted element position and scroll to center
   * Optimized for speed and large elements
   */
  const updateHighlight = useCallback(() => {
    if (!step?.target) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      setHighlightRect(null);
      return;
    }

    // Get current scroll position
    const currentScrollY = window.scrollY;
    
    // Get element position relative to document
    const elementRect = element.getBoundingClientRect();
    const absoluteTop = elementRect.top + currentScrollY;
    const elementHeight = elementRect.height;
    
    // Calculate where to scroll
    const viewportHeight = window.innerHeight;
    
    // For large elements, align to top with some padding
    // For small elements, center them
    let targetScrollY;
    if (elementHeight > viewportHeight * 0.7) {
      // Large element: align to top with 80px padding
      targetScrollY = absoluteTop - 80;
    } else {
      // Small element: center it
      targetScrollY = absoluteTop - (viewportHeight / 2) + (elementHeight / 2);
    }
    
    // Use instant scroll for better performance
    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: "auto", // Changed from "smooth" to "auto" for instant scroll
    });
    
    // Immediately update highlight rect (no delay needed)
    requestAnimationFrame(() => {
      const newRect = element.getBoundingClientRect();
      setHighlightRect(newRect);
    });
  }, [step]);

  /**
   * Go to next step
   */
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentStep, totalSteps, onClose]);

  /**
   * Go to previous step
   */
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  /**
   * Skip tutorial
   */
  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Update highlight when step changes
   */
  useEffect(() => {
    if (isOpen && step) {
      // Minimal delay for instant response
      const timer = setTimeout(() => {
        updateHighlight();
      }, 50); // Reduced from 100ms to 50ms
      return () => clearTimeout(timer);
    }
  }, [isOpen, step, updateHighlight]);

  /**
   * Update highlight on window resize or when content changes
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updateHighlight();
    
    // Use MutationObserver to detect layout changes (like error banner appearing)
    const observer = new MutationObserver(() => {
      updateHighlight();
    });

    // Observe changes to the body and main content area
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
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          handleSkip();
          break;
        case "ArrowRight":
        case "Enter":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  /**
   * Prevent body scroll when tutorial is open
   * But allow programmatic scrolling for centering elements
   */
  useEffect(() => {
    if (isOpen) {


      // Prevent user scroll but allow programmatic scroll
      const preventScroll = (e: WheelEvent | TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };

      // Add passive: false to allow preventDefault
      document.addEventListener("wheel", preventScroll, { passive: false });
      document.addEventListener("touchmove", preventScroll, { passive: false });

      return () => {
        document.removeEventListener("wheel", preventScroll);
        document.removeEventListener("touchmove", preventScroll);
      };
    }
  }, [isOpen]);

  // Don't render if not open or no steps
  if (!isOpen || totalSteps === 0) {
    return null;
  }

  /**
   * Calculate tooltip position based on highlighted element and placement
   * Responsive design for all screen sizes (Tailwind breakpoints)
   * Allows overlay on highlight when space is limited
   */
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Tailwind-style breakpoints
    const isMobile = viewportWidth < 640; // sm
    const isTablet = viewportWidth >= 640 && viewportWidth < 1024; // sm-lg


    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: (zIndex || 9999) + 2,
    };

    // For very large highlighted elements (>60% of viewport height)
    const isLargeElement = highlightRect.height > viewportHeight * 0.6;
    
    // On mobile, always show tooltip at bottom center (fixed position)
    if (isMobile) {
      style.bottom = "20px";
      style.left = "50%";
      style.transform = "translateX(-50%)";
      style.width = "calc(100% - 40px)";
      style.maxWidth = "calc(100vw - 40px)";
      style.height = "auto";
      style.maxHeight = "45vh"; // Fixed max height
      return style;
    }

    // On tablet, show at bottom with more width
    if (isTablet) {
      style.bottom = "20px";
      style.left = "50%";
      style.transform = "translateX(-50%)";
      style.width = "calc(100% - 60px)";
      style.maxWidth = "500px";
      style.height = "auto";
      style.maxHeight = "50vh"; // Fixed max height
      return style;
    }

    // Desktop: Smart positioning
    if (isLargeElement) {
      // For large elements, check available space
      const spaceRight = viewportWidth - highlightRect.right;
      const spaceBottom = viewportHeight - highlightRect.bottom;
      
      // If not enough space on the side, overlay on the element
      if (spaceRight < 450 && spaceBottom < 300) {
        // Overlay at bottom-center of viewport
        style.bottom = "40px";
        style.left = "50%";
        style.transform = "translateX(-50%)";
        style.width = "450px";
        style.maxWidth = "calc(100vw - 80px)";
        style.height = "auto";
        style.maxHeight = "60vh"; // Fixed max height
        // Add semi-transparent backdrop to make text readable
        style.backgroundColor = "rgba(255, 255, 255, 0.98)";
        style.backdropFilter = "blur(8px)";
        return style;
      }
      
      // Otherwise show in bottom-right corner
      style.bottom = "40px";
      style.right = "40px";
      style.width = "400px";
      style.maxWidth = "calc(100vw - 80px)";
      style.height = "auto";
      style.maxHeight = "60vh"; // Fixed max height
      return style;
    }

    // Normal elements: Position relative to highlight
    const placement = step.placement || "bottom";
    const padding = 24;
    const spaceTop = highlightRect.top;
    const spaceBottom = viewportHeight - highlightRect.bottom;
    const spaceLeft = highlightRect.left;
    const spaceRight = viewportWidth - highlightRect.right;

    // Check if there's enough space anywhere
    const hasSpaceBottom = spaceBottom > 200;
    const hasSpaceTop = spaceTop > 200;
    const hasSpaceRight = spaceRight > 400;
    const hasSpaceLeft = spaceLeft > 400;
    
    // If no space available, overlay on the element
    if (!hasSpaceBottom && !hasSpaceTop && !hasSpaceRight && !hasSpaceLeft) {
      style.top = "50%";
      style.left = "50%";
      style.transform = "translate(-50%, -50%)";
      style.width = "min(450px, calc(100vw - 40px))";
      style.maxWidth = "min(450px, calc(100vw - 40px))";
      style.height = "auto";
      style.maxHeight = "60vh";
      style.backgroundColor = "rgba(255, 255, 255, 0.98)";
      style.backdropFilter = "blur(8px)";
      return style;
    }

    // Auto-adjust placement based on available space
    let finalPlacement = placement;
    
    if (placement === "bottom" && !hasSpaceBottom) {
      finalPlacement = hasSpaceTop ? "top" : (hasSpaceRight ? "right" : "left");
    } else if (placement === "top" && !hasSpaceTop) {
      finalPlacement = hasSpaceBottom ? "bottom" : (hasSpaceRight ? "right" : "left");
    }

    // Apply positioning
    switch (finalPlacement) {
      case "top":
        style.bottom = `${viewportHeight - highlightRect.top + padding}px`;
        style.left = `50%`;
        style.transform = "translateX(-50%)";
        style.width = "min(450px, calc(100vw - 40px))";
        style.maxWidth = "min(450px, calc(100vw - 40px))";
        style.height = "auto";
        style.maxHeight = `min(${spaceTop - padding - 20}px, 60vh)`;
        break;
      case "bottom":
        style.top = `${highlightRect.bottom + padding}px`;
        style.left = `50%`;
        style.transform = "translateX(-50%)";
        style.width = "min(450px, calc(100vw - 40px))";
        style.maxWidth = "min(450px, calc(100vw - 40px))";
        style.height = "auto";
        style.maxHeight = `min(${spaceBottom - padding - 20}px, 60vh)`;
        break;
      case "left":
        style.right = `${viewportWidth - highlightRect.left + padding}px`;
        style.top = `${Math.max(20, Math.min(highlightRect.top, viewportHeight - 300))}px`;
        style.width = `min(${spaceLeft - padding - 20}px, 450px)`;
        style.maxWidth = `min(${spaceLeft - padding - 20}px, 450px)`;
        style.height = "auto";
        style.maxHeight = "min(calc(100vh - 40px), 60vh)";
        break;
      case "right":
        style.left = `${highlightRect.right + padding}px`;
        style.top = `${Math.max(20, Math.min(highlightRect.top, viewportHeight - 300))}px`;
        style.width = `min(${spaceRight - padding - 20}px, 450px)`;
        style.maxWidth = `min(${spaceRight - padding - 20}px, 450px)`;
        style.height = "auto";
        style.maxHeight = "min(calc(100vh - 40px), 60vh)";
        break;
    }

    return style;
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="tutorial-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      {/* Dark overlay with cutout for highlighted element */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 8}
                y={highlightRect.top - 8}
                width={highlightRect.width + 16}
                height={highlightRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlighted element border */}
      {highlightRect && (
        <div
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

      {/* Tooltip card - Always fully visible without scrolling */}
      <div
        className="tutorial-tooltip"
        style={getTooltipStyle()}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col" style={{ maxHeight: "inherit" }}>
            {/* Header - Fixed size */}
            <div className="flex items-start justify-between mb-2 sm:mb-3 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <h3
                  id="tutorial-title"
                  className="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1"
                >
                  {step.title}
                </h3>
                <div className="text-xs text-slate-500">
                  Step {currentStep + 1} of {totalSteps}
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors -mt-1"
                aria-label="Close tutorial"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content - Flexible with strict line clamp */}
            <div className="flex-1 min-h-0 mb-3 sm:mb-4 overflow-hidden">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-4 sm:line-clamp-5">
                {step.content}
              </p>
            </div>

            {/* Navigation - Compact and fixed */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  onClick={handleSkip}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Skip
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    {currentStep < totalSteps - 1 ? "Next" : "Done"}
                  </button>
                </div>
              </div>

              {/* Progress dots - Compact */}
              <div className="flex justify-center gap-1 pt-2 border-t border-slate-200">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-1 rounded-full transition-all ${
                      index === currentStep
                        ? "bg-blue-600 w-4"
                        : "bg-slate-300 hover:bg-slate-400 w-1"
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}



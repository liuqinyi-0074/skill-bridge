// Reusable tutorial/onboarding component with spotlight effect
// - Responsive tooltip: bottom sheet on mobile, centered on tablet, smart placement on desktop
// - Uses project Button component (primary color). Skip keeps original gray style.
// - Tooltip centered when target missing; throttled highlight updates; ResizeObserver for smoothness.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/Button";

/** Single tutorial step definition */
export interface TutorialStep {
  id: string;
  target: string; // CSS selector of the element to highlight
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right"; // reserved for future fine-tuning
}

/** Props for Tutorial component */
export interface TutorialProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  headerOffset?: number; // pixels to avoid fixed headers when auto-centering
}

/** Rect for spotlight box */
type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

/** Convert DOMRect → RectLike */
function toRectLike(r: DOMRect): RectLike {
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  };
}

/** Detect scrollable elements */
function isScrollable(el: Element): boolean {
  const s = window.getComputedStyle(el);
  const y = s.overflowY;
  const x = s.overflowX;
  const he = el as HTMLElement;
  const canY = (y === "auto" || y === "scroll") && he.scrollHeight > he.clientHeight;
  const canX = (x === "auto" || x === "scroll") && he.scrollWidth > he.clientWidth;
  return canY || canX;
}

/** Collect scrollable ancestors up to the document root */
function getScrollAncestors(el: Element): HTMLElement[] {
  const arr: HTMLElement[] = [];
  let p: Node | null = el.parentNode;
  while (p && p instanceof HTMLElement) {
    if (isScrollable(p)) arr.push(p);
    p = p.parentNode;
  }
  const root = document.scrollingElement as HTMLElement | null;
  if (root) arr.push(root);
  return arr;
}

/** Instantly center target in all scrollable ancestors */
function centerInAllScrollers(el: Element, headerOffset: number): void {
  const rect = (el as HTMLElement).getBoundingClientRect();
  const ancestors = getScrollAncestors(el);
  for (const scroller of ancestors) {
    const isPage = scroller === document.scrollingElement;
    const viewport = isPage
      ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      : (scroller as HTMLElement).getBoundingClientRect();
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const dx = tx - (viewport.left + viewport.width / 2);
    const dy = ty - (viewport.top + viewport.height / 2 - (isPage ? headerOffset : 0));
    if (isPage) {
      window.scrollTo({
        left: Math.max(0, scroller.scrollLeft + dx),
        top: Math.max(0, scroller.scrollTop + dy),
        behavior: "auto",
      });
    } else {
      (scroller as HTMLElement).scrollLeft = Math.max(0, (scroller as HTMLElement).scrollLeft + dx);
      (scroller as HTMLElement).scrollTop = Math.max(0, (scroller as HTMLElement).scrollTop + dy);
    }
  }
}

/** Get element if visible and measurable */
function resolveTarget(selector: string): Element | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return el;
}

export default function Tutorial({
  steps,
  isOpen,
  onClose,
  zIndex = 9999,
  headerOffset = 0,
}: TutorialProps): React.ReactElement | null {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [highlightRect, setHighlightRect] = useState<RectLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const step = steps[currentStep];
  const totalSteps = steps.length;

  /** Recalculate spotlight box */
  const updateHighlight = useCallback(() => {
    if (!step?.target) {
      setHighlightRect(null);
      return;
    }
    const el = resolveTarget(step.target);
    if (!el) {
      setHighlightRect(null);
      return;
    }

    centerInAllScrollers(el, headerOffset);
    // Double RAF to settle layout shifts before measuring
    requestAnimationFrame(() => {
      const r1 = (el as HTMLElement).getBoundingClientRect();
      requestAnimationFrame(() => {
        const r2 = (el as HTMLElement).getBoundingClientRect();
        setHighlightRect(toRectLike(r2.width > 0 ? r2 : r1));
      });
    });
  }, [step, headerOffset]);

  /** Throttled update */
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateHighlight();
    });
  }, [updateHighlight]);

  /** Step navigation */
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) setCurrentStep((i) => i + 1);
    else onClose();
  }, [currentStep, totalSteps, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((i) => i - 1);
  }, [currentStep]);

  const handleSkip = useCallback(() => onClose(), [onClose]);

  /** Update on step change */
  useEffect(() => {
    if (!isOpen || !step) return;
    const t = setTimeout(updateHighlight, 50);
    return () => clearTimeout(t);
  }, [isOpen, step, updateHighlight]);

  /** Scroll / resize / DOM mutation observers (throttled) */
  useEffect(() => {
    if (!isOpen) return;

    const onScroll = (): void => scheduleUpdate();
    const onResize = (): void => scheduleUpdate();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    const obs = new MutationObserver(() => scheduleUpdate());
    obs.observe(document.body, { subtree: true, childList: true, attributes: true });

    // Observe size changes of the target itself for smoother updates
    if (step?.target && "ResizeObserver" in window) {
      const el = resolveTarget(step.target);
      if (el) {
        roRef.current = new ResizeObserver(() => scheduleUpdate());
        roRef.current.observe(el as Element);
      }
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, step, scheduleUpdate]);

  /** Keyboard shortcuts */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") handleSkip();
      else if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  /** Responsive tooltip placement and sizing */
  const getTooltipStyle = useCallback((): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640; // < sm
    const isTablet = vw >= 640 && vw < 1024; // sm..lg
    const base: React.CSSProperties = { position: "fixed", zIndex: (zIndex || 9999) + 2 };

    // When target not found: center with responsive clamp width
    if (!highlightRect) {
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "clamp(280px, 92vw, 520px)",
        maxHeight: "min(80vh, 640px)",
      };
    }

    // Mobile: bottom sheet with gutters
    if (isMobile) {
      return {
        ...base,
        left: 12,
        right: 12,
        bottom: 12,
        width: "auto",
        maxHeight: "min(55vh, 460px)",
        borderRadius: 12,
      };
    }

    // Tablet: centered card
    if (isTablet) {
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "clamp(360px, 70vw, 560px)",
        maxHeight: "min(70vh, 560px)",
        borderRadius: 14,
      };
    }

    // Desktop: try below or above target, else center
    const pad = 24;
    const w = "clamp(380px, 40vw, 640px)";
    const spaceTop = highlightRect.top;
    const spaceBottom = vh - highlightRect.bottom;

    if (spaceBottom > 260) {
      return {
        ...base,
        top: highlightRect.bottom + pad,
        left: "50%",
        transform: "translateX(-50%)",
        width: w,
        maxHeight: "min(60vh, 560px)",
      };
    }
    if (spaceTop > 260) {
      return {
        ...base,
        bottom: vh - highlightRect.top + pad,
        left: "50%",
        transform: "translateX(-50%)",
        width: w,
        maxHeight: "min(60vh, 560px)",
      };
    }
    return {
      ...base,
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      width: w,
      maxHeight: "min(70vh, 600px)",
    };
  }, [highlightRect, zIndex]);

  if (!isOpen || !step) return null;

  return createPortal(
    <div
      className="tutorial-overlay"
      style={{ position: "fixed", inset: 0, zIndex: zIndex || 9999, pointerEvents: "none" }}
    >
      {/* Background dim */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", pointerEvents: "auto" }}
        onClick={handleSkip}
      />

      {/* Spotlight without shadow */}
      {highlightRect && (
        <div
          style={{
            position: "absolute",
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            border: "3px solid #3b82f6",
            borderRadius: 8,
            pointerEvents: "none",
            transition: "all 0.25s ease",
            boxShadow: "none", // no shadow on selected area
          }}
        />
      )}

      {/* Tooltip card */}
      <div style={{ ...getTooltipStyle(), pointerEvents: "auto" }}>
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base font-bold text-slate-900 sm:text-lg">{step.title}</h3>
                <div className="text-xs text-slate-500 sm:text-sm">
                  Step {currentStep + 1} of {totalSteps}
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 sm:text-base">{step.content}</p>
          </div>

          {/* Footer buttons */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handlePrev}
                disabled={currentStep === 0}
                aria-label="Previous"
              >
                Prev
              </Button>

              <button
                onClick={handleSkip}
                className="px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 sm:px-4"
                aria-label="Skip tutorial"
              >
                Skip
              </button>

              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                aria-label={currentStep === totalSteps - 1 ? "Finish" : "Next"}
              >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

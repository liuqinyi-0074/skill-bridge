// src/pages/Analyzer/AnalyzerSkillGap.tsx
// Complete implementation with navigation fix and NO category
// - Reads unmatched from Redux; if missing, falls back to route state ONLY
// - Does not write back to Redux
// - Allows exporting only the printable region to PDF
// - FIXED: Now passes complete state to next step

import React, { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import SkillGap, { type SkillItem } from "../../components/analyzer/SkillGap";
import Button from "../../components/ui/Button";
import GlobalError from "../../components/common/GlobalError";
import type { RootState } from "../../store";
import { useStepNav } from "../../hooks/useRouteStep";
import { exportElementToPdf } from "../../lib/utils/pdf";
import type { AnalyzerRouteState } from "../../types/routes";

/**
 * AnalyzerSkillGap Component
 * 
 * Displays the skill gaps (unmatched abilities) between user's current skills
 * and the requirements of their selected target occupation.
 * 
 * Features:
 * - Shows missing Knowledge, Tech Skills, and General Skills
 * - Exports skill gap report to PDF
 * - Reads from Redux or route state as fallback
 * - Passes complete state to next step (Training)
 * - NO CATEGORY - API doesn't return it
 */
export default function AnalyzerSkillGap(): React.ReactElement {
  const { goPrev, goNext } = useStepNav();
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Read complete analyzer state from Redux
  const store = useSelector((s: RootState) => s.analyzer);
  const unmatchedInStore = store.selectedJobUnmatched;

  // Route-state fallback from previous step (may be undefined)
  const routeState = (useLocation().state ?? {}) as AnalyzerRouteState | undefined;

  // Resolve unmatched with precedence: store → route → null
  const unmatched = unmatchedInStore ?? routeState?.unmatched ?? null;

  /**
   * Build complete navigation state to pass to next step
   * This ensures all data is preserved through the navigation chain
   */
  const buildNavigationState = (): AnalyzerRouteState => ({
    roles: store.chosenRoles,
    abilities: store.chosenAbilities,
    industries: store.interestedIndustryCodes ?? [],
    region: store.preferredRegion ?? "",
    selectedJob: store.selectedJob,
    unmatched: unmatched, // KEY FIX: Pass unmatched to next step
    training: store.trainingAdvice,
  });

  /**
   * Collect names from a bucket that may contain strings or objects
   * with common name fields (name, title, label, code)
   */
  const collect = (bucket: unknown): string[] => {
    if (!Array.isArray(bucket)) return [];
    
    return bucket
      .map((item) => {
        // Handle string items directly
        if (typeof item === "string") return item.trim();
        
        // Handle object items with various property names
        if (item && typeof item === "object") {
          const obj = item as { 
            name?: unknown; 
            title?: unknown; 
            code?: unknown; 
            label?: unknown 
          };
          
          const candidate =
            (typeof obj.name === "string" && obj.name) ||
            (typeof obj.title === "string" && obj.title) ||
            (typeof obj.label === "string" && obj.label) ||
            (typeof obj.code === "string" && obj.code);
          
          return candidate ? candidate.trim() : "";
        }
        
        return "";
      })
      .filter((v): v is string => v.length > 0);
  };

  /**
   * Build the list of missing skills for <SkillGap/> component
   * 
   * Returns:
   * - undefined → data missing (show error UI)
   * - []        → no gap (show green success box)
   * - [items]   → render SkillGap with "Missing" status
   */
  const missingItems: SkillItem[] | undefined = useMemo(() => {
    // If unmatched is null, we don't have data yet
    if (unmatched === null) return undefined;

    const out: SkillItem[] = [];

    // Collect Knowledge items
    const knowledge = collect(unmatched.knowledge);
    for (const k of knowledge) {
      out.push({ name: k, status: "Missing" });
    }

    // Collect Tech Skills items
    const tech = collect(unmatched.tech);
    for (const t of tech) {
      out.push({ name: t, status: "Missing"});
    }

    // Collect General Skills items
    const skill = collect(unmatched.skill);
    for (const s of skill) {
      out.push({ name: s, status: "Missing"});
    }

    return out;
  }, [unmatched]);

  // Determine if we have missing skills
  const hasMissing = Boolean(missingItems && missingItems.length > 0);
  
  // Determine if we have a data error (unmatched is null)
  const hasDataError = missingItems === undefined;

  /**
   * Export the skill gap report to PDF
   */
  const handleExport = async () => {
    if (!printAreaRef.current) return;
    
    try {
      await exportElementToPdf(
        printAreaRef.current,
        "skill-gap-report.pdf",
      );
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  };

  return (
    <AnalyzerLayout
      title="Skill gaps"
      helpContent={{
        title: "Understanding your skill gaps",
        subtitle: "Review the skills you're missing for your target role.",
        features: [
          "Skills are categorized by type (Knowledge, Technical, General Skills).",
          "Each skill represents an ability you'll need to develop or acquire.",
          "Plan your learning journey by addressing these gaps systematically.",
        ],
        howTo: [
          "Review each category to understand where you need to improve.",
          "Export this report as PDF to track your progress over time.",
          "Use this information to guide your training and development choices.",
        ],
        tips: [
          "Focus on the most critical skills first.",
          "Some skills may be learned on the job, others may require formal training.",
          "Don't be discouraged by the list - everyone has skill gaps!",
        ],
      }}
    >
      {/* Export button (top-right) */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          disabled={!hasMissing}
          aria-label="Export skill gap report to PDF"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export as PDF
        </Button>
      </div>

      {/* Printable content area */}
      <div ref={printAreaRef}>
        {/* Error state: No data available */}
        {hasDataError && (
          <GlobalError
            feedbackHref="/feedback"
            message="Unable to load skill gap data. Please go back and select a job again, or try later."
          />
        )}

        {/* Success state: Has missing skills */}
        {!hasDataError && hasMissing && <SkillGap skills={missingItems} />}

        {/* Success state: No skill gaps */}
        {!hasDataError && !hasMissing && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-700">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Congratulations!
                </h3>
                <p>
                  You already meet all the key requirements for this occupation. 
                  You're ready to proceed to the training recommendations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button 
          variant="ghost" 
          size="md" 
          onClick={goPrev} 
          aria-label="Go back to previous step"
        >
          Back
        </Button>
        
        {/* FIXED: Now passes complete state including unmatched */}
        <Button 
          variant="primary" 
          size="md" 
          onClick={() => goNext(buildNavigationState())}
          aria-label="Go to next step"
        >
          Next
        </Button>
      </footer>
    </AnalyzerLayout>
  );
}
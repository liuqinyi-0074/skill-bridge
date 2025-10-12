// src/pages/Analyzer/AnalyzerSkillGap.tsx
// English comments only inside code.

import React, { useMemo, useRef, useState } from "react";
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
 * AnalyzerSkillGap
 * - Reads unmatched from Redux; if missing, falls back to route state ONLY.
 * - Does not write back to Redux.
 * - Allows exporting only the printable region to PDF.
 */
export default function AnalyzerSkillGap(): React.ReactElement {
  const { goPrev, goNext } = useStepNav();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Read from Redux separately to keep selector stable.
  const unmatchedInStore = useSelector((s: RootState) => s.analyzer.selectedJobUnmatched);

  // Route-state fallback from previous step (may be undefined). Never persisted.
  const routeState = (useLocation().state ?? {}) as AnalyzerRouteState | undefined;

  // Resolve unmatched with precedence: store → route → null
  const unmatched = unmatchedInStore ?? routeState?.unmatched ?? null;

  // Collect names from a bucket that may contain strings or objects with common name fields.
  const collect = (bucket: unknown): string[] => {
    if (!Array.isArray(bucket)) return [];
    return bucket
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as { name?: unknown; title?: unknown; code?: unknown; label?: unknown };
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
   * Build the list of missing skills for <SkillGap/>.
   * - undefined → data missing (show error UI).
   * - []        → no gap (show green success box).
   * - [items]   → render SkillGap with "Missing" status.
   */
  const missingItems: SkillItem[] | undefined = useMemo(() => {
    if (unmatched == null) return undefined;
    const names = [
      ...collect(unmatched.knowledge),
      ...collect(unmatched.skill),
      ...collect(unmatched.tech),
    ];
    return names.map((n) => ({ name: n, status: "Missing" as const }));
  }, [unmatched]);

  const hasDataError = missingItems === undefined;
  const hasMissing = Array.isArray(missingItems) && missingItems.length > 0;

  // Export only the printable region as a PDF file.
  const handleExport = async (): Promise<void> => {
    const node = printAreaRef.current;
    if (!node) return;
    await exportElementToPdf(node, "SkillGap.pdf");
  };

  return (
    <AnalyzerLayout
      title="Skill Gap"
      helpContent={{
        title: "Skill Gap Guide",
        subtitle: "We show abilities missing for your selected occupation.",
        features: ["Only missing abilities are listed.", "If empty, you already meet the requirements."],
        tips: ["Use Export PDF to save this section.", "Send feedback if something looks wrong."],
      }}
      headerActions={
        <div
          className="relative"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <Button
            variant="primary"
            size="md"
            onClick={handleExport}
            disabled={!hasMissing}
            aria-label={hasMissing ? "Export PDF" : "Disabled: no skill gap"}
          >
            Export PDF
          </Button>
          {!hasMissing && hovering && (
            <div className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white">
              No skill gap to export
            </div>
          )}
        </div>
      }
    >
      {/* Printable region */}
      <div ref={printAreaRef} className="mt-6 print:bg-white">
        {hasDataError && (
          <GlobalError
            feedbackHref="/feedback"
            message="We couldn't load your skill gap. Please go back and select a job again, or try later."
          />
        )}

        {!hasDataError && hasMissing && <SkillGap skills={missingItems} />}

        {!hasDataError && !hasMissing && (
          <div className="rounded-xl border bg-white p-4 text-green-700">
            You already meet the occupation requirements.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" size="md" onClick={goPrev} aria-label="Go back to previous step">
          Back
        </Button>
        <Button variant="primary" size="md" onClick={() => goNext()} aria-label="Go to next step">
          Next
        </Button>
      </footer>
    </AnalyzerLayout>
  );
}

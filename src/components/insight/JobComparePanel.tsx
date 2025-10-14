// src/components/insight/JobComparePanel.tsx
// Controlled compare panel with view filters and single-select picker.
// - Parent owns compareJob and viewMode; panel emits changes via callbacks
// - Uses your SearchComboWithResults for picking a single compare job
// - When capped, keeps Add enabled and asks to replace the previous choice
// - Three-view toggle: Target only / Comparison only / Both

import React from "react";
import type { AnzscoOccupation } from "../../types/domain";
import Button from "../ui/Button";
import SearchComboWithResults from "../analyzer/SearchComboWithResults";

// Minimal shape for jobs used here
export type RoleLite = { id: string; title: string };

// Search inputs mirrored from your existing props
export type OccupationSearchInputs = {
  industryOptions: ReadonlyArray<{ value: string; label: string }>;
  industryCode: string;
  onIndustryChange: (code: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  onSearch: () => void;

  results: ReadonlyArray<AnzscoOccupation>;
  isFetching: boolean;
  isError: boolean;
  noResults: boolean;
  searchError?: string;
};

export type ViewMode = "target" | "compare" | "both";

export type JobComparePanelProps = {
  targetJob: RoleLite;
  compareJob: RoleLite | null;
  onChangeTargetJob: (next: RoleLite) => void;
  onChangeCompareJob: (next: RoleLite | null) => void;

  occupationSearch: OccupationSearchInputs;

  onSuccess?: (msg: string) => void;

  /** Current view mode and updater provided by parent */
  viewMode: ViewMode;
  onChangeViewMode: (m: ViewMode) => void;
};

function toRoleLite(occ: AnzscoOccupation): RoleLite {
  return { id: occ.code, title: occ.title || occ.code };
}

export default function JobComparePanel({
  targetJob,
  compareJob,
  onChangeTargetJob,
  onChangeCompareJob,
  occupationSearch,
  onSuccess,
  viewMode,
  onChangeViewMode,
}: JobComparePanelProps): React.ReactElement {
  const [openPicker, setOpenPicker] = React.useState<boolean>(false);

  const notify = (msg: string): void => {
    if (onSuccess) onSuccess(msg);
    else window.alert(msg);
  };

  // Add when not capped yet
  const handleAddCompare = (occ: AnzscoOccupation): void => {
    const next = toRoleLite(occ);
    if (!compareJob) {
      onChangeCompareJob(next);
      setOpenPicker(false);
      return;
    }
    // Already selected: confirm to replace
    const confirmMsg = `Do you want to replace “${compareJob.title}” with “${next.title}”?`;
    if (window.confirm(confirmMsg)) {
      onChangeCompareJob(next);
      setOpenPicker(false);
    }
  };

  // Click Add while capped → confirm replace
  const handleCapAttempt = (occ: AnzscoOccupation): void => {
    const next = toRoleLite(occ);
    const prevTitle = compareJob?.title || "current selection";
    const okReplace = window.confirm(`Do you want to replace “${prevTitle}” with “${next.title}”?`);
    if (okReplace) {
      onChangeCompareJob(next);
      setOpenPicker(false);
    }
  };

  // Swap target and compare
  const swap = (): void => {
    if (!compareJob) return;
    onChangeTargetJob(compareJob);
    onChangeCompareJob(targetJob);
  };

  // Promote compare to target
  const setAsTarget = (): void => {
    if (!compareJob) return;
    onChangeTargetJob(compareJob);
    onChangeCompareJob(null);
    notify("Target job updated successfully.");
  };

  // Simple pill styles for titles
  const Pill: React.FC<{ text: string; tone?: "dark" | "muted" }> = ({ text, tone = "muted" }) => (
    <span
      className={
        tone === "dark"
          ? "rounded-full bg-[#0B0B16] text-white px-3 py-1.5 text-base font-semibold"
          : "rounded-2xl bg-slate-100 text-ink px-4 py-3 text-base font-semibold"
      }
    >
      {text}
    </span>
  );

  return (
    <section className="rounded-3xl bg-slate-50 p-6 sm:p-8">
      {/* Header: target job */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
        </svg>
        <span className="text-base font-semibold text-ink">Current Target Job:</span>
        <Pill text={targetJob.title} tone="dark" />

        {/* View mode toggle */}
        <div className="ml-auto inline-flex rounded-full border border-slate-300 bg-white p-1 text-sm">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${viewMode === "target" ? "bg-primary text-white" : "text-ink"}`}
            onClick={() => onChangeViewMode("target")}
            aria-label="Show target only"
          >
            Target only
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${viewMode === "compare" ? "bg-primary text-white" : "text-ink"}`}
            onClick={() => onChangeViewMode("compare")}
            aria-label="Show comparison only"
          >
            Comparison only
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${viewMode === "both" ? "bg-primary text-white" : "text-ink"}`}
            onClick={() => onChangeViewMode("both")}
            aria-label="Show both"
          >
            Both
          </button>
        </div>
      </div>

      {/* Three-column responsive layout with center swap button */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr]">
        {/* Primary column */}
        <div>
          <div className="mb-3 text-base font-semibold text-ink">Primary Job</div>
          <div className="rounded-2xl bg-slate-100 px-4 py-4 text-base font-semibold text-ink">
            {targetJob.title}
          </div>
        </div>

        {/* Center swap */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={swap}
            disabled={!compareJob}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            aria-label="Swap primary and compare"
            title={compareJob ? "Swap jobs" : "Pick a job to enable swap"}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M7 7h11m0 0-3-3m3 3-3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 17H6m0 0 3 3m-3-3 3-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Swap positions
          </button>
        </div>

        {/* Compare column */}
        <div>
          <div className="mb-3 text-base font-semibold text-ink">Compare With</div>

          <button
            type="button"
            onClick={() => setOpenPicker(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-4 text-left"
            aria-label="Select a job to compare"
          >
            <svg className="h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M12 20h9" strokeWidth="2" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeWidth="2" />
            </svg>
            <span className="text-base font-semibold text-ink">
              {compareJob ? compareJob.title : "Select a job to compare"}
            </span>
          </button>

          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              onClick={setAsTarget}
              disabled={!compareJob}
              tooltipWhenDisabled="Pick a job first"
              aria-label="Set compare job as target"
            >
              Set as target job
            </Button>
          </div>
        </div>
      </div>

      {/* Picker modal */}
      {openPicker && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white p-5">
              <h3 className="text-base font-bold text-ink">Select job to compare</h3>
              <button
                onClick={() => setOpenPicker(false)}
                className="rounded p-1 text-ink-soft hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <SearchComboWithResults
                industryOptions={occupationSearch.industryOptions}
                industryCode={occupationSearch.industryCode}
                onIndustryChange={occupationSearch.onIndustryChange}
                keyword={occupationSearch.keyword}
                onKeywordChange={occupationSearch.onKeywordChange}
                onSearch={occupationSearch.onSearch}
                searchError={occupationSearch.searchError}
                results={occupationSearch.results}
                isFetching={occupationSearch.isFetching}
                isError={occupationSearch.isError}
                noResults={occupationSearch.noResults}
                pickedIds={compareJob ? [compareJob.id] : []}
                onAdd={handleAddCompare}
                onRemove={() => onChangeCompareJob(null)}
                maxSelectable={1}
                selectedCount={compareJob ? 1 : 0}
                addDisabledReason="You can select only one job."
                allowAddWhenCapped
                onCapAddAttempt={handleCapAttempt}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

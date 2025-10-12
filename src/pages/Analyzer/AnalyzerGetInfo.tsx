// src/pages/Analyzer/AnalyzerGetInfo.tsx
// Get Info step for the Analyzer wizard
// - Uses AnalyzerLayout header (Title + HelpToggle) and ProgressBar + SummaryDock
// - Search API requires the industry's FULL NAME; we map code/slug → name
// - Re-search always refetches even with the same params
// - Next enabled only when all three questions are completed
// - On Next, persist to Redux and pass router state as fallback to the next step
// - Cap selected roles to MAX_ROLES with tooltip and helper messages
// - Validate inputs strictly: industry code and ANZSCO code
// - Normalize roles before persisting: { id, title }

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import SelectQuestion from "../../components/analyzer/SelectQuestion";
import Button from "../../components/ui/Button";
import SearchComboWithResults from "../../components/analyzer/SearchComboWithResults";
import Tutorial from "../../components/tutorial/Tutorial";

import { useStepNav } from "../../hooks/useRouteStep";
import { industryOptions, industryNameOf } from "../../data/industries";
import { AU_STATE_OPTIONS } from "../../data/au-state";
import { getInfoTutorialSteps } from "../../data/GetInfoTutorialSteps";

import { useAnzscoSearch } from "../../hooks/queries/userAnzscoSearch";
import type { AnzscoOccupation } from "../../types/domain";

import {
  setPreferredRegion,
  setInterestedIndustryCodes,
  setChosenRoles,
} from "../../store/analyzerSlice";
import type { RootState } from "../../store";
import type { AnalyzerRouteState } from "../../types/routes";

// Maximum selected roles allowed on this step
const MAX_ROLES = 5;

// Hook param uses industry full name
type SearchParams = { industry: string; keyword: string; limit?: number } | null;

/** Validate that a string is a supported industry code present in options. */
function isValidIndustryCode(code: string): boolean {
  if (!code) return false;
  return industryOptions.some((opt) => opt.value === code);
}

/** Validate ANZSCO code (commonly 6 digits). Adjust if your backend differs. */
function isValidAnzscoCode(code: string): boolean {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}

/** Normalize any role-like input into { id, title } with de-duplication. */
function normalizeRoles(
  roles: Array<{ id?: string; title?: string } | { code?: string; title?: string } | string>
): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = [];
  const seen = new Set<string>();
  for (const r of roles) {
    let id = "";
    let title = "";
    if (typeof r === "string") {
      id = r.trim();
      title = r.trim();
    } else if ("id" in r && typeof r.id === "string") {
      id = r.id.trim();
      title = (r.title ?? r.id).trim();
    } else if ("code" in r && typeof r.code === "string") {
      id = r.code.trim();
      title = (r.title ?? r.code).trim();
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}

/** 
 * Page body isolated so the route-level ErrorBoundary can wrap it cleanly 
 */
function PageBody(): React.ReactElement {
  const { goPrev, goNext } = useStepNav();
  const qc = useQueryClient();
  const dispatch = useDispatch();

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(true);

  // Read persisted selections to hydrate local drafts
  const persisted = useSelector((s: RootState) => s.analyzer);

  // Local drafts (lazy init from Redux so Back restores selections)
  const [industryCode, setIndustryCode] = useState<string>(""); // store code (A..T) or slug
  const [keyword, setKeyword] = useState<string>("");
  const [region, setRegion] = useState<string>(persisted.preferredRegion ?? "");
  const [interests, setInterests] = useState<string[]>(
    persisted.interestedIndustryCodes ?? []
  );
  const [draftRoles, setDraftRoles] = useState<Array<{ id: string; title: string }>>(
    persisted.chosenRoles ?? []
  );

  // Submitted snapshot used by the search hook
  const [submittedIndustryCode, setSubmittedIndustryCode] = useState<string>("");
  const [submittedKeyword, setSubmittedKeyword] = useState<string>("");

  // UI message for search validation
  const [searchErr, setSearchErr] = useState<string>("");

  // Build API params: map code/slug → FULL NAME (labelEn)
  const params: SearchParams = useMemo(() => {
    const k = submittedKeyword.trim();
    if (!k || k.length < 2) return null;

    // Guard: ensure the submitted industry code is still valid
    if (!isValidIndustryCode(submittedIndustryCode)) return null;

    const industryFullName = industryNameOf(submittedIndustryCode);
    if (!industryFullName) return null;

    return { industry: industryFullName, keyword: k, limit: 12 };
  }, [submittedIndustryCode, submittedKeyword]);

  // Execute search (returns normalized AnzscoOccupation[])
  const { data, isFetching, isError } = useAnzscoSearch(params);
  const uiResults: AnzscoOccupation[] = data ?? [];

  // Click "Search" → validate + commit snapshot; always refetch even if params unchanged
  const handleSearchClick = (): void => {
    const k = keyword.trim();

    if (!isValidIndustryCode(industryCode)) {
      setSearchErr("Please choose a valid industry.");
      return;
    }
    const industryFullName = industryNameOf(industryCode);
    if (!industryFullName) {
      setSearchErr("Please choose a valid industry.");
      return;
    }
    if (k.length < 2) {
      setSearchErr("Please enter at least 2 characters for the keyword.");
      return;
    }
    setSearchErr("");

    setSubmittedIndustryCode(industryCode);
    setSubmittedKeyword(k);

    // Force refetch for this concrete key
    qc.invalidateQueries({
      queryKey: ["anzsco", "search", industryFullName, k, 12],
    });
  };

  // Selected ids for highlight/disable
  const pickedIds = useMemo(() => draftRoles.map((r) => r.id), [draftRoles]);

  // Add/remove role (id = ANZSCO code; title = occupation title)
  const handleAddRole = (occ: AnzscoOccupation): void => {
    // Validate the incoming code before accepting
    if (!isValidAnzscoCode(occ.code)) return;
    if (draftRoles.length >= MAX_ROLES) return; // cap
    setDraftRoles((prev) =>
      prev.some((x) => x.id === occ.code) ? prev : [...prev, { id: occ.code, title: occ.title }]
    );
  };
  
  const handleRemoveRole = (id: string): void => {
    setDraftRoles((prev) => prev.filter((x) => x.id !== id));
  };

  // Guard for Next button
  const nextBlockers: string[] = useMemo(() => {
    const blocks: string[] = [];
    if (!draftRoles.length) blocks.push("Pick at least 1 role via Search.");
    if (!region) blocks.push("Select a preferred location.");
    if (!interests.length) blocks.push("Select at least 1 interested industry.");
    return blocks;
  }, [draftRoles, region, interests]);

  const nextDisabled = nextBlockers.length > 0;

  // Persist local drafts to Redux then navigate
  const handleSubmitAndNext = (): void => {
    if (nextDisabled) return;

    // Filter roles again to ensure only valid ANZSCO codes are stored
    const cleanedRoles = draftRoles.filter((r) => isValidAnzscoCode(r.id));
    // Normalize to { id, title } in case older data shape exists
    const normalized = normalizeRoles(cleanedRoles);

    dispatch(setChosenRoles(normalized)); // { id, title }[]
    dispatch(setPreferredRegion(region));

    // Filter interests to only valid industry codes
    const cleanedInterests = interests.filter(isValidIndustryCode);
    dispatch(setInterestedIndustryCodes(cleanedInterests));

    // Build route state for fallback
    const state: AnalyzerRouteState = {
      roles: normalized,
      region,
      industries: cleanedInterests,
    };

    goNext(state);
  };

  // Max-roles message
  const maxMsg =
    draftRoles.length >= MAX_ROLES
      ? `You have reached the maximum of ${MAX_ROLES} roles.`
      : `Select up to ${MAX_ROLES} roles.`;

  // Calculate noResults based on search state
  const noResults =
    !isFetching && !isError && uiResults.length === 0 && submittedKeyword.length >= 2;

  return (
    <AnalyzerLayout
      title="Get info"
      helpContent={{
        title: "How to use this page",
        subtitle: "Tell us about your career preferences and interests.",
        features: [
          "Search for occupations by industry and keyword (up to 5 selections).",
          "Choose your preferred work location in Australia.",
          "Select industries that interest you (multi-select, up to 20).",
        ],
        tips: [
          "Use the Search function to explore roles; submit selections with the chip.",
          "Re-search anytime — same params refetch; Remove chips via ×.",
          <>
            Click the{" "}
            <button
              onClick={() => setShowTutorial(true)}
              className="text-primary-600 hover:text-primary-700 underline font-medium"
            >
              interactive tutorial
            </button>{" "}
            to see a guided walkthrough of this page.
          </>,
          "Check the summary sidebar on the right to review your current selections at any time.",
          "Hover over the disabled 'Next' button to see what's required to proceed.",
        ],
      }}
      summaryDrafts={{
        region,
        industryCodes: interests,
        roles: draftRoles, // { id, title }[]
      }}
    >
      {/* Role search (Q1) */}
      <section className="mt-8" data-section="role-search">
        <h2 className="text-xl font-semibold text-ink mb-4">
          1. Which occupation roles are you interested in?
        </h2>

        <SearchComboWithResults
          industryOptions={industryOptions}
          industryCode={industryCode}
          onIndustryChange={setIndustryCode}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearchClick}
          searchError={searchErr}
          results={uiResults}
          isFetching={isFetching}
          isError={isError}
          noResults={noResults}
          pickedIds={pickedIds}
          onAdd={handleAddRole}
          onRemove={handleRemoveRole}
          maxSelectable={MAX_ROLES}
          selectedCount={draftRoles.length}
          addDisabledReason={`Maximum ${MAX_ROLES} roles can be selected. Remove one before adding another.`}
        />

        {/* Selected roles as chips */}
        {draftRoles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" data-role-chips>
            {draftRoles.map((r) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                           bg-primary-50 text-primary-700 text-sm font-medium
                           border border-primary-200"
              >
                <span>{r.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(r.id)}
                  className="text-primary-500 hover:text-primary-700 transition-colors"
                  aria-label={`Remove ${r.title}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-slate-600">{maxMsg}</p>
      </section>

      {/* Preferred location (single) */}
      <section className="mt-10" data-section="location">
        <SelectQuestion
          title="2. Preferred location (single choice)"
          subtitle="Choose all if you are not sure"
          options={AU_STATE_OPTIONS}
          value={region ? [region] : []}
          onChange={(arr) => setRegion(arr[0] ?? "")}
          columns={2}
          name="preferred-location"
        />
      </section>

      {/* Interested industries (multi) */}
      <section className="mt-10" data-section="industries">
        <SelectQuestion
          title="3. Which industries interest you? (multi-select)"
          subtitle=""
          helperText=" "
          options={industryOptions}
          value={interests}
          onChange={setInterests}
          maxSelected={20}
          columns={2}
        />
      </section>

      {/* Footer actions */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" size="md" onClick={goPrev} aria-label="Go back to previous step">
          Back
        </Button>

        <div className="relative group">
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmitAndNext}
            disabled={nextDisabled}
            aria-label={nextDisabled ? "Disabled. Complete required fields." : "Go to next step"}
          >
            Next
          </Button>

          {nextDisabled && (
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 -top-2 translate-y-[-100%] w-72
                         rounded-md border border-black/10 bg-neutral-900 text-white text-xs
                         shadow-lg p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
                         transition-opacity"
            >
              <div className="font-semibold mb-1">Complete before continuing:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {nextBlockers.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </footer>

      {nextDisabled && (
        <p className="mt-2 text-xs text-amber-700">Complete: {nextBlockers.join(" • ")}</p>
      )}

      {/* Tutorial overlay */}
      <Tutorial
        steps={getInfoTutorialSteps}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </AnalyzerLayout>
  );
}

/**
 * Main component with error boundary wrapper
 */
export default function AnalyzerGetInfo(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <PageBody />
    </ErrorBoundary>
  );
}

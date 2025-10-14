// Career choice panel for selecting past jobs, target job, and region.
// Layout matches the screenshot: big title + subtitle, then three stacked rows:
// Past Job, Target Job, Target Region. Each row shows chips and an Edit button.
// Target Job editor uses allowAddWhenCapped + confirm-to-replace behavior.

import React, { useMemo, useState } from "react";
import { Briefcase, Target as TargetIcon, MapPin, X } from "lucide-react";
import type { AnzscoOccupation } from "../../types/domain";
import SearchComboWithResults from "../analyzer/SearchComboWithResults";
import type { RoleLite } from "../../store/analyzerSlice";

/** Strongly-typed panel state */
export type CareerChoiceState = {
  pastJobs: RoleLite[];        // Up to 5
  targetJob: RoleLite | null;  // Single
  region: string;
};

export type Option = { value: string; label: string };

export type OccupationSearchInputs = {
  industryOptions: readonly Option[];
  industryCode: string;
  onIndustryChange: (code: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  onSearch: () => void;

  results: readonly AnzscoOccupation[];
  isFetching: boolean;
  isError: boolean;
  noResults: boolean;
  searchError?: string;
};

export type SelectQuestionProps = {
  title: string;
  open: boolean;
  options: string[];
  value: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
  helperText?: string;
};

export type CareerChoicePanelProps = {
  value: CareerChoiceState;
  onChange: (next: CareerChoiceState) => void;
  regionOptions: string[];
  SelectQuestion: React.ComponentType<SelectQuestionProps>;
  occupationSearch: OccupationSearchInputs;
  labels?: {
    title?: string;
    subtitle?: string;
    pastJobs?: string;
    targetJob?: string;
    region?: string;
    edit?: string;
    empty?: string;
    pastJobsHelp?: string;
    targetJobHelp?: string;
    regionHelp?: string;
  };
};

type EditorState =
  | { kind: "idle" }
  | { kind: "editPast" }
  | { kind: "editTarget" }
  | { kind: "editRegion" };

export default function CareerChoicePanel(props: CareerChoicePanelProps) {
  const {
    value,
    onChange,
    regionOptions,
    SelectQuestion,
    occupationSearch,
    labels,
  } = props;

  // Copy consistent with screenshot
  const text = useMemo(
    () => ({
      subtitle: labels?.subtitle ?? "Your career background and goals",
      pastJobs: labels?.pastJobs ?? "Past Job",
      targetJob: labels?.targetJob ?? "Target Job",
      region: labels?.region ?? "Target Region",
      edit: labels?.edit ?? "Edit",
      empty: labels?.empty ?? "None",
      pastJobsHelp:
        labels?.pastJobsHelp ??
        "You can choose up to 5 past occupations. Stored with their official code.",
      targetJobHelp:
        labels?.targetJobHelp ??
        "Choose a single target occupation. Stored with its official code.",
      regionHelp: labels?.regionHelp ?? "Choose one region (English).",
    }),
    [labels]
  );

  const [editor, setEditor] = useState<EditorState>({ kind: "idle" });

  // ---------- Helpers ----------
  const toRoleLite = (occ: AnzscoOccupation): RoleLite => ({
    id: occ.code,
    title: occ.title || occ.code,
  });

  const updatePast = (next: RoleLite[]) => {
    // Deduplicate by id and clamp to 5
    const unique = Array.from(new Map(next.map((r) => [r.id, r])).values()).slice(0, 5);
    onChange({ ...value, pastJobs: unique });
  };

  const updateTarget = (next: RoleLite | null) => {
    onChange({ ...value, targetJob: next });
  };

  const saveRegion = (next: string) => {
    onChange({ ...value, region: next });
    setEditor({ kind: "idle" });
  };

  // ---------- Actions for Past ----------
  const addPast = (occ: AnzscoOccupation): void => updatePast([...value.pastJobs, toRoleLite(occ)]);
  const removePast = (id: string): void =>
    updatePast(value.pastJobs.filter((r) => r.id !== id));

  // ---------- Actions for Target ----------
  const addTarget = (occ: AnzscoOccupation): void => updateTarget(toRoleLite(occ));
  const removeTarget = (): void => updateTarget(null);

  // ---------- Small chips renderer ----------
  const Chips: React.FC<{ items: RoleLite[] }> = ({ items }) => {
    if (items.length === 0) return <span className="text-ink-soft">{text.empty}</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((role) => (
          <span
            key={role.id}
            className="rounded-full border border-border bg-gray-50 px-2.5 py-1 text-xs text-ink"
          >
            {role.title || role.id}
          </span>
        ))}
      </div>
    );
  };

  const SelectedChipsRow: React.FC<{
    picked: Array<{ id: string; title: string }>;
    onRemove: (id: string) => void;
    max?: number;
  }> = ({ picked, onRemove, max }) => {
    if (!picked.length) return null;
    return (
      <div className="mt-4">
        <div className="mb-2 text-xs text-ink-soft">
          Selected {max ? `(${picked.length}/${max})` : `(${picked.length})`}
        </div>
        <div className="flex flex-wrap gap-2">
          {picked.map((item) => (
            <span
              key={item.id}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-gray-50 px-2 py-0.5 text-xs text-ink"
            >
              {item.title || item.id}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-gray-200"
                aria-label={`Remove ${item.title}`}
                title="Remove"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ---------- Layout (matches screenshot) ----------
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
        {/* Title + subtitle */}
        <p className="mt-1 text-sm text-ink-soft">{text.subtitle}</p>

        <hr className="my-5 border-border" />

        {/* Past Job row */}
        <div className="flex items-start gap-3 py-3">
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-sm font-semibold text-ink">{text.pastJobs}</div>
            <Chips items={value.pastJobs} />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-ink-invert hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => setEditor({ kind: "editPast" })}
            aria-label={`Edit ${text.pastJobs}`}
          >
            {text.edit}
          </button>
        </div>

        {/* Target Job row */}
        <div className="flex items-start gap-3 py-3">
          <TargetIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-sm font-semibold text-ink">{text.targetJob}</div>
            {value.targetJob ? (
              <span className="rounded-full border border-border bg-gray-50 px-2.5 py-1 text-xs text-ink">
                {value.targetJob.title}
              </span>
            ) : (
              <span className="text-ink-soft text-sm">{text.empty}</span>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-ink-invert hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => setEditor({ kind: "editTarget" })}
            aria-label={`Edit ${text.targetJob}`}
          >
            {text.edit}
          </button>
        </div>

        {/* Target Region row */}
        <div className="flex items-start gap-3 py-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-sm font-semibold text-ink">{text.region}</div>
            {value.region ? (
              <span className="rounded-full border border-border bg-gray-50 px-2.5 py-1 text-xs text-ink">
                {value.region}
              </span>
            ) : (
              <span className="text-ink-soft text-sm">{text.empty}</span>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-ink-invert hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => setEditor({ kind: "editRegion" })}
            aria-label={`Edit ${text.region}`}
          >
            {text.edit}
          </button>
        </div>
      </div>

      {/* ---------------- Editors ---------------- */}

      {/* Past Jobs Editor (multi-select, max 5) */}
      {editor.kind === "editPast" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-modal">
            <div className="sticky top-0 border-b border-border bg-white p-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xl font-heading font-bold text-ink">Edit {text.pastJobs}</h4>
                <button
                  onClick={() => setEditor({ kind: "idle" })}
                  className="rounded-lg p-1 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-ink-soft">{text.pastJobsHelp}</p>
            </div>

            <div className="p-6">
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
                pickedIds={value.pastJobs.map((r) => r.id)}
                onAdd={addPast}
                onRemove={(code) => removePast(code)}
                maxSelectable={5}
                selectedCount={value.pastJobs.length}
                addDisabledReason="Limit reached: 5 roles selected."
              />

              <SelectedChipsRow
                picked={value.pastJobs.map((r) => ({ id: r.id, title: r.title }))}
                onRemove={(id) => removePast(id)}
                max={5}
              />
            </div>
          </div>
        </div>
      )}

      {/* Target Job Editor (single-select with allowAddWhenCapped + confirm) */}
      {editor.kind === "editTarget" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-modal">
            <div className="sticky top-0 border-b border-border bg-white p-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xl font-heading font-bold text-ink">Edit {text.targetJob}</h4>
                <button
                  onClick={() => setEditor({ kind: "idle" })}
                  className="rounded-lg p-1 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-ink-soft">{text.targetJobHelp}</p>
            </div>

            <div className="p-6">
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
                pickedIds={value.targetJob ? [value.targetJob.id] : []}
                onAdd={addTarget}
                onRemove={() => removeTarget()}
                maxSelectable={1}
                selectedCount={value.targetJob ? 1 : 0}
                addDisabledReason="You can only choose one target occupation."
                /** Keep Add clickable at cap and defer to confirm */
                allowAddWhenCapped={true}
                onCapAddAttempt={(occ) => {
                  const oldTitle = value.targetJob?.title || value.targetJob?.id || "current selection";
                  const newTitle = occ.title;
                  const ok = window.confirm(
                    `Do you want to change your target job from “${oldTitle}” to “${newTitle}”?`
                  );
                  if (ok) addTarget(occ);
                }}
              />

              <SelectedChipsRow
                picked={value.targetJob ? [{ id: value.targetJob.id, title: value.targetJob.title }] : []}
                onRemove={() => removeTarget()}
                max={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Region Editor */}
      <SelectQuestion
        title={`Edit ${text.region}`}
        open={editor.kind === "editRegion"}
        options={regionOptions}
        value={value.region ?? null}
        onClose={() => setEditor({ kind: "idle" })}
        onSave={saveRegion}
        helperText={text.regionHelp}
      />
    </section>
  );
}

// src/components/analyzer/SearchComboWithResults.tsx
import React, { useMemo, useState } from "react";
import type { AnzscoOccupation } from "../../types/domain";
import Button from "../ui/Button";

/** Generic option for the industry select */
export type Option = { value: string; label: string };

export type SearchComboWithResultsProps = {
  industryOptions: readonly Option[];
  industryCode: string;
  onIndustryChange: (code: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  onSearch: () => void;

  searchError?: string;

  results: readonly AnzscoOccupation[];
  isFetching: boolean;
  isError: boolean;
  noResults: boolean;

  pickedIds: readonly string[];
  onAdd: (occ: AnzscoOccupation) => void;
  onRemove: (code: string) => void;

  maxSelectable: number;
  selectedCount: number;
  addDisabledReason?: string;
};

const CARD_BODY_MAX_H = 96; // px

const SearchComboWithResults: React.FC<SearchComboWithResultsProps> = ({
  industryOptions,
  industryCode,
  onIndustryChange,
  keyword,
  onKeywordChange,
  onSearch,
  searchError,
  results,
  isFetching,
  isError,
  noResults,
  pickedIds,
  onAdd,
  onRemove,
  maxSelectable,
  selectedCount,
  addDisabledReason,
}) => {
  /** 哪些卡片已展开 */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** 哪些卡片描述会溢出，需要切换按钮 */
  const [overflow, setOverflow] = useState<Record<string, boolean>>({});

  const reachedCap = selectedCount >= maxSelectable;

  const trimmed = keyword.trim();
  const englishOk = trimmed === "" || /^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed);

  const makeMeasureRef = (code: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    const need = el.scrollHeight > CARD_BODY_MAX_H + 1;
    setOverflow((p) => (p[code] === need ? p : { ...p, [code]: need }));
  };

  const industryOptionsWithPlaceholder = useMemo<Option[]>(
    () => [{ value: "", label: "Select an industry…" }, ...industryOptions],
    [industryOptions]
  );

  return (
    <section className="mt-2">
      {/* Search form */}
      <div className="grid gap-3 sm:grid-cols-[300px_minmax(0,1fr)_auto]">
        {/* Industry select */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Industry</span>
          <select
            className="h-10 w-full min-w-[260px] rounded-lg border border-border px-3"
            value={industryCode}
            onChange={(e) => onIndustryChange(e.target.value)}
            aria-label="Industry"
          >
            {industryOptionsWithPlaceholder.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Keyword input */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Keyword</span>
          <input
            className="h-10 rounded-lg border border-border px-3"
            placeholder="Type a role keyword (e.g., analyst)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Keyword"
          />
        </label>

        {/* Search button */}
        <div className="self-end">
          <Button
            variant="primary"
            size="md"
            onClick={onSearch}
            aria-label="Search roles"
            disabled={!englishOk}
            tooltipWhenDisabled={!englishOk ? "Please enter English letters only." : undefined}
          >
            Search roles
          </Button>
        </div>
      </div>

      {/* Error messages: 默认不显示，只有出错条件下渲染 */}
      {!englishOk && (
        <div className="mt-3 rounded-md bg-red-50 text-red-900 p-3 text-sm">
          Please enter English letters only.
        </div>
      )}

      {searchError && (
        <div className="mt-3 rounded-md bg-red-50 text-red-900 p-3 text-sm">
          {searchError}
        </div>
      )}

      {reachedCap && (
        <div
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-black/5 px-2 py-1 text-xs text-ink"
          title={addDisabledReason}
        >
          Limit reached: {maxSelectable} roles selected. Remove one before adding another.
        </div>
      )}

      {isError && (
        <div className="mt-3 rounded-md bg-red-50 text-red-900 p-3 text-sm">
          Our system may be having an issue right now. Please try again later or{" "}
          <a href="/feedback" className="underline underline-offset-2 font-medium" target="_blank" rel="noreferrer">
            send feedback
          </a>
          .
        </div>
      )}

      {noResults && englishOk && !isFetching && (
        <div className="mt-3 rounded-md bg-blue-50 text-blue-900 p-3 text-sm">
          This industry does not contain roles matching your keyword. Please verify your input or try a different
          industry.
        </div>
      )}

      {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching…</div>}

      {/* Results grid */}
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((it) => {
          const picked = pickedIds.includes(it.code);
          const disableAdd = reachedCap && !picked;

          const rawDesc = (it as { description?: unknown }).description;
          const desc: string = typeof rawDesc === "string" ? rawDesc : "";
          const hasDesc = desc.trim().length > 0;
          const expandedNow = Boolean(expanded[it.code]);
          const showToggle = hasDesc && (overflow[it.code] ?? false); // 仅溢出时显示箭头

          return (
            <li key={it.code} className="h-full">
              <article className="relative h-full rounded-xl border border-border p-4 shadow-card">
                <div className="flex h-full flex-col">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 max-w-full">
                      <div className="flex items-start gap-2">
                        <h4
                          className="text-sm font-semibold text-ink break-words whitespace-normal leading-5"
                          title={it.title}
                        >
                          {it.title}
                        </h4>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-soft shrink-0">
                          {it.code}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!picked ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onAdd(it)}
                          disabled={disableAdd}
                          aria-label="Add role"
                          tooltipWhenDisabled={
                            disableAdd
                              ? addDisabledReason ??
                                `Limit reached: maximum ${maxSelectable} roles. Remove one before adding.`
                              : undefined
                          }
                        >
                          Add
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => onRemove(it.code)} aria-label="Remove role">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {hasDesc && (
                    <div className="relative mt-2">
                      <div
                        ref={makeMeasureRef(it.code)}
                        className={`text-xs leading-5 text-ink-soft break-words whitespace-normal ${
                          expandedNow ? "" : "max-h-[96px] overflow-hidden"
                        }`}
                        style={!expandedNow ? { maxHeight: CARD_BODY_MAX_H } : undefined}
                      >
                        {desc}
                      </div>

                      {!expandedNow && showToggle && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                      )}

                      {showToggle && (
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [it.code]: !p[it.code] }))}
                          className="absolute right-0 bottom-1 translate-y-0 rounded-full p-1 text-ink-soft hover:text-ink"
                          aria-label={expandedNow ? "Collapse" : "Expand to view all"}
                          title={expandedNow ? "Collapse" : "View full description"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            {expandedNow ? (
                              <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                            ) : (
                              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                            )}
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SearchComboWithResults;

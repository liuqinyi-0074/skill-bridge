// VetGlossarySuggest.tsx
// Names-only dropdown + detail panel with robust empty/error fallbacks.

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, BookOpen, Link as LinkIcon, X } from "lucide-react";
import { useGlossarySuggest } from "../../hooks/queries/useGlossarySuggest";
import type { GlossaryDetail } from "../../lib/api/glossary/getListByPrefix";

/** Small debounce hook */
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface VetGlossarySuggestProps {
  className?: string;
  minChars?: number;
  debounceMs?: number;
}

export default function VetGlossarySuggest({
  className = "",
  minChars = 1,
  debounceMs = 120,
}: VetGlossarySuggestProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [selected, setSelected] = useState<GlossaryDetail | null>(null);

  const debounced = useDebounce<string>(inputValue, debounceMs);
  const shouldQuery = debounced.trim().length >= minChars;

  const { data, isFetching, isError, error, refetch } = useGlossarySuggest(
    shouldQuery ? debounced : null
  );

  const options = useMemo<GlossaryDetail[]>(
    () => (Array.isArray(data) ? data : []),
    [data]
  );

  const [open, setOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => setOpen(shouldQuery), [shouldQuery]);

  // Clear selection if user edits input away from current selection
  useEffect(() => {
    if (selected && !selected.term.toLowerCase().startsWith(inputValue.toLowerCase())) {
      setSelected(null);
    }
  }, [inputValue, selected]);

  const handleChoose = (item: GlossaryDetail) => {
    setSelected(item);
    setInputValue(item.term);
    setOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    setSelected(null);
    setOpen(false);
  };

  const handleSeeAlsoClick = (term: string) => {
    setInputValue(term);
    setOpen(true);
    setSelected(null);
  };

  // Derived UI states
  const showEmpty =
    !isFetching && !isError && shouldQuery && Array.isArray(data) && data.length === 0;

  return (
    <div
      ref={wrapperRef}
      className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold">VET Glossary</h3>
      </div>

      <p className="text-sm text-ink-soft mb-4">
        Type a prefix to see VET terms. Click a term to view its full details.
      </p>

      {/* Search input */}
      <div className="relative mb-4">
        <input
          id="glossary-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter a prefix or a keyword"
          className="w-full px-4 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          aria-label="Search VET terminology"
          onFocus={() => {
            if (shouldQuery) setOpen(true);
          }}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="glossary-listbox"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Dropdown */}
        {open && (
          <div
            className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            role="listbox"
            id="glossary-listbox"
          >
            {isFetching && options.length === 0 && (
              <div className="p-3 text-sm text-ink-soft">Loading…</div>
            )}

            {isError && (
              <div className="p-3 text-sm text-red-700">
                Connection failed.{" "}
                <button
                  type="button"
                  className="ml-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
                {error?.message ? <span className="ml-1 opacity-70">({error.message})</span> : null}
              </div>
            )}

            {showEmpty && <div className="p-3 text-sm text-ink-soft">No information found.</div>}

            {!isError && options.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {options.map((item) => (
                  <li key={item.term}>
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => handleChoose(item)}
                      role="option"
                      aria-selected={selected?.term === item.term}
                    >
                      <Search className="h-4 w-4 mr-2 text-ink-soft" aria-hidden="true" />
                      <span className="font-medium text-ink">{item.term}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Empty guidance */}
      {!inputValue && !selected && !isFetching && (
        <div className="text-center py-8 text-ink-soft">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Enter a VET term prefix to see suggestions</p>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <div>
            <h4 className="text-base font-semibold text-ink mb-1">{selected.term}</h4>
            {selected.acronym && (
              <p className="text-sm text-ink-soft">
                <span className="font-medium">Acronym:</span> {selected.acronym}
              </p>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-ink leading-relaxed">
              {selected.description || "No description provided."}
            </p>
          </div>

          {selected.also_called && selected.also_called.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">Also called:</p>
              <div className="flex flex-wrap gap-2">
                {selected.also_called.map((name) => (
                  <span
                    key={name}
                    className="inline-block px-2 py-1 rounded-full bg-gray-100 text-xs text-ink"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selected.see_also && selected.see_also.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink mb-2 flex items-center gap-1">
                <LinkIcon className="h-4 w-4" />
                See also:
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.see_also.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSeeAlsoClick(term)}
                    className="inline-block px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition font-medium"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

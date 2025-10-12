// src/pages/Profile.tsx
// Page: Profile
// - Centered header with inline help.
// - Reads Redux first, then falls back to route state once (no rewrite).
// - SkillRoadMap shows ONLY abilities from `selectedJobUnmatched`.
// - Auto-fetch training advice when target job changes and persist to Redux.
// - Converts between Redux format ({ code, title }) and UI format ({ id, title }).
// - Tutorial is a page-level overlay, launched by a floating button (same pattern as Insight).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { useAppDispatch } from "../store/hooks";

// UI
import HelpToggleSmall from "../components/ui/HelpToggleSmall";
import CareerChoicePanel, {
  type CareerChoiceState,
  type OccupationSearchInputs,
} from "../components/profile/CareerChoicePanel";
import SkillRoadMap, { type SkillRoadmapItem } from "../components/profile/SkillRoadMap";
import TrainingAdviceList, { type TrainingAdvice } from "../components/profile/TrainingAdviceList";
import VetGlossarySearch from "../components/profile/VetGlossarySearch";
import Tutorial from "../components/tutorial/Tutorial";

// Redux actions + types
import {
  setChosenRoles,
  setChosenAbilities,
  setInterestedIndustryCodes,
  setPreferredRegion,
  setSelectedJob,
  setTrainingAdvice,
} from "../store/analyzerSlice";
import type {
  AbilityLite,
  UnmatchedBuckets,
  RoleLite,
  SelectedJob,
  TrainingAdviceState,
} from "../store/analyzerSlice";

// Data and hooks
import { industryOptions, industryNameOf } from "../data/industries";
import { useAnzscoSearch } from "../hooks/queries/userAnzscoSearch";
import { useTrainingAdvice } from "../hooks/queries/useTrainingAdvice";
import { getProfileTutorialSteps } from "../data/ProfileTutorialSteps";
import type { TutorialStep } from "../components/tutorial/Tutorial";
import type { AnalyzerRouteState } from "../types/routes";
import type { AnzscoOccupation } from "../types/domain";
import type { TrainingAdviceRes, TrainingCourse } from "../types/training";

/** Build a public TGA/VET link when only a code is present */
const fallbackCourseUrl = (code: string): string =>
  `https://training.gov.au/training/details/${encodeURIComponent(code)}`;

/** Region options for single-select */
const REGION_OPTIONS = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Northern Territory",
  "Australian Capital Territory",
];

/** Course item shape from Redux/route state */
type CourseItem = { name?: string; title?: string; id?: string; code?: string; url?: string };

type SelectedJobValue = Exclude<SelectedJob, null>;

/** Normalize roles into RoleLite[] with { id, title } */
const normalizeRoles = (roles: Array<RoleLite | string> | null | undefined): RoleLite[] => {
  if (!Array.isArray(roles)) return [];
  const seen = new Set<string>();
  const out: RoleLite[] = [];
  for (const role of roles) {
    if (!role) continue;
    const id = (typeof role === "string" ? role : role.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const title = typeof role === "string" ? role : role.title || id;
    out.push({ id, title });
  }
  return out;
};

/** Normalize selected job into { code, title } | null */
const normalizeSelectedJob = (
  job: SelectedJob | string | null | undefined
): SelectedJobValue | null => {
  if (!job) return null;
  if (typeof job === "string") {
    const code = job.trim();
    if (!code) return null;
    return { code, title: code };
  }
  const code = (job.code ?? "").trim();
  if (!code) return null;
  return { code, title: job.title || code };
};

/** Local-only type for search params */
type SearchParams = { industry: string; keyword: string; limit?: number };

/** Safe string */
const normName = (v: unknown): string => (typeof v === "string" ? v : "");

/** Unique key for AbilityLite; null if invalid */
const abilityKey = (a: AbilityLite): string | null => {
  const name = normName((a as { name?: unknown }).name);
  const code =
    typeof (a as { code?: unknown }).code === "string" ? (a as { code?: string }).code : "";
  if (!name && !code) return null;
  return `${a.aType}:${code || name.toLowerCase()}`;
};

/** Unique key for SkillRoadmapItem; null if invalid */
const roadmapKey = (it: SkillRoadmapItem): string | null => {
  const name = normName((it as { skill?: unknown }).skill);
  const code =
    typeof (it as { code?: unknown }).code === "string" ? (it as { code?: string }).code : "";
  if (!name && !code) return null;
  return `${it.abilityType}:${code || name.toLowerCase()}`;
};

/** Unique identity string used for keys */
const abilityIdentityKey = (ability: AbilityLite): string => {
  const name = normName(ability.name);
  const base = ability.code ?? name;
  const safe = base ? encodeURIComponent(base) : `unnamed-${ability.aType}`;
  return `${ability.aType}:${safe}`;
};

/** Unique filter for abilities with guards */
const uniqueAbilities = (abilities: AbilityLite[]): AbilityLite[] => {
  const seen = new Set<string>();
  const result: AbilityLite[] = [];
  for (const a of abilities) {
    const k = abilityKey(a);
    const name = normName(a.name);
    if (!k || !name) continue;
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ ...a, name });
    }
  }
  return result;
};

/** Collapse unmatched buckets into flat abilities */
const collapseUnmatchedBuckets = (b: UnmatchedBuckets | null | undefined): AbilityLite[] => {
  if (!b) return [];
  const collect = (list: string[] | undefined, aType: AbilityLite["aType"]): AbilityLite[] =>
    (list ?? [])
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name, aType }));
  return [...collect(b.skill, "skill"), ...collect(b.knowledge, "knowledge"), ...collect(b.tech, "tech")];
};

/** Map abilities to Roadmap items with empty schedule */
const toSkillRoadmapItems = (abilities: AbilityLite[]): SkillRoadmapItem[] =>
  abilities.map((ability, index) => ({
    id: `${abilityIdentityKey(ability)}:${index}`,
    abilityType: ability.aType,
    category: "content",
    skill: normName(ability.name),
    code: typeof ability.code === "string" ? ability.code : undefined,
    startDate: undefined,
    endDate: undefined,
  }));

/** De-duplicate SkillRoadmapItem safely */
const dedupeRoadmapItems = (items: SkillRoadmapItem[]): SkillRoadmapItem[] => {
  const seen = new Set<string>();
  const out: SkillRoadmapItem[] = [];
  for (const it of items) {
    const k = roadmapKey(it);
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
};

/** Map server response (anzsco + vet_courses) to Redux TrainingAdviceState. */
function mapAdviceResToState(
  res: TrainingAdviceRes,
  fallbackOcc: { code: string; title: string }
): TrainingAdviceState {
  const occ = { code: res?.anzsco?.code ?? fallbackOcc.code, title: res?.anzsco?.title ?? fallbackOcc.title };
  const courses: TrainingCourse[] = [];
  const list = Array.isArray(res?.vet_courses) ? res.vet_courses : [];
  for (const c of list) {
    const id = typeof c.vet_course_code === "string" ? c.vet_course_code.trim() : "";
    const name = typeof c.course_name === "string" ? c.course_name.trim() : "";
    if (!id || !name) continue;
    const url = fallbackCourseUrl(id);
    courses.push({ id, name, url });
  }
  return { occupation: occ, courses };
}

/** SelectQuestion adapter (modal picker for region) */
const SelectQuestionAdapter: React.FC<{
  title: string;
  open: boolean;
  options: string[];
  value: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
  helperText?: string;
}> = ({ title, open, options, value, onClose, onSave, helperText }) => {
  const [selected, setSelected] = useState<string | null>(value);
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-modal max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-heading font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition" aria-label="Close">
            <svg className="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {helperText && <p className="text-sm text-ink-soft mb-4">{helperText}</p>}

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className="w-full text-left p-3 border border-border rounded-lg hover:bg-gray-50 transition"
              style={{
                borderColor: selected === opt ? "#5E75A4" : "#e2e8f0",
                backgroundColor: selected === opt ? "#5E75A4" : "white",
                color: selected === opt ? "white" : "#0f172a",
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (selected) onSave(selected);
              onClose();
            }}
            className="flex-1 py-2 px-4 rounded-full font-semibold bg-primary text-ink-invert hover:bg-primary/90 transition"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-full font-semibold border border-border text-ink hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Profile(): React.ReactElement {
  const dispatch = useAppDispatch();
  const { state } = useLocation();
  const routeState = (state as (AnalyzerRouteState & { notice?: string }) | undefined) ?? undefined;

  // Redux source
  const analyzer = useSelector((s: RootState) => s.analyzer);
  const notice = routeState?.notice;

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialSteps: TutorialStep[] = useMemo(() => getProfileTutorialSteps(), []);

  // One-time hydration from route state when Redux is empty
  useEffect(() => {
    if (!routeState) return;

    if (!analyzer.chosenRoles?.length && routeState.roles?.length) {
      dispatch(setChosenRoles(normalizeRoles(routeState.roles)));
    }
    if (!analyzer.chosenAbilities?.length && routeState.abilities?.length) {
      dispatch(setChosenAbilities(routeState.abilities));
    }
    if (
      (!analyzer.interestedIndustryCodes || analyzer.interestedIndustryCodes.length === 0) &&
      routeState.industries?.length
    ) {
      dispatch(setInterestedIndustryCodes(routeState.industries));
    }
    if (!analyzer.preferredRegion && routeState.region) {
      dispatch(setPreferredRegion(routeState.region));
    }
    if (!analyzer.selectedJob && routeState.selectedJob) {
      const normalized = normalizeSelectedJob(routeState.selectedJob);
      if (normalized) dispatch(setSelectedJob(normalized));
    }
    if (!analyzer.trainingAdvice && routeState.training) {
      dispatch(setTrainingAdvice(routeState.training));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  /** Career choice value for panel */
  const careerChoiceValue = useMemo((): CareerChoiceState => {
    const pastJobsRedux = normalizeRoles(analyzer.chosenRoles);
    const targetJobRedux = normalizeSelectedJob(analyzer.selectedJob);
    const regionRedux = analyzer.preferredRegion || "";

    const pastJobsRoute = normalizeRoles(routeState?.roles);
    const targetJobRoute = normalizeSelectedJob(routeState?.selectedJob);
    const regionRoute = routeState?.region || "";

    const pastJobs = pastJobsRedux.length > 0 ? pastJobsRedux : pastJobsRoute;

    const targetJobSource = targetJobRedux ?? targetJobRoute;
    const targetJob = targetJobSource ? { id: targetJobSource.code, title: targetJobSource.title } : null;

    return { pastJobs, targetJob, region: regionRedux || regionRoute };
  }, [analyzer, routeState]);

  /** Persist panel changes back to Redux */
  const onCareerChoiceChange = (next: CareerChoiceState): void => {
    dispatch(setChosenRoles(normalizeRoles(next.pastJobs)));
    const targetJobForRedux = next.targetJob ? { code: next.targetJob.id, title: next.targetJob.title } : null;
    dispatch(setSelectedJob(targetJobForRedux));
    dispatch(setPreferredRegion(next.region));
  };

  /** Auto-fetch training advice on target-job change */
  const selectedJobCode = analyzer.selectedJob?.code ?? "";
  const selectedJobTitle = analyzer.selectedJob?.title ?? selectedJobCode;
  const { data: adviceData } = useTrainingAdvice(selectedJobCode);
  const lastAppliedCodeRef = useRef<string>("");

  useEffect(() => {
    if (!selectedJobCode || !adviceData) return;
    if (lastAppliedCodeRef.current === selectedJobCode) return;

    const mapped = mapAdviceResToState(adviceData, { code: selectedJobCode, title: selectedJobTitle });
    dispatch(setTrainingAdvice(mapped));
    lastAppliedCodeRef.current = selectedJobCode;
  }, [adviceData, selectedJobCode, selectedJobTitle, dispatch]);

  /** Training advice items → UI list */
  const trainingItems = useMemo<TrainingAdvice[]>(
    () => {
      const coursesRedux = analyzer.trainingAdvice?.courses ?? [];
      const coursesRoute = routeState?.training?.courses ?? [];
      const courses = coursesRedux.length ? coursesRedux : coursesRoute;

      return courses.map((c: CourseItem) => ({
        title: c.name || c.title || "",
        code: c.id || c.code || "",
        url: c.url || fallbackCourseUrl(c.id || c.code || ""),
      }));
    },
    [analyzer.trainingAdvice, routeState]
  );

  /** Occupation search inputs for the panel */
  const [industryCode, setIndustryCode] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  type SearchResultShape =
    | { results?: AnzscoOccupation[] | null | undefined }
    | AnzscoOccupation[]
    | null
    | undefined;

  const { data: searchDataRaw, isFetching, isError } =
    useAnzscoSearch(searchParams) as {
      data: SearchResultShape;
      isFetching: boolean;
      isError: boolean;
    };

  const normalizedResults = useMemo<AnzscoOccupation[]>(() => {
    if (Array.isArray(searchDataRaw)) return searchDataRaw;
    const maybe = searchDataRaw?.results;
    return Array.isArray(maybe) ? maybe : [];
  }, [searchDataRaw]);

  const occupationSearch: OccupationSearchInputs = {
    industryOptions: industryOptions.map((opt) => ({ value: opt.value, label: opt.label })),
    industryCode,
    onIndustryChange: setIndustryCode,
    keyword,
    onKeywordChange: setKeyword,
    onSearch: () => {
      const industryName = industryNameOf(industryCode) ?? "";
      if (industryName || keyword.trim()) {
        setSearchParams({ industry: industryName, keyword: keyword.trim(), limit: 20 });
      }
    },
    results: normalizedResults,
    isFetching,
    isError,
    noResults: !isFetching && normalizedResults.length === 0,
  };

  // ---------- SkillRoadMap initial skills from UNMATCHED ONLY ----------
  const unmatchedRedux = analyzer.selectedJobUnmatched;
  const unmatchedRoute = routeState?.unmatched ?? null;
  const abilitiesFromUnmatched = useMemo(() => {
    const source = unmatchedRedux ?? unmatchedRoute ?? null; // precedence: Redux → route → empty
    return uniqueAbilities(collapseUnmatchedBuckets(source));
  }, [unmatchedRedux, unmatchedRoute]);

  const initialRoadmap = useMemo(() => {
    const items = dedupeRoadmapItems(toSkillRoadmapItems(abilitiesFromUnmatched));
    const key = `unmatched:${items.length}`;
    return { key, items };
  }, [abilitiesFromUnmatched]);
  // --------------------------------------------------------------------

  // Scroll helper for VET glossary
  const vetTerminologyRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header - centered with inline help */}
        <header className="mb-8 text-center">
          <div className="mx-auto flex items-center justify-center gap-2">
            <h1 className="whitespace-nowrap text-4xl font-heading font-bold text-ink">Profile</h1>
            <span className="shrink-0">
              <HelpToggleSmall
                placement="right"
                openOn="both"
                text={
                  <div>
                    <p className="mb-1">
                      Your analyzer test results will be <strong>saved here</strong>.
                    </p>
                    <p>You can also <strong>customize</strong> without taking the test.</p>
                  </div>
                }
              />
            </span>
          </div>

          <p className="mt-2 text-ink-soft">Manage your career journey and skills roadmap</p>

          {notice && (
            <div className="mt-4 inline-block rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
              {notice}
            </div>
          )}
        </header>

        <div className="space-y-6">
          {/* Career Intent Section */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">Career Intent</h2>
            <CareerChoicePanel
              value={careerChoiceValue}
              onChange={onCareerChoiceChange}
              regionOptions={REGION_OPTIONS}
              SelectQuestion={SelectQuestionAdapter}
              occupationSearch={occupationSearch}
            />
          </section>

          {/* Skill Roadmap Section (UNMATCHED ONLY) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-heading font-bold text-ink">Skill Roadmap</h2>
              <HelpToggleSmall
                placement="left"
                openOn="both"
                text={
                  <div>
                    <div className="font-semibold text-primary mb-1">Heads-up</div>
                    <p>
                      We list only <strong>missing abilities</strong> detected for your selected job.
                      You can also <strong>customize</strong> this list manually at any time.
                    </p>
                  </div>
                }
              />
            </div>

            {initialRoadmap.items.length === 0 && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                <p className="mb-3">
                  Not sure what you want to do next? You can take the analyzer test to get some ideas.
                </p>
                <Link
                  to="/analyzer"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 font-semibold text-white hover:bg-primary/90"
                >
                  Take the test
                </Link>
              </div>
            )}

            <div className="rounded-xl border border-border p-6 bg-white shadow-card">
              <p className="text-sm text-ink-soft mb-4">
                Plan your skill development journey with timelines for each skill you want to acquire.
              </p>
              <SkillRoadMap key={initialRoadmap.key} initialSkills={initialRoadmap.items} />
            </div>
          </section>

          {/* Training Advice Section */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">Training Advice</h2>
            <div className="rounded-xl border border-border p-6 bg-white shadow-card">
              <TrainingAdviceList
                items={trainingItems}
                title=""
                onRemove={(item) => {
                  const updated = trainingItems.filter((t) => t.code !== item.code);
                  dispatch(
                    setTrainingAdvice({
                      occupation: analyzer.trainingAdvice?.occupation || { code: "", title: "" },
                      courses: updated.map((t) => ({ id: t.code, name: t.title, url: t.url })),
                    })
                  );
                }}
              />

              {trainingItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <svg
                      className="h-5 w-5 text-blue-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 mb-2">
                        <strong>Confused by course terminology?</strong> Try our VET Terminology Dictionary below to look up unfamiliar terms.
                      </p>
                      <button
                        onClick={() =>
                          vetTerminologyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }
                        className="text-sm font-semibold text-blue-700 hover:text-blue-800 underline transition"
                      >
                        Go to VET Terminology →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* VET Terminology Section */}
          <section ref={vetTerminologyRef}>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">VET Terminology</h2>
            <VetGlossarySearch />
          </section>
        </div>
      </div>

      {/* Floating tutorial button */}
      <button
        aria-label="Open tutorial"
        onClick={() => setShowTutorial(true)}
        className="fixed bottom-6 right-6 inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </button>

      {/* Tutorial overlay */}
      <Tutorial steps={tutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}

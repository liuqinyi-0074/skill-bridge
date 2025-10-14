// src/pages/Insight.tsx
// Career Insights page with fixed-launcher Tutorial integration. No layout impact.
// First visit auto-opens tutorial via TutorialLauncher.autoOpenOnceKey.

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";

import rawGeo from "../assets/au-states.json";
import { normalizeAuStates } from "../lib/utils/normalizeAuState";

import HeroIntro from "../components/HeroIntro";
import AuSvgMap from "../components/insight/AuMap";
import OccupationGrowthStats from "../components/insight/OccupationGrowthCard";
import GrowthComparisonChart from "../components/insight/GrowthComparisonChart";
import HelpToggleSmall from "../components/ui/HelpToggleSmall";
import ErrorBoundary from "../components/common/ErrorBoundary";
import TutorialLauncher from "../components/tutorial/TutorialLauncher";
import { insightTutorialSteps } from "../data/InsightTutorialStep";
import InsightImage from "../assets/image/data.svg";

import { useShortage } from "../hooks/queries/useShortage";
import { useCareerGrowth } from "../hooks/queries/useCareerGrowth";
import type { ShortageRes } from "../types/shortage";
import type { RootState } from "../store";
import type { CareerGrowthResponse } from "../types/careerGrowth";

import {
  type StateCode,
  type StateProps,
  getStateCode,
  initializeStateValues,
} from "../types/state";

import SearchComboWithResults, {
  type Option as IndustryOption,
} from "../components/analyzer/SearchComboWithResults";
import { industryOptions, industryNameOf } from "../data/industries";
import { useAnzscoSearch } from "../hooks/queries/userAnzscoSearch";
import type { SearchParams } from "../hooks/queries/userAnzscoSearch";
import type { AnzscoOccupation } from "../types/domain";

const useReduxTarget = () => useSelector((s: RootState) => s.analyzer?.selectedJob ?? null);
const getMajorGroupCode = (code: string) => code.trim().slice(0, 4);
const safeNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const safeString = (v: unknown): string => (typeof v === "string" ? v : "");

function toEmploymentValues(res?: ShortageRes): Record<StateCode, number> {
  const out = initializeStateValues(0);
  if (!res) return out;
  if (Array.isArray(res.latest_by_state)) {
    for (const row of res.latest_by_state) {
      const code = getStateCode(row.state);
      if (code) out[code] = safeNumber(row.nsc_emp);
    }
  } else if (res.shortage && typeof res.shortage === "object") {
    for (const [name, val] of Object.entries(res.shortage)) {
      const code = getStateCode(name);
      if (code) out[code] = safeNumber(val);
    }
  }
  return out;
}
const hasAnyData = (values: Record<StateCode, number>) => Object.values(values).some((v) => v > 0);

function SectionHeader({
  title,
  helpContent,
  level = 2,
}: {
  title: string;
  helpContent: string;
  level?: 2 | 3;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div aria-hidden className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 sm:h-10 sm:w-10" />
      {level === 2 ? (
        <h2 className="text-2xl font-heading font-extrabold text-ink sm:text-3xl">{title}</h2>
      ) : (
        <h3 className="text-xl font-heading font-bold text-ink sm:text-2xl">{title}</h3>
      )}
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-live="polite">
      <div className="h-32 rounded-xl bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );
}

function InsightInner(): React.ReactElement {
  const reduxTarget = useReduxTarget();
  const [displayJob, setDisplayJob] = useState<{ code: string; title: string } | null>(
    reduxTarget ? { code: reduxTarget.code, title: reduxTarget.title } : null
  );

  const currentCode = displayJob?.code?.trim() ?? "";
  const majorGroup = currentCode ? getMajorGroupCode(currentCode) : "";

  const { data: shortage, isLoading: shortageLoading, isFetching: shortageRefetching } =
    useShortage(currentCode);
  const { data: career, isLoading: careerLoading } = useCareerGrowth(majorGroup);

  const geoData: FeatureCollection<Geometry, StateProps> = useMemo(
    () => normalizeAuStates(rawGeo as FeatureCollection<Geometry, Record<string, unknown>>),
    []
  );

  const employmentValues = useMemo(
    () => (currentCode ? toEmploymentValues(shortage) : initializeStateValues(0)),
    [shortage, currentCode]
  );
  const mapHasData = hasAnyData(employmentValues);
  const isInitialLoading =
    (careerLoading || shortageLoading) && !!currentCode && !career && !shortage;

  const safeCareer = useMemo(() => {
    if (!currentCode) {
      return {
        anzscoCode: "",
        majorGroupTitle: "",
        fiveYearGrowthRate: 0,
        tenYearGrowthRate: 0,
        growthRanking: "",
        currentEmployment: 0,
        projectedNewJobs: 0,
        nationalAverageRate: 0,
        relatedOccupationsRate: 0,
        selectedOccupationRate: 0,
      };
    }
    if (!career) {
      return {
        anzscoCode: currentCode,
        majorGroupTitle: displayJob?.title ?? currentCode,
        fiveYearGrowthRate: 0,
        tenYearGrowthRate: 0,
        growthRanking: "",
        currentEmployment: 0,
        projectedNewJobs: 0,
        nationalAverageRate: 0,
        relatedOccupationsRate: 0,
        selectedOccupationRate: 0,
      };
    }
    const c = career as Partial<CareerGrowthResponse>;
    return {
      anzscoCode: safeString(c.anzscoCode) || currentCode,
      majorGroupTitle: safeString(c.majorGroupTitle) || displayJob?.title || currentCode,
      fiveYearGrowthRate: safeNumber(c.fiveYearGrowthRate),
      tenYearGrowthRate: safeNumber(c.tenYearGrowthRate),
      growthRanking: safeString(c.growthRanking),
      currentEmployment: safeNumber(c.currentEmployment),
      projectedNewJobs: safeNumber(c.projectedNewJobs),
      nationalAverageRate: safeNumber(c.nationalAverageRate),
      relatedOccupationsRate: safeNumber(c.relatedOccupationsRate),
      selectedOccupationRate: safeNumber(c.selectedOccupationRate),
    };
  }, [career, currentCode, displayJob?.title]);

  const title = displayJob?.title || safeCareer.majorGroupTitle || currentCode || "Select a job";
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const [openPicker, setOpenPicker] = useState<boolean>(false);
  const [industryCode, setIndustryCode] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [searchParams, setSearchParams] = useState<SearchParams>(null);
  const { data: resultsRaw, isFetching: isSearching, isError: searchIsError } = useAnzscoSearch(searchParams);
  const results = useMemo(() => (Array.isArray(resultsRaw) ? resultsRaw : []), [resultsRaw]);

  const doSearch = () => {
    const name = industryNameOf(industryCode) ?? "";
    if (name || keyword.trim()) {
      setSearchParams({ industry: name, keyword: keyword.trim(), limit: 20 });
    }
  };
  const onAddFirst = (occ: AnzscoOccupation) => {
    setDisplayJob({ code: occ.code, title: occ.title || occ.code });
    setOpenPicker(false);
  };
  const onReplaceAttempt = (occ: AnzscoOccupation) => {
    const next = occ.title || occ.code;
    const cur = displayJob?.title || "current job";
    if (window.confirm(`Do you want to view data for “${next}”? Current loaded data for “${cur}” will be replaced.`)) {
      setDisplayJob({ code: occ.code, title: next });
      setOpenPicker(false);
    }
  };

  return (
    <ErrorBoundary feedbackHref="/feedback">
      {/* Hero */}
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description={
            currentCode
              ? `Comprehensive data for ${title}. Explore employment trends and regional demand across Australia.`
              : "Redux has no target job. Charts show zero by default. Select a job to load real data, or take the analyzer test."
          }
          image={InsightImage}
          tone="blue"
          imageDecorative
        />

        {/* Fixed-position launcher that auto-opens once on first visit */}
        <TutorialLauncher
          steps={insightTutorialSteps}
          placement="top-right"
          label="View Tutorial"
          variant="outline"
          ariaLabel="View Career Insights Tutorial"
          className="z-50"
          headerOffset={64}
          tutorialHeaderOffset={64}
          autoOpenOnceKey="insight:tutorial:v1"
          autoOpenDelayMs={300}
        />
      </div>

      {/* Top notice when redux empty */}
      {!reduxTarget && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-sm text-ink">
                No job selected. Select a job to load data, or take the analyzer test.
              </p>
              <div  className="flex w-full justify-start gap-2 sm:w-auto sm:justify-end">

                <Link
                  to="/analyzer"
                  className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-blue-50"
                >
                  Take analyzer test
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Title row */}
        <div id="job-title" className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              ANZSCO Major Group: {currentCode ? getMajorGroupCode(currentCode) : "—"}
            </p>
          </div>
          <button id="select-job"
            onClick={() => setOpenPicker(true)}
            className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-blue-50"
          >
            {currentCode ? "Change job" : "Select job"}
          </button>
        </div>

        {isInitialLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Growth Statistics */}
            <section id="growth-statistics" className="mb-8">
              <SectionHeader
                title="Growth Statistics"
                helpContent="Detailed employment statistics and projections for this occupation group."
              />
              <OccupationGrowthStats
                anzscoCode={safeCareer.anzscoCode}
                majorGroupTitle={safeCareer.majorGroupTitle || title}
                fiveYearGrowthRate={safeCareer.fiveYearGrowthRate ?? 0}
                tenYearGrowthRate={safeCareer.tenYearGrowthRate ?? 0}
                growthRanking={safeCareer.growthRanking ?? ""}
                currentEmployment={safeCareer.currentEmployment ?? 0}
                projectedNewJobs={safeCareer.projectedNewJobs ?? 0}
              />
            </section>

            {/* Growth Comparison */}
            <section id="growth-comparison" className="mb-8">
              <SectionHeader
                title="Growth Comparison"
                helpContent="Compare this occupation's growth rate with related occupations and national average."
              />
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                <GrowthComparisonChart
                  selectedOccupationRate={safeCareer.selectedOccupationRate ?? 0}
                  selectedOccupationLabel={safeCareer.majorGroupTitle || title}
                  relatedOccupationsRate={safeCareer.relatedOccupationsRate ?? 0}
                  nationalAverageRate={safeCareer.nationalAverageRate ?? 0}
                />
              </div>
            </section>

            {/* Geographic Distribution */}
            <section id="geographic-map">
              <SectionHeader
                title="Geographic Distribution"
                helpContent="Click a state to view employment values. Darker shades indicate higher demand."
              />
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                {(shortageLoading || shortageRefetching) && currentCode && (
                  <div className="flex flex-col items-center justify-center py-12" aria-live="polite">
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-primary" />
                    <p className="text-sm text-slate-600">Loading geographic data…</p>
                  </div>
                )}
                {(!currentCode || !(shortageLoading || shortageRefetching)) && (
                  <AuSvgMap
                    geo={geoData}
                    values={employmentValues}
                    onSelect={(code, value) => setSelectedState(`${code} — ${value.toLocaleString("en-AU")}`)}
                  />
                )}
              </div>

              {hasAnyData(employmentValues) && selectedState && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  Selected: <span className="font-medium text-ink">{selectedState}</span>
                </p>
              )}

              {!mapHasData && currentCode && !(shortageLoading || shortageRefetching) && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  No regional employment data available for this occupation.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Picker modal */}
      {openPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white p-5">
              <h3 className="text-lg font-bold text-ink">Please select one job</h3>
              <button
                onClick={() => setOpenPicker(false)}
                className="rounded p-1 text-ink-soft hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <SearchComboWithResults
                industryOptions={industryOptions as ReadonlyArray<IndustryOption>}
                industryCode={industryCode}
                onIndustryChange={setIndustryCode}
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSearch={doSearch}
                searchError={undefined}
                results={results}
                isFetching={isSearching}
                isError={searchIsError}
                noResults={!isSearching && results.length === 0}
                pickedIds={currentCode ? [currentCode] : []}
                onAdd={onAddFirst}
                onRemove={() => {}}
                maxSelectable={1}
                selectedCount={currentCode ? 1 : 0}
                addDisabledReason="You can select only one job."
                allowAddWhenCapped
                onCapAddAttempt={onReplaceAttempt}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border p-4">
              <Link
                to="/analyzer"
                className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-blue-50"
              >
                Take analyzer test
              </Link>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default function Insight(): React.ReactElement {
  return <InsightInner />;
}

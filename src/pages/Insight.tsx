// frontend/src/pages/Insight.tsx
// Fix: guard non-array API shapes for relatedIndustries/selectedIndustries

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
import IndustryEmploymentComparison from "../components/insight/IndustryEmploymentComparison";
import HelpToggleSmall from "../components/ui/HelpToggleSmall";
import ErrorBoundary from "../components/common/ErrorBoundary";
import Tutorial from "../components/tutorial/Tutorial";
import { insightTutorialSteps } from "../data/InsightTutorialStep";

import { useShortage } from "../hooks/queries/useShortage";
import { useCareerGrowth } from "../hooks/queries/useCareerGrowth";
import type { ShortageRes } from "../types/shortage";
import type { RootState } from "../store";

import {
  type StateCode,
  type StateProps,
  getStateCode,
  initializeStateValues,
} from "../types/state";

// helpers
function getMajorGroupCode(code: string): string {
  return code.trim().slice(0, 4);
}
function safeNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function toEmploymentValues(res?: ShortageRes): Record<StateCode, number> {
  const out = initializeStateValues(0);
  if (!res) return out;
  if (Array.isArray(res.latest_by_state)) {
    for (const row of res.latest_by_state) {
      const code = getStateCode(row.state);
      if (code) out[code] = safeNumber(row.nsc_emp);
    }
    return out;
  }
  if (res.shortage && typeof res.shortage === "object") {
    for (const [name, val] of Object.entries(res.shortage)) {
      const code = getStateCode(name);
      if (code) out[code] = safeNumber(val);
    }
  }
  return out;
}
const hasAnyData = (values: Record<StateCode, number>) =>
  Object.values(values).some((v) => v > 0);
const totalEmployment = (values: Record<StateCode, number>) =>
  Object.values(values).reduce((s, v) => s + v, 0);
const activeRegions = (values: Record<StateCode, number>) =>
  Object.values(values).filter((v) => v > 0).length;
const useTargetAnzsco = () =>
  useSelector((s: RootState) => s.analyzer?.selectedJob?.code?.trim() ?? "");

// small UI
function SectionHeader({ title, helpContent }: { title: string; helpContent: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-2xl font-heading font-bold text-ink">{title}</h2>
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  );
}
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-32 bg-slate-200 rounded-xl" />
      <div className="h-64 bg-slate-200 rounded-xl" />
      <div className="h-96 bg-slate-200 rounded-xl" />
    </div>
  );
}
function NoOccupationSelected() {
  return (
    <>
      <HeroIntro
        title="Your Personalized Career Insights"
        description="Select a target occupation in your profile to view employment data, growth, and regional demand."
        image="/images/insight-hero.png"
        tone="blue"
        imageDecorative
      />
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Occupation Selected</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Choose a target occupation in your profile or complete the analyzer test.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/profile" className="px-6 py-3 rounded-lg text-white bg-primary hover:bg-primary-dark">
              Go to Profile
            </Link>
            <Link
              to="/analyzer"
              className="px-6 py-3 rounded-lg border border-primary text-primary bg-white hover:bg-blue-50"
            >
              Take Analyzer Test
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// page inner
function InsightInner(): React.ReactElement {
  const anzscoCode = useTargetAnzsco();
  const majorGroup = anzscoCode ? getMajorGroupCode(anzscoCode) : "";

  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const { data: shortage, isLoading: shortageLoading, isFetching: shortageRefetching } =
    useShortage(anzscoCode);

  const { data: career, isLoading: careerLoading, error: careerError } =
    useCareerGrowth(majorGroup);

  const geoData: FeatureCollection<Geometry, StateProps> = useMemo(
    () => normalizeAuStates(rawGeo as FeatureCollection<Geometry, Record<string, unknown>>),
    []
  );

  const employmentValues = useMemo(() => toEmploymentValues(shortage), [shortage]);
  const mapHasData = useMemo(() => hasAnyData(employmentValues), [employmentValues]);
  const isInitialLoading = (careerLoading || shortageLoading) && !career && !shortage;

  // strict safe wrapper for career data
  const safeCareer = useMemo(() => {
    if (!career) return null;
    return {
      anzscoCode: safeString(career.anzscoCode),
      majorGroupTitle: safeString(career.majorGroupTitle),
      fiveYearGrowthRate: safeNumber(career.fiveYearGrowthRate),
      tenYearGrowthRate: safeNumber(career.tenYearGrowthRate),
      growthRanking: safeString(career.growthRanking),
      currentEmployment: safeNumber(career.currentEmployment),
      projectedNewJobs: safeNumber(career.projectedNewJobs),
      nationalAverageRate: safeNumber(career.nationalAverageRate),
      relatedOccupationsRate: safeNumber(career.relatedOccupationsRate),
      selectedOccupationRate: safeNumber(career.selectedOccupationRate),
      // force arrays
      relatedIndustries: asArray<{ industryName?: string; employment?: number }>(
        career.relatedOccupationsRate as unknown
      ),
      selectedIndustries: asArray<{ industryName?: string; employment?: number }>(
        career.selectedOccupationRate as unknown
      ),
    };
  }, [career]);

  const stats = useMemo(() => {
    const total = totalEmployment(employmentValues);
    const regions = activeRegions(employmentValues);
    const avgGrowth = safeNumber(safeCareer?.fiveYearGrowthRate);
    const ranking = safeString(safeCareer?.growthRanking);
    return { totalRegions: regions, totalEmployment: total, avgGrowthRate: avgGrowth, growthRanking: ranking };
  }, [employmentValues, safeCareer]);

  const industries = useMemo(() => {
    if (!safeCareer) return [];
    const rel = safeCareer.relatedIndustries.map((i) => ({
      name: i.industryName || "Unknown Industry",
      employment: safeNumber(i.employment),
      isSelected: false,
    }));
    const sel = safeCareer.selectedIndustries.map((i) => ({
      name: i.industryName || "Unknown Industry",
      employment: safeNumber(i.employment),
      isSelected: true,
    }));
    return [...sel, ...rel].filter((x) => x.name && x.name !== "Unknown Industry" && x.employment > 0);
  }, [safeCareer]);

  if (!anzscoCode) return <NoOccupationSelected />;

  return (
    <>
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description={
            safeCareer
              ? `Comprehensive data for ${safeCareer.majorGroupTitle}. Explore regional demand and growth projections.`
              : `Loading career insights for ANZSCO ${anzscoCode}...`
          }
          image="/images/insight-hero.png"
          tone="blue"
          imageDecorative
        />
        <div className="absolute bottom-8 right-8">
          <button
            onClick={() => setShowTutorial(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-primary border-2 border-primary text-sm font-semibold rounded-full shadow-lg hover:bg-primary hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Tutorial
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto space-y-8">
        {isInitialLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {careerError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-red-900 mb-1">Unable to Load Career Data</h3>
                <p className="text-sm text-red-800 mb-3">
                  The data below may be incomplete. Try again later or{" "}
                  <Link to="/feedback" className="underline font-medium hover:text-red-900">
                    send feedback
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* quick stats */}
            <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {careerLoading ? "-" : stats.totalRegions}
                  </div>
                  <div className="text-sm text-slate-600">Active Regions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {careerLoading ? "-" : stats.totalEmployment.toLocaleString("en-AU")}
                  </div>
                  <div className="text-sm text-slate-600">Total Employment</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {careerLoading ? "-" : `${stats.avgGrowthRate > 0 ? "+" : ""}${stats.avgGrowthRate.toFixed(1)}%`}
                  </div>
                  <div className="text-sm text-slate-600">Avg. Growth Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {careerLoading ? "-" : (stats.growthRanking || "N/A")}
                  </div>
                  <div className="text-sm text-slate-600">Growth Ranking</div>
                </div>
              </div>
            </section>

            {/* major group stats */}
            {safeCareer && (
              <section id="growth-statistics">
                <SectionHeader
                  title="Major Group Statistics"
                  helpContent="The first 4 digits of an ANZSCO code define the Major Group. These stats summarize that group."
                />
                <OccupationGrowthStats
                  anzscoCode={safeCareer.anzscoCode}
                  majorGroupTitle={safeCareer.majorGroupTitle}
                  fiveYearGrowthRate={safeCareer.fiveYearGrowthRate}
                  tenYearGrowthRate={safeCareer.tenYearGrowthRate}
                  growthRanking={safeCareer.growthRanking}
                  currentEmployment={safeCareer.currentEmployment}
                  projectedNewJobs={safeCareer.projectedNewJobs}
                />
              </section>
            )}

            {/* growth comparison */}
            {safeCareer && (
              <section id="growth-comparison">
                <SectionHeader
                  title="Growth Rate Comparison"
                  helpContent="Compare your occupation's projected growth against related occupations and the national average."
                />
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                  <GrowthComparisonChart
                    selectedOccupationRate={safeCareer.selectedOccupationRate}
                    selectedOccupationLabel={safeCareer.majorGroupTitle}
                    relatedOccupationsRate={safeCareer.relatedOccupationsRate}
                    nationalAverageRate={safeCareer.nationalAverageRate}
                  />
                </div>
              </section>
            )}

            {/* industries */}
            {industries.length > 0 && (
              <section id="industry-employment">
                <SectionHeader
                  title="Employment by Industry"
                  helpContent="Industries are ranked by employment size. Gold bars indicate selected industries for your occupation."
                />
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                  <IndustryEmploymentComparison industries={industries} />
                </div>
              </section>
            )}

            {/* map */}
            <section id="geographic-map">
              <SectionHeader
                title="Geographic Distribution"
                helpContent="Click a state to view its employment value. Darker shades indicate higher values."
              />
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                {shortageLoading || shortageRefetching ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 text-primary mb-3 border-4 border-current border-t-transparent rounded-full" />
                    <p className="text-sm text-slate-600">Loading geographic data…</p>
                  </div>
                ) : (
                  <AuSvgMap
                    geo={geoData}
                    values={employmentValues}
                    onSelect={(code, value) => setSelectedState(`${code} — ${value.toLocaleString("en-AU")}`)}
                  />
                )}
              </div>

              {mapHasData && selectedState && (
                <p className="mt-3 text-sm text-ink-soft text-center">
                  Selected: <span className="font-medium text-ink">{selectedState}</span>
                </p>
              )}

              {!mapHasData && !(shortageLoading || shortageRefetching) && (
                <p className="mt-3 text-sm text-ink-soft text-center">No regional employment data available.</p>
              )}
            </section>
          </>
        )}
      </div>

      <Tutorial steps={insightTutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  );
}

// export with boundary
export default function Insight(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <InsightInner />
    </ErrorBoundary>
  );
}

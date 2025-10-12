// frontend/src/pages/Insight.tsx
// Clean, typed, and accessible. No `any`, no dev logs.
// Adds explicit section IDs to match `insightTutorialSteps` targets.

import { useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"
import type { FeatureCollection, Geometry } from "geojson"

import rawGeo from "../assets/au-states.json"
import { normalizeAuStates } from "../lib/utils/normalizeAuState"

import HeroIntro from "../components/HeroIntro"
import AuSvgMap from "../components/insight/AuMap"
import OccupationGrowthStats from "../components/insight/OccupationGrowthCard"
import GrowthComparisonChart from "../components/insight/GrowthComparisonChart"
import HelpToggleSmall from "../components/ui/HelpToggleSmall"
import ErrorBoundary from "../components/common/ErrorBoundary"
import Tutorial from "../components/tutorial/Tutorial"
import { insightTutorialSteps } from "../data/InsightTutorialStep"
import InsightImage from "../assets/image/data.svg"

import { useShortage } from "../hooks/queries/useShortage"
import { useCareerGrowth } from "../hooks/queries/useCareerGrowth"
import type { ShortageRes } from "../types/shortage"
import type { RootState } from "../store"
import type { CareerGrowthResponse } from "../types/careerGrowth"

import {
  type StateCode,
  type StateProps,
  getStateCode,
  initializeStateValues,
} from "../types/state"

// ---------- Redux + utils ----------

/** Read the currently selected ANZSCO code from Redux */
const useTargetAnzsco = () =>
  useSelector((s: RootState) => s.analyzer?.selectedJob?.code?.trim() ?? "")

/** Extract the 4-digit major group code from ANZSCO */
const getMajorGroupCode = (code: string) => code.trim().slice(0, 4)

/** Safe number parser with fallback to 0 */
const safeNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Safe string parser with fallback to empty string */
const safeString = (v: unknown): string => (typeof v === "string" ? v : "")

/** Convert shortage API into map-friendly state→value dictionary */
function toEmploymentValues(res?: ShortageRes): Record<StateCode, number> {
  const out = initializeStateValues(0)
  if (!res) return out

  if (Array.isArray(res.latest_by_state)) {
    for (const row of res.latest_by_state) {
      const code = getStateCode(row.state)
      if (code) out[code] = safeNumber(row.nsc_emp)
    }
  } else if (res.shortage && typeof res.shortage === "object") {
    for (const [name, val] of Object.entries(res.shortage)) {
      const code = getStateCode(name)
      if (code) out[code] = safeNumber(val)
    }
  }
  return out
}

/** True if at least one state has data > 0 */
const hasAnyData = (values: Record<StateCode, number>) =>
  Object.values(values).some((v) => v > 0)

// ---------- UI helpers ----------

/** Section header with decorative square and inline help */
function SectionHeader({
  title,
  helpContent,
  level = 2,
}: {
  title: string
  helpContent: string
  level?: 2 | 3
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {/* Decorative square; hidden from screen readers */}
      <div
        aria-hidden="true"
        className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 sm:h-10 sm:w-10"
      />
      {level === 2 ? (
        <h2 className="text-2xl font-heading font-extrabold text-ink sm:text-3xl">{title}</h2>
      ) : (
        <h3 className="text-xl font-heading font-bold text-ink sm:text-2xl">{title}</h3>
      )}
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  )
}

/** Top-right tutorial button with accessible labeling */
function TopRightTutorialButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <div className="absolute top-4 right-4 sm:top-6 sm:right-8">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-5 py-3 bg-white text-primary border-2 border-primary text-sm font-semibold rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-200"
        aria-label="View Tutorial"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden sm:inline">View Tutorial</span>
        <span className="sm:hidden">Tutorial</span>
      </button>
    </div>
  )
}

/** Loading skeleton for first screen paint */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-live="polite">
      <div className="h-32 rounded-xl bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  )
}

/** Empty-state hero when no occupation is selected */
function NoOccupationSelected() {
  return (
    <>
      {/* ID matches tutorial step "welcome" target */}
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description="Select a target occupation in your profile to view employment data, growth, and regional demand."
          image={InsightImage}
          tone="blue"
          imageDecorative
        />
        <TopRightTutorialButton onClick={() => { /* handled in page where mounted */ }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <h3 className="mb-2 text-xl font-semibold text-slate-900">No Occupation Selected</h3>
          <p className="mx-auto mb-6 max-w-md text-slate-600">
            Choose a target occupation in your profile or complete the analyzer test.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/profile" className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-dark">
              Go to Profile
            </Link>
            <Link
              to="/analyzer"
              className="rounded-lg border border-primary bg-white px-6 py-3 text-primary hover:bg-blue-50"
            >
              Take Analyzer Test
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Main page ----------

function InsightInner(): React.ReactElement {
  const anzscoCode = useTargetAnzsco()
  const majorGroup = anzscoCode ? getMajorGroupCode(anzscoCode) : ""

  const [showTutorial, setShowTutorial] = useState(false)
  const [selectedState, setSelectedState] = useState<string | null>(null)

  const { data: shortage, isLoading: shortageLoading, isFetching: shortageRefetching } =
    useShortage(anzscoCode)
  const { data: career, isLoading: careerLoading, error: careerError } =
    useCareerGrowth(majorGroup)

  const geoData: FeatureCollection<Geometry, StateProps> = useMemo(
    () => normalizeAuStates(rawGeo as FeatureCollection<Geometry, Record<string, unknown>>),
    []
  )

  const employmentValues = useMemo(() => toEmploymentValues(shortage), [shortage])
  const mapHasData = hasAnyData(employmentValues)
  const isInitialLoading = (careerLoading || shortageLoading) && !career && !shortage

  // Normalize backend response to safe UI values
  const safeCareer = useMemo(() => {
    if (!career) return null
    const c = career as unknown as Partial<CareerGrowthResponse>
    return {
      anzscoCode: safeString(c.anzscoCode),
      majorGroupTitle: safeString(c.majorGroupTitle),
      fiveYearGrowthRate: safeNumber(c.fiveYearGrowthRate),
      tenYearGrowthRate: safeNumber(c.tenYearGrowthRate),
      growthRanking: safeString(c.growthRanking),
      currentEmployment: safeNumber(c.currentEmployment),
      projectedNewJobs: safeNumber(c.projectedNewJobs),
      nationalAverageRate: safeNumber(c.nationalAverageRate),
      relatedOccupationsRate: safeNumber(c.relatedOccupationsRate),
      selectedOccupationRate: safeNumber(c.selectedOccupationRate),
    }
  }, [career])

  if (!anzscoCode) return <NoOccupationSelected />

  return (
    <>
      {/* Hero header with explicit ID for tutorial "welcome"/"complete" */}
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description={
            safeCareer
              ? `Comprehensive data for ${safeCareer.majorGroupTitle}. Explore growth projections and demand.`
              : `Loading career insights for ANZSCO ${anzscoCode}...`
          }
          image="../../"
          tone="blue"
          imageDecorative
        />
        <TopRightTutorialButton onClick={() => setShowTutorial(true)} />
      </div>

      {/* Content container */}
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {isInitialLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {careerError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm" role="alert">
                <h3 className="mb-1 text-lg font-semibold text-red-900">Unable to Load Career Data</h3>
                <p className="text-sm text-red-800">
                  Try again later or{" "}
                  <Link to="/feedback" className="font-medium underline hover:text-red-900">
                    send feedback
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* Major group title block: id = job-title */}
            {safeCareer && (
              <section id="job-title" aria-labelledby="group-title-label">
                <h2 id="group-title-label" className="mb-2 text-xl font-semibold text-ink">
                  Major Group Title
                </h2>
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-center text-lg font-bold text-primary shadow-sm">
                  {safeCareer.majorGroupTitle || "Unknown Major Group"}
                </div>
              </section>
            )}

            {/* Quick stats panel: id = quick-stats */}
            <section id="quick-stats" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-slate-900">
                    {safeCareer ? `${safeCareer.fiveYearGrowthRate > 0 ? "+" : ""}${safeCareer.fiveYearGrowthRate.toFixed(1)}%` : "-"}
                  </div>
                  <div className="text-sm text-slate-600">Avg. Growth Rate (5y)</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-2xl font-bold text-slate-900">
                    {safeCareer?.growthRanking || "N/A"}
                  </div>
                  <div className="text-sm text-slate-600">Growth Ranking</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-slate-900">
                    {safeCareer ? safeCareer.currentEmployment.toLocaleString("en-AU") : "-"}
                  </div>
                  <div className="text-sm text-slate-600">Current Employment</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-slate-900">
                    {safeCareer ? safeCareer.projectedNewJobs.toLocaleString("en-AU") : "-"}
                  </div>
                  <div className="text-sm text-slate-600">Projected New Jobs</div>
                </div>
              </div>
            </section>

            {/* Major group stats card: id = growth-statistics */}
            {safeCareer && (
              <section id="growth-statistics">
                <SectionHeader
                  title="Major Group Statistics"
                  helpContent="Key growth metrics and employment levels for the major group."
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

            {/* Growth comparison chart: id = growth-comparison */}
            {safeCareer && (
              <section id="growth-comparison">
                <SectionHeader
                  title="Growth Rate Comparison"
                  helpContent="Compare your occupation's projected growth with related occupations and the national average."
                />
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                  <GrowthComparisonChart
                    selectedOccupationRate={safeCareer.selectedOccupationRate}
                    selectedOccupationLabel={safeCareer.majorGroupTitle || "Selected occupation"}
                    relatedOccupationsRate={safeCareer.relatedOccupationsRate}
                    nationalAverageRate={safeCareer.nationalAverageRate}
                  />
                </div>
              </section>
            )}

            {/* Map: id = geographic-map */}
            <section id="geographic-map">
              <SectionHeader
                title="Geographic Distribution"
                helpContent="Click a state to view employment values. Darker shades indicate higher values."
              />
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                {shortageLoading || shortageRefetching ? (
                  <div className="flex flex-col items-center justify-center py-12" aria-live="polite">
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-primary" />
                    <p className="text-sm text-slate-600">Loading geographic data…</p>
                  </div>
                ) : (
                  <AuSvgMap
                    geo={geoData}
                    values={employmentValues}
                    onSelect={(code, value) =>
                      setSelectedState(`${code} — ${value.toLocaleString("en-AU")}`)
                    }
                  />
                )}
              </div>

              {mapHasData && selectedState && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  Selected: <span className="font-medium text-ink">{selectedState}</span>
                </p>
              )}

              {!mapHasData && !(shortageLoading || shortageRefetching) && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  No regional employment data available.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Tutorial modal (steps reference the IDs added above) */}
      <Tutorial steps={insightTutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  )
}

export default function Insight(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <InsightInner />
    </ErrorBoundary>
  )
}

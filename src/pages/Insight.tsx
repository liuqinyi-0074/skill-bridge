// frontend/src/pages/Insight.tsx
// Comprehensive occupation insight page displaying growth statistics,
// comparison charts, and geographical demand distribution.
// Uses real API data with fallback to empty data (0 values) if API fails.
// Global error handling via ErrorBoundary, always shows UI.
// Includes interactive tutorial system.

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";

import rawGeo from "../assets/au-states.json";
import { normalizeAuStates } from "../lib/utils/normalizeAuState";

import HeroIntro from "../components/HeroIntro";
import AuSvgMap from "../components/insight/AuMap";
import OccupationGrowthStats from "../components/insight/OccupationGrowthCard";
import GrowthComparisonChart from "../components/insight/GrowthComparisonChart";
import IndustryEmploymentComparison from "../components/insight/IndustryEmploymentComparison";
import HelpToggleSmall from "../components/ui/HelpToggleSmall";
import InsightImage from "../assets/image/data.svg";
import ErrorBoundary from "../components/common/ErrorBoundary";
import Tutorial from "../components/tutorial/Tutorial";
import { insightTutorialSteps } from "../data/InsightTutorialStep";

import { useShortage } from "../hooks/queries/useShortage";
import { useCareerGrowth } from "../hooks/queries/useCareerGrowth";
import type { ShortageRes } from "../types/shortage";
import type { RootState } from "../store";

import {
  type StateCode,
  getStateCode,
  initializeStateValues,
  type StateProps,
} from "../types/state";

// ============================================================================
// Constants
// ============================================================================

const GEO_DATA: FeatureCollection<Geometry, StateProps> = normalizeAuStates(
  rawGeo as FeatureCollection<Geometry, Record<string, unknown>>
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert API shortage response to map-compatible state values
 */
function transformShortageData(res?: ShortageRes): Record<StateCode, number> {
  const stateValues = initializeStateValues(0);

  if (!res) return stateValues;

  // Handle modern API format: latest_by_state array
  if (Array.isArray(res.latest_by_state)) {
    res.latest_by_state.forEach((entry) => {
      const stateCode = getStateCode(entry.state);
      const value = entry.nsc_emp;

      if (stateCode && typeof value === "number" && Number.isFinite(value)) {
        stateValues[stateCode] = value;
      }
    });
    return stateValues;
  }

  // Handle legacy API format: shortage object
  if (res.shortage && typeof res.shortage === "object") {
    Object.entries(res.shortage).forEach(([key, value]) => {
      const stateCode = getStateCode(key);
      if (stateCode && typeof value === "number" && Number.isFinite(value)) {
        stateValues[stateCode] = value;
      }
    });
  }

  return stateValues;
}

/**
 * Custom hook to get target ANZSCO code
 */
function useTargetAnzsco(): string {
  const params = useParams<{ anzsco?: string }>();
  const fromRoute = params.anzsco?.trim() ?? "";

  const fromRedux = useSelector(
    (state: RootState) => state.analyzer?.selectedJob?.code?.trim() ?? ""
  );

  return fromRoute || fromRedux || "";
}

/**
 * Calculate total employment from state values
 */
function calculateTotalEmployment(values: Record<StateCode, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

/**
 * Calculate number of active regions (with non-zero employment)
 */
function calculateActiveRegions(values: Record<StateCode, number>): number {
  return Object.values(values).filter((value) => value > 0).length;
}

/**
 * Check if any state has non-zero shortage value
 */
function hasShortageData(values: Record<StateCode, number>): boolean {
  return Object.values(values).some((value) => value > 0);
}

/**
 * Get the first 4 digits from ANZSCO code (major group)
 */
function getMajorGroupCode(code: string): string {
  return code.trim().slice(0, 4);
}

/**
 * Safe number getter with 0 fallback
 */
function safeNumber(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Safe string getter with empty fallback
 */
function safeString(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim() : "";
}

// ============================================================================
// UI Components
// ============================================================================

/**
 * Empty state when no occupation is selected
 */
function NoOccupationSelected() {
  return (
    <>
      <HeroIntro
        title="Discover Career Insights Tailored for You"
        description="Explore personalized occupation metrics, track employment trends across Australian states, and make informed career decisions with real-time labor market data."
        image={InsightImage}
        tone="blue"
        ctaLabel="Go to Profile"
        ctaTo="/profile"
        imageDecorative
      />

      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <div className="rounded-xl border border-border bg-white shadow-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-heading font-bold text-ink">
            No Occupation Selected
          </h2>

          <p className="text-ink-soft max-w-md mx-auto">
            To view detailed career insights, please select a target occupation or complete our
            career analyzer to find the best match for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              to="/profile"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Go to Profile
            </Link>
            <Link
              to="/analyzer"
              className="inline-flex items-center justify-center px-6 py-3 border border-primary text-base font-medium rounded-lg text-primary bg-white hover:bg-blue-50 transition-colors"
            >
              Take Analyzer Test
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Section header with title and help toggle
 */
interface SectionHeaderProps {
  title: string;
  helpContent: string;
}

function SectionHeader({ title, helpContent }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-2xl font-heading font-bold text-ink">{title}</h2>
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  );
}

/**
 * Quick stats cards showing key metrics at a glance
 */
interface QuickStatsProps {
  totalRegions: number;
  totalEmployment: number;
  avgGrowthRate: number;
  growthRanking: string;
}

function QuickStats({
  totalRegions,
  totalEmployment,
  avgGrowthRate,
  growthRanking,
}: QuickStatsProps) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalRegions}</div>
          <div className="text-sm text-slate-600">Active Regions</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {totalEmployment.toLocaleString("en-AU")}
          </div>
          <div className="text-sm text-slate-600">Total Employment</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {avgGrowthRate > 0 ? "+" : ""}
            {avgGrowthRate.toFixed(1)}%
          </div>
          <div className="text-sm text-slate-600">Avg. Growth Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {growthRanking || "N/A"}
          </div>
          <div className="text-sm text-slate-600">Growth Ranking</div>
        </div>
      </div>
    </section>
  );
}

/**
 * Loading skeleton for data sections
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-32 bg-slate-200 rounded-xl" />
      <div className="h-64 bg-slate-200 rounded-xl" />
      <div className="h-96 bg-slate-200 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Main Component Inner (wrapped by ErrorBoundary)
// ============================================================================

function InsightInner(): React.ReactElement {
  const anzscoCode = useTargetAnzsco();
  const majorGroupCode = anzscoCode ? getMajorGroupCode(anzscoCode) : "";

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Fetch shortage data (map data) - errors handled by ErrorBoundary
  const { data: shortageData, isFetching: isShortageLoading } = useShortage(anzscoCode);

  // Fetch career growth data from API - don't throw, handle gracefully
  const { 
    data: careerApiData, 
    isLoading: isCareerLoading,
    error: careerError 
  } = useCareerGrowth(majorGroupCode);

  // Use API data or create empty fallback with 0 values
  const careerData = useMemo(() => {
    if (careerApiData) {
      return careerApiData;
    }
    // Return empty data structure with 0 values when API fails
    return {
      anzscoCode: majorGroupCode,
      majorGroupTitle: `ANZSCO ${majorGroupCode}`,
      fiveYearGrowthRate: 0,
      tenYearGrowthRate: 0,
      growthRanking: "",
      currentEmployment: 0,
      projectedNewJobs: 0,
      nationalAverageRate: 0,
      relatedOccupationsRate: 0,
      selectedOccupationRate: 0,
      relatedIndustries: [],
      selectedIndustries: [],
    };
  }, [careerApiData, majorGroupCode]);

  // State for selected state in map
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Transform shortage data for map
  const stateValues = useMemo(() => transformShortageData(shortageData), [shortageData]);

  const hasMapData = useMemo(() => hasShortageData(stateValues), [stateValues]);

  const geoData = useMemo(() => GEO_DATA, []);

  // Calculate statistics with safe defaults (0 for missing data)
  const stats = useMemo(() => {
    const totalEmployment = calculateTotalEmployment(stateValues);
    const activeRegions = calculateActiveRegions(stateValues);
    const avgGrowth = safeNumber(careerData?.fiveYearGrowthRate);
    const ranking = safeString(careerData?.growthRanking);

    return {
      totalRegions: activeRegions,
      totalEmployment,
      avgGrowthRate: avgGrowth,
      growthRanking: ranking,
    };
  }, [stateValues, careerData]);

  // Combine all industries into one array with isSelected flag
  const allIndustries = useMemo(() => {
    if (!careerData) return [];
    
    const related = (careerData.relatedIndustries || []).map((industry) => ({
      name: industry.industryName || "Unknown Industry",
      employment: safeNumber(industry.employment),
      isSelected: false,
    }));

    const selected = (careerData.selectedIndustries || []).map((industry) => ({
      name: industry.industryName || "Unknown Industry",
      employment: safeNumber(industry.employment),
      isSelected: true,
    }));

    // Filter out entries with 0 employment and empty names
    const combined = [...selected, ...related];
    const filtered = combined.filter(
      (item) => item.name && item.name !== "Unknown Industry" && item.employment > 0
    );

    // If no valid industries, return some mock data for display
    if (filtered.length === 0) {
      return [
        { name: "Information Technology", employment: 0, isSelected: true },
        { name: "Professional Services", employment: 0, isSelected: false },
        { name: "Healthcare", employment: 0, isSelected: false },
      ];
    }

    return filtered;
  }, [careerData]);

  // Handle state selection on map
  const handleStateSelect = (stateCode: string): void => {
    setSelectedState(stateCode);
  };

  // Show empty state if no ANZSCO code
  if (!anzscoCode) {
    return <NoOccupationSelected />;
  }

  // Show loading state only on initial load
  const isLoading = (isCareerLoading || isShortageLoading) && !careerData;

  // Safe career data values with 0 fallback
  const safeCareerData = careerData
    ? {
        anzscoCode: safeString(careerData.anzscoCode),
        majorGroupTitle: safeString(careerData.majorGroupTitle),
        fiveYearGrowthRate: safeNumber(careerData.fiveYearGrowthRate),
        tenYearGrowthRate: safeNumber(careerData.tenYearGrowthRate),
        growthRanking: safeString(careerData.growthRanking),
        currentEmployment: safeNumber(careerData.currentEmployment),
        projectedNewJobs: safeNumber(careerData.projectedNewJobs),
        nationalAverageRate: safeNumber(careerData.nationalAverageRate),
        relatedOccupationsRate: safeNumber(careerData.relatedOccupationsRate),
        selectedOccupationRate: safeNumber(careerData.selectedOccupationRate),
      }
    : null;

  return (
    <>
      {/* Hero Section with Tutorial Button */}
      <div id="hero-section">
        <div className="relative">
          <HeroIntro
            title="Your Personalized Career Insights"
            description={
              safeCareerData
                ? `Comprehensive employment data and growth projections for ${safeCareerData.majorGroupTitle}. Explore regional demand, industry trends, and future opportunities across Australia.`
                : `Loading career insights for ANZSCO ${anzscoCode}...`
            }
            image="/images/insight-hero.png"
            tone="blue"
            imageDecorative
          />
          
          {/* Tutorial Button Overlay */}
          <div className="absolute bottom-8 right-8">
            <button
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-primary border-2 border-primary text-sm font-semibold rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto space-y-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* API Error Banner - Show if career data failed to load */}
            {careerError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-1">
                      Unable to Load Career Data
                    </h3>
                    <p className="text-sm text-red-800 mb-3">
                      We're having trouble loading career insights from our server. The data shown below may be incomplete. Please try again later or{" "}
                      <Link to="/feedback" className="underline font-medium hover:text-red-900">
                        send us feedback
                      </Link>
                      .
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats Bar - Always show with 0 for missing data */}
            <div id="quick-stats">
              <QuickStats {...stats} />
            </div>

            {/* Growth Statistics Section */}
            {safeCareerData && (
              <section id="growth-statistics">
                <SectionHeader
                  title="Major Group Statistics"
                  helpContent="The first 4 digits of an ANZSCO code represent the Major Group classification. For example, code 2613 refers to 'Software and Applications Programmers' within the broader ICT Professionals category. This grouping helps track employment trends and growth projections for related occupations."
                />
                <OccupationGrowthStats
                  anzscoCode={safeCareerData.anzscoCode}
                  majorGroupTitle={safeCareerData.majorGroupTitle}
                  fiveYearGrowthRate={safeCareerData.fiveYearGrowthRate}
                  tenYearGrowthRate={safeCareerData.tenYearGrowthRate}
                  growthRanking={safeCareerData.growthRanking}
                  currentEmployment={safeCareerData.currentEmployment}
                  projectedNewJobs={safeCareerData.projectedNewJobs}
                />
              </section>
            )}

            {/* Growth Comparison Chart Section */}
            {safeCareerData && (
              <section id="growth-comparison">
                <GrowthComparisonChart
                  selectedOccupationRate={safeCareerData.selectedOccupationRate}
                  selectedOccupationLabel={safeCareerData.majorGroupTitle}
                  relatedOccupationsRate={safeCareerData.relatedOccupationsRate}
                  nationalAverageRate={safeCareerData.nationalAverageRate}
                />
              </section>
            )}

            {/* Combined Industry Comparison Section */}
            <section id="industry-employment">
              <IndustryEmploymentComparison
                industries={allIndustries}
                title="Employment by Industry"
              />
            </section>

            {/* Geographic Distribution Map Section */}
            <section id="geographic-map">
              <SectionHeader
                title="Geographic Demand Distribution"
                helpContent="Click on different states to view their specific demand data. Darker colors indicate higher demand or employment numbers for this occupation in that state. This helps you understand regional job market variations across Australia."
              />

              {!hasMapData && !isShortageLoading && (
                <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 mb-4">
                  <p>No regional employment data available for this occupation.</p>
                </div>
              )}

              <div className="flex justify-center">
                <AuSvgMap
                  geo={geoData}
                  values={stateValues}
                  className="w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]"
                  onSelect={handleStateSelect}
                />
              </div>

              {/* Show selected state info inline below map */}
              {selectedState && (
                <div className="mt-4 text-center text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{selectedState}</span>
                  {stateValues[selectedState as StateCode] > 0 && (
                    <span>
                      {" — "}
                      Employment: {stateValues[selectedState as StateCode].toLocaleString("en-AU")}
                    </span>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Tutorial Component */}
      <Tutorial
        steps={insightTutorialSteps}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
}

// ============================================================================
// Main Component Export with ErrorBoundary
// ============================================================================

export default function Insight(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <InsightInner />
    </ErrorBoundary>
  );
}
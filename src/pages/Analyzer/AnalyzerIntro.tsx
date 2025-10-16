// Intro page for the Analyzer wizard.
// - Uses a full-bleed hero and feature sections.
// - CTA navigates to the first data-collection step via a static path.
// - Floating CTA: fixed at bottom-right on large screens. It pushes up when near footer sentinel.

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Button from "../../components/ui/Button";
import HeroIntro from "../../components/HeroIntro";
import FeatureCard from "../../components/FeatureCard";
import DataAnalyzerIcon from "../../assets/image/dataAnalyzer.svg";
import MatchIcon from "../../assets/image/match.svg";
import PlanIcon from "../../assets/image/plan.svg";
import IntroImage from "../../assets/image/analyze.svg";
import DataSource from "../../components/DataSource";
import HowItWorksGrid, { type HowItWorksStep } from "../../components/analyzer/HowItWorksGrid";

/** Inline SVG icons for steps  */
const IconUser: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path
      d="M4 20c0-4 4-6 8-6s8 2 8 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconCheck: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12l3 3 5-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTarget: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const IconBook: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 6a2 2 0 012-2h11a3 3 0 013 3v13a2 2 0 00-2-2H6a2 2 0 00-2 2V6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M9 6h9M9 10h9M9 14h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function AnalyzerIntro(): React.ReactElement {
  // English: observe if the hero section is within the viewport
  const heroRef = useRef<HTMLDivElement | null>(null);

  // English: a tiny empty div placed above the footer to compute push-up distance
  const footerSentinelRef = useRef<HTMLDivElement | null>(null);

  // English: whether hero is visible; when false, show floating CTA on large screens
  const [heroInView, setHeroInView] = useState<boolean>(true);

  // English: how many pixels we need to lift the floating CTA to stay above footer
  const [pushUpPx, setPushUpPx] = useState<number>(0);

  // English: observe hero visibility to toggle floating CTA
  useEffect(() => {
    if (!heroRef.current) return;
    const io = new IntersectionObserver(
      (entries) => setHeroInView(entries[0].isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(heroRef.current);
    return () => io.disconnect();
  }, []);

  // English: compute "push-up" amount for the floating CTA when footer sentinel overlaps viewport bottom
  useEffect(() => {
    let raf = 0;

    const computePush = (): void => {
      const el = footerSentinelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // overlap > 0 means sentinel's top has entered the viewport from the bottom side
      const overlap = Math.max(0, vh - rect.top);
      setPushUpPx(overlap);
    };

    const onScrollOrResize = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(computePush);
    };

    computePush();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  // Data sources shown at the bottom
  const sources = [
    {
      id: "1",
      name: "Jobs and Skills Australia",
      url: "https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles",
      description: "Australian government data on occupation and industry profiles.",
    },
    {
      id: "2",
      name: "O*NET Online",
      url: "https://www.onetonline.org/",
      description: "Comprehensive occupational data and skill taxonomy from the U.S. Department of Labor.",
    },
    {
      id: "3",
      name: "Victorian VET Enrolments",
      url: "https://discover.data.vic.gov.au/dataset/vocational-education-and-training-course-enrolments-by-training-package",
      description: "Victorian Government statistics on vocational training course enrolments by training package.",
    },
  ] as const;

  // Steps passed to the reusable grid (icons, ids, titles, descriptions)
  const steps: HowItWorksStep[] = [
    {
      id: "step-1",
      title: "Step 1: Input personal info",
      desc: "Provide your past occupation and interested industry.",
      icon: <IconUser className="w-full h-full" />,
    },
    {
      id: "step-2",
      title: "Step 2: Confirm analysis",
      desc: "The system builds your capability profile automatically.",
      icon: <IconCheck className="w-full h-full" />,
    },
    {
      id: "step-3",
      title: "Step 3: Select target jobs",
      desc: "Pick career options that match your aspirations.",
      icon: <IconTarget className="w-full h-full" />,
    },
    {
      id: "step-4",
      title: "Step 4: Get advice",
      desc: "Identify gaps and receive personalized training guidance.",
      icon: <IconBook className="w-full h-full" />,
    },
  ];

  const inlineCta = (
    <div className="max-w-7xl mx-auto text-center">
      <p className="text-ink-soft mb-3">Want to find roles that fit you?</p>
      <Button to="/analyzer/get-info">Take analyzer test now</Button>
    </div>
  );

  return (
    <>
      {/* Full-bleed hero: expands to screen width and touches header (no top gap) */}
      <div className="w-screen mx-[calc(50%-50vw)]" ref={heroRef}>
        <HeroIntro
          title="Career Analyzer"
          description="Understand your strengths, explore tailored job options, and plan your growth with evidence-based insights."
          image={IntroImage}
          tone="blue" // 'blue' | 'yellow' | 'white'
          ctaLabel="Start test"
          ctaTo="/analyzer/get-info" /* Static path to the next step */
        />
      </div>

      {/* Main content, centered and constrained */}
      <main className="px-4 sm:px-6 lg:px-8 py-16">


        {/* Why choose us */}
        <section className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">Why choose us</h2>
          <p className="mt-3 text-ink-soft max-w-2xl mx-auto">
            We combine market data, personalized recommendations, and clear action plans to support your career journey.
          </p>

        {/* Features grid (centered) */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              title="Data-driven decisions"
              description="Leverage market data and industry trends to get accurate career guidance."
              image={DataAnalyzerIcon}
              imageAlt="Data analyzer icon"
              tone="gold"
            />
            <FeatureCard
              title="Personalized matching"
              description="Align your unique strengths and interests with roles that fit you best."
              image={MatchIcon}
              imageAlt="Matching icon"
              tone="blue"
            />
            <FeatureCard
              title="Clear action plan"
              description="Receive concrete upskilling suggestions and resources to reach your goals faster."
              image={PlanIcon}
              imageAlt="Action plan icon"
              tone="gold"
            />
          </div>
        </section>

        {/* How it works: title + intro live here, right next to the reusable grid */}
        <section className="mt-20 max-w-7xl mx-auto text-center">
          <h2 id="how-it-works" className="text-2xl sm:text-3xl font-bold text-ink">
            How it works
          </h2>
          <p className="mt-3 text-ink-soft max-w-2xl mx-auto">
            Four simple steps to get a tailored career development report.
          </p>

          {/* pass labelledById to link region to the H2 above. */}
          <HowItWorksGrid
            steps={steps}
            labelledById="how-it-works"
            className="mt-6"
            columns={steps.length}
          />
        </section>

        {/* Data sources section */}
        <section className="mt-20 max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">Data sources</h2>
          <p className="mt-3 text-ink-soft max-w-2xl mx-auto">
            Our insights are grounded in verified open data and official workforce statistics. These trusted sources ensure
            accuracy and transparency for every analysis.
          </p>
          <DataSource sources={sources} title="" />
        </section>

        {/* Footer sentinel to push the floating CTA up before the actual footer */}
        <div ref={footerSentinelRef} aria-hidden className="h-1 w-full" />

        {/* Inline CTA: show on small screens; on desktop only while hero visible (no floating button) */}
        <div className="mt-16 lg:hidden">{inlineCta}</div>
        {heroInView && <div className="mt-16 hidden lg:block">{inlineCta}</div>}
      </main>

      {/* Large screens (>=lg): fixed bottom-right CTA that pushes up when footer enters */}
      {!heroInView && (
        <div
          className={clsx(
            "hidden lg:block fixed right-6 z-40 transition-opacity duration-200",
            heroInView ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          // Base gap 24px; add pushUpPx when the footer sentinel overlaps the viewport bottom
          style={{ bottom: `${24 + Math.max(0, pushUpPx)}px` }}
        >
          <div className="backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border border-border rounded-2xl shadow-lg p-3 w-[18rem]">
            <p className="text-sm text-ink-soft mb-2">Want to know which jobs fit you?</p>
            <Button aria-label="Take the analyzer test now" to="/analyzer/get-info">
              Take analyzer test now
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

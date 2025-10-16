// - Background image is 20% taller than the hero (so 1/5 remains visible).
// - No CSS mask: we overlay a transparent→white gradient on top of the image,
//   which visually fades the edges to the page background (white).
// - Tighter spacing between Hero / FeatureSection / cards stays as you set.

import Hero from "../components/Hero"
import FeatureSection from "../components/home/FeatureSection"
import FeatureCard from "../components/FeatureCard"
import bridgeUrl from "../assets/image/bridge.png"
import analyzeSvg from "../assets/image/analyze.svg"
import dataSvg from "../assets/image/data.svg"
import profileSvg from "../assets/image/profie.svg"
import HowItWorksGrid, { type HowItWorksStep } from "../components/analyzer/HowItWorksGrid";

/** Tiny inline icons for demo purposes (parent controls the icon node) */
const IconAnalyze: React.FC<{ className?: string }> = ({ className }) => (
  // English: magnifier symbol for "Analyzer"
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M20 20l-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconProfile: React.FC<{ className?: string }> = ({ className }) => (
  // English: user avatar for "Profile"
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconInsight: React.FC<{ className?: string }> = ({ className }) => (
  // English: light bulb for "Insights"
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M9 18h6v2H9z" fill="currentColor" />
    <path d="M12 3a7 7 0 00-4 12c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0012 3z" fill="none" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
export default function Home() {
   const steps: HowItWorksStep[] = [
    {
      id: "step-analyzer",
      title: "Run Analyzer",
      desc: "Enter past occupation and target state to start the assessment.",
      icon: <IconAnalyze className="w-full h-full" />,
    },
    {
      id: "step-profile",
      title: "See Profile",
      desc: "Review abilities, gaps, and demand signals tailored to you.",
      icon: <IconProfile className="w-full h-full" />,
    },
    {
      id: "step-insight",
      title: "Get Insights",
      desc: "Match roles, compare regions, and plan your learning path.",
      icon: <IconInsight className="w-full h-full" />,
    },
  ];
  // Shared sizes
  const HEADER_H = 64 // must match Hero.headerHeight

  // Express heights using CSS calc strings (no JS math on viewport units)
  const HERO_H_EXPR = `calc(100dvh - ${HEADER_H}px)`              // hero height
  const BG_H_EXPR = `calc(${HERO_H_EXPR} + (${HERO_H_EXPR} / 5))` // hero + 1/5 hero
  const EXTRA_1_5_EXPR = `calc(${HERO_H_EXPR} / 5)`               // the extra 1/5 part

  // Fade range controls (percent of the background container height)
  const FADE_START = "78%" // start fading here (visible above)
  const FADE_END = "100%"  // fully white at the very bottom

  
  return (
    <main className="relative min-h-screen bg-white">
      {/* Background image layer (20% taller than the hero) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-0"
        style={{ height: BG_H_EXPR }}
      >
        {/* Image */}
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${bridgeUrl})`,
            // Align the focal line; 56–62% usually works for horizons
            backgroundPosition: "center 58%",
            // Keep cover; switch to "120% auto" for a closer framing
            backgroundSize: "cover",
          }}
        />
        {/* Overlay gradient (transparent → white). This is NOT a mask.
            Because the page canvas is white, the visual effect equals "fade to transparent". */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom,
              rgba(255,255,255,0) ${FADE_START},
              rgba(255,255,255,1) ${FADE_END}
            )`,
          }}
        />
      </div>

      {/* Foreground content above the background */}
      <div className="relative z-10">
        {/* HERO: smaller veil for a tighter joint */}
        <Hero
          title="Bridge your skills to the next role"
          subtitle="Run Analyzer. Build Profile. Surface Insights"
          headerHeight={HEADER_H}
          scrollTargetId="analyzer"
        />
        <section className="px-4 sm:px-6 lg:px-8 py-16 text-center" aria-labelledby="how-it-works">
        {/* TOP SECTION: keep the extra 1/5 visible, then blend to white */}
        <section id="analyzer" className="relative bg-transparent">
          {/* Transparent → white cap over the extra 1/5 */}
          <div
            aria-hidden="true"
            className="w-full"
            style={{
              height: EXTRA_1_5_EXPR,
              backgroundImage:
                "linear-gradient(to bottom, rgba(255,255,255,0) 0%, #ffffff 100%)",
            }}
          />
      {/* English: the H2 lives in the parent; grid uses aria-labelledby for a11y structure */}
      <h2 id="how-it-works" className="text-2xl sm:text-3xl font-bold text-ink">
        Using SkillBridge
      </h2>
      <p className="mt-3 text-ink-soft">Analyzer → Profile → Insights</p>

      <HowItWorksGrid
        steps={steps}                 // English: pass 3-step model
        labelledById="how-it-works"   // English: link region to the H2
        className="mt-4"              // English: spacing above the grid
        columns={steps.length}        // English: keep cards on one line when width allows
      />
    </section>

          {/* Content wrapper on white; small negative margin to pull content upward */}
            <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 lg:pt-8 lg:pb-16">
              <FeatureSection
                visual="panel"
                className="bg-transparent"
                badgeLabel="Core Feature"
                title="Ability Analyzer"
                description="Analyze your current career situation, understand your strengths and possible pivots, and receive actionable advice."
                bullets={[
                  "Skill gap analysis",
                  "Career path planning",
                  "Personalized suggestions",
                ]}
                image={analyzeSvg}
                imageAlt="Analyzer illustration"
                to="/analyzer"
                ctaLabel="Start analysis"
                ctaVariant="primary"
                size="normal"
              
              />
            </div>
        </section>

        {/* CARDS: tighter section paddings and grid gaps */}
        <section className="bg-white -mt-15">
          <div className="mx-auto max-w-7xl px-3 lg:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-2">
              <FeatureCard
                title="Industry Insight"
                description="Explore industry trends, requirements, and growth areas to make better career choices."
                to="/insight"
                image={dataSvg}
                imageAlt="Data/insight icon"
                ctaLabel="Use Insight"
                ctaVariant="primary"
                tone="blue"
                revealDelayMs={0}
              />
              <FeatureCard
                title="Profile"
                description="Organize your skills, experiences, and interests. Identify improvement areas and prepare for career transitions."
                to="/profile"
                image={profileSvg}
                imageAlt="Profile/user icon"
                ctaLabel="Use Profile"
                ctaVariant="accent"
                tone="gold"
                revealDelayMs={60}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

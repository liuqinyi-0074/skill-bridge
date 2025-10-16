import React from "react";
import clsx from "clsx";

/** One step item model passed from parent */
export type HowItWorksStep = {
  /** Unique id for the step (used as key and aria attributes) */
  id: string;
  /** Short title displayed on the card */
  title: string;
  /** One or two sentences describing the step */
  desc: string;
  /** Icon node provided by parent; sized by this component */
  icon: React.ReactNode;
};

/** Props for the reusable HowItWorks grid */
export type HowItWorksGridProps = {
  /** Steps to render in order */
  steps: readonly HowItWorksStep[];
  /** Optional className for outer section */
  className?: string;
  /**
   * Desired number of cards per row on desktop breakpoints.
   * Defaults to total steps so every card can sit on one line when there is space.
   */
  columns?: number;
  /**
   * Optional accessible label id for the region, e.g. the id of an H2 outside.
   * When provided, we expose aria-labelledby for better a11y structure.
   */
  labelledById?: string;
};

/** Single step card without animation */
const StepCard: React.FC<HowItWorksStep> = ({ title, desc, icon }) => {
  return (
    <div
      className="flex w-full flex-col items-center gap-3 px-2 py-4 text-center"
      role="listitem"
    >
      <div
        className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center"
        aria-hidden="true"
      >
        {/* Constrain icon visual size; parent controls the rendered node */}
        <div className="w-9 h-9">{icon}</div>
      </div>
      <div className="text-lg sm:text-xl font-semibold text-ink">{title}</div>
      <p className="text-ink-soft leading-relaxed max-w-[22rem]">{desc}</p>
    </div>
  );
};

/**
 * HowItWorksGrid
 * Layout rules:
 * - Mobile: one column grid for readability.
 * - Desktop and up: adopt the requested column count and wrap naturally if the viewport is narrow.
 * - Use CSS variable to pass template columns so we can keep Tailwind classes static.
 * - Cards stretch to column width but keep internal content centered for symmetry.
 */
const HowItWorksGrid: React.FC<HowItWorksGridProps> = ({
  steps,
  className,
  columns,
  labelledById,
}) => {
  const totalSteps = steps.length;
  const desiredColumns = Math.max(1, columns ?? (totalSteps || 1));
  const safeColumns = Math.min(desiredColumns, Math.max(totalSteps, 1));

  type GridStyle = React.CSSProperties & { "--hiw-cols"?: string };
  const gridStyle: GridStyle = {
    "--hiw-cols": `repeat(${safeColumns}, minmax(0, 1fr))`,
  };

  return (
    <section
      className={clsx("py-6 sm:py-8", className)} // English comment: tighter vertical rhythm
      aria-labelledby={labelledById}
    >
      {/* Headerless grid; parent owns heading */}
      <div
        role="list"
        className={clsx(
          "mx-auto w-full max-w-6xl",
          // Mobile: single column, centered items
          "grid grid-cols-1 gap-6 place-items-center justify-items-center",
          // Desktop+: expand to requested column count; allow wrap when space is constrained
          "md:gap-8 md:place-items-stretch md:justify-items-stretch md:[grid-template-columns:var(--hiw-cols)]"
        )}
        style={gridStyle}
      >
        {steps.map((s) => (
          <StepCard key={s.id} id={s.id} title={s.title} desc={s.desc} icon={s.icon} />
        ))}
      </div>
    </section>
  );
};

export default HowItWorksGrid;

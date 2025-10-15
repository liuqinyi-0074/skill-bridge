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
   * Optional accessible label id for the region, e.g. the id of an H2 outside.
   * When provided, we expose aria-labelledby for better a11y structure.
   */
  labelledById?: string;
};

/** Single step card without animation */
const StepCard: React.FC<HowItWorksStep> = ({ title, desc, icon }) => {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-2 py-4" role="listitem">
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
 * HowItWorksGrid (no animation)
 * - Headerless, centered grid.
 * - Parent supplies icons, ids, titles, descriptions.
 */
const HowItWorksGrid: React.FC<HowItWorksGridProps> = ({ steps, className, labelledById }) => {
  return (
    <section
      className={clsx("py-6 sm:py-8", className)} // English comment: tighter vertical rhythm
      aria-labelledby={labelledById}
    >
      {/* Steps grid only; header is owned by the parent page */}
      <div
        role="list"
        className={clsx(
          "mx-auto max-w-5xl",
          "grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8",
          "place-items-center justify-items-center"
        )}
      >
        {steps.map((s) => (
          <StepCard key={s.id} id={s.id} title={s.title} desc={s.desc} icon={s.icon} />
        ))}
      </div>
    </section>
  );
};

export default HowItWorksGrid;

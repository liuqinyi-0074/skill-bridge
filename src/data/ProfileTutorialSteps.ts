// src/data/ProfileTutorialSteps.ts
// Tutorial steps for the Profile page.
// Keep texts concise and action-oriented. All strings are English.
// Export a factory function for late evaluation (consistent with GetInfo style).

import type { TutorialStep } from "../components/tutorial/Tutorial";

export const getProfileTutorialSteps = (): TutorialStep[] => [
  {
    id: "profile-welcome",
    target: "#profile-header",
    title: "Profile overview",
    content:
      "This page centralizes your career intent, unmatched skills roadmap, and training advice. Use the help icons for quick tips.",
    placement: "bottom",
  },
  {
    id: "career-intent",
    target: "#career-intent",
    title: "Set your career intent",
    content:
      "Pick past roles, choose a target job, and set a preferred location.",
    placement: "bottom",
  },
  {
    id: "skill-roadmap",
    target: "#skill-roadmap",
    title: "Unmatched skills only",
    content:
      "The roadmap lists skills you are currently missing for the selected occupation. Add dates to plan your learning timeline.",
    placement: "top",
  },
  {
    id: "training-advice",
    target: "#training-advice",
    title: "Training advice",
    content:
      "We map relevant VET courses. Remove items that are not useful. The list refreshes automatically when your target job changes.",
    placement: "top",
  },
  {
    id: "vet-terminology",
    target: "#vet-terminology",
    title: "VET terminology",
    content:
      "Unsure about course jargon? Open the glossary to quickly look up terms before enrolling.",
    placement: "top",
  },
  {
    id: "profile-help",
    target: "#profile-header .shrink-0", // the help / tutorial trigger area next to the title
    title: "Need a hint later?",
    content:
      "Click the help icon or the tutorial button next to the title anytime to replay this guide.",
    placement: "left",
  },
];

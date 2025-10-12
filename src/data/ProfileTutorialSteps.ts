// src/data/ProfileTutorialSteps.ts
// Complete Profile page tutorial steps
// Uses simplified selectors that work on both mobile and desktop
// Follows Insight page tutorial style

import type { TutorialStep } from "../components/tutorial/Tutorial";

/**
 * Get Profile tutorial steps
 * Returns array of tutorial steps for the Profile page
 * 
 * Design principles:
 * - Use container-level selectors (IDs) that work on all screen sizes
 * - Avoid desktop-specific class selectors (e.g., .lg:table)
 * - Keep content concise for mobile readability
 * - Use friendly emojis to enhance UX
 */
export const getProfileTutorialSteps = (): TutorialStep[] => [
  // Step 1: Welcome and overview
  {
    id: "profile-welcome",
    target: "#profile-header",
    title: "Welcome to Your Profile!",
    content:
      "This is your career command center. Here you'll organize your career goals, track skills you need to develop, and discover training courses that match your target role. Let's take a quick tour!",
    placement: "bottom",
  },

  // Step 2: Career Intent section introduction
  {
    id: "career-intent-section",
    target: "#career-intent",
    title: "Step 1: Define Your Career Intent",
    content:
      "Start by telling us about your career journey. Select up to 5 past roles, choose your target occupation, and pick your preferred work location. This helps us personalize your skill roadmap and training recommendations.",
    placement: "bottom",
  },

  // Step 3: Past jobs explanation
  {
    id: "past-jobs-detail",
    target: "#career-intent",
    title: "Your Past Roles Matter ",
    content:
      "Click 'Edit' next to 'Past' to search and add up to 5 past occupations. This helps us understand your experience background and current skill level.",
    placement: "top",
  },

  // Step 4: Target job importance
  {
    id: "target-job-detail",
    target: "#career-intent",
    title: "Choose Your Target Occupation ",
    content:
      "This is crucial! Select the occupation you're aiming for. Once set, we'll suggest relevant training courses. You can change this anytime.",
    placement: "top",
  },

  // Step 5: Region selection
  {
    id: "region-detail",
    target: "#career-intent",
    title: "Set Your Preferred Region ",
    content:
      "Choose the Australian state or territory where you want to work. This helps us provide location-specific job market insights and opportunities.",
    placement: "top",
  },

  // Step 6: Skill Roadmap introduction
  {
    id: "skill-roadmap-intro",
    target: "#skill-roadmap",
    title: "Step 2: Your Skill Development Roadmap ",
    content:
      "This section shows ONLY the skills you're currently missing for your target occupation. Think of it as your personal learning checklist! Add target dates to plan your development journey.",
    placement: "top",
  },

  // Step 7: How to use the roadmap
  {
    id: "skill-roadmap-usage",
    target: "#skill-roadmap",
    title: "Plan Your Learning Timeline ",
    content:
      "Click on any skill to add start and end dates. You can also manually add skills, edit categories, or remove items that aren't relevant. Use filters to organize by priority or timeline.",
    placement: "top",
  },

  // Step 8: Empty roadmap guidance
  {
    id: "no-roadmap-hint",
    target: "#skill-roadmap",
    title: "Don't Have Skills Yet? ",
    content:
      "If your roadmap is empty, consider taking the Analyzer test first. It will assess your current abilities, match you with suitable roles, and automatically populate this roadmap.",
    placement: "top",
  },

  // Step 9: Training Advice introduction
  {
    id: "training-advice-section",
    target: "#training-advice",
    title: "Step 3: Discover Relevant Training ",
    content:
      "Based on your target occupation, we automatically recommend VET (Vocational Education and Training) courses from Australia's official training registry. These courses help you gain the skills you're missing.",
    placement: "top",
  },

  // Step 10: Training list management
  {
    id: "training-management",
    target: "#training-advice",
    title: "Customize Your Course List ",
    content:
      "Review each course and remove ones that don't fit your needs or schedule. The list updates automatically when you change your target occupation. Click any course to view full details.",
    placement: "top",
  },

  // Step 11: VET Terminology tool
  {
    id: "vet-terminology-tool",
    target: "#vet-terminology",
    title: "Step 4: Understand Course Jargon ",
    content:
      "Confused by VET terms like 'RTO' or 'AQF'? Use this terminology dictionary to look up unfamiliar terms before enrolling in courses. It helps you make informed decisions about your training.",
    placement: "top",
  },

  // Step 12: VET search demonstration
  {
    id: "vet-search-demo",
    target: "#vet-terminology",
    title: "Quick Terminology Lookup ",
    content:
      "Simply type any VET term or acronym you're unsure about, and we'll show you a clear explanation with related terms. This saves you time researching on your own.",
    placement: "top",
  },

  // Step 13: Help button location
  {
    id: "help-toggle-location",
    target: "#profile-header",
    title: "Quick Help Anytime ",
    content:
      "See the question mark icons throughout the page? Click them anytime you need quick tips about a specific section. They provide context-sensitive help without interrupting your workflow.",
    placement: "left",
  },

  // Step 14: Tutorial replay reminder
  {
    id: "tutorial-replay",
    target: "#profile-header",
    title: "Replay This Tour Anytime ",
    content:
      "Found this tutorial helpful? You can replay it anytime by clicking the 'View Tutorial' button at the top of the page. Perfect for when you need a refresher!",
    placement: "left",
  },

  // Step 15: Final call to action
  {
    id: "final-action-call",
    target: "#career-intent",
    title: "Ready to Get Started? ",
    content:
      "Here's your action plan: (1) Set your career intent, (2) Review your skill roadmap, (3) Browse recommended courses, and (4) Start learning! Take it step by step, and you'll be on track to your target role.",
    placement: "bottom",
  },
];
// src/data/ProfileTutorialSteps.ts
// Complete Profile page tutorial design
// Follows Insight page style, providing clear and practical guidance

import type { TutorialStep } from "../components/tutorial/Tutorial";

export const getProfileTutorialSteps = (): TutorialStep[] => [
  // Step 1: Welcome introduction - overall page overview
  {
    id: "profile-welcome",
    target: "#profile-header",
    title: "Welcome to Your Profile! ",
    content:
      "This is your career command center. Here you'll organize your career goals, track the skills you need to develop, and discover training courses that match your target role. Let's take a quick tour!",
    placement: "bottom",
  },

  // Step 2: Career Intent - core functionality area
  {
    id: "career-intent-section",
    target: "#career-intent",
    title: "Step 1: Define Your Career Intent ",
    content:
      "Start by telling us about your career journey. Select up to 5 past roles you've held, choose your target occupation, and pick your preferred work location. This helps us personalize your skill roadmap and training recommendations.",
    placement: "bottom",
  },

  // Step 3: Past Jobs detailed explanation
  {
    id: "past-jobs-detail",
    target: "#career-intent .lg\\:table td:first-child", // Desktop first column
    title: "Your Past Roles Matter ",
    content:
      "Click 'Edit' to search and add up to 5 past occupations.",
    placement: "bottom",
  },

  // Step 4: Target Job core functionality
  {
    id: "target-job-detail",
    target: "#career-intent .lg\\:table td:nth-child(2)", // Desktop second column
    title: "Choose Your Target Occupation ",
    content:
      "This is crucial! Select the occupation you're aiming for. Once set, we'll automatically analyze the suggest relevant training courses. You can change this anytime.",
    placement: "top",
  },

  // Step 5: Region Selection
  {
    id: "region-detail",
    target: "#career-intent .lg\\:table td:last-child", // Desktop third column
    title: "Set Your Preferred Region ",
    content:
      "Choose the Australian state or territory where you want to work. ",
    placement: "top",
  },

  // Step 6: Skill Roadmap introduction
  {
    id: "skill-roadmap-intro",
    target: "#skill-roadmap",
    title: "Step 2: Your Skill Development Roadmap ",
    content:
      "This section shows ONLY the skills you're currently missing for your target occupation. Think of it as your personal learning checklist. Add start and end dates to create a timeline for your skill development journey.",
    placement: "top",
  },

  // Step 7: How to use Roadmap
  {
    id: "skill-roadmap-usage",
    target: "#skill-roadmap .rounded-xl.border", // Roadmap card
    title: "Plan Your Learning Timeline ",
    content:
      "Click on any skill to add target dates. You can also manually add skills, edit categories, or remove items that aren't relevant. Use the filter and sort options to organize your roadmap by priority, category, or timeline status.",
    placement: "top",
  },

  // Step 8: Handle empty Roadmap state
  {
    id: "no-roadmap-hint",
    target: "#skill-roadmap",
    title: "Don't Have Skills Yet? ",
    content:
      "If your roadmap is empty, consider taking the Analyzer test first. It will assess your current abilities, match you with suitable roles, and automatically populate this roadmap with the skills you need to develop.",
    placement: "top",
  },

  // Step 9: Training Advice core value
  {
    id: "training-advice-section",
    target: "#training-advice",
    title: "Step 3: Discover Relevant Training ",
    content:
      "Based on your target occupation, we automatically recommend VET (Vocational Education and Training) courses from Australia's official training registry. These courses are mapped to help you gain the skills you're missing.",
    placement: "top",
  },

  // Step 10: How to manage Training list
  {
    id: "training-management",
    target: "#training-advice .rounded-xl.border", // Training card
    title: "Customize Your Course List ",
    content:
      "Review each course and remove ones that don't fit your needs or schedule. The list updates automatically when you change your target occupation. Click on any course to view full details on the official training website.",
    placement: "top",
  },

  // Step 11: VET Terminology tool
  {
    id: "vet-terminology-tool",
    target: "#vet-terminology",
    title: "Step 4: Understand Course Jargon ",
    content:
      "Confused by terms? Use this VET Terminology Dictionary to look up unfamiliar terms before enrolling in courses. It helps you make informed decisions about your training.",
    placement: "top",
  },

  // Step 12: VET search functionality
  {
    id: "vet-search-demo",
    target: "#vet-terminology input", // Search box
    title: "Quick Terminology Lookup ",
    content:
      "Simply type any term you're unsure about, and we'll show you a clear explanation. This saves you time researching on your own.",
    placement: "bottom",
  },

  // Step 13: Help button location
  {
    id: "help-toggle-location",
    target: "#profile-header .shrink-0 [data-help-toggle]", // Help button
    title: "Quick Help Anytime ",
    content:
      "See this question mark icon? Click it anytime you need quick tips about a specific section. It provides context-sensitive help without interrupting your workflow.",
    placement: "left",
  },

  // Step 14: Tutorial button reminder
  {
    id: "tutorial-replay",
    target: "#profile-header button[aria-label*='Tutorial']", // Tutorial button
    title: "Replay This Tour Anytime ",
    content:
      "Found this tutorial helpful? You can replay it anytime by clicking the 'View Tutorial' button at the top of the page. Perfect for when you need a refresher!",
    placement: "left",
  },

  // Step 15: Final recommendation - call to action
  {
    id: "final-action-call",
    target: "#career-intent",
    title: "Ready to Get Started? ",
    content:
      "Here's your action plan: (1) Set your career intent, (2) Review and schedule your skill roadmap, (3) Browse recommended courses, and (4) Start learning! Take it step by step, and you'll be on track to your target role in no time.",
    placement: "bottom",
  },
];


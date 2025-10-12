# SkillBridge

SkillBridge is a React + TypeScript application that guides users through a career analysis journey, highlights skill gaps, and surfaces training resources and high-level labour market insights. It combines a multi-step Analyzer wizard with a persistent Profile hub and an Insight dashboard backed by real-world data.

## Features

- **Career Analyzer Wizard**  
  `Get Info → Abilities → Job Suggestion → Skill Gap → Training` collects role interests, preferred regions, industries, and expertise, then calls backend services to generate recommendations.

- **Smart Job Suggestions**  
  Occupations are ranked via parallel API calls (TanStack Query). Past roles from the Profile are automatically filtered so users only see fresh opportunities.

- **Skill Gap & Training Advice**  
  Missing abilities are captured in Redux, merged into the Profile’s Skill Roadmap, and paired with training courses fetched on demand. Users can prune or update the advice list in place.

- **Insight Dashboard**  
  Displays major group statistics, growth comparisons, and geographic demand on an interactive map. Includes skeleton states, error fallbacks, and an in-app tutorial.

- **Supporting Modules**  
  Feedback form with API integration, Privacy/Terms static pages, glossary search, and reusable Hero/Tutorial components for consistent onboarding.

## Tech Stack

| Layer        | Choice                                                    |
|--------------|-----------------------------------------------------------|
| Framework    | React 19, Vite                                            |
| Language     | TypeScript 5                                              |
| State        | Redux Toolkit, React Redux                                |
| Data Fetch   | TanStack Query 5                                          |
| Routing      | React Router 7                                            |
| Styling      | Tailwind CSS 4, clsx                                      |
| Visualization| Recharts, D3 Geo, TopoJSON                                |
| Tooling      | ESLint + Prettier, Vitest, Playwright (preconfigured)     |

## Project Structure (partial)

```
src/
├─ App.tsx                # Entry / routes
├─ layouts/               # Layout components
├─ pages/                 # Analyzer, Insight, Profile, Feedback, etc.
├─ components/            # Analyzer widgets, Insight charts, Profile roadmap
├─ hooks/                 # Query hooks, reveal-on-view animation hooks
├─ lib/api/               # API clients (search, skills, shortage, growth, contact)
├─ store/                 # Redux slice, typed hooks
├─ data/                  # Static datasets (industries, tutorial steps)
└─ types/                 # Shared domain types
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create environment variables** (`.env` or `.env.local`)
   ```bash
   VITE_API_BASE=https://your-api-gateway.example.com/
   VITE_SITE_PASSWORD=YourSitePassword
   ```
3. **Start the dev server**
   ```bash
   npm run dev
   ```
4. **Build / preview / lint**
   ```bash
   npm run build
   npm run preview
   npm run lint
   ```

## Key Design Notes

- Analyzer state is persisted in `analyzerSlice` and hydrated from `location.state` where necessary to survive refreshes or private browsing.
- Job Suggestion filters out roles the user has already listed in the Profile, keeping recommendations fresh.
- Skill Gap results are normalized and merged into the Profile’s Skill Roadmap without overwriting user-added items.
- Insight normalizes API payloads (`safeNumber`, `safeString`) before rendering charts to guard against inconsistent fields.
- UI components emphasise accessibility: skeletons use `aria-busy`, hero imagery is optionally decorative, map/chart sections include textual guidance.

## API Overview

| Endpoint                              | Description                                |
|---------------------------------------|--------------------------------------------|
| `/anzsco/search`                      | Occupation search by industry & keyword    |
| `/anzsco/{code}/skills`               | Fetch knowledge / skill / tech abilities   |
| `/api/career-growth/{code}`           | Career growth stats (major group)          |
| `/anzsco/{code}/shortage`             | Geographic demand / shortage data          |
| `/contact`                            | Submit feedback form                       |

## License

No licence file is included. Add one if you plan to distribute or open-source the project.

---

Feel free to extend SkillBridge with additional analytics, personalisation, or reporting capabilities to further support career planning. Enjoy building! 🚀

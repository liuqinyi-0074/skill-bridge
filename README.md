# SkillBridge

## Overview

SkillBridge is a career-planning SPA that guides users from aspiration to action.  
The multi-step Analyzer collects role interests, surfaces recommended occupations, highlights missing abilities, and suggests training.  
A persistent Profile page keeps roadmaps and advice in sync, while the Insight dashboard visualises market data (growth, comparison rates, geographic demand).  
The app is designed for modern UX: state persistence, skeleton loading, graceful error handling, and tutorial overlays.

## Tech Stack

| Layer            | Selection                                                     |
|------------------|---------------------------------------------------------------|
| Framework        | React 19 + Vite 7                                             |
| Language         | TypeScript 5                                                  |
| Routing          | React Router 7                                                |
| State Management | Redux Toolkit + React Redux                                   |
| Data Fetching    | TanStack Query 5 (parallel queries, caching, retries)         |
| Styling & UI     | Tailwind CSS 4, clsx, Lucide icons, custom Hero/Tutorial UI   |
| Visualisation    | Recharts, D3-geo                                   |
| Misc Tools       | GSAP, html-to-image, jsPDF, redux-persist                     |
| Quality & Tooling| ESLint + Prettier, TypeScript ESLint, Vitest & Playwright  (preconfigured) |

## Local setup / ????

Use Node **20.19+ or 22.12+** (required by Vite 7). From the project directory in PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the terminal's URL (normally http://localhost:5173). The example defaults to Demo Mode and needs no backend. Restart Vite after changing environment settings. Do not overwrite an existing `.env.local` without saving your settings first.

### Demo Mode / ????

Set these values in `.env.local`:

```dotenv
VITE_DEMO_MODE=true
VITE_API_BASE=
VITE_API_PROXY_TARGET=http://localhost:8000
VITE_PWA_ENABLED=true
VITE_SITE_PASSWORD=
```

Open `/?demo=1` to explicitly select Demo Mode. All planning data is bundled locally; the proxy target does not need to be running.

### Live Mode through the local proxy / ????????

Start your backend separately, then set:

```dotenv
VITE_DEMO_MODE=false
VITE_API_BASE=
VITE_API_PROXY_TARGET=http://localhost:8000
VITE_PWA_ENABLED=true
VITE_SITE_PASSWORD=
```

Run `npm run dev` and open `/?demo=0`. Replace port 8000 with your backend's port. The same target proxies **/anzsco, /api, /occupations and /rum** without changing endpoint paths. An optional relative base such as `VITE_API_BASE=/backend` adds a frontend prefix; the proxy strips that prefix. Backend paths appended to `VITE_API_PROXY_TARGET` are preserved. No backend is included in this frontend repository; an unreachable backend shows the service-unavailable page.

### Live Mode with a direct backend URL / ??????

```dotenv
VITE_DEMO_MODE=false
VITE_API_BASE=https://your-backend.example.com
VITE_API_PROXY_TARGET=
VITE_PWA_ENABLED=true
VITE_SITE_PASSWORD=
```

Absolute HTTP(S) bases bypass the Vite proxy and require backend CORS permission for the frontend origin. Bases may include a path; trailing slashes are normalized. Do not include query strings, fragments or credentials. For static production hosting, use an absolute base or configure a same-origin reverse proxy on the host; Vite's proxy only runs in development and local preview.

### Environment reference / ????

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_DEMO_MODE` | `false` | Default mode; explicit `?demo=1/0` wins, then a remembered browser choice, then this setting. |
| `VITE_API_BASE` | empty | Shared browser API URL and PWA API matching base; empty means same-origin. |
| `VITE_API_PROXY_TARGET` | empty | HTTP(S) backend target for development/preview when the base is relative. |
| `VITE_PWA_ENABLED` | `true` | Generate/register the service worker in production builds; development never installs it. |
| `VITE_SITE_PASSWORD` | empty | Optional frontend access gate. |

These public settings are compiled at build time. `.env.local` overrides `.env`; shell variables override files. Use `.env.production.local` to override production settings. Do not place secrets in `VITE_*` settings. Shared definitions live in `src/config/environment.ts`, used by the browser and Vite's proxy/PWA configuration.

### Build, preview and caching / ????????

```powershell
npm run build
npm run preview
```

Open the preview URL (normally http://localhost:4173). When enabled, PWA precaches the app shell and caches static assets/images. API GET and POST requests are **NetworkOnly**, so a backend outage cannot be masked by cached success responses. Navigation falls back to the SPA shell; API paths are excluded. Demo Mode works without a backend; first visiting the app still requires loading its assets. Turning PWA off does not remove a service worker already installed by an older build: unregister it and clear site caches in browser developer tools when testing the disabled configuration. An updated worker replaces the previous caching rules after activation.

### Browser storage / ?????

Password-gate state, tutorial flags, mode choice and plans use one guarded adapter. It falls back from localStorage to sessionStorage, then memory, including storage-property access errors and runtime quota failures. Readable values are preserved when moving to a fallback. Session storage lasts for the tab; memory data is lost on reload. Corrupt serialized state is discarded, and invalid saved fields are reset or filtered while valid fields are retained. Live and demo plans remain separate.

### Validation / ??

Run `npm test` for configuration and storage unit tests. With a running development server and the password gate disabled:

```powershell
npx playwright install chromium
npx playwright test src/test/demo.e2e.spec.ts src/test/service-unavailable.e2e.spec.ts src/test/storage.e2e.spec.ts --retries=0 --workers=1
```

Set `E2E_BASE_URL` when using a different frontend address. The browser tests cover both modes, service outages, blocked storage getters, quota failures, corrupt saved data, and password-gate storage fallback.

## Project Structure

```
src/
├─ App.tsx                   # Root router & Suspense
├─ layouts/                  # Main layout, header/footer
├─ components/
│  ├─ analyzer/              # JobSuggestion cards, Ability pickers, etc.
│  ├─ insight/               # Map, growth chart, comparison chart
│  ├─ profile/               # SkillRoadMap, TrainingAdvice UI
│  ├─ tutorial/              # Reusable tutorial overlay
│  └─ ui/                    # Buttons, toggles, helpers
├─ pages/                    # Home, Analyzer, Profile, Insight, Feedback, static pages
├─ hooks/                    # TanStack Query hooks, reveal-on-view, route helpers
├─ lib/
│  ├─ api/                   # API clients (search, skills, growth, shortage, contact)
│  └─ utils/                 # PDF export, helpers
├─ store/                    # Redux slice, typed hooks
├─ data/                     # Industry options, tutorial steps
└─ types/                    # Domain types (roles, abilities, routes, API contracts)
```

## Common NPM Commands

| Command          | Description                                    |
|------------------|------------------------------------------------|
| `npm run dev`    | Start Vite dev server (with HMR)               |
| `npm run build`  | Type-check + bundle production assets          |
| `npm run preview`| Preview the production build locally           |
| `npm run lint`   | ESLint (TypeScript + React + formatting rules) |

Vitest/Playwright are preconfigured; add tests under `tests/` or `playwright/` and run `npx vitest` / `npx playwright test` as needed.

## Deployment

1. **Build** – `npm run build` produces static assets under `dist/`.
2. **Serve** – Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, etc.).
3. **API Base** – Ensure `VITE_API_BASE` points to the correct production backend via environment variables at build time.

CI/CD (GitHub Actions, etc.) can run `npm ci && npm run lint && npm run build` before publishing artifacts.

## Code Style & Testing

- ESLint + Prettier enforce consistent formatting and React Hook rules.
- Tailwind class ordering is handled by `prettier-plugin-tailwindcss`.
- Types are strict; avoid `any` and leverage domain typings under `src/types/`.
- For automated tests, intercept API calls in E2E (Playwright/Cypress) to stabilise async flows and skeleton states.

## API Endpoints (Summary)

| Endpoint / Client                                   | Purpose                                                     |
|-----------------------------------------------------|-------------------------------------------------------------|
| `GET /anzsco/search`                                | Search occupations by industry and keyword                  |
| `GET /anzsco/{code}/skills`                         | Fetch abilities (knowledge/skill/tech) by ANZSCO code       |
| `GET /anzsco/{code}/shortage`                       | Retrieve geographic shortage / employment distribution      |
| `GET /api/career-growth/{code}`                     | Major group growth metrics (rates, rankings, employment)    |
| `GET /api/anzsco/{code}/demand` (`getDemand`)       | Demand indicators / shortage labels for the occupation      |
| `POST /occupation/rank` (`rankByCodes`)             | Rank occupations using selected abilities + industries      |
| `GET /occupation/training/{code}`                   | Fetch recommended VET training advice                       |
| `GET /glossary/detail?keyword=...`                  | Look up terminology definitions (VET glossary)              |
| `POST /api/contact`                                     | Submit feedback / contact form                              |

Each client wrapper normalises payloads (`safeNumber`, `safeString`) and surfaces errors via TanStack Query state flags (`isLoading`, `isError`, etc.), so UI components can render skeletons, fallbacks, or retries as needed.

---

SkillBridge is built to extend. Add new data sources, enhance analysis steps, or integrate reporting with minimal friction. Happy hacking! 🚀

## Demo Mode

Click **Enter Demo Mode** in the data-mode banner, or open `/?demo=1`. Set `VITE_DEMO_MODE=true` to enable it by default. `?demo=0` explicitly restores Live Mode. The choice is remembered using the available storage fallback. Switching modes returns to the Analyzer intro and reloads the app to clear query caches. Demo plans use a separate persistence key; live plans are preserved.

All career-planning API responses come from bundled local fixtures; no backend or API credentials are needed. Select **Professional, Scientific and Technical Services**, search **analyst**, add **ICT Business Analyst**, select a location and interested industry, then continue through abilities, suggested jobs, skill gaps and training to Finish and view the saved Profile. Other sample roles include care, construction, retail, hospitality and education. Search is limited to the local catalog. Figures, role matches and courses are illustrative, not current advice. Feedback cannot be sent in Demo Mode.

Offline acceptance test: run a dev server with the optional `VITE_SITE_PASSWORD` empty, then run `npx playwright test src/test/demo.e2e.spec.ts`. Use `E2E_BASE_URL` if the server is not at `http://localhost:5173`. The test blocks career API requests, reports the browser as offline, completes every planning step, verifies refresh persistence, and checks mode isolation.

## Live service availability

Live Mode remains available. Network failures, browser offline state, request/body timeouts (at most 10 seconds), HTTP 5xx responses, and invalid JSON responses display a service-unavailable page. Requests in flight are cancelled and further API requests stop until the user explicitly selects **Try Live Mode again** (reload). Queries do not retry automatically or refetch on reconnect. Caller cancellation and ordinary HTTP 4xx errors are handled without declaring a service outage. Saved plans are preserved; no sample results are substituted in Live Mode. Demo Mode remains available from the banner. Feedback requires an explicit successful response; a failed submission is never automatically replayed.

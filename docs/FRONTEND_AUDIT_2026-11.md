# MAUSAM Full-Site Frontend Audit
**Repository:** `codesbysayam/mausam_sih-26`  
**Audited branch:** `main`  
**Audit working branch:** `audit/mausam-full-site-reconstruction`  
**Audit date:** 18 November 2026  
**Scope:** Frontend architecture, design-system consistency, page composition, data-trust risks visible from source, responsive/navigation structure, and CI coverage.

> This is a source-level first-pass audit. It is not a claim that the production deployment has been browser-tested or that every interactive state has been exercised. The supplied screenshots were used as visual evidence for the Analyze, Classic, Radar and Atmospheric Change views.

---

## 1. Executive finding

The repository already contains a substantial redesign foundation: Explore, Analyze and Classic experience modes, a Three.js atmospheric scene, a 2D fallback, a floating brand bar, weather HUD, layer dock and forecast timeline. The problem is not an absence of modern components. The problem is that the active experience architecture coexists with older page compositions, legacy dashboard components and multiple overlapping design specifications.

The supplied screenshots show the result: Analyze, Classic, Radar and the old dashboard sections do not yet feel like one deliberately art-directed product. The redesign must reconcile the active shell, each domain page, the older Classic home, and the shared visual primitives rather than applying another global CSS pass.

**Recommendation:** retain the existing weather/data architecture and spatial scene; establish one authoritative design system and rebuild the page-level presentation around it. Do not replace the application with a static mockup or a second, disconnected frontend.

---

## 2. Verified repository and runtime baseline

- Public repository: `codesbysayam/mausam_sih-26`.
- Default branch: `main`.
- Current project manifest identifies React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Express, Three.js, Leaflet / React-Leaflet, Recharts, Motion and Lucide React.
- `src/main.tsx` mounts React providers for language, location, provider state and experience mode, inside a shared error boundary.
- `src/App.tsx` is the application shell and owns URL-to-view mapping, selected location, weather bundle state, mode switching and global overlays.
- `src/components/experience/` contains the newer Explore / Analyze / Classic workspaces and floating HUD components.
- `src/components/scene/AtmosphereScene.tsx` is a substantial Three.js scene implementation (1,032 lines in the audited revision).
- `src/pages/` contains domain pages for Weather, Forecast, Radar, Alerts, Cyclone Tracker, Air Quality, Agromet, Reports and supporting documentation/policy pages.
- The repository tree contains 662 tracked file entries at the audited revision.

The stack is capable of supporting the intended product. A framework migration is not justified by the evidence reviewed.

---

## 3. High-priority findings

### P0 — Data-trust and initial-state semantics need a dedicated verification pass

**Files:** `src/App.tsx`, `src/data/weatherData.ts`, `src/services/weatherService.ts`, provider status services.

The initial `weatherBundle` in `App.tsx` is populated from `INITIAL_WEATHER`, `INITIAL_ALERTS`, `HOURLY_FORECAST` and `DAILY_FORECAST`, while the initial object sets `isLive: true`. A real weather request is started in an effect after render. This creates a risk that seeded values can be presented before a verified provider response has arrived, with live semantics.

The same file derives the assistant's station context using fallback literals (`aqiPm25 || 42` and `elevation || '45m ASL'`). These values must not be silently represented as measured station facts when source data is absent.

**Required correction:**
- Introduce explicit initial/loading/unavailable/cached/live states for the weather bundle.
- Do not label seeded or placeholder values LIVE.
- Represent missing measurements as unavailable/null, not plausible numeric defaults.
- Keep provider name, observed time, received time, cache age and fallback status attached to the displayed metric.
- Audit every visible metric and chart for the same pattern before altering its UI.

### P0 — The design specification is not the single source of truth

**Files:** `docs/DESIGN.md`, `src/styles/mausam.css`, `src/theme/tokens.ts`, `src/components/experience/*`.

The checked-in design document describes an earlier Government Operational Console. It specifies a palette centered on `#071A2D`, `#0B263D` and `#123652`, plus GovernmentHeader/MainNavigation as the principal chrome. The active stylesheet and theme tokens instead use several other surface/accent families (including `#0B1219`, `#101B26`, `#162331`, `#0B3D91`, `#35C7E8` and `#38BDF8`). The newer spatial mode adds yet another token group.

This drift makes it easy for individual pages or AI-assisted changes to invent slightly different cards, borders, typography, spacing and interaction styles.

**Required correction:**
- Replace the outdated design contract with one versioned source of truth.
- Make CSS custom properties the canonical runtime tokens and map TypeScript tokens to the same values.
- Define component variants for page headers, data panels, status indicators, buttons, tabs, maps, legends, charts and drawers.
- Remove obsolete token aliases only after references have been searched and migrated.

### P1 — Classic mode currently wraps the older long-form Home page

**Files:** `src/components/experience/ClassicWorkspace.tsx`, `src/pages/Home.tsx`.

ClassicWorkspace renders HomePage beneath its own mode strip. HomePage is a long dashboard composition containing location status, severe-weather strip, atmospheric hero, radar preview, hourly timeline, seven-day forecast, two-column "What's happening now"/change detector, solar and air panels, guidance, personalized hub, national status and a state directory.

This is functionally rich, but it explains why Classic still resembles the previous dashboard rather than a deliberately redesigned accessible mode. It is not enough to label it "Classic Accessible View"; its information hierarchy and component styling also need to be reconstructed.

**Required correction:**
- Preserve feature coverage, but regroup it into a clear linear reading order.
- Establish a compact conditions summary, warning state, forecast, map and optional deep-dive sections.
- Reduce repeated bordered-card framing and excessive nested panels.
- Keep all core tasks available without 3D, hover or complex gestures.
- Validate long-page scrolling, mobile stacking and keyboard focus order.

### P1 — Analyze mode adds its own navigation layer and page-specific composition

**Files:** `src/components/experience/AnalyzeWorkspace.tsx`, `src/components/experience/FloatingBrandBar.tsx`, `src/pages/Weather.tsx`, domain pages.

AnalyzeWorkspace renders a second domain navigation strip below the global FloatingBrandBar and then mounts each page inside PageContainer. WeatherPage itself adds a LocationStatusBar, a large observation header, current-weather hero, atmospheric narrative, telemetry grid, widgets, hourly timeline, seven-day forecast, solar content and other sections.

The screenshot's extra navigation row and large Weather & Synoptic Observation header are therefore not an isolated CSS accident: they are the composition of the global shell, AnalyzeWorkspace navigation and the Weather page's own header/location modules.

**Required correction:**
- Define one consistent page-header contract for all Analyze pages.
- Avoid repeated location bars when the global shell already provides the same location context.
- Standardize content width, section spacing, panel density and responsive collapse rules.
- Use domain-specific layouts where useful, but retain common primitives and hierarchy.

### P1 — Domain pages use visibly different visual conventions

**Files:** `src/pages/Weather.tsx`, `src/pages/Radar.tsx`, `src/pages/Alerts.tsx`, `src/pages/Agromet.tsx`, `src/components/AlertsView.tsx`, `src/components/InsightsView.tsx`.

The Weather page uses the newer `mausam-panel` and weather component system. Radar has a separate map workspace with its own toolbar, layer rail, legend, inspector, station network, product selector and timeline. Alerts has a distinct warning portal with dedicated map, filter, ticker, list and drawer components. Agromet uses a chapter-based command layout and a large specialized component family.

Domain-specific workflows are appropriate; inconsistent page chrome and unrelated panel styles are not.

**Required correction:**
- Define common page title, subtitle, status/source row, primary action and content-grid patterns.
- Preserve specialist controls and visualizations but align their surfaces, typography, spacing and breakpoints.
- Make map/visualization workspaces responsive without forcing the entire page into one card grid.

### P1 — Legacy components contain static sample data and must not be treated as live views

**Files:** `src/components/AlertsView.tsx`, `src/components/InsightsView.tsx`, `src/data/weatherData.ts`.

The legacy `AlertsView` initializes its alert list directly from `INITIAL_ALERTS`. `InsightsView` contains fixed seven-day particulate/humidity values, fixed pollutant concentrations and fixed atmospheric diagnostics. These are source-level sample values, not a live provider query in that component.

The currently routed Alerts page (`src/pages/Alerts.tsx`) is a separate implementation that fetches warnings through the canonical warning service and provider store. The legacy components must be traced for imports/usages before removal; if still reachable, they must be converted to source-backed data or explicitly marked as demo/sample content.

**Required correction:**
- Trace every import and route reference before deleting legacy components.
- Never show static sample values with LIVE, RECENT, official or current labels.
- Add empty, loading, stale and unavailable states.
- Ensure all displayed time-series carry the correct time range, unit and source.

### P2 — CSS and design tokens have accumulated overlapping systems

**Files:** `src/styles/mausam.css`, `src/theme/tokens.ts`, `src/index.css`.

The global stylesheet contains core variables, surface aliases, glass utilities, fluid typography, responsive helpers, legacy brand styles, print overrides, alert animations and newer spatial HUD styles. The TypeScript theme separately defines brand, severity, atmospheric, dark/light and spatial values.

This is not inherently broken, but it creates a high regression risk: a global selector or broad responsive override can alter unrelated views. The source already uses a mixture of Tailwind utility classes, CSS utility classes and component-level inline styles.

**Required correction:**
- Consolidate token ownership and document allowed variants.
- Scope page-specific CSS under stable component/page roots.
- Avoid global overrides that alter every `.overflow-hidden`, `.overflow-y-auto`, `svg`, `canvas` or grid child.
- Keep print styles isolated from screen layout.
- Add visual regression snapshots at desktop, tablet and mobile widths.

### P2 — Current CI is a compile/build gate, not a full quality gate

**Files:** `package.json`, `.github/workflows/ci.yml`.

The workflow runs `npm ci`, `npm run lint` and `npm run build`. The package's `lint` script is `tsc --noEmit`; there is no test script in the manifest reviewed. The current workflow therefore checks TypeScript compilation and production bundling, but does not by itself prove page interactions, responsive layout, accessibility or provider-state behavior.

**Required correction:**
- Keep the existing build and typecheck gates.
- Add component/service tests for mode routing, provider state and data normalization.
- Add browser smoke tests for all primary routes and mode transitions.
- Add viewport checks for 390px, 768px, 1280px and 1440px.
- Add keyboard and reduced-motion checks for critical navigation and alert flows.

---

## 4. Screenshot-to-source mapping

| Supplied screenshot | Relevant source composition | Audit conclusion |
|---|---|---|
| Analyze / Weather Detail | FloatingBrandBar → AnalyzeWorkspace → WeatherPage | Global header, domain nav, location bar and page header all contribute to vertical stacking. |
| Classic home | FloatingBrandBar → ClassicWorkspace → HomePage | Classic currently reuses the long-form Home dashboard; it needs a purposeful accessible information architecture. |
| Doppler Radar | AnalyzeWorkspace → RadarPage | Radar has a specialist map workspace; preserve it while aligning shared page chrome and panel system. |
| What's Happening Now / Atmospheric Change | HomePage → HomeWhatsHappeningNow / HomeAtmosphericChangeDetector | These are part of the old long-form home composition; verify their source freshness and hierarchy as part of the Classic rebuild. |

---

## 5. Required full-site work plan

### Phase 1 — Source-of-truth and safety
- [ ] Create the authoritative design-system specification.
- [ ] Map all routes to their actual page components.
- [ ] Trace legacy components and dead imports.
- [ ] Audit all hardcoded weather, warning, AQI, radar and NWP values.
- [ ] Correct LIVE/RECENT/STALE/UNAVAILABLE semantics before visual polish.

### Phase 2 — Shared application shell
- [ ] Finalize FloatingBrandBar sizing, responsive behavior and control priority.
- [ ] Standardize Analyze domain navigation.
- [ ] Standardize page headers, content containers and footer.
- [ ] Fix mobile overflow, wrapping, safe-area and focus behavior.

### Phase 3 — Page-by-page reconstruction
- [ ] Explore / 3D globe and 2D fallback.
- [ ] Analyze / Weather Detail.
- [ ] Classic / accessible home.
- [ ] Forecast & NWP.
- [ ] Doppler Radar.
- [ ] Warnings.
- [ ] Cyclone Tracker.
- [ ] AQI & Air.
- [ ] Agromet.
- [ ] Reports.
- [ ] Data & Sources / diagnostics.
- [ ] Ask MAUSAM, settings, location and privacy dialogs.

### Phase 4 — Verification
- [ ] Build and TypeScript check.
- [ ] Route and mode-transition smoke tests.
- [ ] Provider unavailable/stale/live state tests.
- [ ] Desktop/tablet/mobile visual checks.
- [ ] Keyboard, screen-reader labels and reduced-motion checks.
- [ ] Production deployment verification.

---

## 6. Guardrails for implementation

1. Do not remove existing API routes, provider adapters, normalization, caching, source attribution or data contracts as part of a visual redesign.
2. Do not substitute mock values for unavailable data.
3. Do not describe a provider as IMD, CPCB, SACHET or live unless the provider state and provenance support it.
4. Do not treat the current Classic page as the target visual standard.
5. Do not force every page into the same card grid; unify the design primitives, not the domain workflows.
6. Do not add more animation or 3D effects before page hierarchy, loading states and performance are correct.
7. Do not merge directly into `main` during the audit/reconstruction work. Use this isolated branch and review the diff before merge.

---

## 7. Evidence reviewed

- `package.json`
- `src/main.tsx`
- `src/App.tsx`
- `src/context/ExperienceContext.tsx`
- `src/components/experience/ExploreWorkspace.tsx`
- `src/components/experience/AnalyzeWorkspace.tsx`
- `src/components/experience/ClassicWorkspace.tsx`
- `src/components/experience/FloatingBrandBar.tsx`
- `src/components/experience/WeatherHUD.tsx`
- `src/components/scene/AtmosphereScene.tsx`
- `src/pages/Home.tsx`
- `src/pages/Weather.tsx`
- `src/pages/Radar.tsx`
- `src/pages/Alerts.tsx`
- `src/components/AlertsView.tsx`
- `src/components/InsightsView.tsx`
- `src/styles/mausam.css`
- `src/theme/tokens.ts`
- `src/index.css`
- `docs/DESIGN.md`
- `docs/ARCHITECTURE.md`
- `.github/workflows/ci.yml`

**Audit status:** Source-level first pass completed. Browser-level regression testing and implementation/build verification remain outstanding.

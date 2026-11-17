# MAUSAM — Full-Site Design System & Implementation Specification

> Version 3.0.0 · Authoritative UI/UX contract · 18 November 2026  
> Repository: `codesbysayam/mausam_sih-26`  
> Stack: React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Three.js · Leaflet · Recharts

## 0. Read this before changing code

This is the design and UX contract for the **entire existing MAUSAM application**, not a prompt to create a new mockup. Read this alongside `docs/RULES.md`, `docs/ARCHITECTURE.md` and `docs/FRONTEND_AUDIT_2026-11.md`.

Work in the existing repository. Inspect routes, component ownership, imports, providers and service contracts before editing. Preserve the existing application architecture, weather integrations, location/language contexts, caching, provenance, map/radar workflows, accessibility fallback and deployment behavior.

**Non-negotiable:**
- Redesign every route and every experience mode, not just the first screen.
- Never replace real integrations with static mockups or invented values.
- Never present synthetic, default or stale values as live observations.
- Never claim LIVE, VERIFIED, OFFICIAL or OPERATIONAL without provider evidence.
- Missing values stay missing; render a useful unavailable state instead of a plausible number.
- Do not remove features because they are difficult to style.
- Do not fix structural problems with broad global CSS overrides.
- Do not introduce unnecessary dependencies, animation, gradients or 3D decoration.
- Do not expose secrets, tokens, private endpoints or stack traces.
- Work on the designated feature branch; do not merge to `main` before verification.

---

## 1. Product identity

MAUSAM is an atmospheric intelligence platform for the public, weather-aware citizens, farmers, field teams and researchers. It is not a generic SaaS dashboard or a conventional weather widget.

The interface must combine:
1. Scientific credibility — units, timestamps, station/model context and provenance.
2. Public accessibility — clear language and obvious next actions.
3. Operational clarity — warnings, radar, forecasts and provider health are easy to locate.
4. Geographic context — India, states, districts, stations and selected locations remain understandable.
5. High information quality — dense enough for analysis, calm enough to scan.
6. Distinct identity — a recognizable MAUSAM visual language, not a copied dashboard template.

### Desired aesthetic

A carefully art-directed **meteorological observatory / scientific workstation**: restrained dark surfaces, precise typography, strong alignment, map-first workspaces, subtle borders, meaningful semantic color and generous breathing room.

Avoid:
- Repeated identical rounded cards for every section.
- Generic hero slogans and oversized empty headers.
- Purple/blue gradients, neon outlines and glowing blobs.
- Excessive pills, badges, uppercase labels and decorative icons.
- Random border radii, inconsistent spacing and heavy shadows.
- Fake charts, placeholder map overlays or sample values that resemble live data.
- Perpetual motion, scroll-jacking and gratuitous glassmorphism.
- Repeating the same location, source or status in several stacked bars.

“Less AI-ish” means deliberate editorial hierarchy, domain-specific layouts, purposeful controls, accurate data, real whitespace and restraint—not adding more visual effects.

---

## 2. Design principles

- **Truth before polish:** visual status must reflect actual data/provider state.
- **One product, three workspaces:** Explore, Analyze and Classic share identity and behavior.
- **Domain-specific layouts:** Weather, Radar, Forecast, Warnings, AQI and Agromet have different tasks.
- **Urgency-first hierarchy:** warnings and hazards precede secondary diagnostics.
- **Maps and charts are primary content:** do not shrink spatial tools into decorative cards.
- **Mobile is a composition, not a squeezed desktop:** re-order and simplify for touch.
- **Accessibility is product functionality:** keyboard, reduced motion and 2D access are required.

---

## 3. Visual foundations

### 3.1 Color tokens

Consolidate color ownership in `src/styles/mausam.css`. TypeScript theme values must mirror the canonical CSS variables. Audit usages before changing current values.

| Token | Target | Purpose |
|---|---|---|
| `--m-canvas` | `#07111D` | App background |
| `--m-surface-1` | `#0B1927` | Workspace surface |
| `--m-surface-2` | `#101F2E` | Panels / data regions |
| `--m-surface-3` | `#172A3B` | Raised controls / menus |
| `--m-surface-inset` | `#08131F` | Inset controls / data areas |
| `--m-border` | `#26394B` | Standard dividers |
| `--m-border-strong` | `#38536A` | Emphasized boundaries |
| `--m-text-primary` | `#F3F6FA` | Primary text |
| `--m-text-secondary` | `#B5C3D1` | Supporting text |
| `--m-text-muted` | `#8295A8` | Nonessential metadata |
| `--m-accent` | `#35C7E8` | Primary interactive accent |
| `--m-accent-strong` | `#0B72B9` | Primary action / links |
| `--m-focus` | `#7DD3FC` | Keyboard focus |

These are target design tokens, not permission to overwrite values without checking current usage and contrast.

### 3.2 Semantic colors

Preserve the project's documented hazard and air-quality mappings in `docs/RULES.md` and the relevant source configuration.

| State | Color | Meaning |
|---|---|---|
| Normal / Clear | `#00C853` | Verified no active hazard reported |
| Watch / Advisory | `#F1C40F` | Monitor / attention |
| Alert / Severe | `#E67E22` | Hazardous conditions |
| Warning / Extreme | `#E74C3C` | Serious hazard |
| Unknown / Unavailable | Neutral slate | Status cannot be established |

Always pair color with text/icon. Do not infer official warning severity from a general forecast. Preserve the CPCB NAQI and radar dBZ scales from the actual product. Never change a legend independently of its data.

### 3.3 Typography

Use existing bundled fonts where available; do not add an external font dependency without need.

- UI/body: Inter if already bundled, otherwise a system sans-serif stack.
- Scientific values: tabular numerals.
- Monospace: coordinates, station IDs, timestamps, model IDs and compact technical metadata only.
- Use sentence case for headings; avoid excessive uppercase/tracking.
- Avoid tiny muted text for essential information.

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---|
| Page title | 28–34px | 23–28px | 650–750 |
| Section title | 18–22px | 17–19px | 600–650 |
| Panel title | 15–17px | 15–16px | 600 |
| Body | 14–16px | 14–16px | 400–450 |
| Supporting | 12–13px | 12–13px | 400 |
| Key metric | 36–64px | 34–48px | 600–700 |
| Technical metadata | 11–12px | 11–12px | 450–550 |

### 3.4 Spacing, shape and elevation

Use a 4px base and 8px primary rhythm:
- 4px icon/text micro-gap; 8px compact controls; 12px dense grouping.
- 16px component padding; 20–24px section gap.
- 28–32px major content group gap; 40–48px page section separation where warranted.

Shape:
- Controls 8–10px radius.
- Panels 12–16px.
- Large workspace frames 14–18px.
- Chips 6–8px, used sparingly.
- Prefer 1px borders and surface contrast over shadows.
- Shadows only for functional elevation (menus, drawers, dialogs).
- Avoid nested cards unless hierarchy requires them.

---

## 4. Global application shell

### 4.1 Brand and location bar

One shared header across every mode:
- MAUSAM brand and “Atmospheric Intelligence”.
- Location search / selected location.
- Explore / Analyze / Classic switcher.
- Warning-center entry/status.
- Ask MAUSAM.
- Settings/accessibility actions where supported.

Keep it compact. Do not duplicate location search or GPS status in stacked bars. On mobile, prioritize brand, location and warnings; move secondary controls into a labelled overflow menu. GPS ACTIVE is allowed only when permission and coordinates are actually available.

### 4.2 Analyze navigation

Provide one domain navigation row:
Weather Detail · Forecast & NWP · Doppler Radar · Warnings · Cyclone Tracker · AQI & Air · Agromet · Reports · Data & Sources.

Use clear active, hover, focus and disabled states. At tablet widths use a scrollable row or menu with a visible selected state. On mobile, use a compact selector or controlled horizontal scrolling. Never create multiple competing navigation rows.

### 4.3 Shared page frame

Analytical pages should follow this hierarchy:
1. Page title and concise purpose.
2. Location/region context where relevant.
3. Source and freshness context.
4. Primary action(s).
5. Main visualization or information hierarchy.
6. Supporting analysis/details.
7. Related action/navigation.

Share hierarchy and primitives, not identical page layouts.

---

## 5. Experience modes

### 5.1 Explore — spatial workspace

Preserve the existing Three.js atmospheric scene and Leaflet fallback.

- Globe/map is the primary surface and occupies most of the viewport.
- Coordinate the floating brand bar, layer dock, Weather HUD and forecast timeline.
- Keep HUD panels compact/collapsible; never obscure important geography.
- Selected location, active layer, inspected feature and timeline state are obvious.
- Layer labels and legends describe the actual product and units.
- Display loading, stale and unavailable states in context.
- 2D fallback must retain essential tasks when WebGL is unavailable.
- Respect reduced-motion and low-performance quality tiers.
- No decorative particles or animation that could be mistaken for real measurements.

### 5.2 Analyze — scientific detail

- Use global shell plus one Analyze navigation row.
- Remove redundant location bars and repeated page titles.
- Prioritize analytical content over decorative framing.
- Tables for exact comparisons, charts for trends, maps for spatial patterns.
- Show units, valid/observation time and source.
- Distinguish observation, forecast, model output, derived estimate and static reference.
- Complex visualizations need accessible textual summaries.

### 5.3 Classic — accessible linear mode

Classic is a first-class experience, not a neglected legacy page.

- Preserve route and feature access.
- No WebGL dependency or unnecessary animation.
- Clear vertical reading order; warning state and current conditions near top.
- Follow with forecast, regional map and deeper modules.
- Avoid a wall of equally weighted cards.
- Use tables/lists when clearer than cards.
- Ensure keyboard and screen-reader access.
- Provide navigation to detailed Analyze pages.

---

## 6. Full-site page specifications

Every route must be audited and redesigned. Do not stop after the homepage.

### 6.1 Home / Classic overview

**User question:** What is happening at my location and what should I notice?

Order:
1. Selected location and observation context.
2. Verified active warning state, if available.
3. Current conditions.
4. Short-term/hourly trend.
5. Seven-day forecast.
6. Regional radar/map preview.
7. AQI/environmental conditions.
8. Solar/daylight context when source-backed.
9. Regional/national situation summaries.
10. Links to deeper analysis.

First viewport must communicate location, warning state and current conditions. Avoid repeated values and duplicated source labels. “No active warnings” must not appear when the feed is unavailable.

### 6.2 Weather Detail

**User question:** What are the verified current atmospheric conditions here?

Show location/station, observation time, provider, temperature/condition, feels-like only if validly supplied/derived, available metrics, hourly and daily forecast, and source-backed solar information.

Separate observations from model output. Every metric has a unit and available source/time metadata. Do not invent sensor names. Missing values render unavailable. A numeric value alone does not prove freshness or live status.

### 6.3 Forecast & NWP

**User question:** What is expected and how do available models differ?

Show forecast horizon, valid time, actual available model selector, model run time if supplied, hourly/daily views, precipitation probability separately from amount, and comparable variable trends.

Never invent model names, run times or ensemble spread. Compare only aligned locations, valid times, variables and units. Mark missing data unavailable. Charts need units, time zone and source. Forecast guidance is not an official warning.

### 6.4 Doppler Radar

**User question:** Where is precipitation/convection and how is it evolving?

Map is primary. Provide product/station selector, frame timestamp, playback/timeline, reflectivity legend in dBZ, coverage/range, layer controls, station metadata and source.

No synthetic echoes. Do not call a radar node operational without verification. Distinguish composite radar from a station product. Label cached/historical frames accurately. Mobile controls must not obstruct the map; no hover-only functionality.

### 6.5 Warnings

**User question:** Is there an official warning for this location and what action is advised?

Show jurisdiction, verified alert state, active alerts ordered by severity/validity, affected areas/map, issuing authority, bulletin ID, issue/update time, valid-from/until, official advisory and separately grouped archived alerts.

Preserve issuing authority's wording and severity. Do not generate warnings from model data. “No records received” is not “All clear”. Expired alerts cannot appear active. Feed unavailable must be explicit.

### 6.6 Cyclone Tracker

Show system name/classification, advisory issue time, center position, observed intensity/units, forecast track with valid times, wind radii/uncertainty only when supplied, affected areas where supported, and official bulletins.

Never invent systems or track points. Distinguish observed center, forecast positions and uncertainty. No active system must be source-backed. Avoid decorative storm animation.

### 6.7 AQI & Air

Show AQI/category and standard, dominant pollutant when identified, pollutant concentrations/units/averaging periods, monitoring station/network, observation time, regional comparisons only when sourced and time-aligned, and standard-consistent health guidance.

Do not mix AQI scales silently. Do not mark selected location live without a current reading. Static reference values must be labelled as reference, not live. Missing concentrations stay unavailable.

### 6.8 Agromet

Show location/district/crop context, source/time, rainfall, temperature/humidity, wind, relevant hazard indicators, soil moisture only with identified measurement/model source, crop advisory source/date, and risk indicators only when supported.

Do not generate crop advice from guessed weather. Do not imply district advisory exists when none was retrieved. Missing soil data must not become a plausible percentage. One numeric temperature does not make the entire page live.

### 6.9 Reports

Show location, time range, report type, provider/completeness, labelled tables/charts, units, export action and empty/error states. Exports must include timestamp, units, source and caveats; never export placeholders as observations. Print output must preserve readability and provenance.

### 6.10 Data & Sources / Diagnostics

Show provider, purpose, actual state (connected/degraded/stale/unavailable/not configured/offline), last successful fetch/update, safe error summary, product/source links, cache/fallback details and system health.

Never expose secrets or stack traces. A successful app render does not mean all providers are live. Distinguish application health from upstream availability.

### 6.11 Ask MAUSAM and global dialogs

Assistant context must use the selected location and real provider context. Missing values stay missing; do not inject fallback numbers. Distinguish retrieved facts from generated explanation. Location, settings, privacy and alert dialogs share focus, escape, close and mobile scrolling behavior. No automatic audio playback; follow `docs/RULES.md`.

---

## 7. Data state and provenance contract

Every metric component supports these states:

| State | UI behavior |
|---|---|
| Loading | Skeleton/progress; no guessed number |
| Live/current | Only with provider evidence and valid freshness |
| Cached/stale | Value plus visible stale label and last update |
| Unavailable | “Unavailable” and useful reason |
| Not configured | Provider configuration explanation |
| Offline/error | Source could not be reached |
| Partial | Show available fields; missing fields remain unavailable |

Where available, expose provider/authority, station/model, valid/observation time, retrieval time, unit/averaging period and cache/fallback state. Keep provenance compact but discoverable by keyboard and touch.

**Forbidden:** plausible numeric defaults; multiplying current precipitation to invent accumulations; synthetic forecast curves; fabricated station metadata; static regional values presented as current; official warning state without authoritative verification.

Only derive a value when the method is scientifically valid, inputs exist, units are correct and the derived nature is disclosed.

---

## 8. Shared component system

Create/reuse well-defined primitives; do not invent a new card for each page.

- `AppShell`, `BrandLocationBar`, `ExperienceSwitcher`, `AnalyzeNavigation`
- `PageHeader`, `SectionHeading`, `SourceStatus`
- `MetricValue`, `MetricList`, `DataPanel`
- `SeverityBanner`, `EmptyState`, `UnavailableState`, `LoadingState`
- `DataTable`, `ChartFrame`, `MapFrame`, `FilterBar`
- `Drawer`, `Dialog`, `Toast`

### Buttons

Use primary (one main action per local context), secondary, tertiary/ghost, danger and accessible icon-only variants. All need hover, active, focus, disabled and loading states. Avoid pill buttons everywhere; no emoji as UI icons.

### Panels

Not every paragraph needs a card. Use open layout and dividers for related content; panels for independent tools, inspectors and data modules. Avoid nested cards and identical repeated grids. Align titles, metadata and actions.

### Tables and charts

Right-align numeric values and use tabular numerals. Include units, time range and source. Tables need a mobile strategy. Charts need readable axes, accessible summaries and honest empty/partial states. Avoid 3D charts, decorative gradients and misleading zero lines.

### Maps

Group controls predictably; keep attribution visible; provide labelled controls and legends with units. Do not cover essential geography with HUD panels. Use responsive inspector/drawer on mobile. Do not rely on hover or color alone.

---

## 9. Interaction and motion

Motion clarifies cause/effect; it is not decoration.

- Hover/focus 100–160ms; small state changes 140–220ms; drawer/modal 180–260ms.
- Respect `prefers-reduced-motion`.
- Avoid perpetual motion unless it represents a real process and can be paused.
- Do not animate numbers in a way that implies unobserved changes.
- No scroll-jacking or unnecessary parallax.
- Preserve focus when dialogs open/close.
- Loading actions need immediate feedback; destructive actions need confirmation.

---

## 10. Responsive design

Test at minimum: 320×640, 360×800, 390×844, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080.

**Mobile**
- Header retains brand, location and warning access; secondary controls go to overflow.
- Navigation is touch-friendly and does not create uncontrolled wrapped rows.
- Main content is primarily single-column.
- Tables scroll or recompose deliberately.
- Charts remain legible; time-series can scroll horizontally.
- Map controls are reachable and do not obstruct core map interactions.
- Dialogs fit viewport and scroll internally.
- Touch targets minimum 44×44px.
- Fixed/floating controls respect safe areas.
- No fixed desktop widths/heights or horizontal page overflow.

**Tablet**
- Two columns only when both remain readable.
- Map + inspector side-by-side when possible; otherwise use a drawer.
- Navigation remains compact with visible selection.

**Desktop**
- Stable readable content width; avoid stretching text/metrics on ultrawide screens.
- Map-first views may use fluid width.
- Clear primary visualization vs secondary inspector hierarchy.

---

## 11. Accessibility

Target WCAG 2.2 AA where applicable:
- Body contrast 4.5:1; large text and meaningful UI boundaries 3:1.
- Visible keyboard focus, logical tab order and semantic headings.
- Accessible names for controls; labels and useful input errors.
- Never rely on color alone.
- Chart/map summaries or alternatives.
- Reduced-motion support; no flashing/high-frequency animation.
- All essential functions work without hover.
- Classic is a genuine low-GPU accessible mode.
- Zoom/text scaling must not clip content.

---

## 12. Loading, empty, error and offline states

Every route/module must support: initial loading, partial data, no location data, provider not configured, timeout/error, stale cache, verified no-warning state, warning-feed unavailable, no radar coverage, and export failure.

These states are distinct. “No active warnings” ≠ “warning feed unavailable”. “No radar echoes” ≠ “radar unavailable”. “No AQI reading” ≠ AQI zero.

---

## 13. Performance

- Preserve lazy loading for heavy pages.
- Three.js belongs to Explore; Classic must not depend on WebGL.
- Avoid rendering hidden heavy maps/charts.
- Avoid large dependencies for simple effects.
- Use existing Lucide React icons consistently.
- Avoid duplicate token systems and broad global selectors.
- Prevent unnecessary re-renders in weather/radar/map contexts.
- Reserve layout space to prevent shifts.
- Skeletons should match final content.
- Do not eagerly load every domain page and visualization.

---

## 14. Repository integration contract

Before editing:
1. Read `docs/RULES.md` and `docs/ARCHITECTURE.md`.
2. Inspect `src/main.tsx`, `src/App.tsx`, experience context and all workspaces.
3. Trace every route and imports/usages of legacy components.
4. Identify canonical service/provider/store for each data type.
5. Search hardcoded values, fallback numbers and misleading status labels.
6. Identify shared layout and token ownership.
7. Implement tokens and shell before page-level polish.
8. Rebuild each page without removing domain functionality.
9. Verify all modes/routes after each major change.

Preserve the current architecture: React shell; Explore/Analyze/Classic; Three.js scene and Leaflet fallback; weather, forecast, radar, warning, cyclone, AQI, Agromet, reports and diagnostics pages; provider/service layers; location/language contexts; Ask MAUSAM; API routes and deployment configuration. Do not assume every provider is configured or healthy.

---

## 15. Implementation sequence

### Phase 0 — audit and data safety
- [ ] Map routes and active workspace composition.
- [ ] Trace legacy components before removal.
- [ ] Find synthetic/default weather, AQI, radar, forecast and soil values.
- [ ] Find misleading LIVE/VERIFIED/OFFICIAL/OPERATIONAL labels.
- [ ] Correct provider state and provenance.
- [ ] Ensure missing data cannot become fabricated zero/plausible values.

### Phase 1 — design system
- [ ] Consolidate color, typography, spacing, radius and elevation tokens.
- [ ] Align CSS variables and TypeScript theme.
- [ ] Standardize controls, panels, tabs, banners, dialogs and source states.
- [ ] Remove obsolete styles only after reference checks.

### Phase 2 — shell
- [ ] Refine brand/location bar and mode switcher.
- [ ] Refine Analyze navigation.
- [ ] Remove duplicated location/status/page chrome.
- [ ] Verify mobile/tablet header and navigation.

### Phase 3 — every page
- [ ] Explore and 2D fallback.
- [ ] Analyze / Weather Detail.
- [ ] Classic / Home overview.
- [ ] Forecast & NWP.
- [ ] Doppler Radar.
- [ ] Warnings.
- [ ] Cyclone Tracker.
- [ ] AQI & Air.
- [ ] Agromet.
- [ ] Reports.
- [ ] Data & Sources / Diagnostics.
- [ ] Ask MAUSAM, location search, settings and dialogs.
- [ ] Privacy, terms, docs and not-found.

### Phase 4 — responsive/accessibility
- [ ] Test all specified viewport sizes.
- [ ] No horizontal overflow.
- [ ] Keyboard-only flows and visible focus.
- [ ] Dialog focus management and escape behavior.
- [ ] Reduced motion, contrast and text scaling.
- [ ] Accessible chart/map summaries.

### Phase 5 — verification
- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Route and mode-transition smoke tests.
- [ ] Provider live/stale/partial/unavailable tests.
- [ ] Location change and refresh tests.
- [ ] Map/radar interaction and playback tests.
- [ ] Language selection, export and print tests.
- [ ] Browser console/network review.
- [ ] Production deployment verification after approved merge.

A successful build alone does not prove visual correctness, data truthfulness or functional behavior.

---

## 16. Definition of done

**Design:** every route has a deliberate hierarchy; all modes feel like one product; no duplicate navigation/location chrome; no generic repeated-card template; consistent typography/spacing/colors/controls; maps and charts have usable space and legends; mobile/tablet layouts are intentional.

**Data trust:** no fabricated measurements; no misleading live/official labels; missing data is honest; source/unit/time are visible where available; warning-feed health is distinct from hazard status.

**Quality:** keyboard works; focus and contrast are correct; reduced motion is respected; no horizontal overflow; no dead controls; lint/typecheck and build pass; key routes and interactions are browser-tested.

**Delivery:** changes committed on feature branch; diff reviewed for accidental API/data/secret changes; known limitations documented; deployment verified after approved merge.

---

## 17. Final creative direction

The finished MAUSAM should feel like a carefully engineered atmospheric intelligence workstation: a calm observatory, a precise scientific instrument and an accessible public weather service in one coherent product.

Its sophistication must come from typography, layout, geographic context, meaningful visualization, reliable provenance, responsive behavior and thoughtful interaction.

**Do not make MAUSAM impressive by adding more effects. Make every screen clear, trustworthy, intentional and exceptionally well composed.**

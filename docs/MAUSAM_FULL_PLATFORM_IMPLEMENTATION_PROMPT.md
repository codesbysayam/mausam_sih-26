# MAUSAM — Full Platform Implementation Brief for Google AI Studio

Repository: https://github.com/codesbysayam/mausam_sih-26
Target branch: `fix/mausam-responsive-all-viewports`
Production URL: https://mausamgovt.vercel.app

## Execution contract

You are modifying the existing MAUSAM codebase. Do not create a separate demo, do not replace the application with a new starter template, and do not produce mock screenshots in place of code changes.

First pull the latest target branch. Preserve the changes already committed there. Inspect the actual source before editing. Apply changes in small, buildable groups. Keep the existing React + TypeScript + Vite + Express + Vercel architecture unless a measured incompatibility requires a change.

The owner wants the full platform repaired, not only the first page. Every relevant page, map, chart, data panel, mobile layout and backend endpoint is in scope.

Do not claim that a build, test, provider, preview or production deployment succeeded unless it was actually run and its output was checked.

---

# PART A — Issues already identified in the repository

These are source-inspected defects, not hypothetical suggestions.

1. `src/services/weather/weatherService.ts` previously substituted:
   - precipitation probability with 0,
   - precipitation with 0,
   - humidity with 60,
   - wind speed with 10,
   - estimated wave height from wind,
   - sea-surface temperature from air temperature,
   - a generic normal tide state.
   The current branch has been patched to stop these fabricated substitutions and to leave marine telemetry to a real marine provider. Review the patch and preserve it.

2. `src/services/weather/openMeteoAdapter.ts` previously substituted missing upstream values with 0, 1013 hPa and a default WMO clear-sky code. It also used the first hourly probability as if it were current probability. The current branch has been patched to preserve missing values, validate response fields, match current time to the hourly time index, and label the result as a model-grid product. Review the patch and preserve it.

3. `src/components/scene/geoMath.ts` previously placed unmatched state markers at latitude 22.5, longitude 78.9. The current branch now omits entries without verified region coordinates.

4. `src/components/experience/AccessibleMapFallback.tsx` previously used arbitrary coordinates 21.5, 79.0 when a region lookup failed. The current branch now refuses to create a state inspection with unverified coordinates.

5. `src/components/experience/ForecastTimeline.tsx` previously detected radar mode only when past frames existed, treated missing age as a current frame, and could reuse the same index after switching between radar and hourly series. The current branch now handles nowcast-only feeds, reports unknown frame time honestly, and resets the cursor when the active series changes. Verify that the actual map overlay updates from the same selected frame index.

6. `src/styles/responsive-observatory.css` already exists and is imported. A new `src/styles/viewport-hardening.css` is now imported after it. Do not duplicate it or remove it. Inspect it and test the actual DOM at every target viewport. If it conflicts with component layout, fix the component and then simplify CSS rather than adding endless overrides.

7. `api/system.ts` and `src/services/multiSourceService.ts` already contain a first pass at a provider health contract. They still need full contract alignment, provider-specific validation, honest readiness semantics and real shared telemetry.

---

# PART B — Mandatory complete viewport redesign

## B1. Explore workspace

Primary files:
- `src/components/experience/ExploreWorkspace.tsx`
- `src/components/experience/FloatingBrandBar.tsx`
- `src/components/experience/LayerDock.tsx`
- `src/components/experience/WeatherHUD.tsx`
- `src/components/experience/ForecastTimeline.tsx`
- `src/components/scene/AtmosphereScene.tsx`
- `src/components/experience/AccessibleMapFallback.tsx`
- `src/styles/responsive-observatory.css`
- `src/styles/viewport-hardening.css`

### Phone portrait requirements

Do not stack the brand, search, mode switch, alert status, Ask MAUSAM, settings and help as three or four full-width rows.

Compose the header as:

- Row 1: MAUSAM identity + location search.
- Row 2: Explore / Analyze / Classic mode switch on the left; horizontally scrollable essential actions on the right.
- Hide nonessential text labels when space is constrained, but preserve accessible labels and tooltips.
- Keep search input usable and not narrower than its text/cursor affordance.
- Put secondary actions inside the settings/overflow surface.

The layer dock is a compact collapsible control, not a permanent wide desktop rail. The weather summary is a compact sheet above the playback timeline. The timeline is fixed to the bottom safe area. These regions must never overlap.

Use `100dvh`, `visualViewport` only if needed through a React resize observer (not raw global hacks), safe-area insets, `min-width: 0`, `clamp()`, and CSS grid.

### Landscape and short-height devices

For viewports under 520 CSS px high:
- keep the map center unobstructed;
- move layer controls to the left edge and weather inspector to the right edge;
- reduce timeline height;
- avoid full-screen popovers;
- ensure the controls can be scrolled independently;
- do not let the browser page scroll horizontally.

### Analyze and Classic

Audit every page, not only Home:
- Weather
- Forecast
- Radar
- Warnings
- Cyclone Tracker
- AQI
- Agromet
- Reports
- Data Sources
- Documentation
- Settings / dialogs / modals

Use a content-driven grid. On narrow devices, stack cards and allow intentional horizontal forecast strips. Never force a 3-column metric grid into a 360px viewport. Charts must use ResponsiveContainer with a parent whose width and min-width are correct.

### Required viewport matrix

Use Playwright or the repository's available browser automation to inspect screenshots at:
- 320×568
- 360×640
- 375×812
- 390×844
- 414×896
- 430×932
- 600×960
- 768×1024
- 820×1180
- 1024×768
- 1180×820
- 1280×720
- 1366×768
- 1440×900
- 1600×900
- 1920×1080
- 2560×1080
- 667×375 landscape
- 844×390 landscape

For every viewport verify:
- no horizontal page overflow;
- no hidden primary data;
- no text clipping in critical labels;
- no controls covering one another;
- no browser safe-area collision;
- map remains interactive;
- timeline remains reachable;
- charts have readable axes;
- tables remain accessible through controlled horizontal scrolling.

Do not use device labels as substitutes for actual CSS viewport sizes.

---

# PART C — Unified meteorological data contract

Implement a canonical contract and use it in every weather domain. Do not let each page independently guess the meaning of the same field.

Create or consolidate under `shared/` a contract equivalent to:

```ts
export type DataKind =
  | 'OBSERVATION'
  | 'MODEL_FORECAST'
  | 'RADAR_FRAME'
  | 'OFFICIAL_WARNING'
  | 'DERIVED'
  | 'CLIMATOLOGY';

export type Freshness =
  | 'FRESH'
  | 'RECENT'
  | 'STALE'
  | 'DELAYED'
  | 'UNAVAILABLE';

export interface MetricEnvelope<T> {
  value: T | null;
  unit: string;
  metric: string;
  kind: DataKind;
  provider: string;
  location: {
    latitude: number;
    longitude: number;
    label: string;
  };
  validAt: string | null;
  observedAt: string | null;
  issuedAt: string | null;
  fetchedAt: string;
  freshness: Freshness;
  quality: 'VERIFIED' | 'ESTIMATED' | 'DERIVED' | 'UNVERIFIED';
  reason?: string;
}
```

If an equivalent shared type already exists, extend and normalize it instead of adding a duplicate.

## C1. Data normalization rules

- Use finite-number checks before accepting numeric fields.
- Accept 0 only if the provider explicitly returned numeric 0.
- Missing, null, NaN, Infinity, malformed or out-of-range values remain null/unavailable.
- Never use `value || default` for a meteorological value.
- Use `value ?? 0` only for non-meteorological counters where zero is semantically correct.
- Temperature range: validate against a configurable physical sanity boundary; flag suspicious values rather than silently clamping them.
- Relative humidity: 0–100%.
- Probability: 0–100%.
- Wind speed and precipitation: nonnegative.
- Wind direction: 0–360 degrees.
- Pressure: validate against documented physical limits.
- Preserve source units and normalize to canonical display units once.
- Never treat an HTTP 200 response as proof of valid data.
- Keep observation time, model valid time, model issue time and retrieval time distinct.
- A forecast-grid value must not be labelled as a station observation.
- Do not average models unless the product explicitly presents a documented ensemble statistic.

## C2. Specific source audit

Inspect and repair:
- `src/services/weather/openMeteoAdapter.ts`
- `src/services/weather/imdAdapter.ts`
- `src/services/weather/weatherService.ts`
- `src/services/forecastNormalizer.ts`
- `src/services/weatherResolver.ts`
- `src/services/nwp/nwpNormalizer.ts`
- `src/services/nwp/nwpFreshness.ts`
- `src/services/authoritativeService.ts`
- `src/services/multiSourceService.ts`
- `src/services/air/`
- `src/services/radarService.ts`
- `src/services/CycloneLiveDataService.ts`
- `src/services/agrometService.ts`
- `src/services/warningService.ts`
- `src/services/warningNewsService.ts`
- `src/services/marineService.ts`
- `src/services/mausamAssistantService.ts`

Important additional audit:
`src/services/mausamAssistantService.ts` currently has a state-profile path that can use climatological normal values as if they were current weather for a state other than the selected active location. Change this behavior:
- If a user asks for current conditions in another state/city, query the live provider for that requested location.
- If live retrieval fails, say current telemetry is unavailable.
- Climatology may be shown only in a separate, clearly labelled climatology section with its reference period/source.
- Never display typical AQI as today's measured AQI.

---

# PART D — Backend: complete full-stack data architecture

Do not add a second backend that competes with the current Express/Vercel architecture. Repair and consolidate the existing services.

## D1. API layer

Audit:
- `api/system.ts`
- all `api/*.ts` routes
- `server.ts`
- `server/routes/`
- `src/server/services/`
- `src/server/apiUtils.ts`
- `src/services/apiClient.ts`

Every API response should include:
- `requestId`
- `status`
- `data`
- `sources[]`
- `fetchedAt`
- `validAt` or `observedAt` when applicable
- `freshness`
- `cache: { state, ageSeconds, ttlSeconds }`
- `errors[]` with provider and error code

Do not include secrets, internal stack traces or credential-bearing URLs.

Use proper HTTP semantics:
- 200 for successful or partial data response with explicit provider status.
- 400 for invalid request parameters.
- 404 for unsupported route/resource.
- 429 for rate limiting.
- 502/503 when the gateway cannot provide the requested required service.
- 504 for upstream timeout when no usable stale result exists.

Do not return HTTP 200 with `ready: true` if readiness has not been checked. Distinguish liveness (process responds) from readiness (required dependencies are ready) and provider health (individual upstreams).

## D2. Shared cache and persistence

Current code contains in-process cache implementations, including:
- `src/server/services/cacheService.ts`
- `src/services/nwp/nwpCache.ts`
- `src/services/apiClient.ts` browser memory cache

These may remain as local/per-instance optimizations, but must not be the authoritative production cache.

Implement a cache adapter contract:

```ts
export interface SharedCache {
  get<T>(key: string): Promise<{
    value: T | null;
    ageSeconds: number | null;
    state: 'MISS' | 'FRESH' | 'STALE';
  }>;
  set<T>(key: string, value: T, ttlSeconds: number, staleSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
```

Requirements:
- Use the already-supported shared cache environment if configured (e.g. Upstash Redis REST).
- If no shared cache is configured, report `IN_MEMORY_DEGRADED` and do not imply cross-instance consistency.
- PostgreSQL is for durable records, not a substitute for a low-latency hot cache.
- Add schema/migrations only after inspecting existing tables.
- Use TTLs appropriate to the source: current model grid, hourly forecasts, radar frames, warnings, AQI and NWP runs must not share one TTL.
- Include provider/model/coordinates/variables/time range in every cache key.
- Prevent cache stampedes with a distributed lock or bounded single-flight mechanism where supported.
- A stale value may be returned only with its age and stale status.
- A failed refresh must not overwrite a previously valid cache entry with an error payload.
- Cache failures must not crash unrelated data providers.

## D3. Provider orchestration

For independent providers:
- use `Promise.allSettled`;
- apply per-provider timeout and cancellation;
- validate each response independently;
- record measured latency;
- implement bounded retries only for transient errors;
- use exponential backoff with jitter;
- use circuit breakers;
- return partial results when optional providers fail;
- never substitute one provider's data while retaining the failed provider's name.

## D4. Data health

Separate these concepts:
- gateway reachable;
- provider endpoint reachable;
- provider response schema valid;
- data timestamp fresh;
- required metric present;
- source quality acceptable.

A provider must not be called operational just because a credential exists or an endpoint returns HTTP 200.

---

# PART E — Professional map rebuild across the entire platform

Do not redesign only the 3D Explore map. Audit all maps and shared map primitives.

Targets include:
- `src/components/scene/AtmosphereScene.tsx`
- `src/components/scene/indiaTerrainBuilder.ts`
- `src/components/scene/geoMath.ts`
- `src/components/experience/AccessibleMapFallback.tsx`
- `src/components/map/MausamMap.tsx`
- `src/components/map/IndiaWeatherMap.tsx`
- `src/components/map/MapLayerControl.tsx`
- `src/components/map/MapLayerRail.tsx`
- `src/components/map/MapLegend.tsx`
- `src/components/map/MapToolbar.tsx`
- `src/components/RadarMapView.tsx`
- `src/pages/Radar.tsx`
- `src/pages/CycloneTracker.tsx`
- `src/pages/Alerts.tsx`
- `src/pages/AirQuality.tsx`
- `src/pages/Agromet.tsx`

## E1. Map visual standard

Create a consistent professional map system:
- neutral, low-contrast basemap;
- restrained warm land palette and deep ocean palette;
- clean administrative boundaries;
- selected location marker with halo and label;
- clear map scale and north/orientation control where appropriate;
- layer legend with units and source;
- timestamp and freshness badge;
- accessible layer picker;
- keyboard and touch zoom/recenter;
- attribution visible at all times;
- selected feature inspector with provenance.

Do not use repeated generic pins to imply actual weather readings. Station pins must originate from a verified station registry and have accurate coordinates. State centroids are geographic reference points, not observation stations.

## E2. Layer truthfulness

- Surface temperature: actual provider/model grid with valid time.
- Wind: actual u/v or speed/direction grid; do not generate wind streams from decorative particle motion alone.
- Rain: actual precipitation field, radar or model QPF; distinguish them.
- Radar: use actual timestamped radar frames and correct tile URL pattern from provider metadata.
- Satellite/cloud: use a real satellite/cloud layer or label it unavailable. Decorative cloud textures must never be represented as a current satellite product.
- AQI: actual CPCB station values or a clearly labelled model estimate; never interpolate a fabricated national AQI.
- Warnings: actual official CAP/IMD bulletins with valid period and affected geography.
- Cyclones: current official RSMC/IMD track points, forecast cone and issue time; do not draw fictional tracks.
- Agromet: actual soil/weather model variables and district advisories; separate model-derived values from official recommendations.

If a layer has no verified feed, show the neutral base map and an explicit unavailable state.

---

# PART F — Playback and loop implementation

The playback controller must drive the map, not just animate the slider.

Implement or refactor one shared playback controller with:
- active series key (`radar`, `forecast:ECMWF`, `forecast:GEFS`, etc.);
- ordered frames/slots;
- selected index;
- play/pause;
- loop enabled/disabled;
- speed (0.5×, 1×, 2×);
- actual valid timestamp;
- source label;
- loading/error/empty state.

Rules:
1. Build radar series from the real sorted `pastFrames + nowcastFrames`.
2. Build forecast series from the selected model's actual hourly data.
3. On series switch, reset or map by timestamp; never reuse an unrelated numeric index.
4. Play advances exactly one real frame/slot per tick.
5. Pause stops all timers.
6. Previous/next pauses or preserves the documented play state consistently.
7. Loop ON wraps the final frame to the first.
8. Loop OFF stops on the final frame.
9. Scrubbing immediately updates the map layer and pauses playback.
10. Data refresh preserves the selected timestamp only if it exists in the new series.
11. Missing timestamps display `Time unavailable`; they are never treated as current.
12. Empty data disables playback with an explanation.
13. No synthetic interpolation or generated frames.
14. Use one timer owner. Clean up timers on unmount and series changes.
15. Pause rendering when the document is hidden, and resume only if the user had playback enabled.

Add unit tests for loop wrap, stop-at-end, speed changes, series switch, empty data, frame refresh and missing timestamp.

---

# PART G — Replace vendor-branded assistant implementation

The owner wants all code references to the previous vendor-specific assistant integration and development tooling removed from the repository and replaced with neutral MAUSAM naming.

This does NOT mean deleting the word `air` from Air Quality, removing the actual assistant feature, or blindly regex-replacing every occurrence of the letters `AI`.

Perform an exact identifier/string/dependency migration:
- Remove vendor-specific package imports and provider SDK dependencies.
- Remove vendor-specific environment variable names from application code and docs.
- Replace branded provider classes with `MausamAssistantProvider` / `MausamAssistantService`.
- Replace labels like `MAUSAM AI` with `Ask MAUSAM` or `MAUSAM Assistant`.
- Remove development-tool references from source comments, UI strings, docs and repository configuration.
- Preserve meteorological terms such as Air Quality, rainfall and atmospheric intelligence.
- Search all source files, tests, docs, package manifests, lockfiles, GitHub workflows and environment examples.
- Update all imports and tests before deleting old files.
- Do not leave unused SDKs in package.json or package-lock.json.

The assistant must be provider-neutral:
- Read `MAUSAM_ASSISTANT_API_URL`, `MAUSAM_ASSISTANT_API_KEY` and `MAUSAM_ASSISTANT_MODEL` only on the server.
- Use a documented OpenAI-compatible chat-completions contract or another user-configured endpoint.
- Never expose credentials to Vite/browser variables.
- If not configured, provide a deterministic, source-grounded telemetry summary or FAQ response.
- If the endpoint fails, do not fabricate a normal-weather statement.
- The response must distinguish retrieved telemetry, FAQ knowledge, and general explanation.
- Health checks must not claim operational status based on a configured key alone.

A provider-neutral adapter can follow this structure:

```ts
export interface AssistantRequest {
  prompt: string;
  context: {
    location?: string;
    coordinates?: { latitude: number; longitude: number };
    verifiedMetrics: Array<{
      label: string;
      value: number | string | null;
      unit?: string;
      source: string;
      validAt?: string | null;
      status: string;
    }>;
  };
}

export interface AssistantResult {
  text: string;
  provider: string;
  model: string | null;
  mode: 'REMOTE' | 'GROUNDED_LOCAL' | 'UNAVAILABLE';
  citations: Array<{ title: string; url: string }>;
  error?: string;
}
```

Do not invent a replacement provider or API URL. If no endpoint is configured, the local grounded mode must work without credentials.

---

# PART H — Improve the presentation of every data page

The data must read like a professional meteorological briefing, not a pile of random cards.

For each page:
1. Lead with one clear summary statement supported by data.
2. Show 3–5 primary metrics with units and provenance.
3. Explain temporal or spatial context with charts/maps.
4. Group secondary metrics by meteorological domain.
5. Place source/freshness metadata beside the relevant measurement.
6. Provide an expandable technical detail section.
7. Include empty, loading, stale and unavailable states.
8. Avoid duplicating the same data in multiple cards.
9. Use consistent decimal precision and unit formatting.
10. Keep all cards aligned and content-driven.

### Forecast page
- One model selector with selected model name, run time and freshness.
- Temperature envelope with actual hourly/daily values.
- Precipitation probability and amount shown separately.
- Wind profile with speed and direction.
- Daily row expands into a structured detail panel.
- No model blending unless labelled as an ensemble with a documented calculation.

### AQI page
- State the index standard (CPCB NAQI or US AQI).
- Show station/model source, pollutant, units and observation time.
- Show pollutant sub-index only when the input is present and the calculation is valid.
- Do not claim CPCB live data when using another provider's chemistry forecast.
- Health guidance must match the actual AQI standard and category.

### Agromet page
- Separate weather model variables, soil model variables and official district advisories.
- Show soil depth and units.
- Include crop stage only when user supplied or officially sourced.
- Do not invent crop recommendations from generic weather thresholds.
- Every advisory must carry source and issue/validity time.

### Warnings page
- Official warning first, news/articles in a separate section.
- Show issuer, issue time, valid period, affected districts, severity and action advice.
- News articles must not be converted into official warnings.
- If the feed is unavailable, do not show All Clear.
- A verified zero-alert result is different from a failed warning feed.

### Cyclone page
- Current official system status.
- Last bulletin and issue time.
- Track points with valid timestamps.
- Forecast cone only when official coordinates and uncertainty data exist.
- Wind speed units and averaging period.
- Clearly separate observed track from forecast track.

### Reports page
- Generate from the same normalized data response used by the page.
- Include report generation time, location, source table and data valid time.
- Never export unavailable values as zero.
- Include clear attribution and limitations.

---

# PART I — Required tests

Add unit, integration and browser tests for:

## Data
- Open-Meteo valid response.
- Missing current temperature.
- Missing humidity.
- Missing wind.
- Missing precipitation probability.
- Missing daily high/low.
- Missing hourly values.
- Invalid WMO code.
- Invalid timestamp.
- Provider HTTP 429, 500, timeout and malformed JSON.
- IMD valid, unconfigured, invalid and stale response.
- CPCB missing credentials and provider outage.
- Radar empty frame list and nowcast-only frame list.
- AQI source mismatch and NAQI category boundaries.
- Climatology vs current data separation.
- No fabricated marine wave/tide values.

## Cache/backend
- shared cache hit;
- cache miss;
- stale-on-error;
- shared cache unavailable;
- failed refresh must not overwrite valid cached value;
- cache key includes model/provider/location/variables;
- concurrent requests do not cause unbounded upstream calls;
- provider failures are isolated;
- request ID is present;
- readiness and liveness semantics are correct.

## Playback
- loop wraps;
- non-loop stops;
- pause freezes map and index;
- scrub updates map;
- mode switch resets index;
- speed changes timing;
- missing timestamp not labelled nowcast;
- empty series disabled;
- data refresh preserves valid selected timestamp.

## Visual
Run the viewport matrix in Part B. Save screenshots and fix actual collisions.

---

# PART J — Build, preview and release

Use the Node version required by package.json. Inspect scripts before running.

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Run unit/integration tests.
5. Run browser viewport tests.
6. Start local server and inspect console/network.
7. Deploy a Vercel preview for the target branch.
8. Test actual deployed endpoints with curl.
9. Inspect preview logs and runtime logs.
10. Do not merge to main or claim production deployment without explicit approval and successful verification.

If package.json changes, regenerate package-lock.json with npm; never hand-edit the lockfile.

---

# PART K — Required final handoff

Return a concise but complete engineering report:
- Root causes confirmed from source.
- Files changed and why.
- Exact data defaults/fallbacks removed.
- New backend/cache architecture.
- Every map modified.
- Responsive viewport matrix with pass/fail.
- Playback test results.
- Assistant vendor-neutral migration results.
- `npm ci`, lint, build and tests.
- Preview URL and deployment status.
- Remaining provider credentials or external dependencies.
- Any items that remain unavailable or unverified.

Never use "complete", "fixed", "live", "operational", "deployed" or "verified" unless the corresponding evidence exists.

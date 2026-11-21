# MAUSAM — Product & Interface Design Specification

> A professional atmospheric observatory for India. Spatially immersive in Explore, analytical in Analyze, and accessible in Classic.

## 1. Product principles

1. **Meteorological credibility before decoration.** Every measurement must identify whether it is an observation, forecast-grid value, official warning, derived calculation, climatology, or unavailable.
2. **One datum, one canonical value.** All views consume the same normalized API response for the same location, provider/model, and valid time.
3. **Spatial first, not dashboard first.** Maps explain geography and weather patterns; cards and charts explain the measurements behind them.
4. **Responsive by composition.** Phone, tablet, laptop, desktop, ultrawide, foldable, and landscape layouts are intentionally composed. Desktop is not merely scaled down.
5. **Graceful degradation.** 3D is progressive enhancement. 2D maps, data tables, forecasts, and warnings remain fully usable without WebGL.
6. **No invented telemetry.** Missing values remain unavailable. A provider failure never turns into a plausible-looking zero or generic normal-weather statement.

## 2. Visual identity

### Design character
- Editorial meteorological instrument panel.
- Warm graphite, mineral charcoal, muted sage, parchment, and restrained brass.
- High information density only where the task requires it.
- Large readable values, compact metadata, strong typographic hierarchy.
- No generic electric-blue SaaS dashboard styling.
- No playful gamification or decorative weather values.

### Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#111314` | Primary dark workspace |
| Surface 1 | `#191D1D` | Main cards and panels |
| Surface 2 | `#202424` | Raised cards and controls |
| Surface inset | `#0D1010` | Inputs, map HUD interiors |
| Text primary | `#F0EEE7` | Main text |
| Text secondary | `#B5B6AE` | Supporting text |
| Text muted | `#898B83` | Metadata |
| Brass | `#C5A46D` | Primary accent and active controls |
| Brass bright | `#E0C18A` | Focus and highlight |
| Sage | `#9CAF9A` | Neutral atmospheric/healthy state |
| Success | `#55A77B` | Verified healthy state |
| Watch | `#D8B14F` | Advisory/watch |
| Warning | `#D98548` | Severe advisory |
| Danger | `#C94F4B` | Critical warning |

Use existing CSS variables when available. Do not introduce a second competing token system. Keep severity colors semantically consistent across all pages.

### Typography
- Display: existing MAUSAM display font, used for major headings and primary values.
- Body: Noto Sans or the existing body font.
- Data: tabular numerals; monospace only for coordinates, timestamps, IDs, units, and technical metadata.
- Use `clamp()` for headings and primary metric sizes.
- Avoid uppercase paragraphs. Uppercase is reserved for short instrument labels.

## 3. Global layout rules

- Every flex/grid child that can shrink must have `min-width: 0`.
- No fixed-width cards that overflow at narrow widths.
- Use `minmax(0, 1fr)`, `repeat(auto-fit, minmax(min(100%, 230px), 1fr))`, and content-driven grids.
- Use `100dvh` with a `100vh` fallback for full-screen map workspaces.
- Respect `env(safe-area-inset-*)` on notched phones.
- Avoid nested horizontal scroll areas. A single deliberate horizontal strip is acceptable for hourly forecast cards.
- Tables may scroll horizontally; their page must not.
- All buttons and touch targets should be at least 40–44 CSS px on touch devices.
- No critical information may be hidden solely on hover.
- No text should be clipped with ellipses if it is a primary value, warning, source, or timestamp.
- Charts must use responsive containers and must not impose intrinsic widths on their parents.

## 4. Responsive compositions

Breakpoints are content-driven, not device-name-driven. Validate at intermediate widths as well as the values below.

| Range | Composition |
|---|---|
| 320–389 px | Single-column phone; compact 2-row Explore toolbar; bottom timeline; weather summary sheet above timeline |
| 390–599 px | Phone portrait; full-width search; horizontal mode switch; scrollable secondary actions |
| 600–767 px | Large phone / small tablet; map remains dominant; layer drawer and summary sheet |
| 768–1023 px | Tablet; two-column toolbar, collapsible layer rail, floating inspector |
| 1024–1439 px | Laptop; three-zone toolbar or deliberate two-row header; map canvas gets central clear area |
| 1440–1599 px | Desktop; persistent left layer rail and right weather inspector |
| 1600 px and above | Ultrawide; constrain information rails and reading width, not the map |
| Landscape under 520 px high | Side HUDs, compact top bar, narrow bottom timeline; never stack tall overlays vertically |

### Explore mobile composition
1. Row 1: brand + location search.
2. Row 2: mode switch + horizontally scrollable essential actions.
3. Layer selector: compact, collapsible dock at upper-left.
4. Weather summary: compact bottom sheet, positioned above the playback timeline.
5. Playback timeline: fixed to bottom safe area, no overlap with the summary sheet.
6. Map: fills the remaining stage and remains pan/zoom interactive.
7. Secondary actions (help, settings, language, notifications) live in a compact overflow/settings surface, not an additional toolbar row.

The Explore page must not place the full desktop weather inspector over the map on phone widths.

### Analyze and Classic
- Use a centered reading frame with a fluid maximum width.
- At phone widths, stack all analytical sections and use full-width charts.
- Hourly forecasts are horizontally scrollable with snap points; do not squeeze 24 columns into a viewport.
- Seven-day forecast uses clear rows with day, condition, precipitation, temperature range, and expansion details.
- On tablets, use two columns only when each column retains a comfortable minimum width.
- On wide screens, use 2–3 columns with consistent alignment and a restrained maximum content width.

## 5. Navigation and information architecture

### Explore — Atmospheric Explorer
- Full-screen India 3D relief map.
- Switchable 2D map fallback.
- Layer dock: surface, wind, precipitation, radar, clouds, AQI, warnings, cyclones, agromet.
- Selected-location inspector.
- Real model/radar time progression.
- Visible source and valid-time status.
- Map controls: zoom, recenter, orientation reset, layer legend, station visibility.

### Analyze — Weather Intelligence
- Overview and current conditions.
- Hourly and daily forecast.
- Synoptic context and comparison.
- Data source and model provenance.
- Clear separation between observations and forecast-grid output.

### Classic — Accessible Briefing
- Linear reading order.
- No WebGL requirement.
- Reduced-motion by default when requested.
- Accessible tables, headings, charts, and source labels.
- Full parity for weather, forecast, warnings, AQI, agromet and reports.

### Domain pages
Warnings, Cyclone Tracker, Radar, AQI, Agromet, Reports and Data Sources each receive a consistent page header, source/freshness summary, clear loading/error/empty states, and responsive content grid.

## 6. Weather data presentation

Every metric must present:
- Name and value.
- Unit.
- Location.
- Source/provider.
- Valid or observation time.
- Retrieval time when useful.
- Status: observed, forecast, derived, climatology, stale, delayed, unavailable.
- Quality note when the source has limitations.

### Metric card pattern
A metric card should show a readable value first, then context:
- Temperature: value, feels-like if available, valid time.
- Rain: probability and accumulation as separate quantities; never imply probability is amount.
- Wind: speed, direction, gusts if available.
- Humidity: relative humidity and dew point if available.
- AQI: index, standard (CPCB NAQI or US AQI), dominant pollutant, station/model source, timestamp.
- Pressure: hPa and trend only if at least two comparable valid observations exist.
- UV: index and exposure category from a documented scale.
- Soil moisture: depth and unit; model-derived vs sensor-observed must be explicit.

### Charts and data storytelling
- Use line/area charts for temporal change.
- Use range bars for daily low/high.
- Use stacked or segmented charts for pollutant contribution only when pollutant values exist.
- Use anomaly/context annotations only when a verified baseline is available.
- Use confidence bands only when provider/model spread or calibrated uncertainty exists.
- Avoid decorative sparklines with synthetic values.
- Every chart needs a title, unit, time zone, source and empty state.

## 7. Data integrity and provenance

Canonical data contract for every measurement:

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
  location: { latitude: number; longitude: number; label: string };
  validAt: string | null;
  observedAt: string | null;
  issuedAt: string | null;
  fetchedAt: string;
  freshness: Freshness;
  quality: 'VERIFIED' | 'ESTIMATED' | 'DERIVED' | 'UNVERIFIED';
  reason?: string;
}
```

Rules:
- Never replace null with 0, 50%, 1013 hPa, a generic wind value, or a typical climatology value.
- A returned HTTP 200 is not proof that a provider returned usable measurements.
- A model grid is not a station observation.
- A forecast valid time is not the retrieval time.
- Climatology must never be shown as today's weather.
- Never label data LIVE unless the product's freshness policy and timestamp support it.
- If two sources differ, show their provenance and timestamps; do not average them silently.
- Derived metrics must identify their formula and inputs.

## 8. Backend architecture

Use one canonical server-side weather orchestration pipeline:

1. Validate coordinates, model, requested variables and date range.
2. Resolve the requested provider/model explicitly.
3. Check shared cache using a key that includes provider, model, coordinates, variables and time range.
4. Fetch from provider adapters with independent timeouts.
5. Validate upstream response shape and physical ranges.
6. Normalize units and timestamps.
7. Attach provenance and freshness metadata.
8. Persist successful normalized snapshots where retention is required.
9. Cache with a documented TTL and stale window.
10. Return a typed response envelope.

### Cache policy
- In-process memory is a performance optimization only; it is not shared production persistence.
- Use a shared cache (Upstash Redis or another configured shared store) for cross-instance consistency.
- PostgreSQL stores durable snapshots, reports and audit metadata where needed.
- Cache keys must include location, provider, model, requested variables and time horizon.
- Never mix different models under one cache key.
- Stale-on-error is allowed only when the stale timestamp is displayed.
- A stale response must never be relabelled fresh.
- Add request IDs, upstream latency, cache status and provider error code to server logs.
- Do not expose credentials or full sensitive upstream URLs in the browser.

### Provider orchestration
- Independent providers run concurrently using `Promise.allSettled`.
- Each provider has its own timeout, circuit breaker and schema validator.
- A failed optional provider does not fail the entire weather bundle.
- Core weather failure returns a typed partial/unavailable response, not mock weather.
- Provider health checks must not be confused with data quality checks.
- Do not count a key being present as an operational provider.
- Do not display latency values unless measured during the current request.

## 9. Maps and geospatial design

Audit and improve every map surface:
- 3D Explore terrain.
- 2D accessible fallback.
- National state map.
- Doppler radar map.
- Cyclone track and cone map.
- Warning map.
- AQI map.
- Agromet map.

Every map must have:
- Geographic projection and bounds appropriate to its task.
- Clear selected-location marker.
- Scale, zoom and reset/recenter.
- Legend with units and valid range.
- Timestamp and source.
- Attribution for basemap and overlays.
- Loading, stale, unavailable and no-coverage states.
- Keyboard/touch accessibility.
- Mobile controls that do not cover critical geography.

Never draw an operational radar range ring from an unverified station list. Never show a cloud, AQI, wind or rainfall overlay as live unless it comes from a timestamped provider response. Use a neutral base map when an overlay is unavailable.

## 10. Playback and loop behavior

One timeline controller must drive both the timeline UI and the active map overlay.

Requirements:
- Radar mode uses the actual ordered `pastFrames + nowcastFrames` list.
- Forecast mode uses the selected model's actual ordered hourly slots.
- Switching mode resets or explicitly maps the index; never reuse an unrelated index.
- Play advances one actual frame/slot.
- Pause freezes both index and map overlay.
- Previous/next step updates both.
- Speed changes interval only; it does not skip data.
- Loop enabled wraps final slot to first.
- Loop disabled stops at final slot.
- Scrubbing pauses playback and updates the selected overlay immediately.
- Data refresh clamps the index and preserves the selected timestamp only if it still exists.
- Empty series disables playback and explains why.
- Missing frame timestamp is shown as unknown, not nowcast.
- Playback never manufactures intermediate frames or forecast points.

## 11. Motion and performance

- 3D is an enhancement; provide a stable 2D fallback.
- Respect `prefers-reduced-motion` and the in-app reduced-motion setting.
- Use device-aware quality tiers for pixel ratio, shadows, particles and post-processing.
- Pause animation loops when the page is hidden.
- Dispose Three.js geometry, materials, textures, controls, observers and event listeners on unmount.
- Use ResizeObserver for canvas and chart sizing.
- Never create multiple render loops after resize or mode changes.
- Keep pointer and touch gestures distinct from page scrolling.

## 12. Accessibility

- WCAG AA contrast for text and controls.
- Visible keyboard focus.
- Semantic headings and landmarks.
- Accessible names for icon-only controls.
- Keyboard support for map controls and playback.
- No status conveyed only by color.
- Respect reduced motion.
- Maintain readable font sizes and adequate touch targets.

## 13. Acceptance criteria

The work is complete only when:
- 320px phone portrait has no horizontal page overflow.
- 360px and 390px phones have no HUD collisions.
- 430px phone portrait has readable map controls and forecast summary.
- 667px phone landscape keeps the map usable.
- 768px tablet portrait and 1024px tablet landscape have deliberate compositions.
- 1280px laptop has no overlapping header/side rails.
- 1440px desktop has balanced information density.
- 1920px and 2560px ultrawide do not stretch reading content or cards excessively.
- All five modes/pages use the same data contract.
- Provider outages show honest partial states.
- No fake zeros, generic weather statements, fabricated radar frames or synthetic AQI values.
- Loop playback visibly updates the selected map layer.
- All map layers expose source, timestamp and legend.
- Build, lint, tests and preview deployment have actual recorded results.

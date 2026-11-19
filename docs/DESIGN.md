# MAUSAM — Design System & Visual Specification

> **Document Version**: 3.0.0  
> **Aesthetic Archetype**: Editorial Atmospheric Intelligence  
> **Styling Framework**: Tailwind CSS v4 + `src/styles/mausam.css`  
> **Last Updated**: November 2026  

---

## 1. Design Philosophy: Editorial Atmospheric Intelligence

MAUSAM pairs the calm legibility of an archival scientific bulletin with calibrated meteorological instrumentation. Editorial reading surfaces default to **Warm Paper** (`#F7F6F1` canvas, `#FFFEFA` primary surfaces, `#14212B` deep ink typography), while full-screen spatial mapping, Doppler radar, and 3D atmospheric views enter an intentional **Dark Workspace** (`[data-theme="dark-workspace"]`) where dark cartography and radar reflectivity overlays require maximum luminance contrast.

### Core Visual Principles
1. **Paper-First Editorial Clarity**: Content-heavy modules (Overview, Local Weather, 7-Day Forecast, Warnings, Air Quality, Agromet, Cyclone Briefings, Reports, Open Data API, Documentation, Governance) default to Warm Paper for sunlight legibility and long-form reading comfort.
2. **Scoped Dark Spatial Workspaces**: Full-viewport 3D globe, Leaflet Doppler radar canvases, and national cartographic layers opt explicitly into `[data-theme="dark-workspace"]` (`#0D161E` / `#13202C`) so precipitation echoes, wind streams, and severity pins remain crisp.
3. **Truthful Meteorological States**: Every telemetry value must reflect its actual source state (`loading`, `available`, `stale`, `unavailable`, `error`, `not-applicable`) through `<MetricValue />`. Valid numeric `0` readings (`0°C`, `0 mm`, `0 AQI`) are always rendered with units and never converted into blanks or dashes.
4. **Restrained Authority**: Semantic color is reserved strictly for meteorological meaning (IMD/NDMA warning tiers, CPCB NAQI categories, radar reflectivity, active focus). Decorative neon glows, ungrounded gradients, and pill clutter are prohibited.

---

## 2. Color Palette & Semantic Design Tokens

All tokens are defined in `src/styles/mausam.css`.

### 2.1 Warm Paper Default (`:root`, `[data-theme="paper"]`)

| Token | Value | Role |
|---|---|---|
| `--m-canvas` | `#F7F6F1` | Primary warm paper page canvas |
| `--m-surface-1` | `#FFFEFA` | Elevated editorial cards & panels (`.m-panel`, `.mausam-surface`) |
| `--m-surface-2` | `#EFECE3` | Secondary controls, subtle badges, hover fills |
| `--m-surface-3` | `#E4E0D4` | Active pressed controls & hover states |
| `--m-surface-inset` | `#F3F1EA` | Nested metric tiles & inset callouts (`.m-panel-inset`) |
| `--m-text-primary` | `#14212B` | Deep ink headlines & primary readings |
| `--m-text-secondary` | `#394B59` | Body prose & secondary labels |
| `--m-text-muted` | `#5F707D` | Metadata, provenance captions, axis ticks |
| `--m-border` | `rgba(20, 33, 43, 0.14)` | 1px structural hairlines |
| `--m-border-strong` | `rgba(20, 33, 43, 0.28)` | Active borders & focused inputs |
| `--m-accent` | `#1E6091` | Atmospheric blue primary interactive accent |
| `--m-accent-hover` | `#164A72` | Accent button hover |
| `--m-accent-soft` | `rgba(30, 96, 145, 0.10)` | Soft selection highlight |

### 2.2 Scoped Dark Spatial Workspace (`[data-theme="dark-workspace"]`)

| Token | Value | Role |
|---|---|---|
| `--m-canvas` | `#0D161E` | Spatial globe / radar viewport backdrop |
| `--m-surface-1` | `#13202C` | Floating HUD & map dock panels |
| `--m-surface-2` | `#1A2B3B` | Secondary dock controls |
| `--m-surface-inset` | `#0E1924` | Inset telemetry readouts inside HUD |
| `--m-text-primary` | `#F2F5F8` | High-contrast spatial labels |
| `--m-text-secondary` | `#B8C5D0` | Secondary spatial annotations |
| `--m-text-muted` | `#8395A7` | Coordinate grids & subtle captions |
| `--m-accent` | `#4CC9F0` | Active spatial layer & focus indicator |

### 2.3 Semantic Status & IMD/NDMA Warning Tokens

| Level | Paper Hex | Dark Hex | Meaning |
|---|---|---|---|
| **Normal / OK (`--m-ok`)** | `#1F6F50` | `#2DD4BF` | Live / Normal atmospheric state |
| **Watch (`--m-watch`)** | `#A46408` | `#FBBF24` | Yellow Watch / Stale observation caution |
| **Alert (`--m-alert`)** | `#C2530A` | `#FB923C` | Orange Alert — Be Prepared |
| **Danger (`--m-danger`)** | `#B92B27` | `#F87171` | Red Warning / Upstream Error |

---

## 3. Typography & Hierarchy

### 3.1 Font Families
- **Editorial & Interface (`--font-sans`)**: `DM Sans`, `Inter`, system sans-serif
- **Scientific Telemetry (`--font-mono`)**: `JetBrains Mono`, `ui-monospace`, monospace with `font-variant-numeric: tabular-nums`

### 3.2 Fluid Scale & Reading Measure
- **Display Title (`.mausam-display-title`)**: `clamp(1.75rem, 3.2vw, 2.75rem)`, tight tracking (`-0.025em`), line-height `1.08`
- **Eyebrow Label (`.mausam-eyebrow`)**: `11px` uppercase monospace, letter-spacing `0.14em`
- **Long-Form Legal & Documentation Prose**: Constrained to `max-w-[66ch]` (`15px`, line-height `1.65`)
- **Tabular Telemetry**: Every temperature, wind speed, pressure, precipitation total, AQI index, and coordinate uses `font-mono tabular-nums`

---

## 4. Truthful Data State Contract (`MetricValue`)

Implemented in `src/components/common/MetricValue.tsx` and `src/types/dataProvenance.ts`.

| State | Visual Presentation | Provenance / Behavior |
|---|---|---|
| `loading` | Skeleton bar (`Fetching…`) | Non-layout-shifting animated placeholder |
| `available` | Exact reading + unit (preserves `0`) | Displays provider `source` and `observedAt` |
| `stale` | Exact reading + `Stale` badge | Shows last verified observation timestamp |
| `unavailable` | `Not reported by source` | Never substitutes fallback or ambient values |
| `error` | Concise error + `Retry` button | Surfaces provider failure honestly |
| `not-applicable` | `Not applicable` | Used when metric does not apply (e.g., tides inland) |

### Anti-Fabrication Rules
- Missing `apparent_temperature` stays `null` (never copied from ambient `temperature_2m`).
- Missing `weather_code` resolves to `UNKNOWN` (`Condition Unavailable`), never Clear Sky.
- Valid `0` values (`0°C`, `0 mm`, `0 AQI`, `lat=0, lon=0`) are strictly preserved.
- Provider `observedAt` / `validAt` timestamps are stored separately from client `fetchedAt`.
- Static reference benchmarks (e.g., regional AQI comparison tables) are explicitly badged `Static Reference Benchmark` rather than live telemetry.

---

## 5. Workspace Architecture

MAUSAM exposes three synchronized workspaces controlled from the shared `FloatingBrandBar`:

1. **Analyze (Default — Warm Paper)**: Multi-route editorial workstation covering Overview (`/`), Weather (`/weather`), Forecast (`/forecast`), Radar (`/radar`), Warnings (`/warnings`), Cyclone Tracker (`/cyclone-tracker`), Air Quality (`/aqi`), Agromet (`/agromet`), Reports (`/reports`), Open Data API (`/api`), Docs (`/docs`), Diagnostics (`/api-debug`), Privacy (`/privacy`), and Terms (`/terms`).
2. **Explore (Dark Spatial Workspace)**: Full-viewport 3D atmospheric globe / 2D interactive map canvas with `LayerDock`, `WeatherHUD`, and `ForecastTimeline`.
3. **Classic (Warm Paper — Low-GPU Linear Briefing)**: Lightweight accessible linear report designed for low-bandwidth, older hardware, and screen-reader-first navigation.

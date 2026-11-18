# MAUSAM Data Integrity Remediation

**Scope:** Open-Meteo-first weather integration, persona API contract, and fabricated-data audit  
**Branch:** `audit/mausam-full-site-reconstruction`  
**Status:** Partial remediation committed; deployment and runtime verification are still pending.

## Confirmed root cause

The persona client requested `/api/weather?mode=bundle` and treated `json.data` as a complete `PersonaDataBundle`. The Vercel weather gateway returned a different shape: top-level `current`, `forecast`, and `hourly`, with no `data` envelope. The frontend therefore rejected the payload. The Express-only `/api/authoritative/persona-bundle` router is mounted in `server.ts`, but that does not by itself make it a Vercel serverless function.

## Changes made on this branch

1. `src/services/authoritativeService.ts`
   - Persona fetch now validates the expected bundle contract instead of casting arbitrary JSON.
   - Network/schema failures return `null`; the client no longer manufactures a full persona bundle.
   - Starter saved destinations no longer contain hard-coded temperatures, conditions, AQI/tide claims, or alerts.

2. `src/components/weather/personas/PersonaWeatherHub.tsx`
   - Displays an explicit unavailable state and retry action when verified persona data is absent.
   - Does not show persona metric cards with fabricated values.

3. `api/weather.ts`
   - `mode=bundle` now returns an explicit `SCHEMA_MISMATCH` response instead of pretending its forecast object is a persona bundle.
   - Open-Meteo air-quality responses are labelled `MODELLED_LIVE`, not official CPCB observations.
   - Missing AQI and pollutant values remain null; fabricated pollutant defaults were removed.
   - Marine mode returns `NOT_CONFIGURED` rather than fabricated wave/tide measurements.

4. `src/services/weatherService.ts`
   - The old proxy path passed a normalized `/api/weather` envelope to a transformer expecting raw Open-Meteo JSON. The service now consumes the raw Open-Meteo forecast response directly.
   - Removed invalid `dew_point_2m` and `visibility` variables from the current-variable list (they are requested as hourly variables instead).
   - If the network fails and there is no cached observation, the service propagates the error rather than silently generating a synthetic live-looking bundle. A known cached observation may still be shown with `isLive: false`.

## Important remaining audit findings

The repository still contains legacy synthetic/default paths outside the changes above. In particular:

- `src/services/weatherService.ts` still contains a demo/test-data generator. It must remain explicitly test-only and must never be selected by production configuration.
- The same transformer contains legacy regional PM2.5 estimates, fallback pollutant values, estimated pollen baselines, and default astronomy/visibility values. These require a wider typed-model/UI migration to nullable fields and per-metric provenance before they can be safely removed without breaking existing cards.
- Other API gateways and UI modules may contain hard-coded example stations, radar frames, alert counts, marine/tide values, soil metrics, road-safety labels, or forecast defaults. They have not yet been exhaustively migrated in this commit.
- Open-Meteo forecast output is numerical-model guidance, not an official ground-station observation. Air-quality API values are modelled estimates; they must not be labelled CPCB live station readings.
- Marine/tide data, official IMD warnings, CPCB station observations, and Agromet advisories each require a verified provider/endpoint and their own source timestamp. A generic weather forecast is not a substitute.

## Required next implementation stages

1. Introduce a shared metric envelope: `value`, `unit`, `provider`, `dataStatus`, `observedAt`, `isOfficial`, and optional `reason`.
2. Make unavailable values nullable in shared TypeScript types and update every consumer to render “Unavailable” rather than a fabricated number.
3. Integrate and validate each source independently: Open-Meteo forecast, IMD bulletins/observations, CPCB station feed, RainViewer/IMD radar, and approved Agromet feeds.
4. Add schema validation for provider responses and tests for malformed payloads, timeouts, missing variables, stale cache, and unavailable providers.
5. Audit all route pages and visual components against `docs/DESIGN.md`; preserve the Meteoblue-inspired scientific hierarchy while keeping MAUSAM's existing workflows.
6. Run typecheck, production build, API contract tests, and browser smoke tests before deployment.

## Verification status

- GitHub source edits: committed on the feature branch.
- Static source inspection: performed for the files listed above.
- TypeScript check: not run in a repository runtime.
- Production build: not run.
- Live API smoke tests: not run.
- Vercel preview/production deployment: not performed.

Do not treat this branch as production-ready until all verification stages pass.

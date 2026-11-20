// ====================================================================
// MAUSAM Classic Workspace (Low-GPU Accessible Editorial Edition)
// Deliberate 1480px responsive linear briefing optimized for keyboard
// navigation, screen readers, slow networks, and zero WebGL overhead.
// ====================================================================

import React from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocatingPhase } from '../../services/geolocationService';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import { MainNavTab } from '../layout/MainNavigation';
import { MetricValue } from '../common/MetricValue';
import { getMetricStatus } from '../../types/dataProvenance';
import { useExperience } from '../../context/ExperienceContext';
import { useProvider } from '../../store/providerStore';
import { getAlertFeedAvailability } from '../../services/providers/providerStatus';
import { formatCoordinates } from '../../context/LocationContext';
import { formatLocationTitle } from '../../utils/locationFormatter';
import { ArrowUpRight, Globe, MapPin, Navigation } from 'lucide-react';

interface ClassicWorkspaceProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onNavigateToAnalyze: (tab: MainNavTab) => void;
  onSelectLocation: (loc: LocationRecord) => void;
  onStateSelect: (state: StateWeatherData) => void;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  isLocating: boolean;
  locatePhase: LocatingPhase;
  locationSource: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter: () => void;
}

interface DomainSectionItem {
  tab: MainNavTab;
  title: string;
  summary: string;
}

const DOMAIN_SECTION_GROUPS: Array<{
  heading: string;
  items: DomainSectionItem[];
}> = [
  {
    heading: 'Surface & Forecast Guidance',
    items: [
      {
        tab: 'weather',
        title: 'Local Weather Detail',
        summary: 'Full surface readings, solar ephemeris, and hourly chart.',
      },
      {
        tab: 'forecast',
        title: 'Forecast & NWP Guidance',
        summary: 'Multi-model numerical weather forecast curves and daily outlook.',
      },
      {
        tab: 'radar',
        title: 'Doppler Radar Network',
        summary: 'Precipitation mosaic and Indian Doppler radar coverage.',
      },
    ],
  },
  {
    heading: 'Hazards & Public Advisories',
    items: [
      {
        tab: 'warnings',
        title: 'Official Warnings',
        summary: 'SACHET / IMD hazard bulletins and state advisories.',
      },
      {
        tab: 'cyclone-tracker',
        title: 'Cyclone Basin Monitor',
        summary: 'North Indian Ocean tropical disturbance status and RSMC feeds.',
      },
      {
        tab: 'reports',
        title: 'Bulletins & Reports',
        summary: 'Meteorological publications and printable district briefings.',
      },
    ],
  },
  {
    heading: 'Environment & Agriculture',
    items: [
      {
        tab: 'aqi',
        title: 'Air Quality & Pollutants',
        summary: 'PM2.5, PM10, NO2, O3, and CPCB NAQI health breakdown.',
      },
      {
        tab: 'agromet',
        title: 'Agromet Advisories',
        summary: 'Soil moisture, evapotranspiration, and district crop guidance.',
      },
    ],
  },
];

function formatIstLocalTime(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return null;
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parsed) + ' IST'
  );
}

export const ClassicWorkspace: React.FC<ClassicWorkspaceProps> = ({
  weatherBundle,
  selectedLocation,
  onNavigateToAnalyze,
  onDetectLocation,
  isLocating,
  onOpenLocationCenter,
}) => {
  const { setMode, setRendererMode } = useExperience();
  const { state: sachetState } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);

  const cur = weatherBundle.current;
  const isLoading = cur.observationStatus === 'LOADING';
  const isStale = cur.observationStatus === 'STALE';
  const hasError = cur.observationStatus === 'UNAVAILABLE';
  const isModelData = cur.provenance?.isModelData ?? true;
  const isStationObservation = cur.provenance?.isStationObservation ?? false;

  const sourceLabel = cur.provenance?.provider
    ? `${cur.provenance.provider} (${isModelData ? 'Model Grid' : 'Station Observation'})`
    : cur.source || 'Open-Meteo (Model Grid)';

  const validAtIso = cur.provenance?.validAt ?? cur.validAt ?? null;
  const observedAtIso = cur.provenance?.observedAt ?? cur.observedAt ?? null;
  const fetchedAtIso =
    cur.provenance?.fetchedAt ??
    cur.fetchedAt ??
    (weatherBundle.lastFetchedAt ? weatherBundle.lastFetchedAt.toISOString() : null);

  const modelValidFormatted = formatIstLocalTime(validAtIso);
  const stationObservedFormatted = formatIstLocalTime(observedAtIso);
  const retrievedFormatted = formatIstLocalTime(fetchedAtIso);

  const locationTitle = formatLocationTitle(selectedLocation);
  const coordString = formatCoordinates(selectedLocation.lat, selectedLocation.lng);

  const metricOpts = { isLoading, isStale, hasError };
  const tempState = getMetricStatus(cur.temp, metricOpts);
  const activeAlerts = Array.isArray(weatherBundle.alerts) ? weatherBundle.alerts : [];

  const feedStatusText = isLoading
    ? 'Fetching latest model snapshot'
    : isStale
    ? 'Cached model snapshot'
    : hasError
    ? cur.error || 'Upstream feed unreachable'
    : isModelData
    ? 'Model grid active'
    : 'Station telemetry active';

  const feedStatusTone = isLoading
    ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/30'
    : isStale
    ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
    : hasError
    ? 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35'
    : 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/30';

  return (
    <div
      id="mausam-classic-workspace"
      className="min-h-screen w-full bg-[var(--m-canvas)] text-[var(--m-text-primary)]"
    >
      <div id="mausam-main-page-container" className="classic-page">
        {/* 1. Classic Editorial Intro Header (Full 1480px Frame, 68ch Prose Measure) */}
        <header className="classic-page__intro">
          <div className="classic-page__intro-copy">
            <p className="mausam-eyebrow">
              Classic Accessible Edition · Low-GPU Linear Briefing
            </p>
            <h1 className="classic-page__title">{locationTitle}</h1>
            <p className="classic-page__description">
              Reduced-motion, text-first atmospheric briefing for{' '}
              {selectedLocation.district || selectedLocation.city} ({coordString}).
              No WebGL canvas or heavy background animations loaded.
            </p>

            <div className="classic-page__meta data-provenance">
              <span>Source: {sourceLabel}</span>
              {isModelData ? (
                modelValidFormatted ? (
                  <time dateTime={validAtIso ?? undefined}>
                    Model valid: {modelValidFormatted}
                  </time>
                ) : (
                  <span>Valid time unavailable</span>
                )
              ) : isStationObservation && stationObservedFormatted ? (
                <time dateTime={observedAtIso ?? undefined}>
                  Observed: {stationObservedFormatted}
                </time>
              ) : (
                <span>Valid time unavailable</span>
              )}
              {retrievedFormatted && (
                <time dateTime={fetchedAtIso ?? undefined}>
                  Retrieved: {retrievedFormatted}
                </time>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLocationCenter}
              className="px-3.5 min-h-[40px] rounded-lg border border-[var(--m-border-strong)] bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-xs font-semibold text-[var(--m-text-primary)] inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>Change Location</span>
            </button>
            <button
              type="button"
              onClick={() => onDetectLocation(true)}
              disabled={isLocating}
              className="px-3.5 min-h-[40px] rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-xs font-semibold text-[var(--m-text-primary)] inline-flex items-center gap-1.5 cursor-pointer m-focus-ring disabled:opacity-60 whitespace-nowrap"
            >
              <Navigation
                className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isLocating ? 'animate-spin' : ''}`}
              />
              <span>{isLocating ? 'Locating…' : 'Use GPS'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRendererMode('3d');
                setMode('explore');
              }}
              className="px-3.5 min-h-[40px] rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-xs font-semibold text-[var(--m-text-primary)] inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>3D Explore</span>
            </button>
          </div>
        </header>

        {/* 2. Primary Conditions Split: Dominant Temperature + Secondary Grid | Hazard Posture */}
        <div className="classic-page__conditions">
          <section
            aria-labelledby="classic-current-heading"
            className="classic-current"
          >
            <div className="classic-current__heading">
              <div>
                <p className="mausam-eyebrow">Current surface conditions</p>
                <h2
                  id="classic-current-heading"
                  className="text-xl font-bold tracking-tight text-[var(--m-text-primary)] mt-0.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Atmospheric Snapshot
                </h2>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold ${feedStatusTone}`}
              >
                {feedStatusText}
              </span>
            </div>

            <div className="classic-current__layout">
              {/* Primary Metric: Air Temperature */}
              <article className="classic-current__temperature">
                <div>
                  <span className="mausam-eyebrow block">Air Temperature</span>
                  <div className="mt-3">
                    {tempState === 'loading' ? (
                      <span className="metric-value__skeleton h-12 w-28" aria-label="Fetching latest reading" />
                    ) : tempState === 'error' ? (
                      <span className="text-base font-semibold text-[var(--m-danger)]">
                        Unable to load reading
                      </span>
                    ) : cur.temp === null || cur.temp === undefined || !Number.isFinite(cur.temp) ? (
                      <span className="text-base font-semibold text-[var(--m-text-muted)]">
                        Not reported by source
                      </span>
                    ) : (
                      <div className="classic-current__temp-reading">
                        {cur.temp.toFixed(1)}
                        <span className="text-[0.52em] font-medium text-[var(--m-text-muted)] ml-0.5">
                          °C
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[var(--m-text-secondary)] mt-2">
                    {cur.condition || 'Condition unavailable'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--m-border)] text-[11px] font-mono text-[var(--m-text-muted)] space-y-1">
                  {typeof cur.high === 'number' && typeof cur.low === 'number' && (
                    <div className="tabular-nums text-[var(--m-text-secondary)] font-medium">
                      Day range: {cur.high}°C / {cur.low}°C
                    </div>
                  )}
                  <div>
                    {isModelData
                      ? modelValidFormatted
                        ? `Model valid: ${modelValidFormatted}`
                        : 'Valid time unavailable'
                      : stationObservedFormatted
                      ? `Observed: ${stationObservedFormatted}`
                      : 'Observation time unavailable'}
                  </div>
                </div>
              </article>

              {/* Secondary Structured Metrics */}
              <div className="classic-current__metric-grid">
                <div className="classic-current__metric">
                  <MetricValue
                    label="Feels Like"
                    value={cur.feelsLike}
                    unit="°C"
                    decimals={1}
                    size="md"
                    state={getMetricStatus(cur.feelsLike, metricOpts)}
                    unavailableReason="Not reported by source"
                    source={sourceLabel}
                  />
                </div>
                <div className="classic-current__metric">
                  <MetricValue
                    label="Relative Humidity"
                    value={cur.humidity}
                    unit="%"
                    size="md"
                    state={getMetricStatus(cur.humidity, metricOpts)}
                    source={sourceLabel}
                  />
                </div>
                <div className="classic-current__metric">
                  <MetricValue
                    label="10m Wind Speed"
                    value={cur.windSpeed}
                    unit="km/h"
                    size="md"
                    state={getMetricStatus(cur.windSpeed, metricOpts)}
                    source={
                      cur.windDirection && cur.windDirection !== '—'
                        ? cur.windDirection
                        : sourceLabel
                    }
                  />
                </div>
                <div className="classic-current__metric">
                  <MetricValue
                    label="Sea-Level Pressure"
                    value={cur.pressure}
                    unit="hPa"
                    decimals={1}
                    size="md"
                    state={getMetricStatus(cur.pressure, metricOpts)}
                    source={sourceLabel}
                  />
                </div>
                <div className="classic-current__metric">
                  <MetricValue
                    label="Precipitation (1h)"
                    value={cur.precipitation}
                    unit="mm"
                    decimals={1}
                    size="md"
                    state={getMetricStatus(cur.precipitation, metricOpts)}
                    source={sourceLabel}
                  />
                </div>
                <div className="classic-current__metric">
                  <MetricValue
                    label="Surface Visibility"
                    value={cur.visibilityKm}
                    unit="km"
                    decimals={1}
                    size="md"
                    state={getMetricStatus(cur.visibilityKm, metricOpts)}
                    unavailableReason="Not reported by source"
                    source={sourceLabel}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right Companion Panel: Truthful Official Hazard Posture */}
          <aside
            aria-labelledby="classic-alerts-heading"
            className="flex flex-col gap-4"
          >
            <div className="classic-current__heading">
              <div>
                <p className="mausam-eyebrow">SACHET / IMD CAP Feed</p>
                <h2
                  id="classic-alerts-heading"
                  className="text-xl font-bold tracking-tight text-[var(--m-text-primary)] mt-0.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Official Hazard Posture
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToAnalyze('warnings')}
                className="text-xs font-semibold text-[var(--m-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer m-focus-ring rounded"
              >
                <span>Warnings Console</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="m-panel p-5 flex-1 flex flex-col justify-between gap-4">
              {sachetAvailability === 'UNAVAILABLE' ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--m-watch)]">
                    Feed Unavailable
                  </p>
                  <p className="text-sm text-[var(--m-text-primary)] leading-relaxed">
                    SACHET / IMD official CAP alert feed could not be reached right now. Absence of alerts cannot be confirmed until the feed reconnects.
                  </p>
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--m-ok)]">
                    Verified Feed · 0 Active Alerts
                  </p>
                  <p className="text-sm text-[var(--m-text-secondary)] leading-relaxed">
                    No active severe weather alerts reported by SACHET/IMD for{' '}
                    <strong className="text-[var(--m-text-primary)]">{selectedLocation.state}</strong>
                    {retrievedFormatted ? (
                      <>
                        {' '}as of{' '}
                        <time
                          dateTime={fetchedAtIso ?? undefined}
                          className="font-mono text-[var(--m-text-primary)]"
                        >
                          {retrievedFormatted}
                        </time>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--m-border)]">
                  {activeAlerts.slice(0, 4).map((alert) => (
                    <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--m-text-primary)]">
                          {alert.title}
                        </span>
                        <span className="text-[11px] font-mono uppercase font-semibold text-[var(--m-danger)]">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--m-text-secondary)] mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-3 border-t border-[var(--m-border)] flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--m-text-muted)]">
                <span>Region: {selectedLocation.state || 'India'}</span>
                <button
                  type="button"
                  onClick={() => onNavigateToAnalyze('warnings')}
                  className="text-[var(--m-accent)] font-semibold hover:underline cursor-pointer"
                >
                  Inspect district bulletins
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* 3. Full-Width Linear 7-Day Forecast Table */}
        <section
          aria-labelledby="classic-daily-heading"
          className="mt-10 pt-8 border-t border-[var(--m-border)]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <div>
              <p className="mausam-eyebrow">Numerical Weather Guidance</p>
              <h2
                id="classic-daily-heading"
                className="text-xl font-bold tracking-tight text-[var(--m-text-primary)] mt-0.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                7-Day Model Outlook
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToAnalyze('forecast')}
              className="text-xs font-semibold text-[var(--m-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer m-focus-ring rounded"
            >
              <span>Full Forecast &amp; NWP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {weatherBundle.daily.length === 0 ? (
            <div className="m-panel-inset p-4 text-xs text-[var(--m-text-muted)]">
              {isLoading
                ? 'Fetching latest 7-day model outlook…'
                : 'Daily outlook not reported by source.'}
            </div>
          ) : (
            <div className="mausam-table-wrapper">
              <table className="mausam-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Condition</th>
                    <th>High / Low</th>
                    <th>Rain Chance</th>
                    <th>Precipitation</th>
                    <th>Wind</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherBundle.daily.map((d, idx) => (
                    <tr key={`${d.day}-${idx}`}>
                      <td className="font-semibold">
                        {d.day}{' '}
                        <span className="text-[var(--m-text-muted)] font-normal ml-1">
                          {d.date}
                        </span>
                      </td>
                      <td>{d.condition}</td>
                      <td className="font-mono tabular-nums">
                        {d.high}°C / {d.low}°C
                      </td>
                      <td className="font-mono tabular-nums">
                        {d.rainProb !== null && d.rainProb !== undefined
                          ? `${d.rainProb}%`
                          : 'Not reported'}
                      </td>
                      <td className="font-mono tabular-nums">
                        {d.precipMm !== null && d.precipMm !== undefined
                          ? `${d.precipMm.toFixed(1)} mm`
                          : 'Not reported'}
                      </td>
                      <td className="font-mono tabular-nums">
                        {d.wind && d.wind !== '—' ? d.wind : 'Not reported'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 4. Grouped Editorial Meteorological Directory (3 Columns on Desktop) */}
        <section
          aria-labelledby="classic-directory-heading"
          className="classic-page__sections"
        >
          <div className="mb-6">
            <p className="mausam-eyebrow">Direct Domain Index</p>
            <h2
              id="classic-directory-heading"
              className="text-xl font-bold tracking-tight text-[var(--m-text-primary)] mt-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Meteorological Sections
            </h2>
          </div>

          <div className="classic-page__section-groups">
            {DOMAIN_SECTION_GROUPS.map((group) => (
              <div key={group.heading} className="classic-page__section-group">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--m-text-muted)] pb-2 border-b border-[var(--m-border)]">
                  {group.heading}
                </h3>
                {group.items.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => onNavigateToAnalyze(item.tab)}
                    className="classic-page__section-link"
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <span className="text-sm font-bold text-[var(--m-text-primary)]">
                        {item.title}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed m-0">
                      {item.summary}
                    </p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

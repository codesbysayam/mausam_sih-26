// ====================================================================
// MAUSAM Floating Weather Conditions & Spatial Inspector HUD
// Compact, collapsible overlay over the 3D Atmospheric Observatory
// displaying honest, provenance-tagged metrics (Observed vs Model Valid),
// deduplicated location titles, active warning status, and Analyze jumps.
// ====================================================================

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MapPin,
  ArrowUpRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import { MainNavTab } from '../layout/MainNavigation';
import { useExperience } from '../../context/ExperienceContext';
import { locationService } from '../../services/locationService';
import { formatCoordinatePair } from '../../../shared/weatherContract';
import { calculateSolarAstronomicalData } from '../../utils/astronomyCalculator';
import { formatLocationShort, formatLocationTitle } from '../../utils/locationFormatter';

interface WeatherHUDProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
  onSelectLocation: (loc: LocationRecord) => void;
  onInspectInAnalyze: (tab: MainNavTab) => void;
  onOpenAskMausam: () => void;
}

export const WeatherHUD: React.FC<WeatherHUDProps> = ({
  selectedLocation,
  weatherBundle,
  onSelectLocation,
  onInspectInAnalyze,
  onOpenAskMausam,
}) => {
  const {
    activeLayer,
    timelineIndex,
    inspectedFeature,
    setInspectedFeature,
    flyCameraTo,
  } = useExperience();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const current = weatherBundle.current;
  const activeHour = weatherBundle.hourly?.[timelineIndex];
  const displayTemp =
    timelineIndex > 0 && typeof activeHour?.temp === 'number' && Number.isFinite(activeHour.temp)
      ? activeHour.temp
      : typeof current.temp === 'number' && Number.isFinite(current.temp)
      ? current.temp
      : null;

  const hasValidTemp = displayTemp !== null;

  const rawCond =
    timelineIndex > 0 && activeHour?.condition ? activeHour.condition : current.condition;
  const displayCond =
    hasValidTemp && rawCond && rawCond !== '—'
      ? rawCond
      : current.observationStatus === 'LOADING'
      ? 'Syncing feed…'
      : 'Not reported';

  const displayWind =
    timelineIndex > 0 &&
    typeof activeHour?.windSpeed === 'number' &&
    Number.isFinite(activeHour.windSpeed)
      ? activeHour.windSpeed
      : typeof current.windSpeed === 'number' && Number.isFinite(current.windSpeed)
      ? current.windSpeed
      : null;
  const displayWindDir =
    timelineIndex > 0 && activeHour?.windDirection
      ? activeHour.windDirection
      : current.windDirection;
  const displayHumidity =
    timelineIndex > 0 &&
    typeof activeHour?.humidity === 'number' &&
    Number.isFinite(activeHour.humidity)
      ? activeHour.humidity
      : typeof current.humidity === 'number' && Number.isFinite(current.humidity)
      ? current.humidity
      : null;
  const displayRainProb =
    timelineIndex > 0 &&
    typeof activeHour?.rainProb === 'number' &&
    Number.isFinite(activeHour.rainProb)
      ? activeHour.rainProb
      : typeof current.precipitationProbability === 'number' &&
        Number.isFinite(current.precipitationProbability)
      ? current.precipitationProbability
      : null;

  const isStationObserved = current.dataSource === 'IMD';

  const obsStatus =
    current.observationStatus === 'LOADING'
      ? 'LOADING'
      : !hasValidTemp
      ? 'UNAVAILABLE'
      : isStationObserved
      ? 'OBSERVED'
      : current.observationStatus === 'STALE'
      ? 'STALE'
      : 'MODEL GRID';

  const statusColorClass =
    obsStatus === 'OBSERVED'
      ? 'text-[var(--m-ok)]'
      : obsStatus === 'MODEL GRID'
      ? 'text-[var(--m-accent)]'
      : obsStatus === 'LOADING' || obsStatus === 'STALE'
      ? 'text-[var(--m-watch)]'
      : 'text-[var(--m-danger)]';

  // Explicit truthful time terminology: never call Open-Meteo Model Grid "Observed"
  const timestampLine =
    timelineIndex > 0 && activeHour
      ? `Model forecast · ${activeHour.time}`
      : hasValidTemp && current.lastUpdated
      ? isStationObserved
        ? `Observed: ${current.lastUpdated}`
        : `Model valid: ${current.lastUpdated}`
      : 'Awaiting verified feed';

  const activeAlertsCount = Array.isArray(weatherBundle.alerts) ? weatherBundle.alerts.length : 0;

  const elevationMeters =
    typeof (selectedLocation as any)?.elevation === 'number' &&
    Number.isFinite((selectedLocation as any).elevation)
      ? Math.round((selectedLocation as any).elevation)
      : null;

  const solarEphemeris = calculateSolarAstronomicalData(
    selectedLocation.lat,
    selectedLocation.lng
  );

  const locationFullTitle = formatLocationTitle(selectedLocation);
  const locationShortTitle = formatLocationShort(selectedLocation);

  const targetAnalyzeTab: MainNavTab =
    activeLayer === 'radar'
      ? 'radar'
      : activeLayer === 'aqi'
      ? 'aqi'
      : activeLayer === 'warnings'
      ? 'warnings'
      : activeLayer === 'cyclones'
      ? 'cyclone-tracker'
      : activeLayer === 'agromet'
      ? 'agromet'
      : 'weather';

  const handleAnchorInspectedState = () => {
    if (!inspectedFeature?.stateName) return;
    const matched =
      locationService.findLocationByName(inspectedFeature.title) ||
      locationService.findLocationsByState(inspectedFeature.stateName)[0];
    if (matched) {
      onSelectLocation(matched);
      flyCameraTo(matched.lat, matched.lng, 2.95);
    }
  };

  return (
    <>
      {/* Desktop Right-Edge Collapsible HUD (positioned dynamically below wrapped header) */}
      <aside
        aria-label="Current Location Atmospheric HUD"
        className="explore-weather-hud hidden lg:flex fixed right-3 top-[68px] z-30 flex-col items-end gap-2 pointer-events-none"
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="pointer-events-auto spatial-hud-surface rounded-[11px] px-3 min-h-[40px] flex items-center gap-2 text-xs text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] cursor-pointer m-focus-ring"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span className="font-mono font-semibold tabular-nums">
              {hasValidTemp ? `${Math.round(displayTemp as number)}°C` : 'Unavailable'}
            </span>
            <span className="text-[var(--m-text-muted)] truncate max-w-[130px]">
              {locationShortTitle}
            </span>
          </button>
        ) : (
          <div className="explore-weather-hud-card pointer-events-auto spatial-hud-surface rounded-[11px] p-3.5 flex flex-col gap-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--m-accent)] font-medium">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedLocation.state}</span>
                </div>
                <h2
                  className="explore-weather-hud-title text-[15px] font-bold text-[var(--m-text-primary)] leading-snug mt-0.5"
                  title={locationFullTitle}
                >
                  {locationFullTitle}
                </h2>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums mt-0.5">
                  {formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}
                  {elevationMeters !== null ? ` · ${elevationMeters}m ASL` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse weather HUD"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer shrink-0 m-focus-ring"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Active Official Warning Banner inside HUD when warnings exist */}
            {activeAlertsCount > 0 && (
              <button
                type="button"
                onClick={() => onInspectInAnalyze('warnings')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[var(--m-alert-soft)] border border-[var(--m-alert)]/40 text-[11px] font-semibold text-[var(--m-alert)] flex items-center justify-between gap-2 hover:border-[var(--m-alert)] cursor-pointer m-focus-ring"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {activeAlertsCount} Active Official Warning{activeAlertsCount > 1 ? 's' : ''}
                  </span>
                </span>
                <span className="font-mono text-[10px] shrink-0">View →</span>
              </button>
            )}

            {/* Primary Temperature & Condition */}
            <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-[var(--m-border)]">
              <div
                className="text-3xl font-bold text-[var(--m-text-primary)] tabular-nums tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {hasValidTemp ? `${Math.round(displayTemp as number)}°C` : 'Unavailable'}
              </div>
              <div className="text-right min-w-0">
                <div className="text-xs font-medium text-[var(--m-text-secondary)] truncate">
                  {displayCond}
                </div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums truncate">
                  {timestampLine}
                </div>
              </div>
            </div>

            {/* Compact 4-Metric Matrix */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider">
                  Wind (10m)
                </div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {displayWind !== null
                    ? `${Math.round(displayWind)} km/h ${
                        displayWindDir && displayWindDir !== '—' ? displayWindDir : ''
                      }`.trim()
                    : 'Not reported'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider">
                  Rain Prob
                </div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {displayRainProb !== null ? `${Math.round(displayRainProb)}%` : 'Not reported'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider">
                  Humidity
                </div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {displayHumidity !== null ? `${Math.round(displayHumidity)}%` : 'Not reported'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider">
                  AQI (US EPA)
                </div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {typeof current.aqiIndex === 'number' && Number.isFinite(current.aqiIndex)
                    ? current.aqiIndex
                    : typeof current.aqi === 'number' && Number.isFinite(current.aqi)
                    ? current.aqi
                    : 'Not reported'}
                </div>
              </div>
            </div>

            {/* Compact Astronomical Ephemeris Row: Sunrise · Zenith · Sunset */}
            <div className="pt-2 border-t border-[var(--m-border)] grid grid-cols-3 gap-1 text-[10px] font-mono tabular-nums">
              <div>
                <span className="text-[var(--m-text-muted)] block uppercase">Sunrise</span>
                <strong className="text-[var(--m-text-primary)]">{solarEphemeris.sunriseStr}</strong>
              </div>
              <div className="text-center">
                <span className="text-[var(--m-watch)] block uppercase">Zenith</span>
                <strong className="text-[var(--m-text-primary)]">
                  {solarEphemeris.solarNoonStr}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[var(--m-text-muted)] block uppercase">Sunset</span>
                <strong className="text-[var(--m-text-primary)]">{solarEphemeris.sunsetStr}</strong>
              </div>
            </div>

            {/* Provenance line */}
            <div className="text-[10px] text-[var(--m-text-muted)] leading-snug pt-2 border-t border-[var(--m-border)] flex items-center justify-between gap-2">
              <span className="truncate">
                {current.dataSource || current.source || 'Open-Meteo Model Grid'}
              </span>
              <span className={`font-mono shrink-0 font-semibold ${statusColorClass}`}>
                {obsStatus}
              </span>
            </div>

            {/* Quick Bridge Actions */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onInspectInAnalyze(targetAnalyzeTab)}
                  className="flex-1 min-h-[38px] px-3 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/45 text-xs font-semibold text-[var(--m-accent)] hover:bg-[var(--m-accent)]/20 flex items-center justify-center gap-1 transition-colors cursor-pointer m-focus-ring"
                >
                  <span>Open Analyze</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenAskMausam}
                  className="min-h-[38px] px-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
                >
                  Brief
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onInspectInAnalyze('forecast')}
                  className="min-h-[32px] px-2 rounded-lg bg-[var(--m-surface-inset)]/70 border border-[var(--m-border)] text-[11px] font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
                >
                  Forecast &amp; NWP
                </button>
                <button
                  type="button"
                  onClick={() => onInspectInAnalyze('warnings')}
                  className="min-h-[32px] px-2 rounded-lg bg-[var(--m-surface-inset)]/70 border border-[var(--m-border)] text-[11px] font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
                >
                  Warnings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Spatial Feature Inspector Card (Appears when user clicks any State or DWR marker) */}
        {inspectedFeature && (
          <div className="explore-weather-hud-card pointer-events-auto spatial-hud-surface-elevated rounded-[11px] p-3.5 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--m-accent)]">
                  {inspectedFeature.kind === 'radar' ? 'Doppler Radar Station' : 'Regional Beacon'}
                </span>
                <h3 className="text-sm font-bold text-[var(--m-text-primary)] truncate">
                  {inspectedFeature.title}
                </h3>
                <div className="text-[11px] text-[var(--m-text-secondary)] truncate">
                  {inspectedFeature.subtitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFeature(null)}
                aria-label="Close spatial feature inspector"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer shrink-0 m-focus-ring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {inspectedFeature.metrics.slice(0, 4).map((m) => (
                <div
                  key={m.label}
                  className="bg-[var(--m-surface-inset)] rounded-lg px-2 py-1.5 border border-[var(--m-border)]"
                >
                  <div className="text-[10px] text-[var(--m-text-muted)]">{m.label}</div>
                  <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums truncate">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {inspectedFeature.warningMessage && (
              <p className="text-[11px] text-[var(--m-text-secondary)] leading-snug">
                {inspectedFeature.warningMessage}
              </p>
            )}

            {inspectedFeature.source && (
              <div className="text-[10px] font-mono text-[var(--m-text-muted)]">
                Source: {inspectedFeature.source}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {inspectedFeature.kind === 'state' && inspectedFeature.stateName && (
                <button
                  type="button"
                  onClick={handleAnchorInspectedState}
                  className="flex-1 min-h-[36px] px-2.5 rounded-[7px] bg-[var(--m-accent)] text-[var(--m-on-accent)] text-xs font-semibold hover:opacity-95 cursor-pointer m-focus-ring"
                >
                  Anchor Location
                </button>
              )}
              {inspectedFeature.kind === 'radar' && (
                <button
                  type="button"
                  onClick={() => onInspectInAnalyze('radar')}
                  className="flex-1 min-h-[36px] px-2.5 rounded-[7px] bg-[var(--m-accent)] text-[var(--m-on-accent)] text-xs font-semibold hover:opacity-95 cursor-pointer m-focus-ring"
                >
                  Radar Scope →
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Tablet & Mobile Viewport: Compact Floating Summary + Expandable Bottom Sheet */}
      <div className="explore-weather-mobile lg:hidden fixed left-2.5 right-2.5 bottom-[96px] z-30 pointer-events-none flex flex-col gap-2">
        <div className="pointer-events-auto spatial-hud-surface rounded-[11px] px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-lg font-bold text-[var(--m-text-primary)] tabular-nums shrink-0"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {hasValidTemp ? `${Math.round(displayTemp as number)}°C` : '—'}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--m-text-primary)] truncate" title={locationFullTitle}>
                {inspectedFeature ? inspectedFeature.title : locationShortTitle}
              </div>
              <div className="text-[10px] text-[var(--m-text-secondary)] truncate tabular-nums">
                {displayCond} · Wind {displayWind !== null ? `${Math.round(displayWind)} km/h` : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onInspectInAnalyze(targetAnalyzeTab)}
              className="px-3 min-h-[42px] rounded-[7px] bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/45 text-xs font-semibold text-[var(--m-accent)] cursor-pointer m-focus-ring"
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen((v) => !v)}
              aria-expanded={isMobileSheetOpen}
              aria-label="Toggle weather details sheet"
              className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-secondary)] cursor-pointer m-focus-ring"
            >
              {isMobileSheetOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isMobileSheetOpen && (
          <div className="explore-weather-mobile-sheet pointer-events-auto spatial-hud-surface-elevated rounded-[11px] p-3 flex flex-col gap-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-[var(--m-text-muted)]">Humidity</div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {displayHumidity !== null ? `${Math.round(displayHumidity)}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--m-text-muted)]">Rain Prob</div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {displayRainProb !== null ? `${Math.round(displayRainProb)}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--m-text-muted)]">AQI</div>
                <div className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                  {typeof current.aqiIndex === 'number'
                    ? current.aqiIndex
                    : typeof current.aqi === 'number'
                    ? current.aqi
                    : '—'}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[var(--m-text-muted)] pt-1.5 border-t border-[var(--m-border)] flex items-center justify-between gap-2">
              <span className="truncate">{timestampLine}</span>
              <span className={statusColorClass}>{obsStatus}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

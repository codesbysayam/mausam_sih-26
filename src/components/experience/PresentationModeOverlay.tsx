// ====================================================================
// MAUSAM - Projector Presentation Mode & Smart TV Briefing Board
// Dedicated high-contrast, distance-legible atmospheric briefing layout
// for 720p, 1080p, 1440p & 4K projectors and Smart TVs.
// Works independently of Browser Fullscreen API (fullscreen is optional).
// Preserves 100% real telemetry integrity (zero fabricated values).
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  Presentation,
  Tv,
  X,
  Maximize2,
  Minimize2,
  Wind,
  Droplets,
  Gauge,
  Activity,
  AlertTriangle,
  Map as MapIcon,
  Sun,
  Moon,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useExperience } from '../../context/ExperienceContext';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocationRecord, WeatherAlert } from '../../types';

interface PresentationModeOverlayProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  activeAlerts: WeatherAlert[];
  onRefresh: () => void;
  onOpenMapView: () => void;
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Unavailable';
  }
  return `${Math.round(value)}${unit}`;
}

export const PresentationModeOverlay: React.FC<PresentationModeOverlayProps> = ({
  weatherBundle,
  selectedLocation,
  activeAlerts,
  onRefresh,
  onOpenMapView,
}) => {
  const {
    displayProfile,
    setDisplayProfile,
    surfaceTheme,
    setSurfaceTheme,
    isPresentationMode,
    isTvMode,
  } = useExperience();

  // Allows collapsing the briefing board to inspect the live interactive map in projector/TV mode
  const [boardCollapsedToMap, setBoardCollapsedToMap] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [liveClockIst, setLiveClockIst] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        setLiveClockIst(`${formatted} IST`);
      } catch {
        setLiveClockIst(new Date().toTimeString().slice(0, 8));
      }
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Reset to briefing board whenever entering projector mode freshly
  useEffect(() => {
    if (isPresentationMode) {
      setBoardCollapsedToMap(false);
    }
  }, [isPresentationMode]);

  if (!isPresentationMode && !isTvMode) {
    return null;
  }

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen API may be restricted in embedded iframes; presentation layout works regardless
    }
  };

  // In Smart TV mode (or when Projector user switches to live map view), show a clean floating status/mode strip
  if (isTvMode || boardCollapsedToMap) {
    return (
      <div
        id="large-screen-mode-bar"
        className="fixed bottom-4 right-4 z-[65] flex flex-wrap items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--m-surface-1)]/96 border-2 border-[var(--m-accent)]/60 shadow-2xl backdrop-blur-md max-w-[calc(100vw-24px)]"
        role="region"
        aria-label="Large Screen Mode Controls"
      >
        <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-accent)] px-1.5">
          {isTvMode ? <Tv className="w-4 h-4" /> : <Presentation className="w-4 h-4" />}
          {isTvMode ? 'Smart TV Remote Mode' : 'Projector Map View'}
        </span>

        {isPresentationMode && (
          <button
            type="button"
            data-tv-focusable="true"
            onClick={() => setBoardCollapsedToMap(false)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[var(--m-accent)] text-[#111314] text-xs font-bold cursor-pointer m-focus-ring whitespace-nowrap"
          >
            Open Briefing Board
          </button>
        )}

        {isTvMode && (
          <button
            type="button"
            data-tv-focusable="true"
            onClick={() => setDisplayProfile('projector')}
            className="min-h-[44px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[var(--m-text-primary)] text-xs font-bold cursor-pointer m-focus-ring whitespace-nowrap"
          >
            Briefing Board
          </button>
        )}

        <button
          type="button"
          data-tv-focusable="true"
          onClick={() => setDisplayProfile('standard')}
          className="min-h-[44px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[var(--m-text-primary)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          Exit {displayProfile === 'tv' ? 'TV' : 'Projector'}
        </button>
      </div>
    );
  }

  const current = weatherBundle?.current;
  const hourly = Array.isArray(weatherBundle?.hourly) ? weatherBundle.hourly.slice(0, 6) : [];
  const daily = Array.isArray(weatherBundle?.daily) ? weatherBundle.daily.slice(0, 5) : [];
  const aqiVal = current?.aqiIndex ?? current?.aqi;
  const topAlerts = activeAlerts.slice(0, 3);

  return (
    <div
      id="projector-presentation-board"
      role="region"
      aria-label="MAUSAM Projector Presentation Mode"
      className="fixed inset-0 z-[65] bg-[var(--m-canvas)] text-[var(--m-text-primary)] overflow-y-auto flex flex-col tv-safe-frame"
    >
      {/* Top Presentation Header — High-Contrast, Single Row, Zero Clutter */}
      <header className="w-full border-b-2 border-[var(--m-border)] bg-[var(--m-surface-inset)] px-[var(--page-gutter)] py-4 shrink-0">
        <div className="page-container-wide flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="px-3 py-1.5 rounded-lg bg-[var(--m-accent)] text-[#111314] font-display font-extrabold tracking-tight text-lg shrink-0">
              MAUSAM
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-lg md:text-2xl font-bold truncate">
                <MapPin className="w-5 h-5 text-[var(--m-accent)] shrink-0" />
                <span className="truncate">
                  {selectedLocation.displayName || selectedLocation.name}
                </span>
              </div>
              <div className="text-xs md:text-sm font-mono text-[var(--m-text-secondary)] flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{selectedLocation.state}</span>
                <span>
                  {selectedLocation.lat.toFixed(2)}°N, {selectedLocation.lng.toFixed(2)}°E
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--m-text-primary)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  {liveClockIst}
                </span>
              </div>
            </div>
          </div>

          {/* Essential Presentation Controls Only */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => {
                setBoardCollapsedToMap(true);
                onOpenMapView();
              }}
              className="min-h-[48px] px-4 rounded-xl bg-[var(--m-accent)] text-[#111314] text-sm font-bold inline-flex items-center gap-2 cursor-pointer m-focus-ring whitespace-nowrap"
            >
              <MapIcon className="w-4 h-4" />
              Live Weather Map
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={onRefresh}
              className="min-h-[48px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer m-focus-ring whitespace-nowrap"
              aria-label="Refresh weather data"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => setSurfaceTheme(surfaceTheme === 'dark' ? 'paper' : 'dark')}
              className="min-h-[48px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer m-focus-ring whitespace-nowrap"
              aria-label="Toggle high-contrast light or dark theme"
            >
              {surfaceTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {surfaceTheme === 'dark' ? 'Light Board' : 'Dark Board'}
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={toggleBrowserFullscreen}
              className="min-h-[48px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer m-focus-ring whitespace-nowrap"
              aria-label={isBrowserFullscreen ? 'Exit fullscreen' : 'Enter browser fullscreen'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isBrowserFullscreen ? 'Windowed' : 'Fullscreen'}
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => setDisplayProfile('tv')}
              className="min-h-[48px] px-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer m-focus-ring whitespace-nowrap"
            >
              <Tv className="w-4 h-4" />
              TV Mode
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => setDisplayProfile('standard')}
              className="min-h-[48px] px-4 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/50 text-[var(--m-danger)] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Exit Presentation
            </button>
          </div>
        </div>
      </header>

      {/* Main High-Contrast Presentation Grid */}
      <main className="flex-1 w-full px-[var(--page-gutter)] py-6">
        <div className="page-container-wide flex flex-col gap-6">
          {/* Active Hazard Banner (if verified alerts exist) */}
          {topAlerts.length > 0 && (
            <section
              aria-label="Active Meteorological Warnings"
              className="rounded-2xl border-2 border-[var(--m-danger)] bg-[var(--m-danger-soft)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <AlertTriangle className="w-7 h-7 text-[var(--m-danger)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-[0.14em] font-bold text-[var(--m-danger)]">
                    Active Official Warnings ({activeAlerts.length})
                  </div>
                  <div className="text-lg md:text-xl font-bold text-[var(--m-text-primary)] mt-0.5">
                    {topAlerts[0].title || 'Active Meteorological Advisory'}
                  </div>
                  {topAlerts[0].description && (
                    <p className="text-sm md:text-base text-[var(--m-text-secondary)] mt-1 line-clamp-2 max-w-[80ch]">
                      {topAlerts[0].description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-xs md:text-sm font-mono font-semibold text-[var(--m-text-primary)] shrink-0">
                Agency: {topAlerts[0].agency || 'IMD / NDMA SACHET'}
              </div>
            </section>
          )}

          {/* Row 1: Hero Temperature + Key Atmospheric Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Primary Conditions Card */}
            <section
              aria-label="Current Atmospheric Conditions"
              className="lg:col-span-5 rounded-2xl border-2 border-[var(--m-border-strong)] bg-[var(--m-surface-1)] p-6 md:p-8 flex flex-col justify-between gap-6"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.16em] text-[var(--m-accent)] font-bold">
                  Current Observation
                </div>
                <div className="mt-3 flex items-baseline gap-4 flex-wrap">
                  <span
                    className="font-mono tabular-nums font-extrabold tracking-tight leading-none"
                    style={{ fontSize: 'clamp(3.2rem, 6.2vw, 6.5rem)' }}
                  >
                    {formatMetric(current?.temp, '°C')}
                  </span>
                  <div className="space-y-1">
                    <div className="text-xl md:text-3xl font-bold">
                      {current?.condition || 'Observation Unavailable'}
                    </div>
                    <div className="text-sm md:text-base font-mono text-[var(--m-text-secondary)]">
                      Feels like {formatMetric(current?.feelsLike, '°C')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--m-border)] text-xs md:text-sm font-mono text-[var(--m-text-secondary)] flex flex-wrap justify-between gap-2">
                <span>Station: {selectedLocation.weatherStation || selectedLocation.name}</span>
                <span>Source: {current?.source || current?.dataSource || 'IMD / Open-Meteo'}</span>
              </div>
            </section>

            {/* 4 Key Telemetry Tiles */}
            <section
              aria-label="Key Atmospheric Telemetry"
              className="lg:col-span-7 grid grid-cols-2 gap-4 md:gap-5"
            >
              <div className="rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs md:text-sm font-mono uppercase tracking-wider text-[var(--m-text-secondary)]">
                  <Wind className="w-5 h-5 text-[var(--m-accent)]" />
                  Wind Speed
                </div>
                <div
                  className="font-mono tabular-nums font-bold mt-2"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 3.25rem)' }}
                >
                  {formatMetric(current?.windSpeed, ' km/h')}
                </div>
                <div className="text-xs md:text-sm font-mono text-[var(--m-text-secondary)] mt-1">
                  Direction: {current?.windDirection || 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs md:text-sm font-mono uppercase tracking-wider text-[var(--m-text-secondary)]">
                  <Droplets className="w-5 h-5 text-[var(--m-info)]" />
                  Relative Humidity
                </div>
                <div
                  className="font-mono tabular-nums font-bold mt-2"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 3.25rem)' }}
                >
                  {formatMetric(current?.humidity, '%')}
                </div>
                <div className="text-xs md:text-sm font-mono text-[var(--m-text-secondary)] mt-1">
                  Dew Point: {formatMetric(current?.dewPoint, '°C')}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs md:text-sm font-mono uppercase tracking-wider text-[var(--m-text-secondary)]">
                  <Gauge className="w-5 h-5 text-[var(--m-ok)]" />
                  Surface Pressure
                </div>
                <div
                  className="font-mono tabular-nums font-bold mt-2"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 3.25rem)' }}
                >
                  {formatMetric(current?.pressure, ' hPa')}
                </div>
                <div className="text-xs md:text-sm font-mono text-[var(--m-text-secondary)] mt-1">
                  Visibility: {formatMetric(current?.visibilityKm ?? current?.visibility, ' km')}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs md:text-sm font-mono uppercase tracking-wider text-[var(--m-text-secondary)]">
                  <Activity className="w-5 h-5 text-[var(--m-watch)]" />
                  Air Quality (NAQI)
                </div>
                <div
                  className="font-mono tabular-nums font-bold mt-2"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 3.25rem)' }}
                >
                  {aqiVal !== null && aqiVal !== undefined && Number.isFinite(aqiVal)
                    ? Math.round(aqiVal)
                    : 'Unavailable'}
                </div>
                <div className="text-xs md:text-sm font-mono text-[var(--m-text-secondary)] mt-1">
                  {current?.aqiStatus || 'CPCB / Chemistry Feed'}
                </div>
              </div>
            </section>
          </div>

          {/* Row 2: Hourly Progression + 5-Day Outlook */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Next 6 Hours */}
            <section
              aria-label="Upcoming Hourly Forecast"
              className="xl:col-span-6 rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6"
            >
              <div className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--m-accent)] font-bold mb-4">
                Next 6 Hours Progression
              </div>
              {hourly.length === 0 ? (
                <p className="text-sm text-[var(--m-text-secondary)]">
                  Hourly forecast feed is currently unavailable.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {hourly.map((slot, idx) => (
                    <div
                      key={`${slot.time}-${idx}`}
                      className="rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-inset)] p-3 text-center flex flex-col gap-1.5"
                    >
                      <div className="text-xs md:text-sm font-mono font-semibold text-[var(--m-text-secondary)]">
                        {slot.time}
                      </div>
                      <div className="text-xl md:text-2xl font-mono tabular-nums font-bold">
                        {formatMetric(slot.temp, '°')}
                      </div>
                      <div className="text-xs font-mono text-[var(--m-info)]">
                        Rain {formatMetric(slot.rainProb, '%')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5-Day Outlook */}
            <section
              aria-label="Multi-Day Weather Outlook"
              className="xl:col-span-6 rounded-2xl border-2 border-[var(--m-border)] bg-[var(--m-surface-1)] p-5 md:p-6"
            >
              <div className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--m-accent)] font-bold mb-4">
                5-Day Synoptic Outlook
              </div>
              {daily.length === 0 ? (
                <p className="text-sm text-[var(--m-text-secondary)]">
                  Multi-day outlook feed is currently unavailable.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {daily.map((day, idx) => (
                    <div
                      key={`${day.day}-${idx}`}
                      className="rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-inset)] p-3 flex sm:flex-col items-center justify-between sm:text-center gap-2"
                    >
                      <div className="text-sm font-bold">{day.day}</div>
                      <div className="text-xs text-[var(--m-text-secondary)] truncate max-w-[110px]">
                        {day.condition}
                      </div>
                      <div className="font-mono tabular-nums text-base md:text-lg font-bold">
                        <span>{formatMetric(day.high, '°')}</span>
                        <span className="text-[var(--m-text-muted)] mx-1">/</span>
                        <span className="text-[var(--m-text-secondary)]">
                          {formatMetric(day.low, '°')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

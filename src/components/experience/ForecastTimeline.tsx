// ====================================================================
// MAUSAM Persistent Forecast & Radar Timeline Dock
// Synchronizes bottom scrubber across real hourly model slots
// (or Doppler radar past/nowcast frames when Radar layer is active)
// with 0.5x / 1x / 2x playback speed and honest provenance badges.
// ====================================================================

import React, { useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Repeat } from 'lucide-react';
import type { HourlyForecastItem } from '../../types';
import type { RadarApiResponse } from '../../services/radarService';
import { useExperience } from '../../context/ExperienceContext';

interface ForecastTimelineProps {
  hourly: HourlyForecastItem[];
  radarData?: RadarApiResponse | null;
}

const SPEED_OPTIONS: Array<0.5 | 1 | 2> = [0.5, 1, 2];

export const ForecastTimeline: React.FC<ForecastTimelineProps> = ({ hourly, radarData }) => {
  const {
    activeLayer,
    timelineIndex,
    setTimelineIndex,
    isTimelinePlaying,
    setIsTimelinePlaying,
    isTimelineLooping,
    setIsTimelineLooping,
    playbackSpeed,
    setPlaybackSpeed,
  } = useExperience();

  const isRadarMode = activeLayer === 'radar' && (radarData?.pastFrames?.length || 0) > 0;

  const radarFrames = useMemo(() => {
    if (!isRadarMode || !radarData) return [];
    return [...(radarData.pastFrames || []), ...(radarData.nowcastFrames || [])];
  }, [isRadarMode, radarData]);

  const hourlySlots = useMemo(() => (hourly || []).slice(0, 24), [hourly]);
  const totalSlots = isRadarMode ? radarFrames.length : hourlySlots.length;
  const safeIdx = totalSlots > 0 ? Math.min(timelineIndex, totalSlots - 1) : 0;

  // Advance one frame at a time. At the final frame, either loop to the
  // beginning or stop and hold the final frame; never wrap unconditionally.
  useEffect(() => {
    if (!isTimelinePlaying || totalSlots <= 1) return;

    const intervalMs = Math.round(1100 / playbackSpeed);
    const timer = window.setTimeout(() => {
      if (timelineIndex >= totalSlots - 1) {
        if (isTimelineLooping) {
          setTimelineIndex(0);
        } else {
          setIsTimelinePlaying(false);
        }
        return;
      }
      setTimelineIndex((previous) => Math.min(previous + 1, totalSlots - 1));
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [
    isTimelinePlaying,
    timelineIndex,
    totalSlots,
    playbackSpeed,
    isTimelineLooping,
    setTimelineIndex,
    setIsTimelinePlaying,
  ]);

  // When data changes or the selected layer changes, clamp the cursor and
  // stop playback if the new series is empty.
  useEffect(() => {
    if (totalSlots <= 0) {
      setTimelineIndex(0);
      setIsTimelinePlaying(false);
      return;
    }
    if (timelineIndex >= totalSlots) {
      setTimelineIndex(totalSlots - 1);
    }
  }, [totalSlots, timelineIndex, setTimelineIndex, setIsTimelinePlaying]);

  const activeLabel = useMemo(() => {
    if (isRadarMode && radarFrames[safeIdx]) {
      const f = radarFrames[safeIdx];
      return {
        time: f.formattedTime || f.relativeLabel || 'Radar Scan',
        kind: (f.ageMinutes ?? 0) <= 0 ? 'NOWCAST' : 'OBSERVED',
        detail: f.relativeLabel || `${f.ageMinutes}m ago`,
        source: 'IMD / RainViewer Radar',
      };
    }
    const h = hourlySlots[safeIdx];
    if (!h) {
      return {
        time: 'Unavailable',
        kind: 'UNAVAILABLE',
        detail: 'No verified hourly model series loaded',
        source: 'Open-Meteo Model Grid',
      };
    }
    const tempStr =
      typeof h.temp === 'number' && Number.isFinite(h.temp) ? `${Math.round(h.temp)}°C` : '—';
    const rainStr =
      typeof h.rainProb === 'number' && Number.isFinite(h.rainProb)
        ? `Rain ${Math.round(h.rainProb)}%`
        : 'Rain —';
    const windStr =
      typeof h.windSpeed === 'number' && Number.isFinite(h.windSpeed)
        ? `${Math.round(h.windSpeed)} km/h`
        : 'Wind —';
    return {
      time: h.time,
      kind: safeIdx === 0 || h.isNow ? 'MODEL VALID' : 'FORECAST',
      detail: `${tempStr} · ${rainStr} · ${windStr}`,
      source: 'Open-Meteo Model Grid',
    };
  }, [isRadarMode, radarFrames, hourlySlots, safeIdx]);

  if (totalSlots === 0) {
    return (
      <div
        role="status"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 spatial-hud-surface rounded-[11px] px-4 py-2 text-xs text-[var(--m-text-muted)] font-mono"
      >
        Timeline disabled — awaiting verified hourly or radar time series.
      </div>
    );
  }

  return (
    <section
      aria-label="Atmospheric Time Progression"
      className="fixed bottom-[max(8px,env(safe-area-inset-bottom))] left-2 right-2 sm:left-3 sm:right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(740px,calc(100vw-40px))] z-30 pointer-events-auto safe-area-bottom max-w-[calc(100vw-16px)]"
    >
      <div className="spatial-hud-surface rounded-[11px] px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Playback & Speed Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => { setIsTimelinePlaying(false); setTimelineIndex((p) => Math.max(0, p - 1)); }}
              aria-label="Previous time step"
              className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { if (!isTimelinePlaying && safeIdx >= totalSlots - 1 && !isTimelineLooping) setTimelineIndex(0); setIsTimelinePlaying((v) => !v); }}
              aria-label={
                isTimelinePlaying ? 'Pause atmospheric playback' : 'Play atmospheric playback'
              }
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-[7px] bg-[var(--m-accent)] text-[var(--m-on-accent)] flex items-center justify-center hover:opacity-95 cursor-pointer m-focus-ring"
            >
              {isTimelinePlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setIsTimelinePlaying(false); setTimelineIndex((p) => Math.min(totalSlots - 1, p + 1)); }}
              aria-label="Next time step"
              className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Playback Speed Switcher (0.5x / 1x / 2x) */}
            <div
              role="group"
              aria-label="Playback speed"
              className="flex items-center bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-0.5 ml-1"
            >
              {SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  aria-pressed={playbackSpeed === spd}
                  className={`px-1.5 min-h-[24px] rounded text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)]'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsTimelineLooping((enabled) => !enabled)}
              aria-label={isTimelineLooping ? 'Disable timeline loop' : 'Enable timeline loop'}
              aria-pressed={isTimelineLooping}
              title={isTimelineLooping ? 'Loop enabled' : 'Loop disabled'}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer m-focus-ring ${
                isTimelineLooping
                  ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/50 text-[var(--m-accent)]'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-muted)]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {safeIdx !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsTimelinePlaying(false);
                  setTimelineIndex(0);
                }}
                title="Jump to current slot"
                aria-label="Reset to current slot"
                className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] cursor-pointer m-focus-ring"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Timestamp & Meteorological Status */}
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 border ${
                activeLabel.kind === 'OBSERVED'
                  ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
                  : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35'
              }`}
            >
              {activeLabel.kind}
            </span>
            <span className="font-mono font-semibold text-[var(--m-text-primary)] tabular-nums shrink-0">
              {activeLabel.time}
            </span>
            <span className="text-[var(--m-text-secondary)] truncate hidden md:inline tabular-nums">
              · {activeLabel.detail}
            </span>
          </div>
        </div>

        {/* Continuous Scrubber Slider & Source Provenance */}
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSlots - 1)}
            value={safeIdx}
            onChange={(e) => {
              setIsTimelinePlaying(false);
              setTimelineIndex(Number(e.target.value));
            }}
            aria-label="Scrub atmospheric timeline"
            className="w-full h-1.5 accent-[var(--m-accent)] cursor-pointer"
          />
          <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums shrink-0">
            {safeIdx + 1}/{totalSlots}
          </span>
          <span className="text-[10px] font-mono text-[var(--m-text-muted)] hidden sm:inline shrink-0 border-l border-[var(--m-border)] pl-2">
            {activeLabel.source}
          </span>
        </div>
      </div>
    </section>
  );
};

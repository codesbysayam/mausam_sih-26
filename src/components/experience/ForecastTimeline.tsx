// ====================================================================
// MAUSAM Persistent Forecast & Radar Timeline Dock
// Synchronizes bottom scrubber across real hourly model slots
// (or Doppler radar past/nowcast frames when Radar layer is active)
// with 0.5x / 1x / 1.5x / 2x playback speed, Reset, Loop ON/OFF,
// and React 19 concurrent-safe single-timer stepping.
// ====================================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Repeat } from 'lucide-react';
import type { HourlyForecastItem } from '../../types';
import type { RadarApiResponse } from '../../services/radarService';
import { useExperience } from '../../context/ExperienceContext';
import {
  buildTimelineSeries,
  getPlaybackIntervalMs,
  reconcileIndexOnRefresh,
  stepTimelineIndex,
  type SupportedPlaybackSpeed,
  type TimelineFrame,
  type TimelineSeriesKind,
} from '../../utils/playbackController';

interface ForecastTimelineProps {
  hourly: HourlyForecastItem[];
  radarData?: RadarApiResponse | null;
  locationKey?: string;
}

const SPEED_OPTIONS: readonly SupportedPlaybackSpeed[] = [0.5, 1, 1.5, 2];

export const ForecastTimeline: React.FC<ForecastTimelineProps> = ({
  hourly,
  radarData,
  locationKey,
}) => {
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

  const series = useMemo(
    () => buildTimelineSeries(activeLayer, hourly, radarData),
    [activeLayer, hourly, radarData]
  );

  const totalSlots = series.frames.length;
  const canPlay = totalSlots > 1;
  const safeIdx = totalSlots > 0 ? Math.max(0, Math.min(timelineIndex, totalSlots - 1)) : 0;

  const prevModeRef = useRef<TimelineSeriesKind>(series.modeKey);
  const prevLocationRef = useRef<string | undefined>(locationKey);
  const prevFramesRef = useRef<TimelineFrame[]>(series.frames);
  const timelineIndexRef = useRef<number>(safeIdx);
  const loopingRef = useRef<boolean>(isTimelineLooping);
  const totalSlotsRef = useRef<number>(totalSlots);

  timelineIndexRef.current = safeIdx;
  loopingRef.current = isTimelineLooping;
  totalSlotsRef.current = totalSlots;

  // Reset timeline index & pause cleanly on location or series mode switch;
  // preserve active timestamp slot across background refreshes within the same series.
  useEffect(() => {
    const modeChanged = prevModeRef.current !== series.modeKey;
    const locationChanged = prevLocationRef.current !== locationKey;

    if (modeChanged || locationChanged) {
      prevModeRef.current = series.modeKey;
      prevLocationRef.current = locationKey;
      prevFramesRef.current = series.frames;
      setIsTimelinePlaying(false);
      setTimelineIndex(0);
      return;
    }

    if (prevFramesRef.current !== series.frames) {
      const reconciled = reconcileIndexOnRefresh(
        prevFramesRef.current,
        timelineIndexRef.current,
        series.frames
      );
      prevFramesRef.current = series.frames;
      if (reconciled !== timelineIndexRef.current) {
        setTimelineIndex(reconciled);
      }
      if (series.frames.length <= 1) {
        setIsTimelinePlaying(false);
      }
    }
  }, [series, locationKey, setIsTimelinePlaying, setTimelineIndex]);

  // Pause playback automatically when browser tab becomes hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        setIsTimelinePlaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [setIsTimelinePlaying]);

  // Single cleanup-safe timer without React 19 state-updater side-effect mutations
  useEffect(() => {
    if (!isTimelinePlaying || !canPlay) return;

    const intervalMs = getPlaybackIntervalMs(playbackSpeed);
    const timer = setInterval(() => {
      const res = stepTimelineIndex(
        timelineIndexRef.current,
        totalSlotsRef.current,
        loopingRef.current
      );
      timelineIndexRef.current = res.nextIndex;
      setTimelineIndex(res.nextIndex);
      if (res.shouldStop) {
        setIsTimelinePlaying(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTimelinePlaying, canPlay, playbackSpeed, setTimelineIndex, setIsTimelinePlaying]);

  const activeFrame = series.frames[safeIdx];
  const firstFrame = series.frames[0];
  const lastFrame = series.frames[totalSlots - 1];

  const activeLabel = activeFrame
    ? {
        time: activeFrame.timeLabel,
        kind: activeFrame.kind,
        detail: activeFrame.detail,
        source: activeFrame.source,
      }
    : {
        time: 'Unavailable',
        kind: 'UNAVAILABLE' as const,
        detail: 'No verified hourly or radar time series loaded',
        source: series.source,
      };

  if (totalSlots === 0) {
    return (
      <div
        role="status"
        className="explore-forecast-timeline fixed bottom-3 left-1/2 -translate-x-1/2 z-30 spatial-hud-surface rounded-[11px] px-4 py-2 text-xs text-[var(--m-text-muted)] font-mono max-w-[calc(100vw-20px)] text-center"
      >
        Timeline unavailable — awaiting verified hourly or radar time series.
      </div>
    );
  }

  return (
    <section
      aria-label="Atmospheric Time Progression"
      className="explore-forecast-timeline fixed bottom-2.5 left-2.5 right-2.5 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(800px,calc(100vw-40px))] z-30 pointer-events-auto safe-area-bottom"
    >
      <div className="spatial-hud-surface rounded-[11px] px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Playback, Loop, Reset & Speed Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsTimelinePlaying(false);
                setTimelineIndex(0);
              }}
              disabled={safeIdx === 0 && !isTimelinePlaying}
              title="Reset to first frame"
              aria-label="Reset to first frame"
              className="min-w-[36px] min-h-[36px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] disabled:opacity-35 cursor-pointer m-focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTimelinePlaying(false);
                setTimelineIndex((p) => (p > 0 ? p - 1 : totalSlots - 1));
              }}
              disabled={!canPlay}
              aria-label="Previous time step"
              className="min-w-[36px] min-h-[36px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] disabled:opacity-35 cursor-pointer m-focus-ring"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!canPlay) return;
                if (!isTimelinePlaying && safeIdx >= totalSlots - 1 && !isTimelineLooping) {
                  timelineIndexRef.current = 0;
                  setTimelineIndex(0);
                }
                setIsTimelinePlaying((v) => !v);
              }}
              disabled={!canPlay}
              aria-label={
                isTimelinePlaying ? 'Pause atmospheric playback' : 'Play atmospheric playback'
              }
              className={`w-10 h-9 sm:w-8 sm:h-8 rounded-[7px] flex items-center justify-center hover:opacity-95 disabled:opacity-40 cursor-pointer m-focus-ring ${
                isTimelinePlaying
                  ? 'bg-[#F59E0B] text-[#0B0D10]'
                  : 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
              }`}
            >
              {isTimelinePlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTimelinePlaying(false);
                setTimelineIndex((p) => (p + 1) % totalSlots);
              }}
              disabled={!canPlay}
              aria-label="Next time step"
              className="min-w-[36px] min-h-[36px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] disabled:opacity-35 cursor-pointer m-focus-ring"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Loop ON/OFF Toggle */}
            <button
              type="button"
              onClick={() => setIsTimelineLooping((v) => !v)}
              aria-pressed={isTimelineLooping}
              title={isTimelineLooping ? 'Loop playback: ON' : 'Loop playback: OFF'}
              aria-label={isTimelineLooping ? 'Disable loop playback' : 'Enable loop playback'}
              className={`min-w-[36px] min-h-[36px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer m-focus-ring ${
                isTimelineLooping
                  ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35'
                  : 'bg-transparent text-[var(--m-text-muted)] border-transparent hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Playback Speed Switcher (0.5x / 1x / 1.5x / 2x) — visible on mobile & desktop */}
            <div
              role="group"
              aria-label="Playback speed"
              className="flex items-center bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-0.5 ml-0.5"
            >
              {SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  aria-pressed={playbackSpeed === spd}
                  className={`px-1.5 min-h-[26px] sm:min-h-[24px] rounded text-[10px] font-mono font-semibold tabular-nums cursor-pointer transition-colors whitespace-nowrap ${
                    playbackSpeed === spd
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>

          {/* Active Timestamp & Meteorological Provenance */}
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 border whitespace-nowrap ${
                activeLabel.kind === 'OBSERVED'
                  ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
                  : activeLabel.kind === 'NOWCAST'
                  ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/35'
                  : activeLabel.kind === 'UNAVAILABLE'
                  ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
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
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={Math.max(0, totalSlots - 1)}
              value={safeIdx}
              disabled={!canPlay}
              onChange={(e) => {
                setIsTimelinePlaying(false);
                setTimelineIndex(Number(e.target.value));
              }}
              aria-label="Scrub atmospheric timeline"
              className="w-full h-1.5 accent-[var(--m-accent)] cursor-pointer disabled:opacity-50"
            />
            <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums shrink-0">
              {safeIdx + 1}/{totalSlots}
            </span>
            <span className="text-[10px] font-mono text-[var(--m-text-muted)] hidden sm:inline shrink-0 border-l border-[var(--m-border)] pl-2 whitespace-nowrap">
              {activeLabel.source}
            </span>
          </div>
          {totalSlots > 1 && firstFrame && lastFrame && (
            <div className="hidden sm:flex items-center justify-between text-[9px] font-mono tabular-nums text-[var(--m-text-muted)] px-0.5">
              <span>{firstFrame.timeLabel}</span>
              <span>{lastFrame.timeLabel}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

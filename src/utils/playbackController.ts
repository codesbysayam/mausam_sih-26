// ====================================================================
// MAUSAM Pure Atmospheric Timeline & Radar Playback Controller
// Zero-React deterministic state helpers for ForecastTimeline,
// AtmosphereScene, and AccessibleMapFallback synchronization.
// ====================================================================

import type { HourlyForecastItem } from '../types';
import type { RadarApiResponse, RadarFrame } from '../services/radarService';
import type { SpatialLayerId } from '../context/ExperienceContext';

export type TimelineSeriesKind = 'radar' | 'forecast';

export type TimelineFrameKind = 'OBSERVED' | 'NOWCAST' | 'MODEL VALID' | 'FORECAST' | 'UNAVAILABLE';

export interface TimelineFrame {
  /** Stable identifier used to preserve the active slot across data refreshes */
  timestampKey: string;
  timeLabel: string;
  kind: TimelineFrameKind;
  detail: string;
  source: string;
  /** Original radar frame when series kind === 'radar' */
  radarFrame?: RadarFrame;
  /** Original hourly forecast item when series kind === 'forecast' */
  hourlyItem?: HourlyForecastItem;
}

export interface TimelineSeries {
  modeKey: TimelineSeriesKind;
  frames: TimelineFrame[];
  source: string;
}

export interface PlaybackStepResult {
  nextIndex: number;
  shouldStop: boolean;
}

export type SupportedPlaybackSpeed = 0.5 | 1 | 1.5 | 2;

/**
 * Computes interval duration in milliseconds for a given playback speed.
 */
export function getPlaybackIntervalMs(speed: SupportedPlaybackSpeed): number {
  const safeSpeed =
    speed === 0.5 || speed === 1 || speed === 1.5 || speed === 2 ? speed : 1;
  return Math.round(1100 / safeSpeed);
}

/**
 * Advances the timeline index by one step with explicit Loop ON/OFF semantics.
 */
export function stepTimelineIndex(
  currentIndex: number,
  totalFrames: number,
  isLooping: boolean
): PlaybackStepResult {
  if (totalFrames <= 1) {
    return { nextIndex: 0, shouldStop: true };
  }
  const clamped = Math.max(0, Math.min(currentIndex, totalFrames - 1));
  if (clamped + 1 < totalFrames) {
    return { nextIndex: clamped + 1, shouldStop: false };
  }
  if (isLooping) {
    return { nextIndex: 0, shouldStop: false };
  }
  return { nextIndex: totalFrames - 1, shouldStop: true };
}

/**
 * Classifies a radar frame truthfully without guessing NOWCAST when timestamp/age is missing.
 */
function buildRadarTimelineFrame(
  frame: RadarFrame,
  origin: 'past' | 'nowcast',
  index: number
): TimelineFrame {
  const hasTimestamp =
    typeof frame.time === 'number' && Number.isFinite(frame.time) && frame.time > 0;
  const hasFormattedTime =
    typeof frame.formattedTime === 'string' && frame.formattedTime.trim().length > 0;
  const hasAge = typeof frame.ageMinutes === 'number' && Number.isFinite(frame.ageMinutes);

  if (!hasTimestamp && !hasFormattedTime) {
    return {
      timestampKey: frame.path || `radar-unknown-${origin}-${index}`,
      timeLabel: 'Time unavailable',
      kind: 'UNAVAILABLE',
      detail: 'Frame timestamp unavailable',
      source: 'IMD / RainViewer Radar',
      radarFrame: frame,
    };
  }

  let kind: TimelineFrameKind;
  if (origin === 'nowcast') {
    kind = 'NOWCAST';
  } else if (hasAge && frame.ageMinutes > 0) {
    kind = 'OBSERVED';
  } else {
    kind = 'OBSERVED';
  }

  const timeLabel = hasFormattedTime
    ? frame.formattedTime
    : frame.relativeLabel || 'Radar Scan';
  const detail =
    frame.relativeLabel ||
    (hasAge
      ? frame.ageMinutes >= 0
        ? `${frame.ageMinutes}m ago`
        : `+${Math.abs(frame.ageMinutes)}m nowcast`
      : origin === 'nowcast'
        ? 'Radar nowcast'
        : 'Observed radar sweep');

  return {
    timestampKey: hasTimestamp
      ? `radar:${frame.time}`
      : frame.path || `radar:${origin}:${index}`,
    timeLabel,
    kind,
    detail,
    source: 'IMD / RainViewer Radar',
    radarFrame: frame,
  };
}

/**
 * Builds the ordered timeline series for the active spatial layer.
 * In 'radar' layer, activates radar playback whenever EITHER past OR nowcast frames exist.
 */
export function buildTimelineSeries(
  activeLayer: SpatialLayerId,
  hourly: readonly HourlyForecastItem[] | null | undefined,
  radarData?: RadarApiResponse | null
): TimelineSeries {
  const pastFrames = Array.isArray(radarData?.pastFrames) ? radarData!.pastFrames : [];
  const nowcastFrames = Array.isArray(radarData?.nowcastFrames) ? radarData!.nowcastFrames : [];
  const hasRadarFrames = pastFrames.length + nowcastFrames.length > 0;

  if (activeLayer === 'radar' && hasRadarFrames) {
    const frames: TimelineFrame[] = [
      ...pastFrames.map((f, idx) => buildRadarTimelineFrame(f, 'past', idx)),
      ...nowcastFrames.map((f, idx) => buildRadarTimelineFrame(f, 'nowcast', idx)),
    ];
    return {
      modeKey: 'radar',
      frames,
      source: 'IMD / RainViewer Radar',
    };
  }

  const hourlySlots = Array.isArray(hourly) ? hourly.slice(0, 24) : [];
  const frames: TimelineFrame[] = hourlySlots.map((h, idx) => {
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
    const timeLabel =
      typeof h.time === 'string' && h.time.trim().length > 0 ? h.time : 'Time unavailable';

    return {
      timestampKey: `hourly:${h.time || idx}`,
      timeLabel,
      kind:
        timeLabel === 'Time unavailable'
          ? 'UNAVAILABLE'
          : idx === 0 || h.isNow
            ? 'MODEL VALID'
            : 'FORECAST',
      detail: `${tempStr} · ${rainStr} · ${windStr}`,
      source: 'Open-Meteo Model Grid',
      hourlyItem: h,
    };
  });

  return {
    modeKey: 'forecast',
    frames,
    source: 'Open-Meteo Model Grid',
  };
}

/**
 * Preserves the user's selected timestamp slot when the underlying series refreshes
 * (e.g., new radar sweep arrives) while remaining inside the same series mode.
 */
export function reconcileIndexOnRefresh(
  prevFrames: readonly TimelineFrame[],
  prevIndex: number,
  nextFrames: readonly TimelineFrame[]
): number {
  if (nextFrames.length === 0) return 0;
  if (prevFrames.length === 0) return 0;
  const clampedPrev = Math.max(0, Math.min(prevIndex, prevFrames.length - 1));
  const targetKey = prevFrames[clampedPrev]?.timestampKey;
  if (targetKey) {
    const matchedIdx = nextFrames.findIndex((f) => f.timestampKey === targetKey);
    if (matchedIdx >= 0) return matchedIdx;
  }
  return Math.max(0, Math.min(clampedPrev, nextFrames.length - 1));
}

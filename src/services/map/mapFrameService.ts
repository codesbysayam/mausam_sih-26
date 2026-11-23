/**
 * MAUSAM Geospatial Frame Normalization Service
 * Converts RainViewer radar sweeps, Open-Meteo hourly forecasts, and RSMC cyclone track fixes
 * into strictly timestamped, chronologically sorted playback frames with zero fabrication.
 */

import type { RadarApiResponse, RadarFrame } from '../radarService';
import type { WeatherSystemEvent, WeatherSystemForecastPoint } from '../../types/cyclone';
import type { HourlyForecastItem } from '../../types';
import { sortFramesChronologically } from '../../hooks/useFramePlayback';

export type FrameDataType = 'OBSERVED' | 'NOWCAST' | 'MODEL VALID' | 'FORECAST' | 'HISTORICAL' | 'CURRENT' | 'UNAVAILABLE';

export interface NormalizedRadarPlaybackFrame {
  id: string;
  time: number;
  path: string;
  tileUrl: string;
  formattedTime: string;
  relativeLabel: string;
  ageMinutes: number | null;
  dataType: 'OBSERVED' | 'NOWCAST' | 'UNAVAILABLE';
  raw: RadarFrame;
}

export interface NormalizedCyclonePlaybackFrame {
  id: string;
  time: number | null;
  timestampIso: string;
  displayTime: string;
  lat: number;
  lng: number;
  maxSustainedWindLabel: string;
  pressureLabel: string;
  category: string;
  locationName?: string;
  dataType: 'HISTORICAL' | 'CURRENT' | 'FORECAST';
}

export interface NormalizedForecastPlaybackFrame {
  id: string;
  time: number | null;
  timeLabel: string;
  dataType: 'MODEL VALID' | 'FORECAST' | 'UNAVAILABLE';
  tempC: number | null;
  rainProb: number | null;
  windKmh: number | null;
  raw: HourlyForecastItem;
}

/**
 * Formats a Unix epoch (seconds or ms) in IST HH:MM format.
 */
export function formatEpochIST(epoch: number | null | undefined): string {
  if (typeof epoch !== 'number' || !Number.isFinite(epoch) || epoch <= 0) {
    return 'Time unavailable';
  }
  const ms = epoch < 1e11 ? epoch * 1000 : epoch;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(ms)) + ' IST';
  } catch {
    return new Date(ms).toISOString().slice(11, 16) + ' UTC';
  }
}

/**
 * Builds chronologically ordered RainViewer radar frames filtered by lookback hours,
 * explicitly distinguishing OBSERVED past scans from NOWCAST forecast scans.
 */
export function buildRadarPlaybackFrames(
  radarData: RadarApiResponse | null | undefined,
  options?: {
    lookbackHours?: number;
    includeNowcast?: boolean;
  }
): NormalizedRadarPlaybackFrame[] {
  if (!radarData) return [];
  const lookbackHours = options?.lookbackHours ?? 6;
  const includeNowcast = options?.includeNowcast ?? true;

  const past = Array.isArray(radarData.pastFrames) ? radarData.pastFrames : [];
  const nowcast =
    includeNowcast && Array.isArray(radarData.nowcastFrames) ? radarData.nowcastFrames : [];

  const toNormalized = (
    frame: RadarFrame,
    origin: 'past' | 'nowcast',
    idx: number
  ): NormalizedRadarPlaybackFrame | null => {
    if (!frame) return null;
    const resolvedTileUrl =
      typeof frame.tileUrl === 'string' && frame.tileUrl.trim().length > 0
        ? frame.tileUrl.trim()
        : radarData.host && typeof frame.path === 'string' && frame.path.trim().length > 0
        ? `${radarData.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
        : '';

    if (!resolvedTileUrl) {
      return null;
    }
    const hasTime = typeof frame.time === 'number' && Number.isFinite(frame.time) && frame.time > 0;
    const formattedTime =
      frame.formattedTime && frame.formattedTime.trim().length > 0
        ? frame.formattedTime
        : hasTime
        ? formatEpochIST(frame.time)
        : 'Time unavailable';

    const dataType: 'OBSERVED' | 'NOWCAST' | 'UNAVAILABLE' = !hasTime
      ? 'UNAVAILABLE'
      : origin === 'nowcast'
      ? 'NOWCAST'
      : 'OBSERVED';

    return {
      id: `${origin}:${hasTime ? frame.time : idx}:${frame.path || idx}`,
      time: hasTime ? frame.time : 0,
      path: frame.path || '',
      tileUrl: resolvedTileUrl,
      formattedTime,
      relativeLabel:
        frame.relativeLabel ||
        (typeof frame.ageMinutes === 'number' && Number.isFinite(frame.ageMinutes)
          ? frame.ageMinutes >= 0
            ? `${frame.ageMinutes}m ago`
            : `+${Math.abs(frame.ageMinutes)}m nowcast`
          : origin === 'nowcast'
          ? 'Nowcast'
          : 'Observed'),
      ageMinutes:
        typeof frame.ageMinutes === 'number' && Number.isFinite(frame.ageMinutes)
          ? frame.ageMinutes
          : null,
      dataType,
      raw: frame,
    };
  };

  const normalizedPast = past
    .map((f, idx) => toNormalized(f, 'past', idx))
    .filter((f): f is NormalizedRadarPlaybackFrame => f !== null);

  const normalizedNowcast = nowcast
    .map((f, idx) => toNormalized(f, 'nowcast', idx))
    .filter((f): f is NormalizedRadarPlaybackFrame => f !== null);

  // Filter past frames by lookback window anchored to latest past frame timestamp
  let filteredPast = sortFramesChronologically(normalizedPast);
  if (filteredPast.length > 0 && lookbackHours > 0) {
    const latestPastTime = filteredPast[filteredPast.length - 1].time;
    if (latestPastTime > 0) {
      const cutoffSec = latestPastTime - lookbackHours * 3600;
      const inWindow = filteredPast.filter((f) => f.time === 0 || f.time >= cutoffSec);
      if (inWindow.length > 0) {
        filteredPast = inWindow;
      }
    }
  }

  const combined = [...filteredPast, ...sortFramesChronologically(normalizedNowcast)];

  // Deduplicate by timestamp+path while preserving chronological order
  const seen = new Set<string>();
  const deduped: NormalizedRadarPlaybackFrame[] = [];
  for (const item of combined) {
    const key = `${item.time}:${item.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return sortFramesChronologically(deduped);
}

function formatTrackLabel(rawTime: string | undefined, validEpoch: number | null): string {
  if (validEpoch !== null) {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).format(new Date(validEpoch)) + ' IST';
    } catch {
      return formatEpochIST(validEpoch);
    }
  }
  if (rawTime && rawTime.trim().length > 0) {
    return rawTime.slice(0, 16).replace('T', ' ') + ' IST';
  }
  return 'Fix time unavailable';
}

function formatWindValue(val: number | string | undefined): string {
  if (typeof val === 'number' && Number.isFinite(val)) return `${val} km/h`;
  if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  return '—';
}

function formatPressureValue(val: number | string | undefined): string {
  if (typeof val === 'number' && Number.isFinite(val)) return `${val} hPa`;
  if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  return '—';
}

/**
 * Builds chronologically ordered track playback frames from a real active WeatherSystemEvent.
 * Never fabricates points when no active system or < 2 real track coordinates exist.
 */
export function buildCyclonePlaybackFrames(
  system: WeatherSystemEvent | null | undefined
): NormalizedCyclonePlaybackFrame[] {
  if (!system) return [];

  const points: NormalizedCyclonePlaybackFrame[] = [];

  const pushPoint = (
    pt: WeatherSystemForecastPoint,
    dataType: 'HISTORICAL' | 'CURRENT' | 'FORECAST',
    idx: number
  ) => {
    if (
      typeof pt.latitude !== 'number' ||
      typeof pt.longitude !== 'number' ||
      !Number.isFinite(pt.latitude) ||
      !Number.isFinite(pt.longitude)
    ) {
      return;
    }
    const parsedEpoch = pt.time ? Date.parse(pt.time) : NaN;
    const validEpoch = Number.isFinite(parsedEpoch) ? parsedEpoch : null;
    points.push({
      id: `${system.id}:${dataType}:${pt.time || idx}`,
      time: validEpoch,
      timestampIso: pt.time || '',
      displayTime: formatTrackLabel(pt.time, validEpoch),
      lat: pt.latitude,
      lng: pt.longitude,
      maxSustainedWindLabel: formatWindValue(pt.windSpeed),
      pressureLabel: formatPressureValue(pt.centralPressure),
      category: pt.expectedClassification || system.classification,
      locationName: pt.locationName,
      dataType,
    });
  };

  if (Array.isArray(system.historicalTrack)) {
    system.historicalTrack.forEach((pt, idx) => pushPoint(pt, 'HISTORICAL', idx));
  }

  if (
    typeof system.latitude === 'number' &&
    typeof system.longitude === 'number' &&
    Number.isFinite(system.latitude) &&
    Number.isFinite(system.longitude)
  ) {
    const rawCurrentTime = system.updatedAt || system.issuedAt || '';
    const parsedCurrent = rawCurrentTime ? Date.parse(rawCurrentTime) : NaN;
    const validCurrent = Number.isFinite(parsedCurrent) ? parsedCurrent : null;
    points.push({
      id: `${system.id}:CURRENT:${rawCurrentTime || 'now'}`,
      time: validCurrent,
      timestampIso: rawCurrentTime,
      displayTime: validCurrent ? formatTrackLabel(rawCurrentTime, validCurrent) : 'Current Fix',
      lat: system.latitude,
      lng: system.longitude,
      maxSustainedWindLabel: formatWindValue(system.maxSustainedWind),
      pressureLabel: formatPressureValue(system.pressure),
      category: system.classification,
      locationName: system.currentLocation,
      dataType: 'CURRENT',
    });
  }

  if (Array.isArray(system.forecastTrack)) {
    system.forecastTrack.forEach((pt, idx) => pushPoint(pt, 'FORECAST', idx));
  }

  // Deduplicate identical timestamp+coordinate entries
  const seen = new Set<string>();
  const unique = points.filter((p) => {
    const key = `${p.timestampIso}:${p.lat.toFixed(2)}:${p.lng.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return sortFramesChronologically(unique);
}

/**
 * Normalizes hourly forecast points into timeline playback frames.
 */
export function buildForecastPlaybackFrames(
  hourly: readonly HourlyForecastItem[] | null | undefined,
  maxHours = 24
): NormalizedForecastPlaybackFrame[] {
  if (!Array.isArray(hourly) || hourly.length === 0) return [];
  return hourly.slice(0, maxHours).map((h, idx) => {
    const label = typeof h.time === 'string' && h.time.trim().length > 0 ? h.time : 'Time unavailable';
    return {
      id: `hourly:${label}:${idx}`,
      time: null,
      timeLabel: label,
      dataType:
        label === 'Time unavailable'
          ? 'UNAVAILABLE'
          : idx === 0 || h.isNow
          ? 'MODEL VALID'
          : 'FORECAST',
      tempC: typeof h.temp === 'number' && Number.isFinite(h.temp) ? h.temp : null,
      rainProb: typeof h.rainProb === 'number' && Number.isFinite(h.rainProb) ? h.rainProb : null,
      windKmh: typeof h.windSpeed === 'number' && Number.isFinite(h.windSpeed) ? h.windSpeed : null,
      raw: h,
    };
  });
}

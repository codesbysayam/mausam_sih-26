import { z } from 'zod';

export type ProviderTelemetryStatus =
  | 'LOADING'
  | 'LIVE'
  | 'RECENT'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'ERROR';

export type DataKind =
  | 'OBSERVED'
  | 'MODEL_ANALYSIS'
  | 'FORECAST'
  | 'NOWCAST'
  | 'CLIMATOLOGY'
  | 'UNAVAILABLE';

export type Freshness = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

export interface MetricEnvelope<T> {
  value: T | null;
  unit?: string;
  kind: DataKind;
  freshness: Freshness;
  source: string;
  observedAt?: string | null;
  validAt?: string | null;
  retrievedAt: string;
  reason?: string;
}

/**
 * Returns a finite number if valid (preserving 0), otherwise null.
 */
export function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

/**
 * Rounds a finite number to `decimals` places (preserving 0), or returns null.
 */
export function roundedNumber(value: unknown, decimals = 0): number | null {
  const num = finiteNumber(value);
  if (num === null) return null;
  if (decimals <= 0) return Math.round(num);
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

function parseMeteorologicalTimestampMs(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasOffset ? trimmed : `${trimmed}+05:30`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Matches a reference observation timestamp against an hourly timestamp array
 * by nearest epoch (interpreting naive ISO timestamps in IST +05:30).
 * Returns -1 if `times` is empty or contains no parseable timestamps.
 */
export function findNearestHourlyIndex(
  times: readonly string[] | null | undefined,
  referenceTime?: string | number | null
): number {
  if (!Array.isArray(times) || times.length === 0) return -1;
  const refMs = parseMeteorologicalTimestampMs(referenceTime) ?? Date.now();
  let bestIdx = -1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const tMs = parseMeteorologicalTimestampMs(times[i]);
    if (tMs === null) continue;
    const diff = Math.abs(tMs - refMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export interface ParsedCoordinatesSuccess {
  ok: true;
  lat: number;
  lon: number;
  error?: undefined;
}

export interface ParsedCoordinatesFailure {
  ok: false;
  lat?: undefined;
  lon?: undefined;
  error: string;
}

export type ParsedCoordinatesResult =
  | ParsedCoordinatesSuccess
  | ParsedCoordinatesFailure;

/**
 * Strictly parses latitude & longitude from query/body parameters without
 * falsy coercion (preserves equatorial 0,0 coordinates) or silent fallbacks.
 */
export function parseCoordinates(
  input: Record<string, unknown> | null | undefined
): ParsedCoordinatesResult {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      error: 'Missing latitude and longitude query parameters.',
    };
  }

  const rawLat = input.lat ?? input.latitude;
  const rawLon = input.lon ?? input.lng ?? input.longitude;

  if (
    rawLat === undefined ||
    rawLat === null ||
    String(rawLat).trim() === '' ||
    rawLon === undefined ||
    rawLon === null ||
    String(rawLon).trim() === ''
  ) {
    return {
      ok: false,
      error: 'Both lat/latitude and lon/lng/longitude parameters are required.',
    };
  }

  const lat = typeof rawLat === 'number' ? rawLat : Number(String(rawLat).trim());
  const lon = typeof rawLon === 'number' ? rawLon : Number(String(rawLon).trim());

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      ok: false,
      error: 'Coordinates must be finite numeric values.',
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      ok: false,
      error: `Latitude ${lat} out of bounds [-90, 90].`,
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      ok: false,
      error: `Longitude ${lon} out of bounds [-180, 180].`,
    };
  }

  return { ok: true, lat, lon };
}

export function formatCoordinatePair(
  lat: number | null | undefined,
  lon: number | null | undefined,
  precision = 2
): string {
  if (
    typeof lat !== 'number' ||
    !Number.isFinite(lat) ||
    typeof lon !== 'number' ||
    !Number.isFinite(lon)
  ) {
    return 'Coordinates unavailable';
  }
  const latHem = lat >= 0 ? 'N' : 'S';
  const lonHem = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(precision)}°${latHem}, ${Math.abs(lon).toFixed(precision)}°${lonHem}`;
}

const nullableNumber = z.number().finite().nullable().optional();

export const OpenMeteoCurrentSchema = z
  .object({
    time: z.union([z.string(), z.number()]).optional(),
    temperature_2m: nullableNumber,
    relative_humidity_2m: nullableNumber,
    apparent_temperature: nullableNumber,
    is_day: z.number().nullable().optional(),
    precipitation: nullableNumber,
    rain: nullableNumber,
    showers: nullableNumber,
    snowfall: nullableNumber,
    weather_code: nullableNumber,
    cloud_cover: nullableNumber,
    pressure_msl: nullableNumber,
    surface_pressure: nullableNumber,
    wind_speed_10m: nullableNumber,
    wind_direction_10m: nullableNumber,
    wind_gusts_10m: nullableNumber,
    dew_point_2m: nullableNumber,
    visibility: nullableNumber,
  })
  .passthrough();

export const OpenMeteoForecastResponseSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timezone: z.string().optional(),
    current: OpenMeteoCurrentSchema.optional(),
    hourly: z.record(z.string(), z.unknown()).optional(),
    daily: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const OpenMeteoAirQualityResponseSchema = z
  .object({
    current: z
      .object({
        time: z.union([z.string(), z.number()]).optional(),
        european_aqi: nullableNumber,
        us_aqi: nullableNumber,
        pm10: nullableNumber,
        pm2_5: nullableNumber,
        carbon_monoxide: nullableNumber,
        nitrogen_dioxide: nullableNumber,
        sulphur_dioxide: nullableNumber,
        ozone: nullableNumber,
        dust: nullableNumber,
        ammonia: nullableNumber,
        alder_pollen: nullableNumber,
        birch_pollen: nullableNumber,
        grass_pollen: nullableNumber,
        mugwort_pollen: nullableNumber,
        olive_pollen: nullableNumber,
        ragweed_pollen: nullableNumber,
      })
      .passthrough()
      .optional(),
    hourly: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const OpenMeteoMarineResponseSchema = z
  .object({
    current: z
      .object({
        time: z.union([z.string(), z.number()]).optional(),
        wave_height: nullableNumber,
        wave_direction: nullableNumber,
        wave_period: nullableNumber,
        wind_wave_height: nullableNumber,
        swell_wave_height: nullableNumber,
        swell_wave_period: nullableNumber,
        sea_surface_temperature: nullableNumber,
        ocean_current_velocity: nullableNumber,
        ocean_current_direction: nullableNumber,
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const RainViewerResponseSchema = z
  .object({
    host: z.string(),
    radar: z
      .object({
        past: z.array(z.object({ time: z.number(), path: z.string() })).optional(),
        nowcast: z.array(z.object({ time: z.number(), path: z.string() })).optional(),
      })
      .optional(),
  })
  .passthrough();

export const PersonaDataBundleSchema = z.object({
  location: z.object({
    city: z.string(),
    state: z.string(),
    lat: z.number(),
    lng: z.number(),
    isCoastal: z.boolean(),
  }),
  health: z.object({
    aqi: z.object({
      source: z.string(),
      stationName: z.string(),
      aqi: z.number().nullable(),
      category: z.string(),
      dominantPollutant: z.string(),
      pm25: z.number().nullable(),
      pm10: z.number().nullable(),
      no2: z.number().nullable(),
      so2: z.number().nullable(),
      co: z.number().nullable(),
      o3: z.number().nullable(),
      healthAdvice: z.string(),
      colorCode: z.string(),
      lastUpdated: z.string(),
      isOfficialFeed: z.boolean(),
    }),
    pollen: z.object({
      source: z.string(),
      overallIndex: z.number().nullable(),
      riskCategory: z.string(),
      treePollen: z.number().nullable(),
      grassPollen: z.number().nullable(),
      weedPollen: z.number().nullable(),
      allergyTip: z.string(),
      lastUpdated: z.string(),
    }),
    uvIndex: z.number().nullable(),
    uvRiskLabel: z.string(),
    uvAdvice: z.string(),
    humidity: z.number().nullable(),
  }),
  fitness: z.object({
    sunrise: z.string().nullable(),
    sunset: z.string().nullable(),
    bestRunningHours: z.string(),
    workoutSuitability: z.string(),
    heatAlertActive: z.boolean(),
    heatAlertMessage: z.string().nullable(),
    windSpeedKmh: z.number().nullable(),
    windDirection: z.string(),
    hydrationRateMlHour: z.number().nullable(),
    thermalStressLevel: z.string(),
  }),
  beachAndSurf: z.object({
    isCoastal: z.boolean(),
    tides: z.any().nullable(),
    marine: z.any().nullable(),
  }),
  travel: z.object({
    activeAlerts: z.array(z.any()),
    packingSuggestions: z.array(z.string()),
    travelSafetyRating: z.string(),
  }),
  familyCommute: z.object({
    morningCommuteStatus: z.string(),
    eveningCommuteStatus: z.string(),
    morningWindow: z.string(),
    eveningWindow: z.string(),
    rainExpectedDuringCommute: z.boolean(),
    commuteRainSummary: z.string(),
    schoolBusSafetyNote: z.string(),
    severeWarnings: z.array(z.any()),
  }),
  agriculture: z.object({
    soilMoisturePercent: z.number().nullable(),
    soilMoistureStatus: z.string(),
    threeDayRainfallTotalMm: z.number().nullable(),
    frostAlertActive: z.boolean(),
    frostAlertMessage: z.string().nullable(),
    currentCropSeason: z.string(),
    seasonalPlantingTip: z.string(),
    irrigationRecommendation: z.string(),
  }),
  commuter: z.object({
    roadCondition: z.string(),
    roadSafetyIndex: z.string(),
    roadSafetyLabel: z.string(),
    visibilityKm: z.number().nullable(),
    visibilityStatus: z.string(),
    travelHazards: z.array(z.string()),
  }),
  eventPlanner: z.object({
    extendedForecast: z.array(z.any()),
    comfortIndexToday: z.number().nullable(),
    comfortCategoryToday: z.string(),
    eventRecommendation: z.string(),
  }),
  fetchedAt: z.string(),
});

export function isWeatherTelemetryComplete(current: {
  temp?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  windSpeed?: number | null;
}): boolean {
  const tempVal = current.temp ?? current.temperature ?? null;
  return (
    typeof tempVal === 'number' &&
    Number.isFinite(tempVal) &&
    (typeof current.humidity === 'number' || typeof current.windSpeed === 'number')
  );
}

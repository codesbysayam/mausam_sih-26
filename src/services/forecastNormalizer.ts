/**
 * Forecast Normalization & Meteorological Quality Control Layer
 * Validates meteorological boundaries, ensures RH <= 100%,
 * computes Dew Point / Apparent Temp strictly from verified inputs (no synthetic constants).
 */

import { HourlyForecastItem, DailyForecastItem } from '../types';

export interface NormalizedHourlyItem extends HourlyForecastItem {
  validTemp: number | null;
  validRainProb: number | null;
  validPrecipMm: number | null;
  validWindSpeed: number | null;
  validWindDirection: string | null;
  windDegree: number | null;
  validHumidity: number | null;
  validCloudCover: number | null;
  dewPoint: number | null;
  feelsLike: number | null;
  uvIndex: number | null;
  visibilityKm: number | null;
  gustSpeed: number | null;
}

export interface NormalizedDailyItem extends DailyForecastItem {
  validHigh: number | null;
  validLow: number | null;
  validRainProb: number | null;
  validPrecipMm: number | null;
  validHumidity: number | null;
  validWindSpeed: number | null;
  validWindDirection: string | null;
  validUv: number | null;
  dateFormatted: string;
  visibilityKm: number | null;
  validCloudCover: number | null;
}

const finiteNum = (val: unknown): number | null =>
  typeof val === 'number' && Number.isFinite(val) ? val : null;

/**
 * Calculates Dew Point using the Magnus-Tetens formula
 * T in °C, RH in % (1-100)
 */
export function calculateDewPoint(tempC: number, rhPercent: number): number {
  const safeRh = Math.max(1, Math.min(100, rhPercent));
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(safeRh / 100.0);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint * 10) / 10;
}

/**
 * Calculates Heat Index / Apparent Temperature in °C (Australian apparent temp formula)
 */
export function calculateApparentTemp(tempC: number, rhPercent: number, windSpeedKmh: number): number {
  const safeRh = Math.max(0, Math.min(100, rhPercent));
  const windMs = (windSpeedKmh * 1000) / 3600;
  const e = (safeRh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const at = tempC + 0.33 * e - 0.70 * windMs - 4.0;
  return Math.round(at * 10) / 10;
}

/**
 * Maps cardinal wind directions to compass degrees (returns null when unknown)
 */
export function directionToDegrees(dirStr?: string | null): number | null {
  if (!dirStr) return null;
  const cleaned = dirStr.trim().toUpperCase();
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  return map[cleaned] !== undefined ? map[cleaned] : null;
}

/**
 * Converts wind speed in km/h to Beaufort wind scale category
 */
export function getBeaufortCategory(windKmh: number): { force: number; description: string } {
  const k = Math.max(0, windKmh);
  if (k < 1) return { force: 0, description: 'Calm (< 1 km/h)' };
  if (k <= 5) return { force: 1, description: 'Light Air (1–5 km/h)' };
  if (k <= 11) return { force: 2, description: 'Light Breeze (6–11 km/h)' };
  if (k <= 19) return { force: 3, description: 'Gentle Breeze (12–19 km/h)' };
  if (k <= 28) return { force: 4, description: 'Moderate Breeze (20–28 km/h)' };
  if (k <= 38) return { force: 5, description: 'Fresh Breeze (29–38 km/h)' };
  if (k <= 49) return { force: 6, description: 'Strong Breeze (39–49 km/h)' };
  if (k <= 61) return { force: 7, description: 'Near Gale (50–61 km/h)' };
  if (k <= 74) return { force: 8, description: 'Gale (62–74 km/h)' };
  if (k <= 88) return { force: 9, description: 'Strong Gale (75–88 km/h)' };
  return { force: 10, description: 'Storm / Violent Gale (89+ km/h)' };
}

/**
 * Normalizes hourly forecasts strictly preserving null for missing telemetry
 */
export function normalizeHourlyForecast(rawItems: HourlyForecastItem[]): NormalizedHourlyItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  return rawItems.map((item) => {
    const rawTemp = finiteNum(item.temp);
    const validTemp = rawTemp !== null ? Math.round(rawTemp * 10) / 10 : null;

    const rawProb = finiteNum(item.precipitationProbability) ?? finiteNum(item.rainProb);
    const validRainProb = rawProb !== null ? Math.max(0, Math.min(100, Math.round(rawProb))) : null;

    const rawPrecip = finiteNum((item as unknown as { precipitationMm?: number }).precipitationMm);
    const validPrecipMm = rawPrecip !== null ? Math.max(0, Math.round(rawPrecip * 10) / 10) : null;

    const rawWind = finiteNum(item.windSpeed);
    const validWindSpeed = rawWind !== null ? Math.max(0, Math.round(rawWind)) : null;

    const validWindDirection = item.windDirection ? item.windDirection.trim() : null;
    const windDegree = directionToDegrees(validWindDirection);

    const rawHumidity = finiteNum(item.humidity);
    const validHumidity = rawHumidity !== null ? Math.max(0, Math.min(100, Math.round(rawHumidity))) : null;

    const rawCloud = finiteNum(item.cloudCover);
    const validCloudCover = rawCloud !== null ? Math.max(0, Math.min(100, Math.round(rawCloud))) : null;

    const dewPoint =
      validTemp !== null && validHumidity !== null
        ? calculateDewPoint(validTemp, validHumidity)
        : null;

    const rawFeels = finiteNum((item as unknown as { feelsLike?: number }).feelsLike);
    const feelsLike =
      rawFeels !== null
        ? Math.round(rawFeels * 10) / 10
        : validTemp !== null && validHumidity !== null && validWindSpeed !== null
        ? calculateApparentTemp(validTemp, validHumidity, validWindSpeed)
        : null;

    const rawUv = finiteNum((item as unknown as { uvIndex?: number }).uvIndex);
    const uvIndex = rawUv !== null ? Math.round(rawUv * 10) / 10 : null;

    const rawVis = finiteNum((item as unknown as { visibilityKm?: number }).visibilityKm);
    const visibilityKm = rawVis !== null ? Math.round(rawVis * 10) / 10 : null;

    const rawGust = finiteNum((item as unknown as { gustSpeed?: number; windGusts?: number }).gustSpeed ?? (item as unknown as { windGusts?: number }).windGusts);
    const gustSpeed = rawGust !== null ? Math.round(rawGust) : null;

    return {
      ...item,
      validTemp,
      validRainProb,
      validPrecipMm,
      validWindSpeed,
      validWindDirection,
      windDegree,
      validHumidity,
      validCloudCover,
      dewPoint,
      feelsLike,
      uvIndex,
      visibilityKm,
      gustSpeed,
    };
  });
}

/**
 * Normalizes 7-day daily forecast data strictly preserving null for missing telemetry
 */
export function normalizeDailyForecast(rawItems: DailyForecastItem[]): NormalizedDailyItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  return rawItems.map((item) => {
    const rawHigh = finiteNum(item.high);
    const validHigh = rawHigh !== null ? Math.round(rawHigh * 10) / 10 : null;

    const rawLow = finiteNum(item.low);
    const validLow = rawLow !== null ? Math.round(rawLow * 10) / 10 : null;

    const rawProb = finiteNum(item.rainProb);
    const validRainProb = rawProb !== null ? Math.max(0, Math.min(100, Math.round(rawProb))) : null;

    const rawPrecip = finiteNum((item as unknown as { precipitationMm?: number }).precipitationMm);
    const validPrecipMm = rawPrecip !== null ? Math.max(0, Math.round(rawPrecip * 10) / 10) : null;

    const rawHumidity = finiteNum(item.humidity);
    const validHumidity = rawHumidity !== null ? Math.max(0, Math.min(100, Math.round(rawHumidity))) : null;

    const windParts = item.wind ? item.wind.trim().split(/\s+/) : [];
    const parsedWind = windParts[0] ? Number(windParts[0]) : NaN;
    const validWindSpeed = Number.isFinite(parsedWind) ? Math.round(parsedWind) : null;
    const validWindDirection = windParts[2] || null;

    const rawUv = finiteNum(item.uv);
    const validUv = rawUv !== null ? Math.round(rawUv * 10) / 10 : null;

    const rawVis = finiteNum((item as unknown as { visibilityKm?: number }).visibilityKm);
    const visibilityKm = rawVis !== null ? Math.round(rawVis * 10) / 10 : null;

    const rawCloud = finiteNum((item as unknown as { cloudCover?: number }).cloudCover);
    const validCloudCover = rawCloud !== null ? Math.max(0, Math.min(100, Math.round(rawCloud))) : null;

    return {
      ...item,
      validHigh,
      validLow,
      validRainProb,
      validPrecipMm,
      validHumidity,
      validWindSpeed,
      validWindDirection,
      validUv,
      dateFormatted: item.date || '—',
      visibilityKm,
      validCloudCover,
    };
  });
}

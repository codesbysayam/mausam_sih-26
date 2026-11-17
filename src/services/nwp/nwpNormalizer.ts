// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Normalizer & Agreement Computation
// Transparent, scientifically grounded rules for model output normalization & cross-model comparison.
// ====================================================================

import { NWPForecastPoint, ModelComparisonPoint } from '../../types/nwp';

export function sanitizePoint(point: any, leadHours: number): NWPForecastPoint {
  const safeNum = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : Math.round(n * 10) / 10;
  };

  return {
    validTime: point.validTime || new Date().toISOString(),
    leadHours,
    temperature2m: safeNum(point.temperature2m),
    apparentTemperature: safeNum(point.apparentTemperature),
    dewPoint2m: safeNum(point.dewPoint2m),
    relativeHumidity: safeNum(point.relativeHumidity),
    precipitation: safeNum(point.precipitation),
    rain: safeNum(point.rain),
    showers: safeNum(point.showers),
    snowfall: safeNum(point.snowfall),
    precipitationProbability: safeNum(point.precipitationProbability),
    windSpeed10m: safeNum(point.windSpeed10m),
    windDirection10m: safeNum(point.windDirection10m),
    windGusts10m: safeNum(point.windGusts10m),
    pressureMSL: safeNum(point.pressureMSL),
    cloudCover: safeNum(point.cloudCover),
    cloudCoverLow: safeNum(point.cloudCoverLow),
    cloudCoverMid: safeNum(point.cloudCoverMid),
    cloudCoverHigh: safeNum(point.cloudCoverHigh),
    visibility: safeNum(point.visibility),
    cape: safeNum(point.cape),
    liftedIndex: safeNum(point.liftedIndex),
    weatherCode: point.weatherCode !== undefined ? Number(point.weatherCode) : undefined,
  };
}

/**
 * Computes transparent agreement level for numerical parameters across available models
 */
export function computeModelAgreement(
  valA?: number,
  valB?: number,
  valC?: number,
  type: 'temperature' | 'precip' | 'wind' | 'pressure' = 'temperature'
): 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA' {
  const values = [valA, valB, valC].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (values.length < 2) return 'INSUFFICIENT_DATA';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;

  switch (type) {
    case 'temperature':
      // High agreement if spread <= 1.5°C; Moderate <= 3.5°C; Low > 3.5°C
      if (spread <= 1.5) return 'HIGH';
      if (spread <= 3.5) return 'MODERATE';
      return 'LOW';

    case 'precip':
      // High agreement if spread <= 2.0 mm; Moderate <= 8.0 mm; Low > 8.0 mm
      if (spread <= 2.0) return 'HIGH';
      if (spread <= 8.0) return 'MODERATE';
      return 'LOW';

    case 'wind':
      // High agreement if spread <= 6 km/h; Moderate <= 15 km/h; Low > 15 km/h
      if (spread <= 6.0) return 'HIGH';
      if (spread <= 15.0) return 'MODERATE';
      return 'LOW';

    case 'pressure':
      // High agreement if spread <= 2.0 hPa; Moderate <= 4.0 hPa; Low > 4.0 hPa
      if (spread <= 2.0) return 'HIGH';
      if (spread <= 4.0) return 'MODERATE';
      return 'LOW';

    default:
      return 'MODERATE';
  }
}

/**
 * Aligns forecast points across multiple models by leadHour/validTime for comparison mode
 */
export function alignModelComparison(
  wrfPoints: NWPForecastPoint[] = [],
  gefsPoints: NWPForecastPoint[] = [],
  ecmwfPoints: NWPForecastPoint[] = []
): ModelComparisonPoint[] {
  // Use timestamps from whichever models are available
  const timeMap = new Map<string, { wrf?: NWPForecastPoint; gefs?: NWPForecastPoint; ecmwf?: NWPForecastPoint; leadHours: number }>();

  const populate = (pts: NWPForecastPoint[], modelKey: 'wrf' | 'gefs' | 'ecmwf') => {
    pts.forEach((p) => {
      // Normalize validTime to hour boundary
      const key = p.validTime.slice(0, 13);
      const existing = timeMap.get(key) || { leadHours: p.leadHours };
      existing[modelKey] = p;
      if (existing.leadHours === undefined) existing.leadHours = p.leadHours;
      timeMap.set(key, existing);
    });
  };

  populate(wrfPoints, 'wrf');
  populate(gefsPoints, 'gefs');
  populate(ecmwfPoints, 'ecmwf');

  const sortedKeys = Array.from(timeMap.keys()).sort();

  return sortedKeys.map((key) => {
    const entry = timeMap.get(key)!;
    const wrf = entry.wrf;
    const gefs = entry.gefs;
    const ecmwf = entry.ecmwf;

    return {
      validTime: (wrf || gefs || ecmwf)?.validTime || key,
      leadHours: entry.leadHours,
      wrf,
      gefs,
      ecmwf,
      tempAgreement: computeModelAgreement(wrf?.temperature2m, gefs?.temperature2m, ecmwf?.temperature2m, 'temperature'),
      precipAgreement: computeModelAgreement(wrf?.precipitation, gefs?.precipitation, ecmwf?.precipitation, 'precip'),
      windAgreement: computeModelAgreement(wrf?.windSpeed10m, gefs?.windSpeed10m, ecmwf?.windSpeed10m, 'wind'),
      pressureAgreement: computeModelAgreement(wrf?.pressureMSL, gefs?.pressureMSL, ecmwf?.pressureMSL, 'pressure'),
    };
  });
}

// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Unified Weather Service for Ask MAUSAM
// Executes real tools: IMD (when configured) -> Open-Meteo fallback
// ====================================================================

import {
  CurrentWeatherContext,
  ForecastContext,
  AgricultureContext,
  MarineContext,
  DataSourceContext,
} from '../../types/askMausam';
import { finiteNumber } from '../../../shared/weatherContract';
import { fetchImdObservation } from './imdAdapter';
import { fetchOpenMeteoBundle, OpenMeteoBundle } from './openMeteoAdapter';

export interface UnifiedWeatherResult {
  current?: CurrentWeatherContext;
  forecast?: ForecastContext;
  agriculture?: AgricultureContext;
  marine?: MarineContext;
  sources: DataSourceContext[];
}

export interface LiveMarineTelemetry {
  waveHeightM?: number | null;
  seaSurfaceTempC?: number | null;
  tideStatus?: string;
}

/**
 * Pure derivation of agriculture context from verified current & soil telemetry.
 * Never fabricates default humidity (60%), wind (10 km/h), or rainfall (0 mm).
 */
export function deriveAgricultureContext(
  current: CurrentWeatherContext | undefined,
  soilData?: Pick<OpenMeteoBundle, 'soilMoisture' | 'soilTemperature' | 'evapotranspiration'>
): AgricultureContext | undefined {
  if (!current) return undefined;

  const soilMoisture = finiteNumber(soilData?.soilMoisture) ?? undefined;
  const soilTemp = finiteNumber(soilData?.soilTemperature) ?? undefined;
  const et0 = finiteNumber(soilData?.evapotranspiration) ?? undefined;
  const rainProb = finiteNumber(current.precipitationProbability) ?? undefined;
  const rainMm = finiteNumber(current.precipitationMm) ?? undefined;
  const temp = finiteNumber(current.temperatureC) ?? undefined;
  const humidity = finiteNumber(current.humidity) ?? undefined;
  const windSpeed = finiteNumber(current.windSpeedKmh) ?? undefined;

  let spraySuitability: 'OPTIMAL' | 'MODERATE' | 'NOT_RECOMMENDED' | undefined;
  const hasDecisionMetric =
    rainProb !== undefined ||
    rainMm !== undefined ||
    windSpeed !== undefined ||
    temp !== undefined;

  if (hasDecisionMetric) {
    if (
      (rainProb !== undefined && rainProb > 40) ||
      (rainMm !== undefined && rainMm > 2) ||
      (windSpeed !== undefined && windSpeed > 20)
    ) {
      spraySuitability = 'NOT_RECOMMENDED';
    } else if (
      (rainProb !== undefined && rainProb > 20) ||
      (windSpeed !== undefined && windSpeed > 15) ||
      (temp !== undefined && temp > 35)
    ) {
      spraySuitability = 'MODERATE';
    } else {
      spraySuitability = 'OPTIMAL';
    }
  }

  const moistureSentence =
    soilMoisture !== undefined
      ? `Topsoil moisture is ${Math.round(soilMoisture * 100)}%. `
      : 'Topsoil moisture observation is currently unavailable. ';

  let guidanceSentence = 'Insufficient surface telemetry to score spraying suitability.';
  if (spraySuitability === 'NOT_RECOMMENDED') {
    guidanceSentence = 'Pesticide/fertilizer spraying NOT recommended due to elevated wind or rain risk.';
  } else if (spraySuitability === 'MODERATE') {
    guidanceSentence = 'Exercise caution during chemical application; calm morning window preferred.';
  } else if (spraySuitability === 'OPTIMAL') {
    guidanceSentence = 'Observed surface conditions are favorable for spraying, irrigation scheduling, and field operations.';
  }

  return {
    soilMoisture0To1cm: soilMoisture,
    soilTemperatureC: soilTemp,
    rainfall24hMm: rainMm,
    precipitationProbability: rainProb,
    temperatureC: temp,
    humidity,
    evapotranspirationMm: et0,
    spraySuitability,
    advisoryText: `${moistureSentence}${guidanceSentence}`,
  };
}

/**
 * Pure derivation of marine context.
 * Strictly prohibits fabricating wave height from wind speed or SST from air temperature.
 */
export function deriveMarineContext(
  isCoastal: boolean | undefined,
  current: CurrentWeatherContext | undefined,
  liveMarine?: LiveMarineTelemetry
): MarineContext | undefined {
  if (!isCoastal || !current) return undefined;

  const windKmh = finiteNumber(current.windSpeedKmh);
  const windKts = windKmh !== null ? Math.round(windKmh * 0.539957) : undefined;
  const waveHeightM = finiteNumber(liveMarine?.waveHeightM) ?? undefined;
  const seaSurfaceTempC = finiteNumber(liveMarine?.seaSurfaceTempC) ?? undefined;

  const seaCondition =
    waveHeightM !== undefined
      ? waveHeightM >= 2.5
        ? 'Rough'
        : waveHeightM >= 1.25
          ? 'Moderate'
          : 'Smooth to Slight'
      : undefined;

  let coastalAdvisory: string;
  if (windKts !== undefined && windKts > 25) {
    coastalAdvisory =
      'Squally coastal winds detected; fishermen should check official INCOIS/IMD marine bulletins before venturing offshore.';
  } else if (waveHeightM === undefined && seaSurfaceTempC === undefined) {
    coastalAdvisory =
      'Live marine buoy wave height and sea-surface temperature are unavailable in this surface feed; consult INCOIS/Open-Meteo Marine for sea state.';
  } else {
    coastalAdvisory = 'Consult official INCOIS and IMD coastal bulletins prior to marine operations.';
  }

  return {
    waveHeightM,
    seaSurfaceTempC,
    tideStatus: liveMarine?.tideStatus,
    windSpeedKts: windKts,
    seaCondition,
    coastalAdvisory,
  };
}

export async function getAuthoritativeWeather(
  latitude: number,
  longitude: number,
  options?: {
    stationCode?: string;
    isCoastal?: boolean;
    liveMarine?: LiveMarineTelemetry;
  }
): Promise<UnifiedWeatherResult> {
  const sources: DataSourceContext[] = [];

  // 1. Try Official IMD Observation first
  const imdRes = await fetchImdObservation(options?.stationCode, latitude, longitude);
  sources.push(imdRes.source);

  // 2. Fetch Open-Meteo bundle for forecast & complete telemetry
  const openMeteoRes = await fetchOpenMeteoBundle(latitude, longitude);
  sources.push(openMeteoRes.source);

  // Determine current weather: prefer IMD if available, otherwise Open-Meteo
  const current = imdRes.available && imdRes.current ? imdRes.current : openMeteoRes.current;

  const agriculture = deriveAgricultureContext(current, openMeteoRes);
  const marine = deriveMarineContext(options?.isCoastal, current, options?.liveMarine);

  return {
    current,
    forecast: openMeteoRes.forecast,
    agriculture,
    marine,
    sources,
  };
}

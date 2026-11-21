// ====================================================================
// MAUSAM — Unified meteorological context service
// Source priority: verified IMD station observation, then Open-Meteo model.
// This module never invents missing weather, agricultural, or marine values.
// ====================================================================

import {
  CurrentWeatherContext,
  ForecastContext,
  AgricultureContext,
  MarineContext,
  DataSourceContext,
} from '../../types/askMausam';
import { fetchImdObservation } from './imdAdapter';
import { fetchOpenMeteoBundle } from './openMeteoAdapter';

export interface UnifiedWeatherResult {
  current?: CurrentWeatherContext;
  forecast?: ForecastContext;
  agriculture?: AgricultureContext;
  marine?: MarineContext;
  sources: DataSourceContext[];
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function buildAgricultureContext(
  current: CurrentWeatherContext | undefined,
  openMeteo: Awaited<ReturnType<typeof fetchOpenMeteoBundle>>
): AgricultureContext | undefined {
  if (!current) return undefined;

  const soilMoisture = finite(openMeteo.soilMoisture) ? openMeteo.soilMoisture : undefined;
  const soilTemperature = finite(openMeteo.soilTemperature) ? openMeteo.soilTemperature : undefined;
  const evapotranspiration = finite(openMeteo.evapotranspiration)
    ? openMeteo.evapotranspiration
    : undefined;
  const rainProbability = finite(current.precipitationProbability)
    ? current.precipitationProbability
    : undefined;
  const windSpeed = finite(current.windSpeedKmh) ? current.windSpeedKmh : undefined;
  const temperature = finite(current.temperatureC) ? current.temperatureC : undefined;
  const humidity = finite(current.humidity) ? current.humidity : undefined;

  // Do not infer a spray window from missing precipitation or wind observations.
  const canAssessSprayWindow =
    rainProbability !== undefined &&
    windSpeed !== undefined &&
    temperature !== undefined;

  let spraySuitability: AgricultureContext['spraySuitability'];
  let advisoryText: string;

  if (!canAssessSprayWindow) {
    advisoryText =
      'Spray-window assessment is unavailable because one or more required forecast inputs (rain probability, wind speed, or temperature) were not reported by the selected source.';
  } else if (rainProbability > 40 || windSpeed > 20) {
    spraySuitability = 'NOT_RECOMMENDED';
    advisoryText =
      'Chemical application is not recommended under the retrieved rain-probability and wind conditions. Reassess when a newer forecast is available.';
  } else if (rainProbability > 20 || windSpeed > 15 || temperature > 35) {
    spraySuitability = 'MODERATE';
    advisoryText =
      'Conditions require caution. Review the latest district agrometeorological advisory before scheduling field operations.';
  } else {
    spraySuitability = 'OPTIMAL';
    advisoryText =
      'The available weather inputs do not indicate the configured rain, wind, or heat constraints. Confirm crop-specific guidance before field application.';
  }

  return {
    soilMoisture0To1cm: soilMoisture,
    soilTemperatureC: soilTemperature,
    // Current-hour precipitation is deliberately not relabelled as 24-hour rainfall.
    rainfall24hMm: undefined,
    precipitationProbability: rainProbability,
    temperatureC: temperature,
    humidity,
    evapotranspirationMm: evapotranspiration,
    spraySuitability,
    advisoryText,
  };
}

export async function getAuthoritativeWeather(
  latitude: number,
  longitude: number,
  options?: {
    stationCode?: string;
    isCoastal?: boolean;
  }
): Promise<UnifiedWeatherResult> {
  const sources: DataSourceContext[] = [];

  // Run independent providers concurrently; neither provider blocks the other.
  const [imdRes, openMeteoRes] = await Promise.all([
    fetchImdObservation(options?.stationCode, latitude, longitude),
    fetchOpenMeteoBundle(latitude, longitude),
  ]);

  sources.push(imdRes.source, openMeteoRes.source);

  // Explicit source precedence: a verified IMD observation wins; otherwise
  // use the Open-Meteo model result with its model provenance intact.
  const current =
    imdRes.available && imdRes.current
      ? imdRes.current
      : openMeteoRes.current;

  const agriculture = buildAgricultureContext(current, openMeteoRes);

  // Marine values must come from a marine/oceanographic provider. Wind-derived
  // wave height, air-temperature-derived sea temperature and assumed tides
  // are not valid substitutes and are intentionally not generated here.
  const marine: MarineContext | undefined = undefined;

  return {
    current,
    forecast: openMeteoRes.forecast,
    agriculture,
    marine,
    sources,
  };
}

// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// IMD (India Meteorological Department) Official Adapter
// Disabled by default in zero-secret keyless mode via MAUSAM_RUNTIME_CONFIG.
// Truthfully reports UNAVAILABLE without reading optional environment secrets.
// ====================================================================

import { CurrentWeatherContext, DataSourceContext } from '../../types/askMausam';
import { MAUSAM_RUNTIME_CONFIG, OPTIONAL_INTEGRATION_DISABLED_MESSAGE } from '../../../lib/providers/ai';

export interface ImdObservationBundle {
  available: boolean;
  current?: CurrentWeatherContext;
  source: DataSourceContext;
  stationCode?: string;
  stationName?: string;
}

export interface ImdRuntimeConfig {
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  apiToken?: string;
  reason?: string;
}

export function resolveImdConfig(
  _env?: Record<string, string | undefined>
): ImdRuntimeConfig {
  if (!MAUSAM_RUNTIME_CONFIG.officialImdEnabled) {
    return {
      enabled: false,
      reason: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
    };
  }

  return {
    enabled: false,
    reason: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
  };
}

function redactImdSecrets(message: string, secrets: Array<string | undefined>): string {
  let out = message;
  for (const s of secrets) {
    if (s && s.length >= 4) {
      out = out.split(s).join('[REDACTED]');
    }
  }
  return out;
}

export async function fetchImdObservation(
  stationCodeOrId?: string,
  _latitude?: number,
  _longitude?: number,
  deps?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }
): Promise<ImdObservationBundle> {
  const retrievedAt = new Date().toISOString();
  const config = resolveImdConfig(deps?.env);

  if (!config.enabled || !config.baseUrl) {
    return {
      available: false,
      source: {
        provider: 'India Meteorological Department (IMD)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: true,
        details: config.reason || OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const fetchFn = deps?.fetchImpl ?? fetch;

  try {
    const stationParam = encodeURIComponent((stationCodeOrId || '42971').trim());
    const endpoint = config.baseUrl.endsWith('/observation')
      ? `${config.baseUrl}?station=${stationParam}`
      : `${config.baseUrl}/observation?station=${stationParam}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (config.apiKey) {
      headers['X-IMD-API-KEY'] = config.apiKey;
    }
    if (config.apiToken) {
      headers.Authorization = `Bearer ${config.apiToken}`;
    }

    const res = await fetchFn(endpoint, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`IMD server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined;

    return {
      available: true,
      current: {
        temperatureC: num(data?.temperature),
        feelsLikeC: num(data?.feelsLike),
        humidity: num(data?.relativeHumidity),
        windSpeedKmh: num(data?.windSpeed),
        windDirection: typeof data?.windDirection === 'string' ? data.windDirection : undefined,
        precipitationMm: num(data?.rainfall24h),
        condition: typeof data?.weatherDescription === 'string' && data.weatherDescription.trim()
          ? data.weatherDescription.trim()
          : undefined,
        pressureHpa: num(data?.pressure),
        dewPointC: num(data?.dewPoint),
        observedAt: typeof data?.observationTime === 'string' ? data.observationTime : undefined,
      },
      source: {
        provider: 'India Meteorological Department (IMD)',
        status: 'LIVE',
        retrievedAt,
        observedAt: typeof data?.observationTime === 'string' ? data.observationTime : undefined,
        isOfficialIMD: true,
        details: `Official IMD Synoptic Station (${data?.stationName || stationCodeOrId || '42971'})`,
      },
      stationCode: data?.stationCode || stationCodeOrId,
      stationName: data?.stationName,
    };
  } catch (err: any) {
    const cleanErr = redactImdSecrets(
      err?.name === 'AbortError' ? 'Connection timeout' : err?.message || 'Connection failed',
      [config.apiKey, config.apiToken]
    );
    return {
      available: false,
      source: {
        provider: 'India Meteorological Department (IMD)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: true,
        details: `IMD Gateway: ${cleanErr}`,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

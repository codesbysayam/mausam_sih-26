// ====================================================================
// MAUSAM — IMD observation adapter
// Uses only deployment-supplied endpoint and credentials. An absent or
// unverified integration is reported as unavailable, never as live.
// ====================================================================

import { CurrentWeatherContext, DataSourceContext } from '../../types/askMausam';

export interface ImdObservationBundle {
  available: boolean;
  current?: CurrentWeatherContext;
  source: DataSourceContext;
  stationCode?: string;
  stationName?: string;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function fetchImdObservation(
  stationCodeOrId?: string,
  latitude?: number,
  longitude?: number
): Promise<ImdObservationBundle> {
  const retrievedAt = new Date().toISOString();
  const env = typeof process !== 'undefined' ? process.env : undefined;
  const enabled = env?.IMD_API_ENABLED?.trim().toLowerCase() === 'true';
  const apiKey = env?.IMD_API_KEY?.trim();
  const apiToken = env?.IMD_API_TOKEN?.trim();
  const baseUrl = env?.IMD_API_BASE_URL?.trim();

  const unavailable = (details: string): ImdObservationBundle => ({
    available: false,
    source: {
      provider: 'India Meteorological Department (IMD)',
      status: 'UNAVAILABLE',
      retrievedAt,
      isOfficialIMD: true,
      details,
    },
  });

  if (!enabled) {
    return unavailable('Direct IMD integration is disabled. The application may use separately attributed baseline providers.');
  }

  if (!baseUrl || (!apiKey && !apiToken)) {
    return unavailable('IMD integration is enabled but its base URL or credentials are missing.');
  }

  let endpoint: string;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') {
      return unavailable('IMD base URL must use HTTP or HTTPS.');
    }
    const normalizedPath = base.pathname.replace(/\/$/, '');
    base.pathname = normalizedPath.endsWith('/api/v1')
      ? `${normalizedPath}/observation`
      : `${normalizedPath}/api/v1/observation`;
    base.search = '';
    base.hash = '';
    if (stationCodeOrId) base.searchParams.set('station', stationCodeOrId);
    else if (finite(latitude) && finite(longitude)) {
      base.searchParams.set('latitude', String(latitude));
      base.searchParams.set('longitude', String(longitude));
    }
    endpoint = base.toString();
  } catch {
    return unavailable('IMD_API_BASE_URL is not a valid HTTP(S) URL.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['X-IMD-API-KEY'] = apiKey;
    if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`IMD endpoint returned HTTP ${response.status}`);
    }

    const data = await response.json() as Record<string, any>;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('IMD endpoint returned an invalid response body.');
    }

    // A successful HTTP response without an actual temperature observation
    // is not a usable current-conditions record.
    if (!finite(data.temperature)) {
      throw new Error('IMD response did not contain a valid temperature measurement.');
    }

    const observedAt =
      typeof data.observationTime === 'string' && Number.isFinite(Date.parse(data.observationTime))
        ? new Date(data.observationTime).toISOString()
        : undefined;

    const current: CurrentWeatherContext = {
      temperatureC: data.temperature,
      feelsLikeC: finite(data.feelsLike) ? data.feelsLike : undefined,
      humidity: finite(data.relativeHumidity) ? data.relativeHumidity : undefined,
      windSpeedKmh: finite(data.windSpeed) ? data.windSpeed : undefined,
      windDirection: typeof data.windDirection === 'string' ? data.windDirection : undefined,
      precipitationMm: finite(data.rainfall24h) ? data.rainfall24h : undefined,
      condition: typeof data.weatherDescription === 'string' ? data.weatherDescription : 'Condition unavailable',
      pressureHpa: finite(data.pressure) ? data.pressure : undefined,
      dewPointC: finite(data.dewPoint) ? data.dewPoint : undefined,
      observedAt,
    };

    return {
      available: true,
      current,
      source: {
        provider: 'India Meteorological Department (IMD)',
        status: 'RECENT',
        retrievedAt,
        observedAt,
        isOfficialIMD: true,
        details: `Configured IMD endpoint response${data.stationName ? ` — ${data.stationName}` : ''}. Verify the endpoint contract and station provenance for this deployment.`,
      },
      stationCode: typeof data.stationCode === 'string' ? data.stationCode : stationCodeOrId,
      stationName: typeof data.stationName === 'string' ? data.stationName : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? (error.name === 'AbortError' ? 'IMD request timed out after 8 seconds.' : error.message)
      : 'IMD request failed.';
    return unavailable(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

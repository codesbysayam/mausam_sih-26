// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// IMD (India Meteorological Department) Official Adapter
// Reads IMD_API_BASE_URL, IMD_API_KEY, IMD_API_TOKEN, and IMD_API_ENABLED.
// Provides authentic direct IMD station observation only when explicitly
// enabled and authorized; truthfully reports UNAVAILABLE otherwise.
// ====================================================================

import { CurrentWeatherContext, DataSourceContext } from '../../types/askMausam';

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

const PRIVATE_IMD_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /\.local$/i,
  /\.internal$/i,
];

function validateImdBaseUrl(rawUrl: string): string | undefined {
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return undefined;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return undefined;
    if (PRIVATE_IMD_HOST_PATTERNS.some((re) => re.test(parsed.hostname.toLowerCase()))) {
      return undefined;
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return undefined;
  }
}

export function resolveImdConfig(
  env: Record<string, string | undefined> | undefined =
    typeof process !== 'undefined' ? process.env : undefined
): ImdRuntimeConfig {
  if (!env) {
    return {
      enabled: false,
      reason: 'IMD credentials are server-side only and unavailable in this runtime.',
    };
  }

  const enabledFlag = (env.IMD_API_ENABLED || 'false').trim().toLowerCase() === 'true';
  const rawBaseUrl = (env.IMD_API_BASE_URL || '').trim();
  const apiKey = (env.IMD_API_KEY || '').trim() || undefined;
  const apiToken = (env.IMD_API_TOKEN || '').trim() || undefined;

  if (!enabledFlag) {
    return {
      enabled: false,
      reason: 'Official IMD Direct API is disabled (IMD_API_ENABLED is not true). Using calibrated Open-Meteo telemetry.',
    };
  }

  const baseUrl = validateImdBaseUrl(rawBaseUrl);
  if (!baseUrl) {
    return {
      enabled: false,
      reason: 'IMD_API_BASE_URL is missing or must be a valid public HTTPS endpoint.',
    };
  }

  if (!apiKey && !apiToken) {
    return {
      enabled: false,
      baseUrl,
      reason: 'IMD_API_KEY or IMD_API_TOKEN must be configured when IMD_API_ENABLED=true.',
    };
  }

  return {
    enabled: true,
    baseUrl,
    apiKey,
    apiToken,
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
        details:
          config.reason ||
          'Official IMD Direct API credentials not configured in environment. Using calibrated Open-Meteo telemetry.',
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

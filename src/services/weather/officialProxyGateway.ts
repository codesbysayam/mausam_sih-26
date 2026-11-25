// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Service-Level Abstraction for Official IMD & CPCB Telemetry Requests
// Automatically switches to public-domain Open-Meteo proxies whenever
// official endpoints are unconfigured, return HTTP 401/403 auth errors,
// are rate-limited, or fail upstream.
// ====================================================================

import {
  CurrentWeatherContext,
  DataSourceContext,
  ForecastContext,
} from '../../types/askMausam';
import { finiteNumber } from '../../../shared/weatherContract';
import { MAUSAM_RUNTIME_CONFIG, OPTIONAL_INTEGRATION_DISABLED_MESSAGE } from '../../../lib/providers/ai';
import { resolveImdConfig } from './imdAdapter';
import { fetchOpenMeteoBundle, OpenMeteoBundle } from './openMeteoAdapter';

export type OfficialPrimaryProvider = 'IMD' | 'CPCB';
export type ResolvedProviderId = 'IMD' | 'CPCB' | 'OPEN_METEO_PROXY';
export type ProxyFallbackReason =
  | 'UNCONFIGURED'
  | 'AUTH_ERROR'
  | 'AUTH_COOLDOWN'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | null;

export interface OfficialProxyMetadata {
  primaryProvider: OfficialPrimaryProvider;
  providerUsed: ResolvedProviderId;
  fallbackUsed: boolean;
  fallbackReason: ProxyFallbackReason;
  httpStatus: number | null;
  attribution: string;
  retrievedAt: string;
  cooldownActive: boolean;
  details: string;
}

export interface OfficialWeatherProxyResult {
  current?: CurrentWeatherContext;
  forecast?: ForecastContext;
  soilMoisture?: number;
  soilTemperature?: number;
  evapotranspiration?: number;
  sources: DataSourceContext[];
  meta: OfficialProxyMetadata;
}

export interface OfficialAqiData {
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  observedAt: string;
  scale: 'INDIAN_NAQI' | 'US_EPA_AQI';
}

export interface OfficialAqiProxyResult {
  available: boolean;
  data: OfficialAqiData | null;
  sources: DataSourceContext[];
  meta: OfficialProxyMetadata;
}

export interface CpcbRuntimeConfig {
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  reason?: string;
}

export interface GatewayFetchDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  proxyBaseUrl?: string;
}

export class ProviderAuthError extends Error {
  public readonly provider: OfficialPrimaryProvider;
  public readonly httpStatus: number;

  constructor(provider: OfficialPrimaryProvider, httpStatus: number, message?: string) {
    super(message || `${provider} returned HTTP ${httpStatus} authentication error`);
    this.name = 'ProviderAuthError';
    this.provider = provider;
    this.httpStatus = httpStatus;
  }
}

export function redactSecrets(
  message: string,
  secrets: Array<string | undefined | null>
): string {
  let out = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) {
      out = out.split(secret).join('[REDACTED]');
    }
  }
  return out;
}

export function resolveCpcbConfig(
  _env?: Record<string, string | undefined>
): CpcbRuntimeConfig {
  if (!MAUSAM_RUNTIME_CONFIG.directCpcbEnabled) {
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

interface AuthCooldownEntry {
  untilEpochMs: number;
  httpStatus: number;
  recordedAt: string;
}

const DEFAULT_AUTH_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Service-level abstraction that routes IMD and CPCB telemetry requests through
 * authorized official gateways when configured and healthy, and transparently
 * switches to public-domain Open-Meteo proxies on missing config, HTTP 401/403
 * authentication failures (with cooldown circuit breaker), or upstream errors.
 */
export class OfficialTelemetryGateway {
  private authCooldowns = new Map<OfficialPrimaryProvider, AuthCooldownEntry>();
  private readonly authCooldownMs: number;

  constructor(options?: { authCooldownMs?: number }) {
    this.authCooldownMs = options?.authCooldownMs ?? DEFAULT_AUTH_COOLDOWN_MS;
  }

  public isAuthCooldownActive(
    provider: OfficialPrimaryProvider,
    nowMs: number = Date.now()
  ): boolean {
    const entry = this.authCooldowns.get(provider);
    if (!entry) return false;
    if (nowMs >= entry.untilEpochMs) {
      this.authCooldowns.delete(provider);
      return false;
    }
    return true;
  }

  public getAuthCooldownInfo(
    provider: OfficialPrimaryProvider,
    nowMs: number = Date.now()
  ): AuthCooldownEntry | null {
    if (!this.isAuthCooldownActive(provider, nowMs)) return null;
    return this.authCooldowns.get(provider) ?? null;
  }

  public markAuthFailure(
    provider: OfficialPrimaryProvider,
    httpStatus: number,
    nowMs: number = Date.now()
  ): void {
    this.authCooldowns.set(provider, {
      untilEpochMs: nowMs + this.authCooldownMs,
      httpStatus,
      recordedAt: new Date(nowMs).toISOString(),
    });
  }

  public clearCooldown(provider?: OfficialPrimaryProvider): void {
    if (provider) {
      this.authCooldowns.delete(provider);
    } else {
      this.authCooldowns.clear();
    }
  }

  public getCircuitStatus(nowMs: number = Date.now()): Record<
    OfficialPrimaryProvider,
    { cooldownActive: boolean; httpStatus: number | null; cooldownUntil: string | null }
  > {
    const imd = this.getAuthCooldownInfo('IMD', nowMs);
    const cpcb = this.getAuthCooldownInfo('CPCB', nowMs);
    return {
      IMD: {
        cooldownActive: Boolean(imd),
        httpStatus: imd?.httpStatus ?? null,
        cooldownUntil: imd ? new Date(imd.untilEpochMs).toISOString() : null,
      },
      CPCB: {
        cooldownActive: Boolean(cpcb),
        httpStatus: cpcb?.httpStatus ?? null,
        cooldownUntil: cpcb ? new Date(cpcb.untilEpochMs).toISOString() : null,
      },
    };
  }

  /**
   * Resolves surface weather via Official IMD endpoint when configured & authorized,
   * automatically switching to the public-domain Open-Meteo proxy when unconfigured,
   * auth-rejected (401/403), rate-limited, or unavailable.
   */
  public async fetchWeatherWithFallback(
    latitude: number,
    longitude: number,
    options?: {
      stationCode?: string;
      deps?: GatewayFetchDeps;
    }
  ): Promise<OfficialWeatherProxyResult> {
    const nowFn = options?.deps?.now ?? Date.now;
    const nowMs = nowFn();
    const retrievedAt = new Date(nowMs).toISOString();
    const fetchFn = options?.deps?.fetchImpl ?? fetch;
    const env = options?.deps?.env;

    const sources: DataSourceContext[] = [];
    const imdConfig = resolveImdConfig(env);

    let imdCurrent: CurrentWeatherContext | undefined;
    let fallbackReason: ProxyFallbackReason = null;
    let httpStatus: number | null = null;
    let primaryDetails = '';

    if (!imdConfig.enabled || !imdConfig.baseUrl) {
      fallbackReason = 'UNCONFIGURED';
      primaryDetails = imdConfig.reason || OPTIONAL_INTEGRATION_DISABLED_MESSAGE;
      sources.push({
        provider: 'India Meteorological Department (IMD)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: true,
        details: primaryDetails,
      });
    } else if (this.isAuthCooldownActive('IMD', nowMs)) {
      const cd = this.getAuthCooldownInfo('IMD', nowMs);
      fallbackReason = 'AUTH_COOLDOWN';
      httpStatus = cd?.httpStatus ?? 401;
      primaryDetails = `IMD skipped during auth-error cooldown (HTTP ${httpStatus}); routing directly to public-domain Open-Meteo proxy.`;
      sources.push({
        provider: 'India Meteorological Department (IMD)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: true,
        details: primaryDetails,
      });
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const stationParam = encodeURIComponent((options?.stationCode || '42971').trim());
        const endpoint = imdConfig.baseUrl.endsWith('/observation')
          ? `${imdConfig.baseUrl}?station=${stationParam}`
          : `${imdConfig.baseUrl}/observation?station=${stationParam}`;

        const headers: Record<string, string> = { Accept: 'application/json' };
        if (imdConfig.apiKey) headers['X-IMD-API-KEY'] = imdConfig.apiKey;
        if (imdConfig.apiToken) headers.Authorization = `Bearer ${imdConfig.apiToken}`;

        const res = await fetchFn(endpoint, {
          headers,
          signal: controller.signal,
        });
        httpStatus = res.status;

        if (res.status === 401 || res.status === 403) {
          this.markAuthFailure('IMD', res.status, nowMs);
          fallbackReason = 'AUTH_ERROR';
          primaryDetails = `IMD authentication failed (HTTP ${res.status}); automatically switched to Open-Meteo proxy.`;
          sources.push({
            provider: 'India Meteorological Department (IMD)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: true,
            details: primaryDetails,
          });
        } else if (res.status === 429) {
          fallbackReason = 'RATE_LIMITED';
          primaryDetails = 'IMD rate limit exceeded (HTTP 429); switched to Open-Meteo proxy.';
          sources.push({
            provider: 'India Meteorological Department (IMD)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: true,
            details: primaryDetails,
          });
        } else if (!res.ok) {
          fallbackReason = 'UPSTREAM_ERROR';
          primaryDetails = `IMD returned HTTP ${res.status}; switched to Open-Meteo proxy.`;
          sources.push({
            provider: 'India Meteorological Department (IMD)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: true,
            details: primaryDetails,
          });
        } else {
          const data = await res.json();
          const num = (v: unknown): number | undefined => finiteNumber(v) ?? undefined;
          imdCurrent = {
            temperatureC: num(data?.temperature),
            feelsLikeC: num(data?.feelsLike),
            humidity: num(data?.relativeHumidity),
            windSpeedKmh: num(data?.windSpeed),
            windDirection: typeof data?.windDirection === 'string' ? data.windDirection : undefined,
            precipitationMm: num(data?.rainfall24h),
            condition:
              typeof data?.weatherDescription === 'string' && data.weatherDescription.trim()
                ? data.weatherDescription.trim()
                : undefined,
            pressureHpa: num(data?.pressure),
            dewPointC: num(data?.dewPoint),
            observedAt: typeof data?.observationTime === 'string' ? data.observationTime : undefined,
          };
          primaryDetails = `Official IMD Synoptic Station (${data?.stationName || options?.stationCode || '42971'})`;
          sources.push({
            provider: 'India Meteorological Department (IMD)',
            status: 'LIVE',
            retrievedAt,
            observedAt: imdCurrent.observedAt,
            isOfficialIMD: true,
            details: primaryDetails,
          });
        }
      } catch (err: any) {
        fallbackReason = 'UPSTREAM_ERROR';
        const cleanErr = redactSecrets(
          err?.name === 'AbortError' ? 'Connection timeout' : err?.message || 'Network failure',
          [imdConfig.apiKey, imdConfig.apiToken]
        );
        primaryDetails = `IMD gateway failed (${cleanErr}); switched to Open-Meteo proxy.`;
        sources.push({
          provider: 'India Meteorological Department (IMD)',
          status: 'UNAVAILABLE',
          retrievedAt,
          isOfficialIMD: true,
          details: primaryDetails,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Fetch public-domain Open-Meteo proxy bundle (provides forecast + fallback current observations)
    let openMeteoBundle: OpenMeteoBundle;
    if (options?.deps?.fetchImpl) {
      openMeteoBundle = await this.fetchOpenMeteoProxyDirect(
        latitude,
        longitude,
        options.deps.fetchImpl,
        options.deps.proxyBaseUrl,
        retrievedAt
      );
    } else {
      openMeteoBundle = await fetchOpenMeteoBundle(latitude, longitude);
    }
    sources.push(openMeteoBundle.source);

    const usedImd = Boolean(imdCurrent && fallbackReason === null);
    return {
      current: usedImd ? imdCurrent : openMeteoBundle.current,
      forecast: openMeteoBundle.forecast,
      soilMoisture: openMeteoBundle.soilMoisture,
      soilTemperature: openMeteoBundle.soilTemperature,
      evapotranspiration: openMeteoBundle.evapotranspiration,
      sources,
      meta: {
        primaryProvider: 'IMD',
        providerUsed: usedImd ? 'IMD' : 'OPEN_METEO_PROXY',
        fallbackUsed: !usedImd,
        fallbackReason: usedImd ? null : fallbackReason,
        httpStatus,
        attribution: usedImd
          ? 'Official data courtesy of India Meteorological Department (IMD), Ministry of Earth Sciences.'
          : 'Public-domain Open-Meteo Atmospheric Proxy (ECMWF/GFS Numerical Grid).',
        retrievedAt,
        cooldownActive: this.isAuthCooldownActive('IMD', nowMs),
        details: usedImd ? primaryDetails : primaryDetails || openMeteoBundle.source.details || '',
      },
    };
  }

  /**
   * Resolves air quality via Official CPCB endpoint when configured & authorized,
   * automatically switching to the public-domain Open-Meteo Air Quality proxy
   * when unconfigured, auth-rejected (401/403), rate-limited, or unavailable.
   */
  public async fetchAqiWithFallback(
    latitude: number,
    longitude: number,
    options?: {
      deps?: GatewayFetchDeps;
    }
  ): Promise<OfficialAqiProxyResult> {
    const nowFn = options?.deps?.now ?? Date.now;
    const nowMs = nowFn();
    const retrievedAt = new Date(nowMs).toISOString();
    const fetchFn = options?.deps?.fetchImpl ?? fetch;
    const env = options?.deps?.env;

    const sources: DataSourceContext[] = [];
    const cpcbConfig = resolveCpcbConfig(env);

    let fallbackReason: ProxyFallbackReason = null;
    let httpStatus: number | null = null;
    let primaryDetails = '';

    if (!cpcbConfig.enabled || !cpcbConfig.baseUrl || !cpcbConfig.apiKey) {
      fallbackReason = 'UNCONFIGURED';
      primaryDetails = cpcbConfig.reason || OPTIONAL_INTEGRATION_DISABLED_MESSAGE;
      sources.push({
        provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: false,
        details: primaryDetails,
      });
    } else if (this.isAuthCooldownActive('CPCB', nowMs)) {
      const cd = this.getAuthCooldownInfo('CPCB', nowMs);
      fallbackReason = 'AUTH_COOLDOWN';
      httpStatus = cd?.httpStatus ?? 401;
      primaryDetails = `CPCB skipped during auth-error cooldown (HTTP ${httpStatus}); routing directly to public-domain Open-Meteo Air Quality proxy.`;
      sources.push({
        provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: false,
        details: primaryDetails,
      });
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const url = `${cpcbConfig.baseUrl}/aqi_all_India?token=${encodeURIComponent(cpcbConfig.apiKey)}&lat=${latitude}&lon=${longitude}`;
        const res = await fetchFn(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        httpStatus = res.status;

        if (res.status === 401 || res.status === 403) {
          this.markAuthFailure('CPCB', res.status, nowMs);
          fallbackReason = 'AUTH_ERROR';
          primaryDetails = `CPCB authentication failed (HTTP ${res.status}); automatically switched to Open-Meteo Air Quality proxy.`;
          sources.push({
            provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: false,
            details: primaryDetails,
          });
        } else if (res.status === 429) {
          fallbackReason = 'RATE_LIMITED';
          primaryDetails = 'CPCB rate limit exceeded (HTTP 429); switched to Open-Meteo Air Quality proxy.';
          sources.push({
            provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: false,
            details: primaryDetails,
          });
        } else if (!res.ok) {
          fallbackReason = 'UPSTREAM_ERROR';
          primaryDetails = `CPCB returned HTTP ${res.status}; switched to Open-Meteo Air Quality proxy.`;
          sources.push({
            provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
            status: 'UNAVAILABLE',
            retrievedAt,
            isOfficialIMD: false,
            details: primaryDetails,
          });
        } else {
          const json = await res.json();
          const aqiNum = finiteNumber(json?.aqi);
          if (aqiNum !== null) {
            const observedAt =
              typeof json?.last_update === 'string' ? json.last_update : retrievedAt;
            const cpcbData: OfficialAqiData = {
              aqi: Math.round(aqiNum),
              pm25: finiteNumber(json?.pm25),
              pm10: finiteNumber(json?.pm10),
              no2: finiteNumber(json?.no2),
              so2: finiteNumber(json?.so2),
              co: finiteNumber(json?.co),
              o3: finiteNumber(json?.o3),
              observedAt,
              scale: 'INDIAN_NAQI',
            };
            primaryDetails = `Official CPCB CAAQMS Station (${json?.station_name || json?.station_id || 'India'})`;
            sources.push({
              provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
              status: 'LIVE',
              retrievedAt,
              observedAt,
              isOfficialIMD: false,
              details: primaryDetails,
            });
            return {
              available: true,
              data: cpcbData,
              sources,
              meta: {
                primaryProvider: 'CPCB',
                providerUsed: 'CPCB',
                fallbackUsed: false,
                fallbackReason: null,
                httpStatus,
                attribution: 'Official Central Pollution Control Board (CPCB) CAAQMS Telemetry.',
                retrievedAt,
                cooldownActive: false,
                details: primaryDetails,
              },
            };
          }
          fallbackReason = 'UPSTREAM_ERROR';
          primaryDetails = 'CPCB returned incomplete payload; switched to Open-Meteo Air Quality proxy.';
        }
      } catch (err: any) {
        fallbackReason = 'UPSTREAM_ERROR';
        const cleanErr = redactSecrets(
          err?.name === 'AbortError' ? 'Connection timeout' : err?.message || 'Network failure',
          [cpcbConfig.apiKey]
        );
        primaryDetails = `CPCB gateway failed (${cleanErr}); switched to Open-Meteo Air Quality proxy.`;
        sources.push({
          provider: 'Central Pollution Control Board (CPCB / CAAQMS)',
          status: 'UNAVAILABLE',
          retrievedAt,
          isOfficialIMD: false,
          details: primaryDetails,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Fallback to public-domain Open-Meteo Air Quality proxy
    const proxyEndpoint =
      options?.deps?.proxyBaseUrl !== undefined
        ? `${options.deps.proxyBaseUrl}/api/proxy/air-quality`
        : typeof window !== 'undefined'
        ? '/api/proxy/air-quality'
        : 'https://air-quality-api.open-meteo.com/v1/air-quality';

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone',
      timezone: 'auto',
    });

    try {
      const res = await fetchFn(`${proxyEndpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Open-Meteo Air Quality proxy returned HTTP ${res.status}`);
      }
      const json = await res.json();
      const cur = json?.current;
      if (!cur || typeof cur !== 'object') {
        throw new Error('Open-Meteo Air Quality proxy returned empty current block');
      }

      const observedAt = typeof cur.time === 'string' ? cur.time : retrievedAt;
      const aqiData: OfficialAqiData = {
        aqi: finiteNumber(cur.us_aqi),
        pm25: finiteNumber(cur.pm2_5),
        pm10: finiteNumber(cur.pm10),
        no2: finiteNumber(cur.nitrogen_dioxide),
        so2: finiteNumber(cur.sulphur_dioxide),
        co: finiteNumber(cur.carbon_monoxide),
        o3: finiteNumber(cur.ozone),
        observedAt,
        scale: 'US_EPA_AQI',
      };

      sources.push({
        provider: 'Open-Meteo Air Quality Proxy (CAMS / US EPA AQI)',
        status: 'LIVE',
        retrievedAt,
        observedAt,
        isOfficialIMD: false,
        details: 'Public-domain Open-Meteo atmospheric chemistry proxy',
      });

      return {
        available: true,
        data: aqiData,
        sources,
        meta: {
          primaryProvider: 'CPCB',
          providerUsed: 'OPEN_METEO_PROXY',
          fallbackUsed: true,
          fallbackReason,
          httpStatus,
          attribution: 'Public-domain Open-Meteo Air Quality Proxy (CAMS Model Grid).',
          retrievedAt,
          cooldownActive: this.isAuthCooldownActive('CPCB', nowMs),
          details: primaryDetails,
        },
      };
    } catch (err: any) {
      sources.push({
        provider: 'Open-Meteo Air Quality Proxy (CAMS / US EPA AQI)',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: false,
        details: err?.message || 'Proxy unreachable',
      });
      return {
        available: false,
        data: null,
        sources,
        meta: {
          primaryProvider: 'CPCB',
          providerUsed: 'OPEN_METEO_PROXY',
          fallbackUsed: true,
          fallbackReason,
          httpStatus,
          attribution: 'Air quality telemetry unavailable from both CPCB and Open-Meteo proxy.',
          retrievedAt,
          cooldownActive: this.isAuthCooldownActive('CPCB', nowMs),
          details: primaryDetails,
        },
      };
    }
  }

  private async fetchOpenMeteoProxyDirect(
    latitude: number,
    longitude: number,
    fetchFn: typeof fetch,
    proxyBaseUrl: string | undefined,
    retrievedAt: string
  ): Promise<OpenMeteoBundle> {
    const endpoint =
      proxyBaseUrl !== undefined
        ? `${proxyBaseUrl}/api/proxy/open-meteo`
        : typeof window !== 'undefined'
        ? '/api/proxy/open-meteo'
        : 'https://api.open-meteo.com/v1/forecast';

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
      timezone: 'Asia/Kolkata',
    });

    try {
      const res = await fetchFn(`${endpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Open-Meteo proxy returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const cur = data?.current || {};
      return {
        current: {
          temperatureC: finiteNumber(cur.temperature_2m) ?? undefined,
          feelsLikeC: finiteNumber(cur.apparent_temperature) ?? undefined,
          humidity: finiteNumber(cur.relative_humidity_2m) ?? undefined,
          windSpeedKmh: finiteNumber(cur.wind_speed_10m) ?? undefined,
          precipitationMm: finiteNumber(cur.precipitation) ?? undefined,
          pressureHpa: finiteNumber(cur.surface_pressure) ?? undefined,
          condition:
            typeof cur.weather_code === 'number'
              ? `WMO Code ${cur.weather_code}`
              : 'Open-Meteo Grid Observation',
          observedAt: typeof cur.time === 'string' ? cur.time : undefined,
        },
        source: {
          provider: 'Open-Meteo Public Proxy (ECMWF/GFS)',
          status: 'LIVE',
          retrievedAt,
          observedAt: typeof cur.time === 'string' ? cur.time : undefined,
          isOfficialIMD: false,
          details: 'Public-domain Open-Meteo telemetry proxy',
        },
      };
    } catch (err: any) {
      return {
        source: {
          provider: 'Open-Meteo Public Proxy (ECMWF/GFS)',
          status: 'UNAVAILABLE',
          retrievedAt,
          isOfficialIMD: false,
          details: err?.message || 'Open-Meteo proxy unreachable',
        },
      };
    }
  }
}

export const officialTelemetryGateway = new OfficialTelemetryGateway();

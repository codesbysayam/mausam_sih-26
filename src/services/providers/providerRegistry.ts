// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Independent Provider Registry & Isolated Fetch Orchestration
// Enforces independent error handling, performance.now() latency tracking,
// and Promise.allSettled() parallel isolation across SACHET, IMD, RADAR,
// AQI, WEATHER, and NWP.
// ====================================================================

import {
  ProviderId,
  ProviderState,
  ProviderStatus,
  ProviderStore,
} from '../../types/providers';
import { LocationRecord } from '../../types';
import { LocationWarningResult } from '../../types/warnings';
import { warningService } from '../warnings/warningService';
import { imdService, IMDCurrentWeather, IMDResponse } from '../imdService';
import { fetchLiveRadarData, RadarApiResponse } from '../radarService';
import { CpcbAirQualityProvider, NormalizedAirQuality } from './cpcbAirQualityProvider';
import { OpenMeteoProvider, OpenMeteoCurrentWeather, OpenMeteoDailyForecast } from './openMeteoProvider';
import { fetchAllNWPModels } from '../nwp/nwpService';
import { NWPModelRun, ModelState } from '../../types/nwp';

export interface FetchProviderOptions<T> {
  endpointType?: string;
  requestId?: string;
  defaultSource?: string;
  previousState?: ProviderState<T>;
  evaluateResult?: (result: T) => {
    status: ProviderStatus;
    source?: string;
    error?: string | null;
    fetchedAt?: string | null;
  };
}

export interface WeatherProviderPayload {
  current: OpenMeteoCurrentWeather | null;
  daily: OpenMeteoDailyForecast[];
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
}

export interface NWPProviderPayload {
  WRF: ModelState<NWPModelRun>;
  GEFS: ModelState<NWPModelRun>;
  ECMWF: ModelState<NWPModelRun>;
}

/**
 * Core isolation primitive: wraps any async provider fetch with independent
 * try/catch error capture and performance.now() latency measurement.
 * Guarantees a failure in one provider never throws or contaminates others.
 */
export async function fetchProviderSafely<T>(
  provider: string,
  request: () => Promise<T>,
  options: FetchProviderOptions<T> = {}
): Promise<ProviderState<T>> {
  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const attemptIso = new Date().toISOString();
  const requestId =
    options.requestId || `${provider.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const prevSuccess = options.previousState?.lastSuccessfulFetch ?? null;

  try {
    const result = await request();
    const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endMs - startMs));

    const evaluated = options.evaluateResult
      ? options.evaluateResult(result)
      : {
          status: (result !== null && result !== undefined ? 'LIVE' : 'UNAVAILABLE') as ProviderStatus,
          source: options.defaultSource || provider,
          error: null,
          fetchedAt: attemptIso,
        };

    const isUsable = evaluated.status === 'LIVE' || evaluated.status === 'RECENT' || evaluated.status === 'STALE';

    return {
      status: evaluated.status,
      data: isUsable ? result : options.previousState?.data && evaluated.status === 'STALE' ? options.previousState.data : null,
      error: evaluated.error ?? null,
      fetchedAt: evaluated.fetchedAt ?? attemptIso,
      latencyMs,
      source: evaluated.source || options.defaultSource || provider,
      lastSuccessfulFetch: isUsable ? (evaluated.fetchedAt ?? attemptIso) : prevSuccess,
      lastAttemptedFetch: attemptIso,
      endpointType: options.endpointType || 'REST / JSON',
      requestId,
    };
  } catch (err: any) {
    const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endMs - startMs));
    const message = err?.message || `${provider} request failed`;

    return {
      status: 'ERROR',
      data: options.previousState?.data ?? null,
      error: message,
      fetchedAt: attemptIso,
      latencyMs,
      source: options.previousState?.source || options.defaultSource || provider,
      lastSuccessfulFetch: prevSuccess,
      lastAttemptedFetch: attemptIso,
      endpointType: options.endpointType || 'REST / JSON',
      requestId,
    };
  }
}

export interface ProviderLocationContext {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  stationId?: string;
  name?: string;
}

export async function fetchSachetProvider(
  location?: ProviderLocationContext | LocationRecord,
  forceRefresh = false,
  previousState?: ProviderState<LocationWarningResult>
): Promise<ProviderState<LocationWarningResult>> {
  return fetchProviderSafely<LocationWarningResult>(
    'SACHET',
    () => warningService.getWarningForLocation(location, forceRefresh),
    {
      endpointType: 'NDMA SACHET CAP/RSS (/api/warnings)',
      defaultSource: 'NDMA / SACHET Official Warning Feed',
      previousState,
      evaluateResult: (res) => {
        if (res.status === 'UNAVAILABLE') {
          return {
            status: 'UNAVAILABLE',
            source: 'NDMA / SACHET Official Warning Feed',
            error: res.diagnostics?.error || 'Official SACHET CAP/RSS stream unreachable',
            fetchedAt: res.diagnostics?.lastAttemptAt || new Date().toISOString(),
          };
        }
        return {
          status: res.status === 'STALE' ? 'STALE' : 'LIVE',
          source: res.primaryWarning?.source || 'NDMA / SACHET Official Warning Feed',
          error: null,
          fetchedAt: res.diagnostics?.lastSuccessfulFetchAt || new Date().toISOString(),
        };
      },
    }
  );
}

export async function fetchImdProvider(
  location?: ProviderLocationContext,
  previousState?: ProviderState<IMDResponse<IMDCurrentWeather>>
): Promise<ProviderState<IMDResponse<IMDCurrentWeather>>> {
  return fetchProviderSafely<IMDResponse<IMDCurrentWeather>>(
    'IMD',
    () => imdService.getCurrentWeather(location?.stationId),
    {
      endpointType: 'IMD Synoptic Proxy (/api/weather?mode=imd)',
      defaultSource: 'India Meteorological Department (IMD)',
      previousState,
      evaluateResult: (res) => {
        if (res.status === 'error' || !res.data) {
          return {
            status: 'UNAVAILABLE',
            source: 'India Meteorological Department (IMD)',
            error: res.error?.message || 'IMD station endpoint not configured or unreachable',
            fetchedAt: res.fetchedAt || new Date().toISOString(),
          };
        }
        return {
          status: res.stale || res.status === 'stale' ? 'STALE' : 'LIVE',
          source: res.data?.stationName
            ? `IMD Synoptic (${res.data.stationName})`
            : 'India Meteorological Department (IMD)',
          error: null,
          fetchedAt: res.fetchedAt || new Date().toISOString(),
        };
      },
    }
  );
}

export async function fetchRadarProvider(
  forceRefresh = false,
  previousState?: ProviderState<RadarApiResponse>
): Promise<ProviderState<RadarApiResponse>> {
  return fetchProviderSafely<RadarApiResponse>(
    'RADAR',
    () => fetchLiveRadarData('MAXZ', forceRefresh),
    {
      endpointType: 'Radar Metadata & Tiles (/api/radar & RainViewer)',
      defaultSource: 'RainViewer Composite / IMD DWR Network',
      previousState,
      evaluateResult: (res) => {
        if (!res.available || res.status === 'UNAVAILABLE' || res.status === 'ERROR') {
          return {
            status: res.status === 'ERROR' ? 'ERROR' : 'UNAVAILABLE',
            source: res.sourceAttribution || 'Radar Composite Feed',
            error: res.message || 'Radar frames currently unavailable from upstream',
            fetchedAt: new Date().toISOString(),
          };
        }
        const status: ProviderStatus =
          res.status === 'LIVE' ? 'LIVE' : res.status === 'RECENT' ? 'RECENT' : 'STALE';
        return {
          status,
          source: res.sourceAttribution || 'Weather radar data by RainViewer',
          error: null,
          fetchedAt: res.rawTimestamp ? new Date(res.rawTimestamp).toISOString() : new Date().toISOString(),
        };
      },
    }
  );
}

export async function fetchAqiProvider(
  location: ProviderLocationContext,
  previousState?: ProviderState<NormalizedAirQuality>
): Promise<ProviderState<NormalizedAirQuality>> {
  return fetchProviderSafely<NormalizedAirQuality>(
    'AQI',
    () => CpcbAirQualityProvider.getAirQuality(location.lat, location.lng, location.city || location.name),
    {
      endpointType: 'CPCB Authoritative / Open-Meteo Chemistry',
      defaultSource: 'CPCB CAAQMS / Open-Meteo Air Quality',
      previousState,
      evaluateResult: (res) => {
        if (res.status === 'UNAVAILABLE' || res.aqi === null) {
          return {
            status: 'UNAVAILABLE',
            source: res.provider || 'Air Quality Feed',
            error: 'AQI telemetry unavailable for current coordinates',
            fetchedAt: res.retrievedAt,
          };
        }
        return {
          status: res.status === 'STALE' ? 'STALE' : 'LIVE',
          source: res.provider,
          error: null,
          fetchedAt: res.observedAt || res.retrievedAt,
        };
      },
    }
  );
}

export async function fetchWeatherProvider(
  location: ProviderLocationContext,
  previousState?: ProviderState<WeatherProviderPayload>
): Promise<ProviderState<WeatherProviderPayload>> {
  return fetchProviderSafely<WeatherProviderPayload>(
    'WEATHER',
    () => OpenMeteoProvider.getWeather(location.lat, location.lng, true),
    {
      endpointType: 'Open-Meteo Forecast API (api.open-meteo.com)',
      defaultSource: 'Open-Meteo Atmospheric Forecast',
      previousState,
      evaluateResult: (res) => {
        if (res.status === 'UNAVAILABLE' || !res.current) {
          return {
            status: 'UNAVAILABLE',
            source: 'Open-Meteo Atmospheric Forecast',
            error: 'Surface meteorological feed temporarily unreachable',
            fetchedAt: new Date().toISOString(),
          };
        }
        return {
          status: res.status === 'STALE' ? 'STALE' : 'LIVE',
          source: 'Open-Meteo Atmospheric Model',
          error: null,
          fetchedAt: res.current.observedAt || res.current.retrievedAt,
        };
      },
    }
  );
}

export async function fetchNwpProvider(
  location: ProviderLocationContext,
  previousState?: ProviderState<NWPProviderPayload>
): Promise<ProviderState<NWPProviderPayload>> {
  return fetchProviderSafely<NWPProviderPayload>(
    'NWP',
    () => fetchAllNWPModels(location.lat, location.lng, location.name || location.city || 'Selected Location'),
    {
      endpointType: 'Parallel NWP Suite (WRF / NOAA GEFS / ECMWF IFS)',
      defaultSource: 'WRF / GEFS / ECMWF Model Suite',
      previousState,
      evaluateResult: (res) => {
        const models = [res.WRF, res.GEFS, res.ECMWF];
        const available = models.filter((m) => m.status === 'live' || m.status === 'recent' || m.status === 'stale');
        const activeNames = [
          res.WRF.status !== 'unavailable' && res.WRF.status !== 'error' ? 'WRF' : null,
          res.GEFS.status !== 'unavailable' && res.GEFS.status !== 'error' ? 'GEFS' : null,
          res.ECMWF.status !== 'unavailable' && res.ECMWF.status !== 'error' ? 'ECMWF' : null,
        ].filter(Boolean);

        if (available.length === 0) {
          return {
            status: 'UNAVAILABLE',
            source: 'NWP Model Ensemble',
            error: 'All NWP model adapters (WRF, GEFS, ECMWF) unavailable',
            fetchedAt: new Date().toISOString(),
          };
        }
        return {
          status: available.length === models.length ? 'LIVE' : 'RECENT',
          source: activeNames.join(' + ') || 'NWP Model Ensemble',
          error:
            available.length < models.length
              ? `Partial NWP coverage (${available.length}/${models.length} active)`
              : null,
          fetchedAt: new Date().toISOString(),
        };
      },
    }
  );
}

export async function fetchSingleProvider(
  providerId: ProviderId,
  location: ProviderLocationContext,
  options: { forceRefresh?: boolean; previousState?: ProviderState } = {}
): Promise<ProviderState> {
  switch (providerId) {
    case 'SACHET':
      return fetchSachetProvider(location, Boolean(options.forceRefresh), options.previousState as any);
    case 'IMD':
      return fetchImdProvider(location, options.previousState as any);
    case 'RADAR':
      return fetchRadarProvider(Boolean(options.forceRefresh), options.previousState as any);
    case 'AQI':
      return fetchAqiProvider(location, options.previousState as any);
    case 'WEATHER':
      return fetchWeatherProvider(location, options.previousState as any);
    case 'NWP':
      return fetchNwpProvider(location, options.previousState as any);
  }
}

/**
 * Orchestrates all 6 providers in strict parallel via Promise.allSettled().
 * Each provider produces its own independent ProviderState.
 */
export async function fetchAllProvidersParallel(
  location: ProviderLocationContext,
  forceRefresh = false,
  previousStore?: Partial<ProviderStore>
): Promise<ProviderStore> {
  const [sachet, imd, radar, aqi, weather, nwp] = await Promise.allSettled([
    fetchSachetProvider(location, forceRefresh, previousStore?.SACHET as any),
    fetchImdProvider(location, previousStore?.IMD as any),
    fetchRadarProvider(forceRefresh, previousStore?.RADAR as any),
    fetchAqiProvider(location, previousStore?.AQI as any),
    fetchWeatherProvider(location, previousStore?.WEATHER as any),
    fetchNwpProvider(location, previousStore?.NWP as any),
  ]);

  const fallbackError = (id: ProviderId, source: string, reason: any): ProviderState => ({
    status: 'ERROR',
    data: previousStore?.[id]?.data ?? null,
    error: reason?.message || `${id} orchestration error`,
    fetchedAt: new Date().toISOString(),
    latencyMs: null,
    source,
    lastSuccessfulFetch: previousStore?.[id]?.lastSuccessfulFetch ?? null,
    lastAttemptedFetch: new Date().toISOString(),
  });

  return {
    SACHET:
      sachet.status === 'fulfilled'
        ? sachet.value
        : fallbackError('SACHET', 'NDMA / SACHET Official Warning Feed', sachet.reason),
    IMD:
      imd.status === 'fulfilled'
        ? imd.value
        : fallbackError('IMD', 'India Meteorological Department (IMD)', imd.reason),
    RADAR:
      radar.status === 'fulfilled'
        ? radar.value
        : fallbackError('RADAR', 'RainViewer / IMD DWR Composite', radar.reason),
    AQI:
      aqi.status === 'fulfilled'
        ? aqi.value
        : fallbackError('AQI', 'CPCB / Open-Meteo Air Quality', aqi.reason),
    WEATHER:
      weather.status === 'fulfilled'
        ? weather.value
        : fallbackError('WEATHER', 'Open-Meteo Atmospheric Forecast', weather.reason),
    NWP:
      nwp.status === 'fulfilled'
        ? nwp.value
        : fallbackError('NWP', 'WRF / GEFS / ECMWF Model Suite', nwp.reason),
  };
}

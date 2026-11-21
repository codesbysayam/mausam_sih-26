// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Master NWP Orchestrator Service
// Coordinates model providers (WRF, GEFS, ECMWF) using Promise.allSettled()
// Enforces non-blocking failures: an outage in one model does not disrupt others.
// ====================================================================

import { NWPModelId } from '../../data/nwpModels';
import { NWPModelDataset, NWPModelRun, ModelState } from '../../types/nwp';
import { wrfProvider } from './wrfProvider';
import { gefsProvider } from './gefsProvider';
import { ecmwfProvider } from './ecmwfProvider';
import { cacheService } from '../../../backend/cache/cacheService';

export class NWPService {
  private static instance: NWPService;
  private inFlight = new Map<string, Promise<NWPModelRun>>();

  public static getInstance(): NWPService {
    if (!NWPService.instance) {
      NWPService.instance = new NWPService();
    }
    return NWPService.instance;
  }

  public async getModelRun(
    model: NWPModelId,
    latitude: number,
    longitude: number,
    signal?: AbortSignal
  ): Promise<NWPModelRun> {
    const cacheKey = `mausam:nwp:v2:${model}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    let cachedRun: NWPModelRun | null = null;

    try {
      const cached = await cacheService.getCached<NWPModelRun>(cacheKey);
      if (cached.isHit && cached.data && cached.ageSeconds <= 36 * 60 * 60) {
        cachedRun = cached.data;
        if (!cached.isStale) return cached.data;
      } else if (cached.isHit) {
        await cacheService.deleteCached(cacheKey);
      }
    } catch (cacheError) {
      // Shared-cache failures are non-fatal. Continue to the upstream model.
      console.warn('[MAUSAM NWP] Shared cache read failed:', cacheError);
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) return existing;

    const request = (async (): Promise<NWPModelRun> => {
      let run: NWPModelRun;
      try {
        switch (model) {
          case 'WRF':
            run = await wrfProvider.getLatestRun(latitude, longitude, signal);
            break;
          case 'GEFS':
            run = await gefsProvider.getLatestRun(latitude, longitude, signal);
            break;
          case 'ECMWF':
            run = await ecmwfProvider.getLatestRun(latitude, longitude, signal);
            break;
          default:
            throw new Error(`Unsupported NWP model: ${model}`);
        }
      } catch (error: any) {
        if (cachedRun) {
          return {
            ...cachedRun,
            status: 'STALE',
            unavailableReason: `Latest refresh failed; showing the last verified run from ${cachedRun.fetchedAt}. ${error?.message || 'Upstream unavailable'}`,
          };
        }
        throw error;
      }

      if (run.status !== 'UNAVAILABLE') {
        try {
          await cacheService.setCached(
            cacheKey,
            run,
            'FORECAST',
            `MAUSAM ${model} model adapter`,
            15 * 60 * 1000
          );
        } catch (cacheError) {
          console.warn('[MAUSAM NWP] Shared cache write failed:', cacheError);
        }
        return run;
      }

      if (cachedRun) {
        return {
          ...cachedRun,
          status: 'STALE',
          unavailableReason: `Latest model run is unavailable; showing the last verified run from ${cachedRun.fetchedAt}. ${run.unavailableReason || ''}`.trim(),
        };
      }
      return run;
    })();

    this.inFlight.set(cacheKey, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  public async getFullDataset(
    latitude: number,
    longitude: number,
    locationName = 'Selected Station',
    models: NWPModelId[] = ['WRF', 'GEFS', 'ECMWF'],
    signal?: AbortSignal
  ): Promise<NWPModelDataset> {
    const results = await Promise.allSettled(
      models.map((m) => this.getModelRun(m, latitude, longitude, signal))
    );

    const modelRecord: Partial<Record<NWPModelId, NWPModelRun>> = {};
    let successCount = 0;

    results.forEach((res, index) => {
      const modelId = models[index];
      if (res.status === 'fulfilled') {
        modelRecord[modelId] = res.value;
        if (res.value.status !== 'UNAVAILABLE') {
          successCount++;
        }
      } else {
        modelRecord[modelId] = {
          model: modelId,
          provider: modelId,
          runTime: '',
          validFrom: '',
          validUntil: '',
          status: 'UNAVAILABLE',
          source: `${modelId} Adapter`,
          fetchedAt: new Date().toISOString(),
          points: [],
          unavailableReason: `${modelId} fetch failed: ${res.reason?.message || 'Upstream timeout'}`,
        };
      }
    });

    const overallStatus =
      successCount === models.length
        ? 'COMPLETE'
        : successCount > 0
        ? 'PARTIAL'
        : 'UNAVAILABLE';

    return {
      location: {
        latitude,
        longitude,
        name: locationName,
      },
      models: modelRecord,
      fetchedAt: new Date().toISOString(),
      overallStatus,
    };
  }
}

export const nwpService = NWPService.getInstance();

/**
 * Universal client fetcher for NWP data
 * Can query the local /api/nwp backend route or directly call nwpService
 */
export async function fetchNWPDataset(
  lat: number,
  lon: number,
  locationName = 'Selected Station',
  signal?: AbortSignal
): Promise<NWPModelDataset> {
  const models: NWPModelId[] = ['WRF', 'GEFS', 'ECMWF'];
  const fetchedAt = new Date().toISOString();

  const unavailable = (model: NWPModelId, reason: string): NWPModelRun => ({
    model,
    provider: `${model} upstream adapter`,
    runTime: '',
    validFrom: '',
    validUntil: '',
    status: 'UNAVAILABLE',
    source: `MAUSAM ${model} model gateway`,
    fetchedAt,
    points: [],
    unavailableReason: reason,
  });

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      name: locationName,
      models: models.join(','),
    });
    const res = await fetch(`/api/nwp?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = payload?.error || payload?.details || `NWP gateway returned HTTP ${res.status}`;
      return {
        location: { latitude: lat, longitude: lon, name: locationName },
        models: Object.fromEntries(models.map((model) => [model, unavailable(model, reason)])) as NWPModelDataset['models'],
        fetchedAt,
        overallStatus: 'UNAVAILABLE',
      };
    }

    if (!payload?.models || !payload?.location) {
      throw new Error('NWP gateway returned an invalid model dataset.');
    }
    return payload as NWPModelDataset;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    const reason = error?.message || 'NWP gateway network failure';
    return {
      location: { latitude: lat, longitude: lon, name: locationName },
      models: Object.fromEntries(models.map((model) => [model, unavailable(model, reason)])) as NWPModelDataset['models'],
      fetchedAt,
      overallStatus: 'UNAVAILABLE',
    };
  }
}

export async function fetchWRF(lat: number, lon: number, signal?: AbortSignal): Promise<NWPModelRun> {
  return wrfProvider.getLatestRun(lat, lon, signal);
}

export async function fetchGEFS(lat: number, lon: number, signal?: AbortSignal): Promise<NWPModelRun> {
  return gefsProvider.getLatestRun(lat, lon, signal);
}

export async function fetchECMWF(lat: number, lon: number, signal?: AbortSignal): Promise<NWPModelRun> {
  return ecmwfProvider.getLatestRun(lat, lon, signal);
}

/**
 * Phase 3 — Parallel NWP Fetching
 * Uses Promise.allSettled to ensure complete isolation between model runs.
 * WRF unconfigured state will NEVER block GEFS or ECMWF.
 */
export async function fetchAllNWPModels(
  lat: number,
  lon: number,
  _locationName = 'Selected Station',
  signal?: AbortSignal
): Promise<{
  WRF: ModelState<NWPModelRun>;
  GEFS: ModelState<NWPModelRun>;
  ECMWF: ModelState<NWPModelRun>;
}> {
  const reqId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // Parallel fetching with Promise.allSettled
  const results = await Promise.allSettled([
    fetchWRF(lat, lon, signal),
    fetchGEFS(lat, lon, signal),
    fetchECMWF(lat, lon, signal),
  ]);

  const mapResultToState = (
    modelId: NWPModelId,
    res: PromiseSettledResult<NWPModelRun>
  ): ModelState<NWPModelRun> => {
    if (res.status === 'fulfilled') {
      const run = res.value;
      let status: ModelState['status'] = 'recent';
      if (run.status === 'LIVE') status = 'live';
      else if (run.status === 'UNAVAILABLE') status = 'unavailable';
      else if (run.status === 'STALE') status = 'stale';

      return {
        status,
        data: run,
        error: run.status === 'UNAVAILABLE' ? (run.unavailableReason || 'Data unavailable') : null,
        fetchedAt: run.fetchedAt || nowIso,
        runTime: run.runTime || null,
        requestId: reqId,
      };
    } else {
      return {
        status: 'error',
        data: null,
        error: res.reason?.message || `${modelId} fetch failed`,
        fetchedAt: nowIso,
        runTime: null,
        requestId: reqId,
      };
    }
  };

  return {
    WRF: mapResultToState('WRF', results[0]),
    GEFS: mapResultToState('GEFS', results[1]),
    ECMWF: mapResultToState('ECMWF', results[2]),
  };
}

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
import { nwpCache } from './nwpCache';

export class NWPService {
  private static instance: NWPService;

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
    const cached = nwpCache.get(model, latitude, longitude);
    if (cached) return cached;

    let run: NWPModelRun;
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
    }

    if (run.status !== 'UNAVAILABLE') {
      nwpCache.set(model, latitude, longitude, run);
    }
    return run;
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
  try {
    const res = await fetch(`/api/nwp?lat=${lat}&lon=${lon}&name=${encodeURIComponent(locationName)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (res.ok) {
      return (await res.json()) as NWPModelDataset;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    // Fallback to client-side direct invocation if backend route is unavailable
  }

  return nwpService.getFullDataset(lat, lon, locationName, ['WRF', 'GEFS', 'ECMWF'], signal);
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

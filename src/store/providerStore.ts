// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Independent Provider Store (State, Per-Provider Cache & Isolation)
// Manages independent ProviderState objects for SACHET, IMD, RADAR,
// AQI, WEATHER, and NWP without cross-provider error contamination.
// ====================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ProviderDescriptor,
  ProviderId,
  ProviderState,
  ProviderStatus,
  ProviderStore,
  SystemDataStatus,
} from '../types/providers';
import {
  fetchAllProvidersParallel,
  fetchSingleProvider,
  ProviderLocationContext,
} from '../services/providers/providerRegistry';
import { deriveSystemDataStatus } from '../services/providers/providerStatus';
import { useLocation } from '../context/LocationContext';
import {
  safeStorageGetJson,
  safeStorageRemove,
  safeStorageSetJson,
} from '../utils/safeStorage';

export const PROVIDER_DESCRIPTORS: Record<ProviderId, ProviderDescriptor> = {
  SACHET: {
    id: 'SACHET',
    name: 'NDMA SACHET Alerts',
    category: 'GOVERNMENT',
    description: 'Official CAP / RSS disaster & severe weather alerts across India.',
    defaultSource: 'NDMA / SACHET CAP Feed',
    refreshIntervalMs: 60 * 1000,
    cacheKey: 'provider:sachet',
  },
  IMD: {
    id: 'IMD',
    name: 'IMD Synoptic & Warnings',
    category: 'GOVERNMENT',
    description: 'India Meteorological Department surface stations, AWS & district warnings.',
    defaultSource: 'India Meteorological Department (IMD)',
    refreshIntervalMs: 5 * 60 * 1000,
    cacheKey: 'provider:imd',
  },
  RADAR: {
    id: 'RADAR',
    name: 'Doppler & Composite Radar',
    category: 'OBSERVATION',
    description: 'RainViewer composite precipitation sweeps & IMD DWR coverage overlays.',
    defaultSource: 'RainViewer Composite / IMD DWR',
    refreshIntervalMs: 3 * 60 * 1000,
    cacheKey: 'provider:radar',
  },
  AQI: {
    id: 'AQI',
    name: 'Air Quality & Particulate',
    category: 'OBSERVATION',
    description: 'CPCB CAAQMS ground stations with Open-Meteo atmospheric chemistry fallback.',
    defaultSource: 'CPCB / Open-Meteo Air Quality',
    refreshIntervalMs: 8 * 60 * 1000,
    cacheKey: 'provider:aqi',
  },
  WEATHER: {
    id: 'WEATHER',
    name: 'Surface Weather & Forecast',
    category: 'OPEN_DATA',
    description: 'High-resolution hourly & 7-day point meteorology via Open-Meteo.',
    defaultSource: 'Open-Meteo Atmospheric Forecast',
    refreshIntervalMs: 3 * 60 * 1000,
    cacheKey: 'provider:weather',
  },
  NWP: {
    id: 'NWP',
    name: 'Numerical Weather Models',
    category: 'ENSEMBLE',
    description: 'Parallel atmospheric model runs from WRF, NOAA GEFS, and ECMWF IFS.',
    defaultSource: 'WRF / GEFS / ECMWF Model Suite',
    refreshIntervalMs: 10 * 60 * 1000,
    cacheKey: 'provider:nwp',
  },
};

const ALL_PROVIDER_IDS: ProviderId[] = ['SACHET', 'IMD', 'RADAR', 'AQI', 'WEATHER', 'NWP'];

function createDefaultProviderState<T = unknown>(id: ProviderId): ProviderState<T> {
  const descriptor = PROVIDER_DESCRIPTORS[id];
  return {
    status: 'LOADING',
    data: null,
    error: null,
    fetchedAt: null,
    latencyMs: null,
    source: descriptor.defaultSource,
    lastSuccessfulFetch: null,
    lastAttemptedFetch: null,
    endpointType: descriptor.description,
    requestId: null,
  };
}

const VALID_PROVIDER_STATUSES = new Set<ProviderStatus>([
  'LIVE',
  'STALE',
  'UNAVAILABLE',
  'ERROR',
  'LOADING',
]);

function isValidCachedProviderPayload(
  value: unknown
): value is ProviderState & { _cachedAt?: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.status !== undefined && !VALID_PROVIDER_STATUSES.has(candidate.status as ProviderStatus)) {
    return false;
  }
  if (candidate._cachedAt !== undefined && typeof candidate._cachedAt !== 'number') {
    return false;
  }
  return true;
}

function readCachedProviderState(id: ProviderId): ProviderState | null {
  const parsed = safeStorageGetJson<ProviderState & { _cachedAt?: number }>(
    'session',
    PROVIDER_DESCRIPTORS[id].cacheKey,
    isValidCachedProviderPayload
  );
  if (!parsed) return null;

  const maxAgeMs = Math.max(PROVIDER_DESCRIPTORS[id].refreshIntervalMs * 2, 10 * 60 * 1000);
  if (parsed._cachedAt && Date.now() - parsed._cachedAt > maxAgeMs) {
    safeStorageRemove('session', PROVIDER_DESCRIPTORS[id].cacheKey);
    return null;
  }

  return {
    status: VALID_PROVIDER_STATUSES.has(parsed.status) ? parsed.status : 'STALE',
    data: parsed.data ?? null,
    error: typeof parsed.error === 'string' ? parsed.error : null,
    fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : null,
    latencyMs: typeof parsed.latencyMs === 'number' && Number.isFinite(parsed.latencyMs) ? parsed.latencyMs : null,
    source: typeof parsed.source === 'string' && parsed.source.trim()
      ? parsed.source
      : PROVIDER_DESCRIPTORS[id].defaultSource,
    lastSuccessfulFetch: typeof parsed.lastSuccessfulFetch === 'string' ? parsed.lastSuccessfulFetch : null,
    lastAttemptedFetch: typeof parsed.lastAttemptedFetch === 'string' ? parsed.lastAttemptedFetch : null,
    endpointType: typeof parsed.endpointType === 'string' ? parsed.endpointType : PROVIDER_DESCRIPTORS[id].description,
    requestId: typeof parsed.requestId === 'string' ? parsed.requestId : null,
  };
}

function writeCachedProviderState(id: ProviderId, state: ProviderState): void {
  if (state.status === 'LOADING') return;
  const payload = {
    ...state,
    _cachedAt: Date.now(),
  };
  safeStorageSetJson('session', PROVIDER_DESCRIPTORS[id].cacheKey, payload);
}

export function createInitialProviderStore(hydrateFromCache = true): ProviderStore {
  return {
    SACHET: (hydrateFromCache && readCachedProviderState('SACHET')) || createDefaultProviderState('SACHET'),
    IMD: (hydrateFromCache && readCachedProviderState('IMD')) || createDefaultProviderState('IMD'),
    RADAR: (hydrateFromCache && readCachedProviderState('RADAR')) || createDefaultProviderState('RADAR'),
    AQI: (hydrateFromCache && readCachedProviderState('AQI')) || createDefaultProviderState('AQI'),
    WEATHER: (hydrateFromCache && readCachedProviderState('WEATHER')) || createDefaultProviderState('WEATHER'),
    NWP: (hydrateFromCache && readCachedProviderState('NWP')) || createDefaultProviderState('NWP'),
  };
}

export function updateProviderInStore<K extends ProviderId>(
  store: ProviderStore,
  providerId: K,
  nextState: ProviderState
): ProviderStore {
  writeCachedProviderState(providerId, nextState);
  return {
    ...store,
    [providerId]: nextState,
  };
}

interface ProviderStoreContextValue {
  providers: ProviderStore;
  systemStatus: SystemDataStatus;
  refreshProvider: (id: ProviderId, overrideLocation?: ProviderLocationContext, force?: boolean) => Promise<ProviderState>;
  refreshAllProviders: (overrideLocation?: ProviderLocationContext, force?: boolean) => Promise<void>;
  updateProvider: (id: ProviderId, nextState: ProviderState) => void;
}

const ProviderStoreContext = createContext<ProviderStoreContextValue | undefined>(undefined);

export const ProviderStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location: activeLocation } = useLocation();
  const [providers, setProviders] = useState<ProviderStore>(() => createInitialProviderStore(true));
  const providersRef = useRef<ProviderStore>(providers);
  providersRef.current = providers;

  const locationContext = useMemo<ProviderLocationContext>(
    () => ({
      lat: activeLocation.lat,
      lng: activeLocation.lng,
      city: activeLocation.city || activeLocation.name,
      district: activeLocation.district,
      state: activeLocation.state,
      country: activeLocation.country || 'India',
      stationId: activeLocation.stationId,
      name: activeLocation.name,
    }),
    [
      activeLocation.lat,
      activeLocation.lng,
      activeLocation.city,
      activeLocation.name,
      activeLocation.district,
      activeLocation.state,
      activeLocation.country,
      activeLocation.stationId,
    ]
  );

  const locationRef = useRef(locationContext);
  locationRef.current = locationContext;

  const inFlightRef = useRef<Partial<Record<ProviderId, Promise<ProviderState>>>>({});
  const cooldownUntilRef = useRef<Partial<Record<ProviderId, number>>>({});

  const updateProvider = useCallback((id: ProviderId, nextState: ProviderState) => {
    setProviders((prev) => updateProviderInStore(prev, id, nextState));
  }, []);

  const computeCooldownMs = useCallback((state: ProviderState): number => {
    const err = (state.error || '').toLowerCase();
    if (
      err.includes('401') ||
      err.includes('403') ||
      err.includes('not configured') ||
      err.includes('unauthorized') ||
      err.includes('forbidden')
    ) {
      return 30 * 60 * 1000; // 30-minute pause for auth/unconfigured providers
    }
    if (err.includes('429') || err.includes('rate limit')) {
      return 10 * 60 * 1000; // 10-minute backoff on rate-limit responses
    }
    return 0;
  }, []);

  const refreshProvider = useCallback(
    async (
      id: ProviderId,
      overrideLocation?: ProviderLocationContext,
      force = true
    ): Promise<ProviderState> => {
      const existingPromise = inFlightRef.current[id];
      if (existingPromise && !force) {
        return existingPromise;
      }

      const cooldownUntil = cooldownUntilRef.current[id] || 0;
      if (!force && cooldownUntil > Date.now()) {
        return providersRef.current[id];
      }

      const targetLoc = overrideLocation || locationRef.current;
      const current = providersRef.current[id];
      setProviders((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'LOADING',
          lastAttemptedFetch: new Date().toISOString(),
        },
      }));

      const runPromise = (async () => {
        try {
          const nextState = await fetchSingleProvider(id, targetLoc, {
            forceRefresh: force,
            previousState: current,
          });
          const backoffMs = computeCooldownMs(nextState);
          cooldownUntilRef.current[id] = backoffMs > 0 ? Date.now() + backoffMs : 0;
          setProviders((prev) => updateProviderInStore(prev, id, nextState));
          return nextState;
        } finally {
          if (inFlightRef.current[id] === runPromise) {
            delete inFlightRef.current[id];
          }
        }
      })();

      inFlightRef.current[id] = runPromise;
      return runPromise;
    },
    [computeCooldownMs]
  );

  const refreshAllProviders = useCallback(
    async (overrideLocation?: ProviderLocationContext, force = false): Promise<void> => {
      const targetLoc = overrideLocation || locationRef.current;
      const settledStore = await fetchAllProvidersParallel(targetLoc, force, providersRef.current);
      for (const id of ALL_PROVIDER_IDS) {
        const backoffMs = computeCooldownMs(settledStore[id]);
        cooldownUntilRef.current[id] = backoffMs > 0 ? Date.now() + backoffMs : 0;
        writeCachedProviderState(id, settledStore[id]);
      }
      setProviders(settledStore);
    },
    [computeCooldownMs]
  );

  // Sync all providers in parallel whenever active location coordinates change
  useEffect(() => {
    let cancelled = false;
    fetchAllProvidersParallel(locationContext, false, providersRef.current).then((settledStore) => {
      if (cancelled) return;
      for (const id of ALL_PROVIDER_IDS) {
        const backoffMs = computeCooldownMs(settledStore[id]);
        cooldownUntilRef.current[id] = backoffMs > 0 ? Date.now() + backoffMs : 0;
        writeCachedProviderState(id, settledStore[id]);
      }
      setProviders(settledStore);
    });
    return () => {
      cancelled = true;
    };
  }, [locationContext, computeCooldownMs]);

  // Independent per-provider periodic refresh respecting tab visibility and error backoff
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    for (const id of ALL_PROVIDER_IDS) {
      const intervalMs = PROVIDER_DESCRIPTORS[id].refreshIntervalMs;
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        const cooldownUntil = cooldownUntilRef.current[id] || 0;
        if (cooldownUntil > Date.now()) return;
        refreshProvider(id, locationRef.current, false).catch(() => {});
      }, intervalMs);
      timers.push(timer);
    }

    return () => {
      timers.forEach((t) => clearInterval(t));
    };
  }, [refreshProvider]);

  const systemStatus = useMemo(() => deriveSystemDataStatus(providers), [providers]);

  const value = useMemo<ProviderStoreContextValue>(
    () => ({
      providers,
      systemStatus,
      refreshProvider,
      refreshAllProviders,
      updateProvider,
    }),
    [providers, systemStatus, refreshProvider, refreshAllProviders, updateProvider]
  );

  return React.createElement(ProviderStoreContext.Provider, { value }, children);
};

export function useProviderStore(): ProviderStoreContextValue {
  const ctx = useContext(ProviderStoreContext);
  if (!ctx) {
    throw new Error('useProviderStore must be used within a ProviderStoreProvider');
  }
  return ctx;
}

export function useProvider<T = unknown>(id: ProviderId): {
  state: ProviderState<T>;
  descriptor: ProviderDescriptor;
  refresh: (force?: boolean) => Promise<ProviderState>;
} {
  const { providers, refreshProvider } = useProviderStore();
  return {
    state: providers[id] as ProviderState<T>,
    descriptor: PROVIDER_DESCRIPTORS[id],
    refresh: (force = true) => refreshProvider(id, undefined, force),
  };
}

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

function readCachedProviderState(id: ProviderId): ProviderState | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(PROVIDER_DESCRIPTORS[id].cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProviderState & { _cachedAt?: number };
    if (!parsed || typeof parsed !== 'object') return null;
    const maxAgeMs = Math.max(PROVIDER_DESCRIPTORS[id].refreshIntervalMs * 2, 10 * 60 * 1000);
    if (parsed._cachedAt && Date.now() - parsed._cachedAt > maxAgeMs) {
      return null;
    }
    return {
      status: parsed.status || 'STALE',
      data: parsed.data ?? null,
      error: parsed.error ?? null,
      fetchedAt: parsed.fetchedAt ?? null,
      latencyMs: parsed.latencyMs ?? null,
      source: parsed.source || PROVIDER_DESCRIPTORS[id].defaultSource,
      lastSuccessfulFetch: parsed.lastSuccessfulFetch ?? null,
      lastAttemptedFetch: parsed.lastAttemptedFetch ?? null,
      endpointType: parsed.endpointType,
      requestId: parsed.requestId ?? null,
    };
  } catch {
    return null;
  }
}

function writeCachedProviderState(id: ProviderId, state: ProviderState): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (state.status === 'LOADING') return;
    const payload = {
      ...state,
      _cachedAt: Date.now(),
    };
    window.sessionStorage.setItem(PROVIDER_DESCRIPTORS[id].cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or serialization errors
  }
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

  const updateProvider = useCallback((id: ProviderId, nextState: ProviderState) => {
    setProviders((prev) => updateProviderInStore(prev, id, nextState));
  }, []);

  const refreshProvider = useCallback(
    async (
      id: ProviderId,
      overrideLocation?: ProviderLocationContext,
      force = true
    ): Promise<ProviderState> => {
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

      const nextState = await fetchSingleProvider(id, targetLoc, {
        forceRefresh: force,
        previousState: current,
      });

      setProviders((prev) => updateProviderInStore(prev, id, nextState));
      return nextState;
    },
    []
  );

  const refreshAllProviders = useCallback(
    async (overrideLocation?: ProviderLocationContext, force = false): Promise<void> => {
      const targetLoc = overrideLocation || locationRef.current;
      const settledStore = await fetchAllProvidersParallel(targetLoc, force, providersRef.current);
      for (const id of ALL_PROVIDER_IDS) {
        writeCachedProviderState(id, settledStore[id]);
      }
      setProviders(settledStore);
    },
    []
  );

  // Sync all providers in parallel whenever active location coordinates change
  useEffect(() => {
    let cancelled = false;
    fetchAllProvidersParallel(locationContext, false, providersRef.current).then((settledStore) => {
      if (cancelled) return;
      for (const id of ALL_PROVIDER_IDS) {
        writeCachedProviderState(id, settledStore[id]);
      }
      setProviders(settledStore);
    });
    return () => {
      cancelled = true;
    };
  }, [locationContext]);

  // Independent per-provider periodic refresh respecting tab visibility
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];

    for (const id of ALL_PROVIDER_IDS) {
      const intervalMs = PROVIDER_DESCRIPTORS[id].refreshIntervalMs;
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
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

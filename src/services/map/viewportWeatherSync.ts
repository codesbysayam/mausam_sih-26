// ====================================================================
// MAUSAM - Debounced, Abort-Safe Viewport Weather Sync for MapLibre
// Prevents zoom/pan request bursts by subscribing to `moveend` (never
// raw wheel/zoom ticks), rounding viewport bounds for cache reuse,
// cancelling superseded requests with AbortController, and guarding
// against stale out-of-order responses.
// ====================================================================

import type { Map as MapLibreMap } from 'maplibre-gl';
import { classifyMapError, type MapErrorCategory } from './mapErrorClassifier';

export interface ViewportSnapshot {
  west: number;
  south: number;
  east: number;
  north: number;
  centerLng: number;
  centerLat: number;
  zoom: number;
  key: string;
}

export interface ViewportWeatherOptions<T> {
  /** Custom async loader receiving the rounded viewport snapshot & AbortSignal */
  fetcher?: (viewport: ViewportSnapshot, signal: AbortSignal) => Promise<T>;
  /** Optional HTTP endpoint used when no custom `fetcher` is provided */
  endpoint?: string;
  onData: (data: T, viewport: ViewportSnapshot) => void;
  onError?: (error: Error, category: MapErrorCategory) => void;
  debounceMs?: number;
  cacheTtlMs?: number;
  /** Minimum zoom required before syncing viewport-specific weather */
  minZoom?: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

export function computeRoundedViewportKey(
  west: number,
  south: number,
  east: number,
  north: number,
  zoom: number
): string {
  const round = (value: number) => Math.round(value * 10) / 10;
  const clampedWest = Math.max(-180, Math.min(180, west));
  const clampedEast = Math.max(-180, Math.min(180, east));
  const clampedSouth = Math.max(-85, Math.min(85, south));
  const clampedNorth = Math.max(-85, Math.min(85, north));
  const roundedZoom = Math.round(zoom * 2) / 2;

  return [
    round(clampedWest),
    round(clampedSouth),
    round(clampedEast),
    round(clampedNorth),
    roundedZoom,
  ].join(',');
}

export function extractViewportSnapshot(map: MapLibreMap): ViewportSnapshot {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const zoom = map.getZoom();

  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();

  return {
    west,
    south,
    east,
    north,
    centerLng: Math.round(center.lng * 100) / 100,
    centerLat: Math.round(center.lat * 100) / 100,
    zoom,
    key: computeRoundedViewportKey(west, south, east, north, zoom),
  };
}

export function attachViewportWeatherSync<T>(
  map: MapLibreMap,
  options: ViewportWeatherOptions<T>
): () => void {
  const {
    fetcher,
    endpoint,
    onData,
    onError,
    debounceMs = 700,
    cacheTtlMs = 60_000,
    minZoom = 0,
  } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let requestId = 0;
  let lastLoadedKey: string | null = null;
  let disposed = false;

  const cache = new Map<string, CacheEntry<T>>();

  async function loadViewport() {
    if (disposed) return;

    const viewport = extractViewportSnapshot(map);
    if (viewport.zoom < minZoom) return;

    // Skip identical settled viewport if already loaded and fresh
    const cached = cache.get(viewport.key);
    if (cached && cached.expiresAt > Date.now()) {
      if (lastLoadedKey !== viewport.key) {
        lastLoadedKey = viewport.key;
        onData(cached.data, viewport);
      }
      return;
    }

    // Cancel any in-flight request superseded by this newer viewport
    controller?.abort();

    const currentController = new AbortController();
    controller = currentController;
    const currentRequestId = ++requestId;

    try {
      let data: T;

      if (fetcher) {
        data = await fetcher(viewport, currentController.signal);
      } else if (endpoint) {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set('lat', String(viewport.centerLat));
        url.searchParams.set('lon', String(viewport.centerLng));
        url.searchParams.set('bbox', viewport.key);
        url.searchParams.set('zoom', String(Math.round(viewport.zoom * 10) / 10));

        const response = await fetch(url.toString(), {
          signal: currentController.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const err = new Error(`Weather viewport request failed: HTTP ${response.status}`) as Error & {
            status?: number;
          };
          err.status = response.status;
          throw err;
        }

        data = (await response.json()) as T;
      } else {
        return;
      }

      if (
        disposed ||
        currentController.signal.aborted ||
        currentRequestId !== requestId
      ) {
        return;
      }

      cache.set(viewport.key, {
        data,
        expiresAt: Date.now() + cacheTtlMs,
      });

      // Bound cache size cleanly
      if (cache.size > 48) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }

      lastLoadedKey = viewport.key;
      onData(data, viewport);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      if (disposed || currentRequestId !== requestId) {
        return;
      }

      const errObj =
        error instanceof Error
          ? error
          : new Error('Unable to load viewport weather data');
      const status = (error as { status?: number })?.status;
      const category = classifyMapError(status, errObj.message);
      onError?.(errObj, category);
    }
  }

  function scheduleLoad() {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void loadViewport();
    }, debounceMs);
  }

  // Subscribe only to settled camera motion (`moveend`), never raw wheel/zoom ticks
  map.on('moveend', scheduleLoad);

  if (map.loaded()) {
    scheduleLoad();
  } else {
    map.once('load', scheduleLoad);
  }

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    controller?.abort();
    map.off('moveend', scheduleLoad);
    map.off('load', scheduleLoad);
    cache.clear();
  };
}

// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Cache Layer
// Composite cache key: nwp:{provider}:{model}:{lat}:{lon}:{vars}:{horizon}
// Preserves last valid NWP run during stale window so upstream failures
// never wipe valid cached model output.
// ====================================================================

import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';

interface CacheEntry {
  data: NWPModelRun;
  cachedAt: number;
  expiresAt: number;
  staleUntil: number;
}

export interface NWPCacheLookup {
  data: NWPModelRun | null;
  status: 'HIT' | 'STALE' | 'MISS';
}

export interface NWPCacheKeyOptions {
  provider?: string;
  vars?: string;
  horizon?: string;
}

export class NWPCache {
  private static instance: NWPCache;
  private cache = new Map<string, CacheEntry>();

  // Default fresh TTL: 15 minutes; stale preservation window: 60 minutes
  private readonly DEFAULT_TTL_MS = 15 * 60 * 1000;
  private readonly DEFAULT_STALE_MS = 60 * 60 * 1000;

  public static getInstance(): NWPCache {
    if (!NWPCache.instance) {
      NWPCache.instance = new NWPCache();
    }
    return NWPCache.instance;
  }

  public getCacheKey(
    model: NWPModelId,
    lat: number,
    lon: number,
    options?: NWPCacheKeyOptions
  ): string {
    const provider = (options?.provider || 'open-meteo').trim().toLowerCase();
    const vars = (options?.vars || 'core').trim().toLowerCase();
    const horizon = (options?.horizon || '7d').trim().toLowerCase();
    return `nwp:${provider}:${model}:${lat.toFixed(3)}:${lon.toFixed(3)}:${vars}:${horizon}`;
  }

  public getWithMeta(
    model: NWPModelId,
    lat: number,
    lon: number,
    options?: NWPCacheKeyOptions,
    now = Date.now()
  ): NWPCacheLookup {
    const key = this.getCacheKey(model, lat, lon, options);
    const entry = this.cache.get(key);
    if (!entry) return { data: null, status: 'MISS' };

    if (now > entry.staleUntil) {
      this.cache.delete(key);
      return { data: null, status: 'MISS' };
    }

    if (now > entry.expiresAt) {
      return { data: entry.data, status: 'STALE' };
    }

    return { data: entry.data, status: 'HIT' };
  }

  public get(
    model: NWPModelId,
    lat: number,
    lon: number,
    options?: NWPCacheKeyOptions
  ): NWPModelRun | null {
    const res = this.getWithMeta(model, lat, lon, options);
    return res.status === 'HIT' ? res.data : null;
  }

  public set(
    model: NWPModelId,
    lat: number,
    lon: number,
    data: NWPModelRun,
    ttlMs = this.DEFAULT_TTL_MS,
    options?: NWPCacheKeyOptions
  ): void {
    // Never overwrite valid cache entries with unavailable runs
    if (!data || data.status === 'UNAVAILABLE') {
      return;
    }
    const key = this.getCacheKey(model, lat, lon, options);
    const now = Date.now();
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + this.DEFAULT_STALE_MS,
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const nwpCache = NWPCache.getInstance();

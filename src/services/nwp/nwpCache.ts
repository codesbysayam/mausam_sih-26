// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Cache Layer
// Cache key pattern: nwp:{model}:{lat}:{lon}:{cycle}
// Prevents duplicate upstream requests during tab switching or rapid UI interactions.
// ====================================================================

import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';

interface CacheEntry {
  data: NWPModelRun;
  cachedAt: number;
  ttlMs: number;
}

export class NWPCache {
  private static instance: NWPCache;
  private cache = new Map<string, CacheEntry>();

  // Default TTL: 15 minutes (NWP cycles update every 6 or 12 hours)
  private readonly DEFAULT_TTL_MS = 15 * 60 * 1000;

  public static getInstance(): NWPCache {
    if (!NWPCache.instance) {
      NWPCache.instance = new NWPCache();
    }
    return NWPCache.instance;
  }

  public getCacheKey(model: NWPModelId, lat: number, lon: number): string {
    return `nwp:${model}:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  }

  public get(model: NWPModelId, lat: number, lon: number): NWPModelRun | null {
    const key = this.getCacheKey(model, lat, lon);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(model: NWPModelId, lat: number, lon: number, data: NWPModelRun, ttlMs = this.DEFAULT_TTL_MS): void {
    const key = this.getCacheKey(model, lat, lon);
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const nwpCache = NWPCache.getInstance();

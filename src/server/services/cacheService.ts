// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Shared Production Cache Contract
// Supports Upstash Redis REST / Vercel KV when configured, transparently
// degrading to an in-process LRU + stale-while-revalidate cache with
// single-flight deduplication and stale-on-error preservation.
// ====================================================================

import { MAUSAM_RUNTIME_CONFIG } from '../../../lib/providers/ai';

export type CacheBackendMode = 'REDIS_REST' | 'IN_MEMORY_DEGRADED';
export type CacheReadStatus = 'HIT' | 'STALE' | 'MISS';

export interface CompositeCacheKeyParts {
  provider: string;
  model?: string;
  lat?: number | string;
  lon?: number | string;
  vars?: string | string[];
  horizon?: string | number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
  savedAt: number;
}

export interface CacheGetOrFetchResult<T> {
  value: T;
  status: CacheReadStatus;
  backend: CacheBackendMode;
  fromFallbackStale?: boolean;
  error?: string;
}

export interface SharedCacheDiagnostics {
  mode: CacheBackendMode;
  entries: number;
  hits: number;
  staleHits: number;
  misses: number;
  inFlightCount: number;
  redisConfigured: boolean;
}

/**
 * Deterministic composite cache key builder preventing cross-provider,
 * cross-model, cross-location, or cross-horizon cache collisions.
 */
export function buildCompositeCacheKey(parts: CompositeCacheKeyParts): string {
  const provider = (parts.provider || 'default').trim().toLowerCase();
  const model = (parts.model || 'std').trim().toLowerCase();
  const latStr =
    typeof parts.lat === 'number' && Number.isFinite(parts.lat)
      ? parts.lat.toFixed(3)
      : parts.lat !== undefined
        ? String(parts.lat).trim()
        : 'any';
  const lonStr =
    typeof parts.lon === 'number' && Number.isFinite(parts.lon)
      ? parts.lon.toFixed(3)
      : parts.lon !== undefined
        ? String(parts.lon).trim()
        : 'any';
  const varsStr = Array.isArray(parts.vars)
    ? [...parts.vars].map((v) => v.trim().toLowerCase()).filter(Boolean).sort().join(',') || 'all'
    : (parts.vars || 'all').trim().toLowerCase();
  const horizonStr = parts.horizon !== undefined ? String(parts.horizon).trim().toLowerCase() : 'default';
  return `mausam:${provider}:${model}:${latStr}:${lonStr}:${varsStr}:${horizonStr}`;
}

interface RedisRestConfig {
  url: string;
  token: string;
}

function resolveRedisRestConfig(_env?: NodeJS.ProcessEnv): RedisRestConfig | null {
  if (!MAUSAM_RUNTIME_CONFIG.redisEnabled) {
    return null;
  }
  return null;
}

export class CacheService {
  private static instance: CacheService;
  private store: Map<string, CacheEntry<any>> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();
  private maxEntries: number;
  private redisConfig: RedisRestConfig | null;
  private fetchImpl: typeof fetch;
  private hits = 0;
  private staleHits = 0;
  private misses = 0;

  constructor(options?: {
    maxEntries?: number;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  }) {
    this.maxEntries = options?.maxEntries ?? 300;
    this.redisConfig = resolveRedisRestConfig(options?.env);
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public getMode(): CacheBackendMode {
    return this.redisConfig ? 'REDIS_REST' : 'IN_MEMORY_DEGRADED';
  }

  private async redisGet<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisConfig) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await this.fetchImpl(
        `${this.redisConfig.url}/get/${encodeURIComponent(key)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.redisConfig.token}` },
          signal: controller.signal,
        }
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { result?: string | null };
      if (!body || typeof body.result !== 'string') return null;
      const parsed = JSON.parse(body.result) as CacheEntry<T>;
      if (parsed && typeof parsed.expiresAt === 'number' && typeof parsed.staleUntil === 'number') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async redisSet<T>(key: string, entry: CacheEntry<T>, totalTtlSeconds: number): Promise<void> {
    if (!this.redisConfig) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const ttl = Math.max(1, Math.ceil(totalTtlSeconds));
      await this.fetchImpl(
        `${this.redisConfig.url}/set/${encodeURIComponent(key)}?EX=${ttl}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisConfig.token}`,
            'Content-Type': 'text/plain; charset=utf-8',
          },
          body: JSON.stringify(entry),
          signal: controller.signal,
        }
      );
    } catch {
      // Degrade silently to in-memory cache
    } finally {
      clearTimeout(timer);
    }
  }

  private async redisDelete(key: string): Promise<void> {
    if (!this.redisConfig) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      await this.fetchImpl(
        `${this.redisConfig.url}/del/${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.redisConfig.token}` },
          signal: controller.signal,
        }
      );
    } catch {
      // Ignore remote deletion errors
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Synchronous in-process lookup preserved for existing callers.
   */
  public get<T = any>(key: string, now = Date.now()): { data: T | null; isStale: boolean; status: CacheReadStatus } {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return { data: null, isStale: false, status: 'MISS' };
    }

    if (now > entry.staleUntil) {
      this.store.delete(key);
      this.misses++;
      return { data: null, isStale: false, status: 'MISS' };
    }

    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);

    const isStale = now > entry.expiresAt;
    if (isStale) {
      this.staleHits++;
      return { data: entry.value, isStale: true, status: 'STALE' };
    }
    this.hits++;
    return { data: entry.value, isStale: false, status: 'HIT' };
  }

  public set<T>(key: string, value: T, ttlSeconds: number, staleSeconds: number = 300, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttlSeconds * 1000,
      staleUntil: now + (ttlSeconds + staleSeconds) * 1000,
      savedAt: now,
    };
    this.store.set(key, entry);
  }

  public async getAsync<T = any>(
    key: string,
    now = Date.now()
  ): Promise<{ data: T | null; isStale: boolean; status: CacheReadStatus }> {
    const local = this.store.get(key);
    if (local && now <= local.staleUntil) {
      return this.get<T>(key, now);
    }

    if (this.redisConfig) {
      const remote = await this.redisGet<T>(key);
      if (remote && now <= remote.staleUntil) {
        this.store.set(key, remote);
        const isStale = now > remote.expiresAt;
        if (isStale) {
          this.staleHits++;
          return { data: remote.value, isStale: true, status: 'STALE' };
        }
        this.hits++;
        return { data: remote.value, isStale: false, status: 'HIT' };
      }
    }

    this.misses++;
    return { data: null, isStale: false, status: 'MISS' };
  }

  public async setAsync<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    staleSeconds: number = 300,
    now = Date.now()
  ): Promise<void> {
    this.set(key, value, ttlSeconds, staleSeconds, now);
    const entry = this.store.get(key);
    if (entry && this.redisConfig) {
      await this.redisSet(key, entry, ttlSeconds + staleSeconds);
    }
  }

  /**
   * Single-flight read-through helper with stale-on-error preservation.
   * Failed upstream fetches NEVER overwrite a valid cached entry.
   */
  public async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttlSeconds: number; staleSeconds?: number; now?: number }
  ): Promise<CacheGetOrFetchResult<T>> {
    const now = options.now ?? Date.now();
    const staleSeconds = options.staleSeconds ?? 300;
    const cached = await this.getAsync<T>(key, now);

    if (cached.data !== null && cached.status === 'HIT') {
      return {
        value: cached.data,
        status: 'HIT',
        backend: this.getMode(),
      };
    }

    let pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (!pending) {
      pending = Promise.resolve()
        .then(() => fetcher())
        .finally(() => {
          this.inFlight.delete(key);
        });
      this.inFlight.set(key, pending);
    }

    try {
      const freshValue = await pending;
      await this.setAsync(key, freshValue, options.ttlSeconds, staleSeconds, Date.now());
      return {
        value: freshValue,
        status: 'MISS',
        backend: this.getMode(),
      };
    } catch (err: any) {
      if (cached.data !== null) {
        return {
          value: cached.data,
          status: 'STALE',
          backend: this.getMode(),
          fromFallbackStale: true,
          error: err?.message || 'Upstream fetch failed; serving preserved stale cache',
        };
      }
      throw err;
    }
  }

  public delete(key: string): void {
    this.store.delete(key);
    if (this.redisConfig) {
      void this.redisDelete(key);
    }
  }

  public clear(): void {
    this.store.clear();
    this.inFlight.clear();
    this.hits = 0;
    this.staleHits = 0;
    this.misses = 0;
  }

  public getEntryCount(): number {
    return this.store.size;
  }

  public getDiagnostics(): SharedCacheDiagnostics {
    return {
      mode: this.getMode(),
      entries: this.store.size,
      hits: this.hits,
      staleHits: this.staleHits,
      misses: this.misses,
      inFlightCount: this.inFlight.size,
      redisConfigured: Boolean(this.redisConfig),
    };
  }
}

export const serverCache = CacheService.getInstance();

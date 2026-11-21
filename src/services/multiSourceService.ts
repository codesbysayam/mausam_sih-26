// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Multi-Source Data Client Service
// Strictly Zero-Fake Data, Real Provider Metrics & Unified Telemetry
// ====================================================================

export type ProviderStatusCode = 'OPERATIONAL' | 'DEGRADED' | 'STALE' | 'NOT_CONFIGURED' | 'UNAVAILABLE';

export interface ProviderHealthDetail {
  code: string;
  name: string;
  category: 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA';
  status: ProviderStatusCode;
  role?: string;
  fallback?: string | null;
  currentDataSource?: string | null;
  reason?: string | null;
  nextAction?: string | null;
  isConfigured: boolean;
  requiredKey: string | null;
  latency: number | null; // in ms
  last_success: string | null;
  last_failure: string | null;
  last_checked: string;
  requests: number | null;
  successful_requests: number | null;
  failed_requests: number | null;
  cache_hits: number | null;
  cache_misses: number | null;
  error: string | null;
  source: string;
  endpoint: string;
  attribution: string;
  attributionUrl?: string;
  latestObservation?: string | null;
}

export interface SystemHealthResponse {
  buildId?: string;
  gitCommit?: string;
  warningServiceVersion?: string;
  timestamp: string;
  database?: {
    configured: boolean;
    connected: boolean;
    provider: 'POSTGRESQL' | 'NOT_CONFIGURED';
    latencyMs?: number | null;
    poolSize?: number;
    lastChecked: string;
    error?: string;
  };
  cache?: {
    configured: boolean;
    connected: boolean;
    provider: 'UPSTASH_REDIS' | 'VERCEL_KV' | 'IN_MEMORY_DEGRADED' | string;
    totalEntries: number | null;
    hits: number | null;
    misses: number | null;
    hitRatio: string;
    hitRatioNumeric: number | null;
    lastPurge: string;
    totalRequests: number | null;
  };
  summary: {
    totalSources: number;
    operational: number;
    degraded: number;
    notConfigured: number;
    unavailable: number;
    activeProviders: number;
    providerAvailabilityPct: number;
    overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    lastSyncTime: string;
  };
  requests?: {
    total: number | null;
    successful: number | null;
    failed: number | null;
    cacheHits: number | null;
    cacheMisses: number | null;
    lastSyncTime: string;
  };
  providers: {
    openMeteo: ProviderHealthDetail;
    imd: ProviderHealthDetail;
    cpcb: ProviderHealthDetail;
    sachet: ProviderHealthDetail;
    incois?: ProviderHealthDetail;
    radar?: ProviderHealthDetail;
    accuweather?: ProviderHealthDetail;
    googleWeather?: ProviderHealthDetail;
  };
}

import { apiFetch } from './apiClient';

function normalizeGatewayProvider(id: string, value: any, timestamp: string): ProviderHealthDetail {
  const rawStatus = String(value?.status || '').toUpperCase();
  const status: ProviderStatusCode =
    rawStatus === 'OPERATIONAL'
      ? 'OPERATIONAL'
      : rawStatus === 'DEGRADED'
      ? 'DEGRADED'
      : rawStatus === 'NOT_CONFIGURED'
      ? 'NOT_CONFIGURED'
      : 'UNAVAILABLE';

  const rawCategory = String(value?.category || '').toUpperCase();
  const category: ProviderHealthDetail['category'] =
    rawCategory.includes('GOVERNMENT')
      ? 'GOVERNMENT'
      : rawCategory.includes('COMMERCIAL') || rawCategory.includes('AI_')
      ? 'COMMERCIAL'
      : 'OPEN_DATA';

  return {
    code: String(value?.id || id).toUpperCase(),
    name: String(value?.name || id),
    category,
    status,
    role: 'Registered upstream health probe',
    fallback: null,
    currentDataSource: String(value?.name || id),
    reason: value?.error || (status === 'NOT_CONFIGURED' ? 'This integration is not configured.' : null),
    nextAction: status === 'NOT_CONFIGURED' ? 'Configure this integration only if its feature is required.' : null,
    isConfigured: Boolean(value?.configured),
    requiredKey: null,
    latency: typeof value?.latencyMs === 'number' ? value.latencyMs : null,
    last_success: null,
    last_failure: status === 'UNAVAILABLE' || status === 'DEGRADED' ? timestamp : null,
    last_checked: timestamp,
    requests: null,
    successful_requests: null,
    failed_requests: null,
    cache_hits: null,
    cache_misses: null,
    error: value?.error || null,
    source: String(value?.name || id),
    endpoint: '',
    attribution: 'Provider reachability probe; this does not assert data completeness.',
  };
}

export class MultiSourceService {
  public static async fetchSystemHealth(): Promise<SystemHealthResponse | null> {
    try {
      // Diagnostics must bypass the normal client cache so refresh means a
      // new server-side health check, not a replay of a previous response.
      const raw = await apiFetch<any>('/api/system?mode=health', {
        timeoutMs: 7000,
        ttlMs: 0,
        skipCache: true,
      });

      if (
        !raw ||
        !raw.summary ||
        typeof raw.summary.totalProviders !== 'number' ||
        !raw.providers ||
        typeof raw.providers !== 'object'
      ) {
        return null;
      }

      const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString();
      const providerEntries = Object.entries(raw.providers) as Array<[string, any]>;
      const mapped = Object.fromEntries(
        providerEntries.map(([id, value]) => [id, normalizeGatewayProvider(id, value, timestamp)])
      ) as Record<string, ProviderHealthDetail>;

      const operational = providerEntries.filter(([, p]) => p?.status === 'OPERATIONAL').length;
      const degraded = providerEntries.filter(([, p]) => p?.status === 'DEGRADED').length;
      const notConfigured = providerEntries.filter(([, p]) => p?.status === 'NOT_CONFIGURED').length;
      const unavailable = providerEntries.filter(([, p]) => p?.status === 'OFFLINE').length;
      const eligible = Math.max(0, providerEntries.length - notConfigured);

      return {
        buildId: raw.buildId,
        gitCommit: raw.gitCommit,
        warningServiceVersion: raw.warningServiceVersion,
        timestamp,
        summary: {
          totalSources: raw.summary.totalProviders,
          operational,
          degraded,
          notConfigured,
          unavailable,
          activeProviders: operational,
          providerAvailabilityPct: eligible > 0 ? Number(((operational / eligible) * 100).toFixed(1)) : 0,
          overallStatus: raw.status === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
          lastSyncTime: timestamp,
        },
        providers: {
          openMeteo: mapped.openMeteo,
          imd: mapped.imd,
          cpcb: mapped.cpcb,
          sachet: mapped.sachet,
          radar: mapped.radar,
          incois: mapped.incois,
          accuweather: mapped.accuweather,
          googleWeather: mapped.googleWeather,
        },
      };
    } catch {
      return null;
    }
  }

  public static async fetchSystemProviders(): Promise<any[] | null> {
    try {
      const data = await apiFetch<any>('/api/system?mode=providers', { timeoutMs: 6000, ttlMs: 60000 });
      return data?.items || data?.providers || null;
    } catch {
      return null;
    }
  }

  public static async fetchSystemReadiness(): Promise<any | null> {
    try {
      return await apiFetch<any>('/api/system?mode=readiness', { timeoutMs: 5000, ttlMs: 30000 });
    } catch {
      return null;
    }
  }
}

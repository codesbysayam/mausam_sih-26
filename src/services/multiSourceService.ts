// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Multi-Source Telemetry Gateway Client Service
// Strict Zero-Fabrication, Live no-store Probing, Contract Validation,
// Separate Gateway RTT vs Server-Measured Upstream Latency
// ====================================================================

export type ProviderStatusCode =
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'UNAVAILABLE'
  | 'NOT_REPORTED'
  | 'STALE';

export interface ProviderHealthDetail {
  id: string;
  code: string;
  name: string;
  category: 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA';
  status: ProviderStatusCode;
  role: string;
  core: boolean;
  optional?: boolean;
  message?: string | null;
  fallback?: string | null;
  currentDataSource?: string | null;
  reason: string | null;
  nextAction?: string | null;
  isConfigured: boolean;
  operational: boolean;
  reachable: boolean;
  requiredKey: string | null;
  /** Server-side measured upstream probe latency in ms, or null if not probed/reported */
  latency: number | null;
  httpStatus: number | null;
  last_success: string | null;
  last_failure: string | null;
  last_checked: string | null;
  error: string | null;
  endpoint: string;
  attribution: string;
}

export interface GatewayDatabaseState {
  reported: boolean;
  configured: boolean;
  connected: boolean;
  provider: 'POSTGRESQL' | 'NOT_CONFIGURED' | 'NOT_REPORTED';
  latencyMs: number | null;
  poolSize?: number;
  lastChecked: string | null;
  error: string | null;
  reason?: string | null;
}

export interface GatewayCacheState {
  reported: boolean;
  configured: boolean;
  connected: boolean;
  provider: 'UPSTASH_REDIS' | 'VERCEL_KV' | 'NOT_REPORTED' | string;
  latencyMs: number | null;
  totalEntries: number | null;
  hits: number | null;
  misses: number | null;
  dedupes: number | null;
  staleServes: number | null;
  hitRatio: string | null;
  hitRatioNumeric: number | null;
  totalRequests: number | null;
  lastChecked: string | null;
  error: string | null;
  reason: string | null;
}

export interface SystemHealthResponse {
  gateway: {
    reachable: true;
    endpoint: string;
    runtime: string;
    roundTripMs: number;
    probeDurationMs: number | null;
    checkedAt: string;
  };
  buildId?: string;
  gitCommit?: string;
  warningServiceVersion?: string;
  environment?: string;
  timestamp: string;
  database: GatewayDatabaseState;
  cache: GatewayCacheState;
  summary: {
    totalProviders: number;
    configuredProviders: number;
    operational: number;
    degraded: number;
    offline: number;
    unavailable: number;
    notConfigured: number;
    notReported: number;
    providerAvailabilityPct: number | null;
    overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    lastSyncTime: string;
  };
  providers: Record<string, ProviderHealthDetail>;
  providerList: ProviderHealthDetail[];
}

export type GatewayFetchErrorCode =
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'MALFORMED_JSON'
  | 'INVALID_CONTRACT'
  | 'ABORTED';

export type GatewayHealthFetchResult =
  | {
      ok: true;
      data: SystemHealthResponse;
      gatewayLatencyMs: number;
      checkedAt: string;
    }
  | {
      ok: false;
      errorCode: GatewayFetchErrorCode;
      errorMessage: string;
      httpStatus: number | null;
      gatewayLatencyMs: number;
      checkedAt: string;
    };

export const GATEWAY_HEALTH_ENDPOINT = '/api/system?mode=health';
export const GATEWAY_PROVIDERS_ENDPOINT = '/api/system?mode=providers';
export const GATEWAY_READINESS_ENDPOINT = '/api/system?mode=readiness';
export const GATEWAY_TIMEOUT_MS = 7000;

const VALID_PROVIDER_STATUSES = new Set<ProviderStatusCode>([
  'OPERATIONAL',
  'DEGRADED',
  'OFFLINE',
  'NOT_CONFIGURED',
  'DISABLED',
  'UNAVAILABLE',
  'NOT_REPORTED',
  'STALE',
]);

const KNOWN_PROVIDER_META: Record<
  string,
  { name: string; code: string; category: 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA'; role: string; core: boolean; requiredKey: string | null }
> = {
  openMeteo: {
    name: 'Open-Meteo Weather API',
    code: 'OPEN_METEO',
    category: 'OPEN_DATA',
    role: 'Primary Keyless Numerical Weather Baseline',
    core: true,
    requiredKey: null,
  },
  sachet: {
    name: 'NDMA / SACHET Disaster Alert Feed',
    code: 'SACHET',
    category: 'GOVERNMENT',
    role: 'Official National CAP Disaster Warnings',
    core: true,
    requiredKey: null,
  },
  radar: {
    name: 'RainViewer Doppler Radar Network',
    code: 'RADAR',
    category: 'OPEN_DATA',
    role: 'Precipitation Reflectivity Mosaic Index',
    core: true,
    requiredKey: null,
  },
  imdCap: {
    name: 'IMD Official CAP Warning Feed',
    code: 'IMD_CAP',
    category: 'GOVERNMENT',
    role: 'IMD CAP RSS Bulletin Mirror',
    core: false,
    requiredKey: null,
  },
  imdCyclone: {
    name: 'IMD RSMC Cyclone & Disturbance Feed',
    code: 'IMD_RSMC',
    category: 'GOVERNMENT',
    role: 'North Indian Ocean Cyclone Advisories',
    core: false,
    requiredKey: null,
  },
  osm: {
    name: 'OpenStreetMap Tile & Cartography',
    code: 'OSM_TILES',
    category: 'OPEN_DATA',
    role: 'Fallback Base Cartography Tiles',
    core: false,
    requiredKey: null,
  },
  assistant: {
    name: 'MAUSAM Meteorological Assistant',
    code: 'MAUSAM_ASSISTANT',
    category: 'OPEN_DATA',
    role: 'Grounded Local Meteorological Assistant (Keyless)',
    core: false,
    requiredKey: null,
  },
  imd: {
    name: 'India Meteorological Department Direct API',
    code: 'IMD',
    category: 'GOVERNMENT',
    role: 'Optional Direct IMD Surface Feed (Disabled)',
    core: false,
    requiredKey: null,
  },
  cpcb: {
    name: 'Central Pollution Control Board (CAAQMS)',
    code: 'CPCB',
    category: 'GOVERNMENT',
    role: 'Optional Direct CPCB Station NAQI Feed (Disabled)',
    core: false,
    requiredKey: null,
  },
  incois: {
    name: 'INCOIS Coastal Oceanography',
    code: 'INCOIS',
    category: 'GOVERNMENT',
    role: 'Optional Direct INCOIS Marine Telemetry (Disabled)',
    core: false,
    requiredKey: null,
  },
  accuweather: {
    name: 'AccuWeather Commercial API',
    code: 'ACCUWEATHER',
    category: 'COMMERCIAL',
    role: 'Optional Secondary Commercial Verification (Disabled)',
    core: false,
    requiredKey: null,
  },
  googleWeather: {
    name: 'Google Weather Commercial API',
    code: 'GOOGLE_WEATHER',
    category: 'COMMERCIAL',
    role: 'Optional Secondary Commercial Verification (Disabled)',
    core: false,
    requiredKey: null,
  },
};

function normalizeCategory(raw: unknown, fallback: 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA'): 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA' {
  const s = String(raw || '').toUpperCase();
  if (s.includes('GOV') || s.includes('DISASTER') || s.includes('AIR_QUALITY')) return 'GOVERNMENT';
  if (s.includes('COMMERCIAL') || s.includes('AI')) return 'COMMERCIAL';
  if (s.includes('OPEN') || s.includes('WEATHER') || s.includes('RADAR') || s.includes('MAP')) return 'OPEN_DATA';
  return fallback;
}

function normalizeProviderStatus(rawStatus: unknown): ProviderStatusCode {
  if (typeof rawStatus === 'string') {
    const upper = rawStatus.trim().toUpperCase() as ProviderStatusCode;
    if (VALID_PROVIDER_STATUSES.has(upper)) {
      return upper;
    }
  }
  return 'NOT_REPORTED';
}

function normalizeProviderRecord(id: string, raw: any, fallbackCheckedAt: string): ProviderHealthDetail {
  const meta = KNOWN_PROVIDER_META[id];
  if (!raw || typeof raw !== 'object') {
    return {
      id,
      code: meta?.code || id.toUpperCase(),
      name: meta?.name || id,
      category: meta?.category || 'OPEN_DATA',
      status: 'NOT_REPORTED',
      role: meta?.role || 'Registered upstream feed',
      core: meta?.core ?? false,
      reason: 'Provider status was not reported by the telemetry gateway.',
      isConfigured: false,
      operational: false,
      reachable: false,
      requiredKey: meta?.requiredKey ?? null,
      latency: null,
      httpStatus: null,
      last_success: null,
      last_failure: null,
      last_checked: null,
      error: null,
      endpoint: 'Not reported',
      attribution: 'Not reported by gateway',
    };
  }

  const status = normalizeProviderStatus(raw.status);
  const latencyCandidate = raw.latencyMs ?? raw.latency;
  const latency =
    typeof latencyCandidate === 'number' && Number.isFinite(latencyCandidate) && latencyCandidate >= 0
      ? Math.round(latencyCandidate)
      : null;

  const isConfigured =
    typeof raw.configured === 'boolean'
      ? raw.configured
      : typeof raw.isConfigured === 'boolean'
      ? raw.isConfigured
      : status !== 'NOT_CONFIGURED' && status !== 'DISABLED' && status !== 'NOT_REPORTED';

  const operational =
    typeof raw.operational === 'boolean' ? raw.operational : status === 'OPERATIONAL';

  const reachable =
    typeof raw.reachable === 'boolean' ? raw.reachable : operational || status === 'DEGRADED';

  const isDisabledOptional = status === 'DISABLED' || status === 'NOT_CONFIGURED';

  return {
    id,
    code: typeof raw.code === 'string' && raw.code ? raw.code : meta?.code || id.toUpperCase(),
    name: typeof raw.name === 'string' && raw.name ? raw.name : meta?.name || id,
    category: normalizeCategory(raw.category, meta?.category || 'OPEN_DATA'),
    status,
    role: typeof raw.role === 'string' && raw.role ? raw.role : meta?.role || 'Upstream provider',
    core: typeof raw.core === 'boolean' ? raw.core : meta?.core ?? false,
    optional: typeof raw.optional === 'boolean' ? raw.optional : isDisabledOptional || !(meta?.core ?? false),
    message: typeof raw.message === 'string' ? raw.message : null,
    fallback: typeof raw.fallback === 'string' ? raw.fallback : null,
    currentDataSource: typeof raw.currentDataSource === 'string' ? raw.currentDataSource : null,
    reason: typeof raw.reason === 'string' ? raw.reason : typeof raw.message === 'string' ? raw.message : null,
    nextAction: typeof raw.nextAction === 'string' ? raw.nextAction : null,
    isConfigured,
    operational,
    reachable,
    requiredKey: isDisabledOptional ? null : raw.requiredKey !== undefined ? raw.requiredKey : meta?.requiredKey ?? null,
    latency,
    httpStatus: typeof raw.httpStatus === 'number' ? raw.httpStatus : null,
    last_success: typeof (raw.lastSuccess ?? raw.last_success) === 'string' ? (raw.lastSuccess ?? raw.last_success) : null,
    last_failure: typeof (raw.lastFailure ?? raw.last_failure) === 'string' ? (raw.lastFailure ?? raw.last_failure) : null,
    last_checked: typeof (raw.lastChecked ?? raw.last_checked) === 'string' ? (raw.lastChecked ?? raw.last_checked) : fallbackCheckedAt,
    error: isDisabledOptional ? null : typeof raw.error === 'string' && raw.error ? raw.error : null,
    endpoint: typeof raw.endpoint === 'string' && raw.endpoint ? raw.endpoint : 'Not reported',
    attribution: typeof raw.attribution === 'string' && raw.attribution ? raw.attribution : 'MAUSAM Telemetry Registry',
  };
}

function finiteNumberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Validates and normalizes the payload returned by GET /api/system?mode=health.
 * Throws descriptive errors if required fields are missing or malformed.
 * Never fabricates database, cache, or missing provider telemetry.
 */
export function normalizeGatewayHealthPayload(
  raw: unknown,
  gatewayLatencyMs: number,
  checkedAt = new Date().toISOString()
): SystemHealthResponse {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Gateway response must be a JSON object.');
  }

  const obj = raw as Record<string, any>;

  if (typeof obj.timestamp !== 'string' || !obj.timestamp.trim()) {
    throw new Error('Gateway health payload missing valid "timestamp" field.');
  }

  if (!obj.summary || typeof obj.summary !== 'object' || Array.isArray(obj.summary)) {
    throw new Error('Gateway health payload missing required "summary" object.');
  }

  if (!obj.providers || typeof obj.providers !== 'object' || Array.isArray(obj.providers)) {
    throw new Error('Gateway health payload missing required "providers" map.');
  }

  const rawProviders = obj.providers as Record<string, any>;
  const providerKeys = Object.keys(rawProviders);
  if (providerKeys.length === 0) {
    throw new Error('Gateway health payload returned an empty "providers" map.');
  }

  // Build normalized provider map from every reported provider
  const providers: Record<string, ProviderHealthDetail> = {};
  for (const key of providerKeys) {
    providers[key] = normalizeProviderRecord(key, rawProviders[key], obj.timestamp);
  }

  const providerList = Object.values(providers);

  // Recompute truthful summary counts directly from normalized providers
  let operational = 0;
  let degraded = 0;
  let offline = 0;
  let unavailable = 0;
  let notConfigured = 0;
  let notReported = 0;
  let configuredProviders = 0;

  for (const p of providerList) {
    if (p.isConfigured) configuredProviders++;
    switch (p.status) {
      case 'OPERATIONAL':
        operational++;
        break;
      case 'DEGRADED':
        degraded++;
        break;
      case 'OFFLINE':
        offline++;
        break;
      case 'UNAVAILABLE':
        unavailable++;
        break;
      case 'NOT_CONFIGURED':
      case 'DISABLED':
        notConfigured++;
        break;
      case 'NOT_REPORTED':
      default:
        notReported++;
        break;
    }
  }

  const rawOverall = String(obj.summary.overallStatus || obj.status || '').toUpperCase();
  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  if (rawOverall === 'HEALTHY' || rawOverall === 'DEGRADED' || rawOverall === 'CRITICAL') {
    overallStatus = rawOverall;
  } else {
    const anyFailed = degraded + offline + unavailable > 0;
    overallStatus = operational === 0 ? 'CRITICAL' : anyFailed ? 'DEGRADED' : 'HEALTHY';
  }

  // Truthful Database telemetry: if omitted by gateway, explicitly reported: false
  const rawDb = obj.database && typeof obj.database === 'object' ? obj.database : null;
  const database: GatewayDatabaseState = rawDb
    ? {
        reported: rawDb.reported !== false,
        configured: Boolean(rawDb.configured),
        connected: Boolean(rawDb.connected),
        provider:
          rawDb.provider === 'POSTGRESQL' || rawDb.provider === 'NOT_CONFIGURED' || rawDb.provider === 'NOT_REPORTED'
            ? rawDb.provider
            : rawDb.configured
            ? 'POSTGRESQL'
            : 'NOT_CONFIGURED',
        latencyMs: finiteNumberOrNull(rawDb.latencyMs),
        poolSize: typeof rawDb.poolSize === 'number' ? rawDb.poolSize : undefined,
        lastChecked: typeof rawDb.lastChecked === 'string' ? rawDb.lastChecked : obj.timestamp,
        error: typeof rawDb.error === 'string' ? rawDb.error : null,
        reason: typeof rawDb.reason === 'string' ? rawDb.reason : null,
      }
    : {
        reported: false,
        configured: false,
        connected: false,
        provider: 'NOT_REPORTED',
        latencyMs: null,
        lastChecked: null,
        error: null,
        reason: 'Database telemetry not reported by gateway.',
      };

  // Truthful Cache telemetry: if omitted by gateway, explicitly reported: false (NEVER assume In-Memory Cache!)
  const rawCache = obj.cache && typeof obj.cache === 'object' ? obj.cache : null;
  const cache: GatewayCacheState = rawCache
    ? {
        reported: rawCache.reported !== false,
        configured: Boolean(rawCache.configured),
        connected: Boolean(rawCache.connected),
        provider: typeof rawCache.provider === 'string' && rawCache.provider ? rawCache.provider : 'NOT_REPORTED',
        latencyMs: finiteNumberOrNull(rawCache.latencyMs),
        totalEntries: finiteNumberOrNull(rawCache.totalEntries),
        hits: finiteNumberOrNull(rawCache.hits),
        misses: finiteNumberOrNull(rawCache.misses),
        dedupes: finiteNumberOrNull(rawCache.dedupes),
        staleServes: finiteNumberOrNull(rawCache.staleServes),
        hitRatio: typeof rawCache.hitRatio === 'string' ? rawCache.hitRatio : null,
        hitRatioNumeric: finiteNumberOrNull(rawCache.hitRatioNumeric),
        totalRequests: finiteNumberOrNull(rawCache.totalRequests),
        lastChecked: typeof rawCache.lastChecked === 'string' ? rawCache.lastChecked : obj.timestamp,
        error: typeof rawCache.error === 'string' ? rawCache.error : null,
        reason: typeof rawCache.reason === 'string' ? rawCache.reason : null,
      }
    : {
        reported: false,
        configured: false,
        connected: false,
        provider: 'NOT_REPORTED',
        latencyMs: null,
        totalEntries: null,
        hits: null,
        misses: null,
        dedupes: null,
        staleServes: null,
        hitRatio: null,
        hitRatioNumeric: null,
        totalRequests: null,
        lastChecked: null,
        error: null,
        reason: 'Cache telemetry not reported by gateway.',
      };

  const providerAvailabilityPct =
    configuredProviders > 0
      ? Math.round((operational / configuredProviders) * 1000) / 10
      : null;

  return {
    gateway: {
      reachable: true,
      endpoint: GATEWAY_HEALTH_ENDPOINT,
      runtime: typeof obj.gateway?.runtime === 'string' ? obj.gateway.runtime : 'deployed-gateway',
      roundTripMs: Math.max(0, Math.round(gatewayLatencyMs)),
      probeDurationMs: finiteNumberOrNull(obj.gateway?.probeDurationMs),
      checkedAt,
    },
    buildId: typeof obj.buildId === 'string' ? obj.buildId : undefined,
    gitCommit: typeof obj.gitCommit === 'string' ? obj.gitCommit : undefined,
    warningServiceVersion: typeof obj.warningServiceVersion === 'string' ? obj.warningServiceVersion : undefined,
    environment: typeof obj.environment === 'string' ? obj.environment : undefined,
    timestamp: obj.timestamp,
    database,
    cache,
    summary: {
      totalProviders: providerList.length,
      configuredProviders,
      operational,
      degraded,
      offline,
      unavailable,
      notConfigured,
      notReported,
      providerAvailabilityPct,
      overallStatus,
      lastSyncTime: obj.timestamp,
    },
    providers,
    providerList,
  };
}

export class MultiSourceService {
  /**
   * Live, uncached diagnostic fetch against GET /api/system?mode=health.
   * Uses cache: 'no-store', bounded 7s timeout, strict HTTP/JSON/contract validation,
   * and returns structured errors instead of falling back to stale client caches.
   */
  public static async fetchGatewayHealth(options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    fetchFn?: typeof fetch;
    endpoint?: string;
  } = {}): Promise<GatewayHealthFetchResult> {
    const timeoutMs = options.timeoutMs ?? GATEWAY_TIMEOUT_MS;
    const fetchImpl = options.fetchFn || fetch;
    const endpoint = options.endpoint || GATEWAY_HEALTH_ENDPOINT;
    const checkedAt = new Date().toISOString();
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const controller = new AbortController();
    let timedOut = false;

    const onExternalAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        return {
          ok: false,
          errorCode: 'ABORTED',
          errorMessage: 'Diagnostic request superseded by a newer refresh.',
          httpStatus: null,
          gatewayLatencyMs: 0,
          checkedAt,
        };
      }
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const res = await fetchImpl(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      const elapsed = Math.max(
        0,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime)
      );

      if (!res.ok) {
        let serverMessage = '';
        try {
          const text = await res.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              serverMessage = parsed?.error || parsed?.message || '';
            } catch {
              serverMessage = text.slice(0, 140);
            }
          }
        } catch {
          // ignore body parse failure
        }

        return {
          ok: false,
          errorCode: 'HTTP_ERROR',
          errorMessage: serverMessage
            ? `Gateway returned HTTP ${res.status} (${res.statusText || 'Error'}): ${serverMessage}`
            : `Gateway returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''} at ${endpoint}`,
          httpStatus: res.status,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch (parseErr: any) {
        return {
          ok: false,
          errorCode: 'MALFORMED_JSON',
          errorMessage: `Gateway returned HTTP ${res.status} with malformed JSON: ${parseErr?.message || 'Unable to parse JSON'}`,
          httpStatus: res.status,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      }

      try {
        const normalized = normalizeGatewayHealthPayload(json, elapsed, checkedAt);
        return {
          ok: true,
          data: normalized,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      } catch (validationErr: any) {
        return {
          ok: false,
          errorCode: 'INVALID_CONTRACT',
          errorMessage: `Invalid gateway health contract: ${validationErr?.message || 'Missing required fields'}`,
          httpStatus: res.status,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      }
    } catch (err: any) {
      const elapsed = Math.max(
        0,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime)
      );

      if (timedOut) {
        return {
          ok: false,
          errorCode: 'TIMEOUT',
          errorMessage: `Gateway health probe timed out after ${timeoutMs}ms (${endpoint}).`,
          httpStatus: null,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      }

      if (options.signal?.aborted || err?.name === 'AbortError') {
        return {
          ok: false,
          errorCode: 'ABORTED',
          errorMessage: 'Diagnostic request was cancelled.',
          httpStatus: null,
          gatewayLatencyMs: elapsed,
          checkedAt,
        };
      }

      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Network error reaching ${endpoint}: ${err?.message || 'Unable to connect'}`,
        httpStatus: null,
        gatewayLatencyMs: elapsed,
        checkedAt,
      };
    } finally {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  /**
   * Backward-compatible convenience wrapper returning normalized health or null.
   */
  public static async fetchSystemHealth(): Promise<SystemHealthResponse | null> {
    const res = await this.fetchGatewayHealth();
    return res.ok ? res.data : null;
  }

  public static async fetchSystemProviders(options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}): Promise<{
    ok: boolean;
    items: any[] | null;
    latencyMs: number;
    httpStatus: number | null;
    error: string | null;
  }> {
    const fetchImpl = options.fetchFn || fetch;
    const timeoutMs = options.timeoutMs ?? GATEWAY_TIMEOUT_MS;
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(GATEWAY_PROVIDERS_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      const latencyMs = Math.max(0, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start));
      if (!res.ok) {
        return { ok: false, items: null, latencyMs, httpStatus: res.status, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.providers) ? data.providers : null;
      if (!items) {
        return { ok: false, items: null, latencyMs, httpStatus: res.status, error: 'Invalid providers list payload' };
      }
      return { ok: true, items, latencyMs, httpStatus: res.status, error: null };
    } catch (err: any) {
      const latencyMs = Math.max(0, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start));
      return { ok: false, items: null, latencyMs, httpStatus: null, error: err?.message || 'Network error' };
    } finally {
      clearTimeout(timer);
    }
  }

  public static async fetchSystemReadiness(options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}): Promise<{
    ok: boolean;
    data: any | null;
    latencyMs: number;
    httpStatus: number | null;
    error: string | null;
  }> {
    const fetchImpl = options.fetchFn || fetch;
    const timeoutMs = options.timeoutMs ?? GATEWAY_TIMEOUT_MS;
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(GATEWAY_READINESS_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      const latencyMs = Math.max(0, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start));
      const data = await res.json().catch(() => null);
      if (!res.ok && !data) {
        return { ok: false, data: null, latencyMs, httpStatus: res.status, error: `HTTP ${res.status}` };
      }
      return { ok: res.ok, data, latencyMs, httpStatus: res.status, error: res.ok ? null : `HTTP ${res.status} (${data?.status || 'NOT_READY'})` };
    } catch (err: any) {
      const latencyMs = Math.max(0, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start));
      return { ok: false, data: null, latencyMs, httpStatus: null, error: err?.message || 'Network error' };
    } finally {
      clearTimeout(timer);
    }
  }
}

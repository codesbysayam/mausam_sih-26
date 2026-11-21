// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Consolidated System Diagnostics Gateway (/api/system)
// Multiplexed via mode query parameter: health | providers | readiness
// Direct support for:
//   /api/system?mode=health       (and /api/system/health)
//   /api/system?mode=providers    (and /api/system/providers)
//   /api/system?mode=readiness    (and /api/system/readiness)
//
// Strict Truthfulness & Independent Probe Contract:
// 1. An API key NEVER proves operational availability.
// 2. HTTP 200 NEVER proves data completeness (payload structure is validated).
// 3. All upstream latencies are measured server-side with actual elapsed time.
// 4. All probes run independently in parallel via Promise.allSettled with
//    bounded timeouts and guaranteed clearTimeout cleanup in finally blocks.
// 5. Missing shared cache/DB telemetry is reported truthfully (reported: false)
//    rather than fabricating zeros or in-memory assumptions.
// 6. Live diagnostics ALWAYS emit Cache-Control: no-store headers.
// ====================================================================

export const APP_BUILD_ID = process.env.APP_BUILD_ID || 'MAUSAM-V1.5.0-20261121';
export const GIT_COMMIT_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.GIT_COMMIT_SHA ||
  'diagnostics-gateway-v2';
export const WARNING_SERVICE_VERSION = '2.4.0-sachet-canonical';

export type GatewayProviderStatus =
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'NOT_REPORTED';

export interface ProviderDiagnostic {
  id: string;
  code: string;
  name: string;
  category: 'OPEN_DATA' | 'GOVERNMENT' | 'COMMERCIAL';
  role: string;
  core: boolean;
  requiredKey: string | null;
  configured: boolean;
  operational: boolean;
  reachable: boolean;
  status: GatewayProviderStatus;
  latencyMs: number | null;
  httpStatus: number | null;
  lastChecked: string;
  lastSuccess: string | null;
  lastFailure: string | null;
  endpoint: string;
  error: string | null;
  reason: string | null;
  attribution: string;
}

export interface GatewayDatabaseTelemetry {
  reported: boolean;
  configured: boolean;
  connected: boolean;
  provider: 'POSTGRESQL' | 'NOT_CONFIGURED' | 'NOT_REPORTED';
  latencyMs: number | null;
  lastChecked: string;
  error: string | null;
  reason?: string | null;
}

export interface GatewayCacheTelemetry {
  reported: boolean;
  configured: boolean;
  connected: boolean;
  provider: 'UPSTASH_REDIS' | 'VERCEL_KV' | 'NOT_REPORTED';
  latencyMs: number | null;
  hits: number | null;
  misses: number | null;
  dedupes: number | null;
  staleServes: number | null;
  totalEntries: number | null;
  totalRequests: number | null;
  hitRatio: string | null;
  hitRatioNumeric: number | null;
  lastChecked: string;
  error: string | null;
  reason: string | null;
}

export interface GatewayHealthPayload {
  gateway: {
    reachable: true;
    endpoint: '/api/system?mode=health';
    runtime: 'vercel-serverless' | 'node-express';
    version: string;
    probeDurationMs: number;
  };
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  buildId: string;
  gitCommit: string;
  warningServiceVersion: string;
  environment: string;
  timestamp: string;
  database: GatewayDatabaseTelemetry;
  cache: GatewayCacheTelemetry;
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
  };
  providers: Record<string, ProviderDiagnostic>;
}

export interface ProbeRuntimeDeps {
  fetchFn?: typeof fetch;
  env?: Record<string, string | undefined>;
  probeDatabaseFn?: (connectionString: string, timeoutMs: number) => Promise<{ connected: boolean; latencyMs: number | null; error: string | null }>;
}

interface ProviderProbeDefinition {
  id: string;
  code: string;
  name: string;
  category: 'OPEN_DATA' | 'GOVERNMENT' | 'COMMERCIAL';
  role: string;
  core: boolean;
  requiredKey: string | null;
  publicEndpoint: string;
  attribution: string;
  timeoutMs: number;
  buildRequest: (env: Record<string, string | undefined>) => {
    configured: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  validateResponse: (res: Response) => Promise<{ ok: boolean; status: GatewayProviderStatus; error: string | null }>;
}

// Per-instance last observed timestamps (truthful best-effort within warm instance)
const lastProbeMemory = new Map<string, { lastSuccess: string | null; lastFailure: string | null }>();

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

function sanitizeErrorMessage(raw: unknown, secrets: Array<string | undefined>): string {
  let msg = raw instanceof Error ? raw.message : String(raw || 'Upstream probe failed');
  for (const secret of secrets) {
    if (secret && secret.trim().length >= 4) {
      msg = msg.split(secret).join('[REDACTED]');
    }
  }
  return msg.slice(0, 240);
}

function sendJson(res: any, status: number, data: any, customHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cache-Control',
    'X-App-Build-Id': APP_BUILD_ID,
    'X-Warning-Service-Version': WARNING_SERVICE_VERSION,
    ...NO_STORE_HEADERS,
    ...customHeaders,
  };

  if (typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      res.setHeader(key, value);
    }
    if (typeof res.status === 'function') {
      res.status(status);
    } else {
      res.statusCode = status;
    }
    if (typeof res.end === 'function') {
      res.end(payload);
    } else if (typeof res.send === 'function') {
      res.send(payload);
    }
  } else if (typeof res.json === 'function') {
    if (typeof res.status === 'function') res.status(status);
    res.json(data);
  }
}

function parseQuery(req: any): Record<string, any> {
  if (req.query && Object.keys(req.query).length > 0) {
    return req.query;
  }
  try {
    const urlStr = req.url || '';
    const queryIndex = urlStr.indexOf('?');
    if (queryIndex === -1) return {};
    const searchParams = new URLSearchParams(urlStr.slice(queryIndex));
    const result: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

async function readTextBounded(res: Response, maxChars = 65536): Promise<string> {
  const text = await res.text();
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

const PROVIDER_DEFINITIONS: ProviderProbeDefinition[] = [
  {
    id: 'openMeteo',
    code: 'OPEN_METEO',
    name: 'Open-Meteo Weather API',
    category: 'OPEN_DATA',
    role: 'Primary Keyless Numerical Weather Baseline',
    core: true,
    requiredKey: null,
    publicEndpoint: 'https://api.open-meteo.com/v1/forecast',
    attribution: 'Open-Meteo.com under CC BY 4.0',
    timeoutMs: 3800,
    buildRequest: () => ({
      configured: true,
      url: 'https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current=temperature_2m',
      headers: { Accept: 'application/json' },
    }),
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        const temp = json?.current?.temperature_2m;
        if (typeof temp === 'number' && Number.isFinite(temp)) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Open-Meteo responded HTTP 200 but omitted numeric current.temperature_2m',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Open-Meteo returned non-JSON payload',
        };
      }
    },
  },
  {
    id: 'sachet',
    code: 'SACHET',
    name: 'NDMA / SACHET Disaster Alert Feed',
    category: 'GOVERNMENT',
    role: 'Official National CAP Disaster Warnings',
    core: true,
    requiredKey: null,
    publicEndpoint: 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
    attribution: 'National Disaster Management Authority (NDMA), Govt. of India',
    timeoutMs: 4200,
    buildRequest: () => ({
      configured: true,
      url: 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    }),
    validateResponse: async (res) => {
      const body = await readTextBounded(res);
      const lower = body.toLowerCase();
      if (lower.includes('<rss') || lower.includes('<feed') || lower.includes('<channel') || lower.includes('<alert')) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: 'SACHET responded HTTP 200 without a valid CAP/RSS XML document',
      };
    },
  },
  {
    id: 'radar',
    code: 'RADAR',
    name: 'RainViewer Doppler Radar Network',
    category: 'OPEN_DATA',
    role: 'Precipitation Reflectivity Mosaic Index',
    core: true,
    requiredKey: null,
    publicEndpoint: 'https://api.rainviewer.com/public/weather-maps.json',
    attribution: 'RainViewer Open Weather Maps API',
    timeoutMs: 3800,
    buildRequest: () => ({
      configured: true,
      url: 'https://api.rainviewer.com/public/weather-maps.json',
      headers: { Accept: 'application/json' },
    }),
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        if (Array.isArray(json?.radar?.past) && json.radar.past.length > 0) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'RainViewer responded HTTP 200 without radar.past frames',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'RainViewer returned malformed JSON payload',
        };
      }
    },
  },
  {
    id: 'imdCap',
    code: 'IMD_CAP',
    name: 'IMD Official CAP Warning Feed',
    category: 'GOVERNMENT',
    role: 'IMD CAP RSS Bulletin Mirror',
    core: false,
    requiredKey: null,
    publicEndpoint: 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml',
    attribution: 'India Meteorological Department (IMD), Ministry of Earth Sciences',
    timeoutMs: 4200,
    buildRequest: () => ({
      configured: true,
      url: 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml',
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    }),
    validateResponse: async (res) => {
      const body = await readTextBounded(res);
      const lower = body.toLowerCase();
      if (lower.includes('<rss') || lower.includes('<feed') || lower.includes('<channel') || lower.includes('<alert')) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: 'IMD CAP RSS returned HTTP 200 without valid XML feed markers',
      };
    },
  },
  {
    id: 'imdCyclone',
    code: 'IMD_RSMC',
    name: 'IMD RSMC Cyclone & Disturbance Feed',
    category: 'GOVERNMENT',
    role: 'North Indian Ocean Cyclone Advisories',
    core: false,
    requiredKey: null,
    publicEndpoint: 'https://rsmcnewdelhi.imd.gov.in',
    attribution: 'RSMC New Delhi, India Meteorological Department',
    timeoutMs: 4200,
    buildRequest: () => ({
      configured: true,
      url: 'https://rsmcnewdelhi.imd.gov.in',
      headers: { Accept: 'text/html, application/xhtml+xml, */*' },
    }),
    validateResponse: async (res) => {
      const body = await readTextBounded(res, 16384);
      if (body.trim().length > 100) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: 'RSMC New Delhi returned empty or truncated body',
      };
    },
  },
  {
    id: 'osm',
    code: 'OSM_TILES',
    name: 'OpenStreetMap Tile & Cartography',
    category: 'OPEN_DATA',
    role: 'Fallback Base Cartography Tiles',
    core: false,
    requiredKey: null,
    publicEndpoint: 'https://tile.openstreetmap.org/0/0/0.png',
    attribution: 'OpenStreetMap contributors (ODbL)',
    timeoutMs: 3500,
    buildRequest: () => ({
      configured: true,
      url: 'https://tile.openstreetmap.org/0/0/0.png',
      headers: { Accept: 'image/png, image/*;q=0.8' },
    }),
    validateResponse: async (res) => {
      const ct = (res.headers?.get('content-type') || '').toLowerCase();
      if (ct.startsWith('image/')) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: `OSM tile probe returned unexpected content-type: ${ct || 'unknown'}`,
      };
    },
  },
  {
    id: 'gemini',
    code: 'GEMINI_AI',
    name: 'Google Gemini Meteorological Assistant',
    category: 'COMMERCIAL',
    role: 'Server-Side Ask MAUSAM AI & Neural TTS',
    core: false,
    requiredKey: 'GEMINI_API_KEY',
    publicEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    attribution: 'Google GenAI API (Server-Side Only)',
    timeoutMs: 3800,
    buildRequest: (env) => {
      const key = (env.GEMINI_API_KEY || '').trim();
      return {
        configured: key.length > 0,
        url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
        headers: key ? { 'x-goog-api-key': key, Accept: 'application/json' } : undefined,
      };
    },
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        if (Array.isArray(json?.models) && json.models.length > 0) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Gemini API responded HTTP 200 without models list',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Gemini API returned non-JSON response',
        };
      }
    },
  },
  {
    id: 'imd',
    code: 'IMD',
    name: 'India Meteorological Department Direct API',
    category: 'GOVERNMENT',
    role: 'Optional Authenticated IMD Surface Feed',
    core: false,
    requiredKey: 'IMD_API_KEY',
    publicEndpoint: 'https://city.imd.gov.in',
    attribution: 'India Meteorological Department (IMD), MoES',
    timeoutMs: 4200,
    buildRequest: (env) => {
      const key = (env.IMD_API_KEY || env.IMD_API_TOKEN || '').trim();
      const base = (env.IMD_API_BASE_URL || 'https://city.imd.gov.in').trim().replace(/\/+$/, '');
      return {
        configured: key.length > 0,
        url: base,
        headers: key ? { Authorization: `Bearer ${key}`, Accept: 'application/json, text/html, */*' } : undefined,
      };
    },
    validateResponse: async (res) => {
      const body = await readTextBounded(res, 16384);
      if (body.trim().length > 20) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: 'IMD endpoint returned empty body',
      };
    },
  },
  {
    id: 'cpcb',
    code: 'CPCB',
    name: 'Central Pollution Control Board (CAAQMS)',
    category: 'GOVERNMENT',
    role: 'Optional Direct CPCB Station NAQI Feed',
    core: false,
    requiredKey: 'CPCB_API_KEY',
    publicEndpoint: 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69',
    attribution: 'Central Pollution Control Board (CPCB), MoEFCC',
    timeoutMs: 4200,
    buildRequest: (env) => {
      const key = (env.CPCB_API_KEY || '').trim();
      const customUrl = (env.CPCB_API_URL || '').trim();
      const targetUrl = customUrl
        ? customUrl
        : `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${encodeURIComponent(key)}&format=json&limit=1`;
      return {
        configured: key.length > 0,
        url: targetUrl,
        headers: { Accept: 'application/json' },
      };
    },
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        if (Array.isArray(json?.records)) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'CPCB API responded HTTP 200 without expected records array',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'CPCB API returned non-JSON payload',
        };
      }
    },
  },
  {
    id: 'incois',
    code: 'INCOIS',
    name: 'INCOIS Coastal Oceanography',
    category: 'GOVERNMENT',
    role: 'Optional Direct INCOIS Marine Telemetry',
    core: false,
    requiredKey: 'INCOIS_API_KEY',
    publicEndpoint: 'https://incois.gov.in',
    attribution: 'INCOIS, Ministry of Earth Sciences',
    timeoutMs: 4200,
    buildRequest: (env) => {
      const key = (env.INCOIS_API_KEY || '').trim();
      const base = (env.INCOIS_BASE_URL || 'https://incois.gov.in').trim();
      return {
        configured: key.length > 0,
        url: base,
        headers: key ? { Authorization: `Bearer ${key}`, Accept: 'application/json, text/html, */*' } : undefined,
      };
    },
    validateResponse: async (res) => {
      const body = await readTextBounded(res, 16384);
      if (body.trim().length > 20) {
        return { ok: true, status: 'OPERATIONAL', error: null };
      }
      return {
        ok: false,
        status: 'DEGRADED',
        error: 'INCOIS endpoint returned empty body',
      };
    },
  },
  {
    id: 'accuweather',
    code: 'ACCUWEATHER',
    name: 'AccuWeather Commercial API',
    category: 'COMMERCIAL',
    role: 'Optional Secondary Commercial Verification',
    core: false,
    requiredKey: 'ACCUWEATHER_API_KEY',
    publicEndpoint: 'https://dataservice.accuweather.com/locations/v1/topcities/50',
    attribution: 'AccuWeather, Inc.',
    timeoutMs: 3800,
    buildRequest: (env) => {
      const key = (env.ACCUWEATHER_API_KEY || '').trim();
      return {
        configured: key.length > 0,
        url: `https://dataservice.accuweather.com/locations/v1/topcities/50?apikey=${encodeURIComponent(key)}`,
        headers: { Accept: 'application/json' },
      };
    },
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'AccuWeather responded HTTP 200 without city payload',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'AccuWeather returned non-JSON payload',
        };
      }
    },
  },
  {
    id: 'googleWeather',
    code: 'GOOGLE_WEATHER',
    name: 'Google Weather Commercial API',
    category: 'COMMERCIAL',
    role: 'Optional Secondary Commercial Verification',
    core: false,
    requiredKey: 'GOOGLE_WEATHER_API_KEY',
    publicEndpoint: 'https://weather.googleapis.com/v1/currentConditions:lookup',
    attribution: 'Google Maps Platform Weather API',
    timeoutMs: 3800,
    buildRequest: (env) => {
      const key = (env.GOOGLE_WEATHER_API_KEY || '').trim();
      return {
        configured: key.length > 0,
        url: 'https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=20.2961&location.longitude=85.8245',
        headers: key ? { 'X-Goog-Api-Key': key, Accept: 'application/json' } : undefined,
      };
    },
    validateResponse: async (res) => {
      try {
        const json = await res.json();
        if (json && typeof json === 'object' && ('temperature' in json || 'weatherCondition' in json)) {
          return { ok: true, status: 'OPERATIONAL', error: null };
        }
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Google Weather responded HTTP 200 without temperature/weatherCondition fields',
        };
      } catch {
        return {
          ok: false,
          status: 'DEGRADED',
          error: 'Google Weather returned non-JSON payload',
        };
      }
    },
  },
];

export async function probeProvider(
  def: ProviderProbeDefinition,
  deps: ProbeRuntimeDeps = {}
): Promise<ProviderDiagnostic> {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchFn || fetch;
  const checkedAt = new Date().toISOString();
  const prev = lastProbeMemory.get(def.id) || { lastSuccess: null, lastFailure: null };

  const reqSpec = def.buildRequest(env);
  if (!reqSpec.configured) {
    return {
      id: def.id,
      code: def.code,
      name: def.name,
      category: def.category,
      role: def.role,
      core: def.core,
      requiredKey: def.requiredKey,
      configured: false,
      operational: false,
      reachable: false,
      status: 'NOT_CONFIGURED',
      latencyMs: null,
      httpStatus: null,
      lastChecked: checkedAt,
      lastSuccess: prev.lastSuccess,
      lastFailure: prev.lastFailure,
      endpoint: def.publicEndpoint,
      error: null,
      reason: def.requiredKey
        ? `${def.requiredKey} is not configured in the server environment.`
        : 'Optional provider not configured.',
      attribution: def.attribution,
    };
  }

  const secretsToRedact = [
    env.GEMINI_API_KEY,
    env.IMD_API_KEY,
    env.IMD_API_TOKEN,
    env.CPCB_API_KEY,
    env.INCOIS_API_KEY,
    env.ACCUWEATHER_API_KEY,
    env.GOOGLE_WEATHER_API_KEY,
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), def.timeoutMs);
  const startMs = Date.now();

  try {
    const res = await fetchImpl(reqSpec.url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'MAUSAM-Atmospheric-Observatory/1.5 (+https://mausamgovt.vercel.app)',
        ...(reqSpec.headers || {}),
      },
      signal: controller.signal,
    });

    const latencyMs = Math.max(0, Math.round(Date.now() - startMs));

    if (!res.ok) {
      const status: GatewayProviderStatus = res.status === 401 || res.status === 403 || res.status === 429 ? 'UNAVAILABLE' : 'OFFLINE';
      const errMsg = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
      lastProbeMemory.set(def.id, { lastSuccess: prev.lastSuccess, lastFailure: checkedAt });
      return {
        id: def.id,
        code: def.code,
        name: def.name,
        category: def.category,
        role: def.role,
        core: def.core,
        requiredKey: def.requiredKey,
        configured: true,
        operational: false,
        reachable: res.status < 500,
        status,
        latencyMs,
        httpStatus: res.status,
        lastChecked: checkedAt,
        lastSuccess: prev.lastSuccess,
        lastFailure: checkedAt,
        endpoint: def.publicEndpoint,
        error: errMsg,
        reason: `Upstream probe returned ${errMsg}.`,
        attribution: def.attribution,
      };
    }

    const validation = await def.validateResponse(res);
    if (validation.ok) {
      lastProbeMemory.set(def.id, { lastSuccess: checkedAt, lastFailure: prev.lastFailure });
      return {
        id: def.id,
        code: def.code,
        name: def.name,
        category: def.category,
        role: def.role,
        core: def.core,
        requiredKey: def.requiredKey,
        configured: true,
        operational: true,
        reachable: true,
        status: 'OPERATIONAL',
        latencyMs,
        httpStatus: res.status,
        lastChecked: checkedAt,
        lastSuccess: checkedAt,
        lastFailure: prev.lastFailure,
        endpoint: def.publicEndpoint,
        error: null,
        reason: null,
        attribution: def.attribution,
      };
    }

    lastProbeMemory.set(def.id, { lastSuccess: prev.lastSuccess, lastFailure: checkedAt });
    return {
      id: def.id,
      code: def.code,
      name: def.name,
      category: def.category,
      role: def.role,
      core: def.core,
      requiredKey: def.requiredKey,
      configured: true,
      operational: false,
      reachable: true,
      status: validation.status,
      latencyMs,
      httpStatus: res.status,
      lastChecked: checkedAt,
      lastSuccess: prev.lastSuccess,
      lastFailure: checkedAt,
      endpoint: def.publicEndpoint,
      error: validation.error,
      reason: validation.error,
      attribution: def.attribution,
    };
  } catch (err: any) {
    const latencyMs = Math.max(0, Math.round(Date.now() - startMs));
    const isTimeout = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    const cleanError = isTimeout
      ? `Probe timed out after ${def.timeoutMs}ms`
      : sanitizeErrorMessage(err, secretsToRedact);
    lastProbeMemory.set(def.id, { lastSuccess: prev.lastSuccess, lastFailure: checkedAt });
    return {
      id: def.id,
      code: def.code,
      name: def.name,
      category: def.category,
      role: def.role,
      core: def.core,
      requiredKey: def.requiredKey,
      configured: true,
      operational: false,
      reachable: false,
      status: 'OFFLINE',
      latencyMs,
      httpStatus: null,
      lastChecked: checkedAt,
      lastSuccess: prev.lastSuccess,
      lastFailure: checkedAt,
      endpoint: def.publicEndpoint,
      error: cleanError,
      reason: cleanError,
      attribution: def.attribution,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probeSharedCache(deps: ProbeRuntimeDeps = {}): Promise<GatewayCacheTelemetry> {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchFn || fetch;
  const checkedAt = new Date().toISOString();

  const redisUrl = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '').trim().replace(/\/+$/, '');
  const redisToken = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '').trim();
  const provider: 'UPSTASH_REDIS' | 'VERCEL_KV' =
    env.KV_REST_API_URL && !env.UPSTASH_REDIS_REST_URL ? 'VERCEL_KV' : 'UPSTASH_REDIS';

  if (!redisUrl || !redisToken) {
    return {
      reported: false,
      configured: false,
      connected: false,
      provider: 'NOT_REPORTED',
      latencyMs: null,
      hits: null,
      misses: null,
      dedupes: null,
      staleServes: null,
      totalEntries: null,
      totalRequests: null,
      hitRatio: null,
      hitRatioNumeric: null,
      lastChecked: checkedAt,
      error: null,
      reason: 'No shared Redis/KV telemetry store is configured; serverless instances do not share process-local cache counters.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  const startMs = Date.now();
  try {
    const res = await fetchImpl(`${redisUrl}/ping`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: controller.signal,
    });
    const latencyMs = Math.max(0, Math.round(Date.now() - startMs));
    let pingOk = false;
    if (res.ok) {
      try {
        const json = await res.json();
        pingOk = json?.result === 'PONG' || Boolean(json?.result);
      } catch {
        pingOk = false;
      }
    }
    return {
      reported: true,
      configured: true,
      connected: pingOk,
      provider,
      latencyMs,
      hits: null,
      misses: null,
      dedupes: null,
      staleServes: null,
      totalEntries: null,
      totalRequests: null,
      hitRatio: null,
      hitRatioNumeric: null,
      lastChecked: checkedAt,
      error: pingOk ? null : `Redis PING returned HTTP ${res.status}`,
      reason: pingOk
        ? 'Shared Redis connectivity verified; aggregate hit/miss counters are not exported by REST PING.'
        : 'Shared Redis configured but PING probe failed.',
    };
  } catch (err: any) {
    const latencyMs = Math.max(0, Math.round(Date.now() - startMs));
    return {
      reported: true,
      configured: true,
      connected: false,
      provider,
      latencyMs,
      hits: null,
      misses: null,
      dedupes: null,
      staleServes: null,
      totalEntries: null,
      totalRequests: null,
      hitRatio: null,
      hitRatioNumeric: null,
      lastChecked: checkedAt,
      error: sanitizeErrorMessage(err, [redisToken]),
      reason: 'Shared Redis PING probe failed.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function defaultProbePostgres(
  connectionString: string,
  timeoutMs: number
): Promise<{ connected: boolean; latencyMs: number | null; error: string | null }> {
  const startMs = Date.now();
  let pool: any = null;
  let client: any = null;
  try {
    const pgMod = await import('pg');
    const PoolCtor = pgMod.default?.Pool || pgMod.Pool;
    const disableSsl =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('sslmode=disable');

    pool = new PoolCtor({
      connectionString,
      max: 1,
      connectionTimeoutMillis: timeoutMs,
      query_timeout: timeoutMs,
      ssl: disableSsl ? false : { rejectUnauthorized: false },
    });
    client = await pool.connect();
    await client.query('SELECT 1');
    return {
      connected: true,
      latencyMs: Math.max(0, Math.round(Date.now() - startMs)),
      error: null,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: null,
      error: sanitizeErrorMessage(err, [connectionString]),
    };
  } finally {
    if (client && typeof client.release === 'function') {
      try {
        client.release();
      } catch {
        // ignore release error
      }
    }
    if (pool && typeof pool.end === 'function') {
      try {
        await pool.end();
      } catch {
        // ignore pool end error
      }
    }
  }
}

async function probeDatabase(deps: ProbeRuntimeDeps = {}): Promise<GatewayDatabaseTelemetry> {
  const env = deps.env || process.env;
  const checkedAt = new Date().toISOString();
  const connectionString = (env.DATABASE_URL || env.POSTGRES_URL || '').trim();

  if (!connectionString) {
    return {
      reported: true,
      configured: false,
      connected: false,
      provider: 'NOT_CONFIGURED',
      latencyMs: null,
      lastChecked: checkedAt,
      error: null,
      reason: 'DATABASE_URL / POSTGRES_URL is not configured in this environment.',
    };
  }

  const probeFn = deps.probeDatabaseFn || defaultProbePostgres;
  const result = await probeFn(connectionString, 3000);
  return {
    reported: true,
    configured: true,
    connected: result.connected,
    provider: 'POSTGRESQL',
    latencyMs: result.latencyMs,
    lastChecked: checkedAt,
    error: result.error,
    reason: result.connected ? null : result.error || 'PostgreSQL SELECT 1 probe failed.',
  };
}

export async function checkAllProviders(deps: ProbeRuntimeDeps = {}): Promise<ProviderDiagnostic[]> {
  const settled = await Promise.allSettled(
    PROVIDER_DEFINITIONS.map((def) => probeProvider(def, deps))
  );

  const now = new Date().toISOString();
  return settled.map((result, idx) => {
    const def = PROVIDER_DEFINITIONS[idx];
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      id: def.id,
      code: def.code,
      name: def.name,
      category: def.category,
      role: def.role,
      core: def.core,
      requiredKey: def.requiredKey,
      configured: def.requiredKey === null,
      operational: false,
      reachable: false,
      status: 'UNAVAILABLE' as GatewayProviderStatus,
      latencyMs: null,
      httpStatus: null,
      lastChecked: now,
      lastSuccess: lastProbeMemory.get(def.id)?.lastSuccess || null,
      lastFailure: now,
      endpoint: def.publicEndpoint,
      error: result.reason instanceof Error ? result.reason.message : 'Unexpected probe exception',
      reason: 'Unexpected exception during upstream probe execution.',
      attribution: def.attribution,
    };
  });
}

export async function runHealthReport(deps: ProbeRuntimeDeps = {}): Promise<GatewayHealthPayload> {
  const env = deps.env || process.env;
  const probeStart = Date.now();

  const [providersSettled, cacheSettled, dbSettled] = await Promise.allSettled([
    checkAllProviders(deps),
    probeSharedCache(deps),
    probeDatabase(deps),
  ]);

  const providersList: ProviderDiagnostic[] =
    providersSettled.status === 'fulfilled' ? providersSettled.value : [];
  const providersMap: Record<string, ProviderDiagnostic> = {};
  for (const p of providersList) {
    providersMap[p.id] = p;
  }

  let operational = 0;
  let degraded = 0;
  let offline = 0;
  let unavailable = 0;
  let notConfigured = 0;
  let notReported = 0;
  let configuredProviders = 0;

  for (const p of providersList) {
    if (p.configured) configuredProviders++;
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
        notConfigured++;
        break;
      case 'NOT_REPORTED':
      default:
        notReported++;
        break;
    }
  }

  const coreProviders = providersList.filter((p) => p.core);
  const coreOperationalCount = coreProviders.filter((p) => p.status === 'OPERATIONAL').length;
  const anyConfiguredFailed = providersList.some(
    (p) => p.configured && p.status !== 'OPERATIONAL'
  );

  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  if (coreProviders.length > 0 && coreOperationalCount === 0) {
    overallStatus = 'CRITICAL';
  } else if (anyConfiguredFailed) {
    overallStatus = 'DEGRADED';
  } else if (operational > 0) {
    overallStatus = 'HEALTHY';
  } else {
    overallStatus = 'CRITICAL';
  }

  const providerAvailabilityPct =
    configuredProviders > 0
      ? Math.round((operational / configuredProviders) * 1000) / 10
      : null;

  const now = new Date().toISOString();
  const cache: GatewayCacheTelemetry =
    cacheSettled.status === 'fulfilled'
      ? cacheSettled.value
      : {
          reported: false,
          configured: false,
          connected: false,
          provider: 'NOT_REPORTED',
          latencyMs: null,
          hits: null,
          misses: null,
          dedupes: null,
          staleServes: null,
          totalEntries: null,
          totalRequests: null,
          hitRatio: null,
          hitRatioNumeric: null,
          lastChecked: now,
          error: 'Cache telemetry probe failed',
          reason: 'Cache telemetry could not be collected.',
        };

  const database: GatewayDatabaseTelemetry =
    dbSettled.status === 'fulfilled'
      ? dbSettled.value
      : {
          reported: false,
          configured: false,
          connected: false,
          provider: 'NOT_REPORTED',
          latencyMs: null,
          lastChecked: now,
          error: 'Database probe failed',
          reason: 'Database telemetry could not be collected.',
        };

  return {
    gateway: {
      reachable: true,
      endpoint: '/api/system?mode=health',
      runtime: env.VERCEL ? 'vercel-serverless' : 'node-express',
      version: APP_BUILD_ID,
      probeDurationMs: Math.max(0, Math.round(Date.now() - probeStart)),
    },
    status: overallStatus,
    buildId: APP_BUILD_ID,
    gitCommit: GIT_COMMIT_SHA,
    warningServiceVersion: WARNING_SERVICE_VERSION,
    environment: env.VERCEL_ENV || (env.VERCEL ? 'production' : env.NODE_ENV || 'development'),
    timestamp: now,
    database,
    cache,
    summary: {
      totalProviders: providersList.length,
      configuredProviders,
      operational,
      degraded,
      offline,
      unavailable,
      notConfigured,
      notReported,
      providerAvailabilityPct,
      overallStatus,
    },
    providers: providersMap,
  };
}

export async function runReadinessReport(deps: ProbeRuntimeDeps = {}) {
  const env = deps.env || process.env;
  const coreDefs = PROVIDER_DEFINITIONS.filter((d) => d.core);
  const settled = await Promise.allSettled(coreDefs.map((def) => probeProvider(def, deps)));

  const checks: Record<string, { status: GatewayProviderStatus; required: boolean; ok: boolean; latencyMs: number | null; error: string | null }> = {};
  for (let i = 0; i < coreDefs.length; i++) {
    const def = coreDefs[i];
    const r = settled[i];
    if (r.status === 'fulfilled') {
      checks[def.id] = {
        status: r.value.status,
        required: def.id === 'openMeteo',
        ok: r.value.operational,
        latencyMs: r.value.latencyMs,
        error: r.value.error,
      };
    } else {
      checks[def.id] = {
        status: 'UNAVAILABLE',
        required: def.id === 'openMeteo',
        ok: false,
        latencyMs: null,
        error: 'Probe exception',
      };
    }
  }

  const omOk = checks.openMeteo?.ok === true;
  const allCoreOk = Object.values(checks).every((c) => c.ok);
  const anyCoreOk = Object.values(checks).some((c) => c.ok);

  const status: 'READY' | 'DEGRADED' | 'NOT_READY' = !omOk && !anyCoreOk
    ? 'NOT_READY'
    : allCoreOk
    ? 'READY'
    : 'DEGRADED';

  return {
    ready: status !== 'NOT_READY',
    status,
    timestamp: new Date().toISOString(),
    buildId: APP_BUILD_ID,
    gitCommit: GIT_COMMIT_SHA,
    warningServiceVersion: WARNING_SERVICE_VERSION,
    environment: env.VERCEL_ENV || (env.VERCEL ? 'production' : env.NODE_ENV || 'development'),
    checks,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, {
      error: 'Method not allowed. System diagnostics gateway accepts GET requests only.',
      allowedMethods: ['GET', 'OPTIONS'],
    });
  }

  const query = parseQuery(req);
  const urlPath = (req.url || '').split('?')[0].toLowerCase();
  let mode = (query.mode || 'health').toString().toLowerCase();

  if (urlPath.endsWith('/health')) {
    mode = 'health';
  } else if (urlPath.endsWith('/providers')) {
    mode = 'providers';
  } else if (urlPath.endsWith('/readiness')) {
    mode = 'readiness';
  }

  try {
    switch (mode) {
      case 'providers': {
        const items = await checkAllProviders();
        return sendJson(res, 200, {
          timestamp: new Date().toISOString(),
          buildId: APP_BUILD_ID,
          gitCommit: GIT_COMMIT_SHA,
          environment: process.env.VERCEL_ENV || (process.env.VERCEL ? 'production' : process.env.NODE_ENV || 'development'),
          count: items.length,
          items,
          providers: items,
        });
      }

      case 'readiness': {
        const readiness = await runReadinessReport();
        const httpStatus = readiness.status === 'NOT_READY' ? 503 : 200;
        return sendJson(res, httpStatus, readiness);
      }

      case 'health':
      default: {
        const report = await runHealthReport();
        return sendJson(res, 200, report);
      }
    }
  } catch (err: any) {
    return sendJson(res, 500, {
      status: 'CRITICAL',
      buildId: APP_BUILD_ID,
      gitCommit: GIT_COMMIT_SHA,
      warningServiceVersion: WARNING_SERVICE_VERSION,
      environment: process.env.VERCEL_ENV || (process.env.VERCEL ? 'production' : process.env.NODE_ENV || 'development'),
      timestamp: new Date().toISOString(),
      error: err?.message || 'System diagnostic probe failed',
    });
  }
}

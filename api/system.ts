// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Consolidated System Diagnostics Gateway (/api/system)
// Multiplexed via mode query parameter: health | providers | readiness | config
// Direct support for:
// /api/system/health, /api/system/providers, /api/system/readiness
// Truthful reporting: unconfigured keys report NOT_CONFIGURED, unreachable feeds report OFFLINE
// Self-contained to guarantee zero runtime failures in Vercel serverless.
// ====================================================================

export const APP_BUILD_ID = process.env.APP_BUILD_ID || 'MAUSAM-V1.4.2-20260920';
export const GIT_COMMIT_SHA = process.env.GIT_COMMIT_SHA || 'synoptic-2026-09-20';
export const WARNING_SERVICE_VERSION = '2.4.0-sachet-canonical';

export interface ProviderDiagnostic {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  operational: boolean;
  status: 'OPERATIONAL' | 'DEGRADED' | 'NOT_CONFIGURED' | 'OFFLINE';
  latencyMs: number | null;
  error?: string | null;
}

function sendJson(res: any, status: number, data: any, customHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-App-Build-Id': APP_BUILD_ID,
    'X-Warning-Service-Version': WARNING_SERVICE_VERSION,
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

async function safeProbe(
  id: string,
  name: string,
  category: string,
  url: string,
  isConfigured: boolean,
  timeoutMs = 4000,
  extraHeaders: Record<string, string> = {}
): Promise<ProviderDiagnostic> {
  if (!isConfigured) {
    return {
      id,
      name,
      category,
      configured: false,
      operational: false,
      status: 'NOT_CONFIGURED',
      latencyMs: null,
    };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MAUSAM-Health-Check/1.0',
        Accept: '*/*',
        ...extraHeaders,
      },
      signal: controller.signal,
    });

    const latencyMs = Math.round(Date.now() - start);

    if (res.ok || res.status === 304) {
      return {
        id,
        name,
        category,
        configured: true,
        operational: true,
        status: 'OPERATIONAL',
        latencyMs,
      };
    }

    return {
      id,
      name,
      category,
      configured: true,
      operational: false,
      status: 'OFFLINE',
      latencyMs,
      error: `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      id,
      name,
      category,
      configured: true,
      operational: false,
      status: 'OFFLINE',
      latencyMs: Math.round(Date.now() - start),
      error: err?.name === 'AbortError'
        ? `Probe timed out after ${timeoutMs}ms`
        : (err?.message || 'Connection or network failure'),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkAllProviders(): Promise<ProviderDiagnostic[]> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cpcbConfigured = !!process.env.CPCB_API_KEY;

  const [openMeteo, sachet, radar, osm, imdCycloneProbe, imdCapProbe, gemini] = await Promise.all([
    safeProbe(
      'openMeteo',
      'Open-Meteo Weather API',
      'WEATHER_CORE',
      'https://api.open-meteo.com/v1/forecast?latitude=20.29&longitude=85.82&current=temperature_2m',
      true,
      3500
    ),
    safeProbe(
      'sachet',
      'NDMA / SACHET Disaster Alert Feed',
      'DISASTER',
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
      true,
      4500
    ),
    safeProbe(
      'radar',
      'RainViewer Doppler Radar Network',
      'RADAR',
      'https://api.rainviewer.com/public/weather-maps.json',
      true,
      3500
    ),
    safeProbe(
      'osm',
      'OpenStreetMap Tile & Cartography',
      'MAP',
      'https://tile.openstreetmap.org/0/0/0.png',
      true,
      3500
    ),
    safeProbe(
      'imdCyclone',
      'IMD Cyclone & RSMC Disturbance Feed',
      'GOVERNMENT_CYCLONE',
      'https://rsmcnewdelhi.imd.gov.in',
      true,
      4500
    ),
    safeProbe(
      'imdCap',
      'IMD Official CAP Warning Feed',
      'GOVERNMENT_WARNINGS',
      'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml',
      true,
      4500
    ),
    geminiKey
      ? safeProbe(
          'gemini',
          'Google Gemini API',
          'AI_ASSISTANT',
          'https://generativelanguage.googleapis.com/v1beta/models',
          true,
          4500,
          { 'x-goog-api-key': geminiKey }
        )
      : Promise.resolve({
          id: 'gemini',
          name: 'Google Gemini API',
          category: 'AI_ASSISTANT',
          configured: false,
          operational: false,
          status: 'NOT_CONFIGURED' as const,
          latencyMs: null,
        }),
  ]);

  // The IMD status below is based on a real official CAP feed probe, not
  // merely the presence of an API key.
  const imd: ProviderDiagnostic = {
    ...imdCapProbe,
    id: 'imd',
    name: 'IMD Official CAP Warning Feed',
    category: 'GOVERNMENT_WARNINGS',
  };

  // A configured CPCB key is not proof that the CAAQMS API is reachable.
  // Until a supported authenticated health endpoint is available, report
  // configured-but-unverified as DEGRADED rather than falsely OPERATIONAL.
  const cpcb: ProviderDiagnostic = {
    id: 'cpcb',
    name: 'Central Pollution Control Board CAAQMS',
    category: 'AIR_QUALITY',
    configured: cpcbConfigured,
    operational: false,
    status: cpcbConfigured ? 'DEGRADED' : 'NOT_CONFIGURED',
    latencyMs: null,
    error: cpcbConfigured
      ? 'Credentials are present, but this deployment has no verified CPCB health probe.'
      : null,
  };

  return [openMeteo, sachet, radar, osm, imdCycloneProbe, gemini, imd, cpcb];
}

async function getHealthReport(): Promise<any> {
  const providersList = await checkAllProviders();
  const providersMap: Record<string, ProviderDiagnostic> = {};
  for (const p of providersList) {
    providersMap[p.id] = p;
  }

  const operationalCount = providersList.filter((p) => p.operational).length;
  const notConfiguredCount = providersList.filter((p) => p.status === 'NOT_CONFIGURED').length;
  const configuredProviders = providersList.filter((p) => p.configured);
  const failedConfiguredProviders = configuredProviders.filter((p) => !p.operational);
  const coreOperational = providersMap.openMeteo?.operational && providersMap.sachet?.operational;
  const overallStatus = coreOperational && failedConfiguredProviders.length === 0
    ? 'HEALTHY'
    : 'DEGRADED';

  return {
    status: overallStatus,
    buildId: APP_BUILD_ID,
    gitCommit: GIT_COMMIT_SHA,
    warningServiceVersion: WARNING_SERVICE_VERSION,
    environment: process.env.VERCEL ? 'production' : (process.env.NODE_ENV || 'development'),
    timestamp: new Date().toISOString(),
    summary: {
      totalProviders: providersList.length,
      operational: operationalCount,
      notConfigured: notConfiguredCount,
      overallStatus,
    },
    providers: providersMap,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  const query = parseQuery(req);
  const urlPath = (req.url || '').split('?')[0].toLowerCase();
  let mode = (query.mode || 'health').toString().toLowerCase();

  // Route directly based on subpath if present (/api/system/health, /api/system/providers, /api/system/readiness)
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
        const result = await checkAllProviders();
        return sendJson(res, 200, result, {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        });
      }

      case 'readiness': {
        return sendJson(res, 200, {
          ready: true,
          status: 'READY',
          timestamp: new Date().toISOString(),
          buildId: APP_BUILD_ID,
          gitCommit: GIT_COMMIT_SHA,
          warningServiceVersion: WARNING_SERVICE_VERSION,
          environment: process.env.VERCEL ? 'production' : (process.env.NODE_ENV || 'development'),
        }, {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      }

      case 'health':
      default: {
        const result = await getHealthReport();
        return sendJson(res, 200, result, {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        });
      }
    }
  } catch (err: any) {
    return sendJson(res, 200, {
      status: 'DEGRADED',
      buildId: APP_BUILD_ID,
      gitCommit: GIT_COMMIT_SHA,
      warningServiceVersion: WARNING_SERVICE_VERSION,
      environment: process.env.VERCEL ? 'production' : (process.env.NODE_ENV || 'development'),
      timestamp: new Date().toISOString(),
      error: err?.message || 'System diagnostic probe failed',
    });
  }
}

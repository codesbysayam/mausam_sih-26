import test from 'node:test';
import assert from 'node:assert/strict';
import systemHandler, {
  runHealthReport,
  runReadinessReport,
  checkAllProviders,
  type ProbeRuntimeDeps,
} from '../api/system';
import {
  MultiSourceService,
  normalizeGatewayHealthPayload,
} from '../src/services/multiSourceService';
import { WeatherDatabaseService } from '../server/database/db';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body = '';
  return {
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
    },
    send(chunk: string) {
      body += typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
    },
    json(obj: unknown) {
      body = JSON.stringify(obj);
    },
    getStatus: () => statusCode,
    getHeaders: () => headers,
    getJson: () => (body ? JSON.parse(body) : null),
  };
}

/**
 * Helper mock fetch that returns valid payloads for all 6 keyless open/government providers
 * unless overridden by URL substring.
 */
function createHealthyUpstreamFetch(overrides: Record<string, () => Promise<Response>> = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [needle, handler] of Object.entries(overrides)) {
      if (url.includes(needle)) {
        return handler();
      }
    }

    if (url.includes('api.open-meteo.com')) {
      return new Response(JSON.stringify({ current: { temperature_2m: 27.4 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('sachet.ndma.gov.in')) {
      return new Response('<?xml version="1.0"?><rss><channel><item><title>OK</title></item></channel></rss>', {
        status: 200,
        headers: { 'Content-Type': 'application/rss+xml' },
      });
    }
    if (url.includes('api.rainviewer.com')) {
      return new Response(JSON.stringify({ radar: { past: [{ time: 1700000000, path: '/v2/radar/1' }] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('cap-sources.s3.amazonaws.com')) {
      return new Response('<?xml version="1.0"?><rss><channel></channel></rss>', {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }
    if (url.includes('rsmcnewdelhi.imd.gov.in')) {
      return new Response('<html><body><h1>RSMC New Delhi Tropical Cyclone Centre Bulletin Portal</h1><p>' + 'x'.repeat(120) + '</p></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (url.includes('tile.openstreetmap.org')) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      return new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('api.data.gov.in')) {
      return new Response(JSON.stringify({ records: [{ station: 'Delhi' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/ping')) {
      return new Response(JSON.stringify({ result: 'PONG' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}

test('1. Successful gateway health report: HEALTHY when all configured providers validate, missing optional credentials are NOT_CONFIGURED, cache/DB reported truthfully', async () => {
  const deps: ProbeRuntimeDeps = {
    fetchFn: createHealthyUpstreamFetch(),
    env: { NODE_ENV: 'test' }, // No optional keys, no Redis, no Postgres
  };

  const report = await runHealthReport(deps);
  assert.equal(report.gateway.reachable, true);
  assert.equal(report.gateway.endpoint, '/api/system?mode=health');
  assert.equal(report.status, 'HEALTHY');
  assert.equal(report.summary.overallStatus, 'HEALTHY');
  assert.equal(report.summary.operational, 6);
  assert.equal(report.summary.notConfigured, 6);
  assert.equal(report.summary.degraded, 0);
  assert.equal(report.summary.offline, 0);
  assert.equal(report.summary.providerAvailabilityPct, 100);

  // Keyless core providers must have real numeric latency >= 0
  assert.equal(report.providers.openMeteo.status, 'OPERATIONAL');
  assert.equal(typeof report.providers.openMeteo.latencyMs, 'number');
  assert.equal(report.providers.sachet.status, 'OPERATIONAL');
  assert.equal(report.providers.radar.status, 'OPERATIONAL');

  // Optional credentialed providers without keys must be NOT_CONFIGURED with null latency
  assert.equal(report.providers.gemini.status, 'NOT_CONFIGURED');
  assert.equal(report.providers.gemini.configured, false);
  assert.equal(report.providers.gemini.latencyMs, null);
  assert.equal(report.providers.imd.status, 'NOT_CONFIGURED');
  assert.equal(report.providers.cpcb.status, 'NOT_CONFIGURED');

  // Truthful cache & database telemetry (never fabricated)
  assert.equal(report.cache.reported, false);
  assert.equal(report.cache.provider, 'NOT_REPORTED');
  assert.equal(report.cache.hits, null);
  assert.equal(report.cache.hitRatio, null);
  assert.equal(report.database.configured, false);
  assert.equal(report.database.connected, false);
  assert.equal(report.database.provider, 'NOT_CONFIGURED');
});

test('2. Client fetchGatewayHealth succeeds with live no-store fetch and measures browser-to-gateway RTT separately from server latencies', async () => {
  const report = await runHealthReport({
    fetchFn: createHealthyUpstreamFetch(),
    env: { NODE_ENV: 'test' },
  });

  let capturedInit: RequestInit | undefined;
  const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await MultiSourceService.fetchGatewayHealth({ fetchFn: mockFetch });
  assert.equal(result.ok, true);
  assert.equal(capturedInit?.cache, 'no-store');
  if (result.ok) {
    assert.equal(result.data.gateway.reachable, true);
    assert.equal(result.data.summary.overallStatus, 'HEALTHY');
    assert.equal(typeof result.gatewayLatencyMs, 'number');
    assert.equal(result.data.cache.reported, false);
  }
});

test('3. Client fetchGatewayHealth rejects malformed JSON with MALFORMED_JSON', async () => {
  const mockFetch = (async () =>
    new Response('<html>502 Bad Gateway</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })) as typeof fetch;

  const result = await MultiSourceService.fetchGatewayHealth({ fetchFn: mockFetch });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, 'MALFORMED_JSON');
    assert.equal(result.httpStatus, 200);
    assert.match(result.errorMessage, /malformed JSON/i);
  }
});

test('4. Client fetchGatewayHealth rejects invalid contract payloads with INVALID_CONTRACT', async () => {
  const invalidPayloads = [
    {},
    { timestamp: '2026-11-21T00:00:00Z' },
    { timestamp: '2026-11-21T00:00:00Z', summary: {}, providers: {} },
    ['not-an-object'],
  ];

  for (const payload of invalidPayloads) {
    const mockFetch = (async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const result = await MultiSourceService.fetchGatewayHealth({ fetchFn: mockFetch });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errorCode, 'INVALID_CONTRACT');
    }
  }
});

test('5. Client fetchGatewayHealth reports HTTP 404 and HTTP 500 with HTTP_ERROR and server diagnostic message', async () => {
  const fetch404 = (async () =>
    new Response(JSON.stringify({ error: 'Function not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  const res404 = await MultiSourceService.fetchGatewayHealth({ fetchFn: fetch404 });
  assert.equal(res404.ok, false);
  if (!res404.ok) {
    assert.equal(res404.errorCode, 'HTTP_ERROR');
    assert.equal(res404.httpStatus, 404);
    assert.match(res404.errorMessage, /404/);
    assert.match(res404.errorMessage, /Function not found/);
  }

  const fetch500 = (async () =>
    new Response(JSON.stringify({ error: 'Upstream gateway exception' }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  const res500 = await MultiSourceService.fetchGatewayHealth({ fetchFn: fetch500 });
  assert.equal(res500.ok, false);
  if (!res500.ok) {
    assert.equal(res500.errorCode, 'HTTP_ERROR');
    assert.equal(res500.httpStatus, 500);
    assert.match(res500.errorMessage, /500/);
  }
});

test('6. Client fetchGatewayHealth reports network failures as NETWORK_ERROR', async () => {
  const netFailFetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;

  const result = await MultiSourceService.fetchGatewayHealth({ fetchFn: netFailFetch });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, 'NETWORK_ERROR');
    assert.equal(result.httpStatus, null);
    assert.match(result.errorMessage, /Failed to fetch/);
  }
});

test('7. Client fetchGatewayHealth aborts slow gateway requests cleanly with TIMEOUT', async () => {
  const hangingFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        reject(err);
      });
    });
  }) as typeof fetch;

  const result = await MultiSourceService.fetchGatewayHealth({
    fetchFn: hangingFetch,
    timeoutMs: 35,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, 'TIMEOUT');
    assert.match(result.errorMessage, /timed out after 35ms/i);
  }
});

test('8. One upstream provider unavailable yields DEGRADED overall status while gateway stays reachable', async () => {
  const report = await runHealthReport({
    fetchFn: createHealthyUpstreamFetch({
      'sachet.ndma.gov.in': async () => new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' }),
    }),
    env: { NODE_ENV: 'test' },
  });

  assert.equal(report.gateway.reachable, true);
  assert.equal(report.status, 'DEGRADED');
  assert.equal(report.summary.overallStatus, 'DEGRADED');
  assert.equal(report.providers.sachet.status, 'OFFLINE');
  assert.equal(report.providers.sachet.operational, false);
  assert.equal(report.providers.sachet.httpStatus, 503);
  assert.equal(report.providers.openMeteo.status, 'OPERATIONAL');
  assert.equal(report.summary.operational, 5);
  assert.equal(report.summary.offline, 1);
});

test('9. All core providers failing yields CRITICAL health report and NOT_READY readiness report', async () => {
  const allCoreFailFetch = createHealthyUpstreamFetch({
    'api.open-meteo.com': async () => new Response('Down', { status: 502 }),
    'sachet.ndma.gov.in': async () => new Response('Down', { status: 503 }),
    'api.rainviewer.com': async () => new Response('Down', { status: 504 }),
  });

  const health = await runHealthReport({ fetchFn: allCoreFailFetch, env: { NODE_ENV: 'test' } });
  assert.equal(health.gateway.reachable, true);
  assert.equal(health.status, 'CRITICAL');
  assert.equal(health.summary.overallStatus, 'CRITICAL');

  const readiness = await runReadinessReport({ fetchFn: allCoreFailFetch, env: { NODE_ENV: 'test' } });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.status, 'NOT_READY');
  assert.equal(readiness.checks.openMeteo.ok, false);
  assert.equal(readiness.checks.sachet.ok, false);
  assert.equal(readiness.checks.radar.ok, false);
});

test('10. Configured API key NEVER proves operational status; auth/probe failure marks UNAVAILABLE/OFFLINE and redacts secrets', async () => {
  const secretKey = 'SUPER_SECRET_GEMINI_TOKEN_987654';
  const report = await runHealthReport({
    fetchFn: createHealthyUpstreamFetch({
      'generativelanguage.googleapis.com': async () =>
        new Response(JSON.stringify({ error: { message: 'API key invalid' } }), {
          status: 401,
          statusText: 'Unauthorized',
        }),
      'api.data.gov.in': async () => {
        throw new Error(`Connection refused for key=${secretKey}`);
      },
    }),
    env: {
      NODE_ENV: 'test',
      GEMINI_API_KEY: secretKey,
      CPCB_API_KEY: secretKey,
    },
  });

  assert.equal(report.providers.gemini.configured, true);
  assert.equal(report.providers.gemini.operational, false);
  assert.equal(report.providers.gemini.status, 'UNAVAILABLE');
  assert.equal(report.providers.gemini.httpStatus, 401);

  assert.equal(report.providers.cpcb.configured, true);
  assert.equal(report.providers.cpcb.operational, false);
  assert.equal(report.providers.cpcb.status, 'OFFLINE');
  assert.ok(!String(report.providers.cpcb.error || '').includes(secretKey), 'Secret key must be redacted from error diagnostics');
  assert.match(String(report.providers.cpcb.error || ''), /\[REDACTED\]/);
});

test('11. HTTP 200 with invalid/incomplete provider payload is marked DEGRADED rather than OPERATIONAL', async () => {
  const report = await runHealthReport({
    fetchFn: createHealthyUpstreamFetch({
      'api.open-meteo.com': async () =>
        new Response(JSON.stringify({ current: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      'sachet.ndma.gov.in': async () =>
        new Response('<html><body>Maintenance page without RSS</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      'api.rainviewer.com': async () =>
        new Response(JSON.stringify({ radar: { past: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    }),
    env: { NODE_ENV: 'test' },
  });

  assert.equal(report.providers.openMeteo.status, 'DEGRADED');
  assert.equal(report.providers.openMeteo.operational, false);
  assert.match(String(report.providers.openMeteo.error), /temperature_2m/i);

  assert.equal(report.providers.sachet.status, 'DEGRADED');
  assert.equal(report.providers.sachet.operational, false);

  assert.equal(report.providers.radar.status, 'DEGRADED');
  assert.equal(report.providers.radar.operational, false);
});

test('12. normalizeGatewayHealthPayload truthfully marks omitted DB, cache, and null provider records as NOT_REPORTED (never In-Memory Cache or Not Configured)', () => {
  const minimalRaw = {
    timestamp: '2026-11-21T01:00:00.000Z',
    summary: { overallStatus: 'HEALTHY' },
    providers: {
      openMeteo: {
        status: 'OPERATIONAL',
        latencyMs: 142,
      },
      cpcb: null,
    },
    // database & cache intentionally omitted
  };

  const normalized = normalizeGatewayHealthPayload(minimalRaw, 38);
  assert.equal(normalized.database.reported, false);
  assert.equal(normalized.database.provider, 'NOT_REPORTED');
  assert.equal(normalized.cache.reported, false);
  assert.equal(normalized.cache.provider, 'NOT_REPORTED');
  assert.equal(normalized.cache.hits, null);
  assert.equal(normalized.cache.hitRatio, null);
  assert.equal(normalized.providers.openMeteo.status, 'OPERATIONAL');
  assert.equal(normalized.providers.openMeteo.latency, 142);
  assert.equal(normalized.providers.cpcb.status, 'NOT_REPORTED');
  assert.equal(normalized.summary.notReported, 1);
});

test('13. Concurrent refresh requests via AbortController cancel superseded calls cleanly without stale overwrite', async () => {
  const firstController = new AbortController();
  const secondController = new AbortController();

  let callCount = 0;
  const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const seq = ++callCount;
    if (seq === 1) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('Superseded');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }
    return new Response(
      JSON.stringify({
        timestamp: '2026-11-21T02:00:00.000Z',
        summary: { overallStatus: 'HEALTHY' },
        providers: { openMeteo: { status: 'OPERATIONAL', latencyMs: 55 } },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  const firstPromise = MultiSourceService.fetchGatewayHealth({
    fetchFn: mockFetch,
    signal: firstController.signal,
  });

  // Trigger newer refresh and abort the previous one
  firstController.abort();
  const secondPromise = MultiSourceService.fetchGatewayHealth({
    fetchFn: mockFetch,
    signal: secondController.signal,
  });

  const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(firstResult.ok, false);
  if (!firstResult.ok) {
    assert.equal(firstResult.errorCode, 'ABORTED');
  }
  assert.equal(secondResult.ok, true);
  if (secondResult.ok) {
    assert.equal(secondResult.data.timestamp, '2026-11-21T02:00:00.000Z');
  }
});

test('14. /api/system HTTP handler enforces Cache-Control: no-store across modes and rejects POST with HTTP 405', async () => {
  const postRes = createMockRes();
  await systemHandler({ method: 'POST', url: '/api/system?mode=health' }, postRes);
  assert.equal(postRes.getStatus(), 405);
  assert.match(postRes.getHeaders()['cache-control'] || '', /no-store/i);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createHealthyUpstreamFetch();
  try {
    for (const mode of ['health', 'providers', 'readiness']) {
      const res = createMockRes();
      await systemHandler({ method: 'GET', url: `/api/system?mode=${mode}`, query: { mode } }, res);
      assert.equal(res.getStatus(), 200);
      assert.match(res.getHeaders()['cache-control'] || '', /no-store/i);
      assert.equal(res.getHeaders()['pragma'], 'no-cache');
      const json = res.getJson();
      assert.ok(json && typeof json === 'object');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('15. Shared Redis / Postgres probes reflect connected state truthfully when configured', async () => {
  const report = await runHealthReport({
    fetchFn: createHealthyUpstreamFetch(),
    env: {
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: 'https://demo.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'demo_token',
      DATABASE_URL: 'postgres://user:pass@db.example.com/mausam',
    },
    probeDatabaseFn: async () => ({ connected: true, latencyMs: 18, error: null }),
  });

  assert.equal(report.cache.reported, true);
  assert.equal(report.cache.configured, true);
  assert.equal(report.cache.connected, true);
  assert.equal(report.cache.provider, 'UPSTASH_REDIS');
  assert.equal(report.database.configured, true);
  assert.equal(report.database.connected, true);
  assert.equal(report.database.provider, 'POSTGRESQL');
  assert.equal(report.database.latencyMs, 18);

  const providers = await checkAllProviders({ fetchFn: createHealthyUpstreamFetch(), env: { NODE_ENV: 'test' } });
  assert.equal(providers.length, 12);
});

test('16. WeatherDatabaseService reports NOT_CONFIGURED without Postgres URL and persists observations, forecasts, AQI, and active warnings cleanly', async () => {
  const db = WeatherDatabaseService.getInstance();
  const status = await db.getStatus();
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    assert.equal(status.configured, false);
    assert.equal(status.connected, false);
    assert.equal(status.provider, 'NOT_CONFIGURED');
  }

  const loc = {
    id: 'test-bbsr-db',
    name: 'Bhubaneswar',
    city: 'Bhubaneswar',
    district: 'Khordha',
    state: 'Odisha',
    country: 'India',
    latitude: 20.2961,
    longitude: 85.8245,
    timezone: 'Asia/Kolkata',
  };

  await db.saveWeatherObservation({
    location: loc,
    source: 'OPEN_METEO',
    sourcePriority: 1,
    dataStatus: 'LIVE',
    observedAt: '2026-11-21T01:00:00.000Z',
    fetchedAt: '2026-11-21T01:01:00.000Z',
    ageSeconds: 60,
    temperature: 26.5,
    feelsLike: 28.0,
    humidity: 78,
    dewPoint: 22.1,
    pressure: 1011.2,
    windSpeed: 10,
    windDirection: 'NE',
    windDirectionDegrees: 45,
    windGust: 15,
    precipitation: 0,
    cloudCover: 40,
    visibility: 10,
    uvIndex: 5,
    weatherCode: 2,
    condition: 'Partly Cloudy',
    isDay: true,
    isFallback: false,
    rawSourceAttribution: 'Open-Meteo.com',
  });

  const obs = await db.getLatestObservation(loc.id);
  assert.ok(obs);
  assert.equal(obs?.temperature, 26.5);

  await db.saveForecast({
    location: loc,
    source: 'OPEN_METEO',
    dataStatus: 'LIVE',
    model: 'ECMWF',
    generatedAt: '2026-11-21T01:00:00.000Z',
    hourly: [],
    daily: [],
    sourceAttribution: 'Open-Meteo.com',
  });
  const fc = await db.getForecast(loc.id);
  assert.ok(fc);
  assert.equal(fc?.model, 'ECMWF');

  await db.saveAQI({
    location: loc,
    source: 'CPCB',
    dataStatus: 'LIVE',
    observedAt: '2026-11-21T01:00:00.000Z',
    fetchedAt: '2026-11-21T01:01:00.000Z',
    aqi: 82,
    category: 'Satisfactory',
    dominantPollutant: 'PM2.5',
    pollutants: {
      pm25: { code: 'pm25', label: 'PM2.5', concentration: 34, unit: 'µg/m³' },
      pm10: { code: 'pm10', label: 'PM10', concentration: 61, unit: 'µg/m³' },
    },
    healthAdvisory: 'Minor breathing discomfort to sensitive people.',
    isIndianStandard: true,
  });
  const aqi = await db.getAQI(loc.id);
  assert.ok(aqi);
  assert.equal(aqi?.aqi, 82);

  await db.saveWarnings([
    {
      id: 'warn-od-1',
      source: 'SACHET',
      country: 'India',
      severity: 'YELLOW',
      severityLabel: 'Yellow Watch',
      hazard: 'THUNDERSTORM',
      affectedArea: 'Khordha, Odisha',
      description: 'Isolated lightning over coastal Odisha.',
      safetyGuidance: ['Stay indoors during lightning'],
      state: 'Odisha',
      district: 'Khordha',
      issuedAt: '2026-11-21T00:30:00.000Z',
      validUntil: '2026-11-21T12:30:00.000Z',
      isActive: true,
    },
    {
      id: 'warn-mh-1',
      source: 'SACHET',
      country: 'India',
      severity: 'ORANGE',
      severityLabel: 'Orange Alert',
      hazard: 'HEAVY_RAIN',
      affectedArea: 'Mumbai, Maharashtra',
      description: 'Heavy showers over Konkan.',
      safetyGuidance: ['Avoid waterlogged roads'],
      state: 'Maharashtra',
      district: 'Mumbai',
      issuedAt: '2026-11-21T00:30:00.000Z',
      validUntil: '2026-11-21T12:30:00.000Z',
      isActive: true,
    },
  ]);

  const odWarnings = await db.getActiveWarnings('Odisha');
  assert.equal(odWarnings.length, 1);
  assert.equal(odWarnings[0].id, 'warn-od-1');
});

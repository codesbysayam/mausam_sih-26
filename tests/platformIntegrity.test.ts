import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOpenMeteoPayload } from '../src/services/weather/openMeteoAdapter';
import {
  deriveAgricultureContext,
  deriveMarineContext,
} from '../src/services/weather/weatherService';
import { matchMausamQuery } from '../src/services/mausamAssistantService';
import {
  CacheService,
  buildCompositeCacheKey,
} from '../src/server/services/cacheService';
import { NWPCache } from '../src/services/nwp/nwpCache';
import {
  buildTimelineSeries,
  reconcileIndexOnRefresh,
  stepTimelineIndex,
} from '../src/utils/playbackController';
import { resolveMergedStatePoints } from '../src/components/scene/geoMath';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_ASSISTANT_MODEL,
  MausamAssistantService,
  getAssistantMode,
  validateAssistantEndpointUrl,
} from '../lib/providers/ai';
import aiHandler from '../api/ai';
import {
  fetchImdObservation,
  resolveImdConfig,
} from '../src/services/weather/imdAdapter';
import type { RadarApiResponse } from '../src/services/radarService';
import type { HourlyForecastItem, CurrentWeather, WeatherStation } from '../src/types';

test('1. Open-Meteo adapter preserves legitimate 0 values, keeps missing fields undefined (no 1013/0 fabrication), and matches current.time against hourly array', () => {
  const payload = {
    current: {
      time: '2026-11-21T14:15',
      temperature_2m: 0,
      relative_humidity_2m: null,
      apparent_temperature: 0,
      is_day: 1,
      precipitation: 0,
      weather_code: 0,
      pressure_msl: null,
      surface_pressure: null,
      wind_speed_10m: 0,
      wind_direction_10m: 0,
      wind_gusts_10m: null,
      dew_point_2m: 0,
      visibility: null,
    },
    hourly: {
      time: [
        '2026-11-21T12:00',
        '2026-11-21T13:00',
        '2026-11-21T14:00',
        '2026-11-21T15:00',
      ],
      temperature_2m: [18, 19, 0, 2],
      relative_humidity_2m: [50, 55, 60, null],
      precipitation_probability: [5, 10, 72, 0],
      precipitation: [0, 0, 0, null],
      weather_code: [0, 1, 2, null],
      soil_moisture_0_to_1cm: [0.1, 0.12, 0.28, 0.25],
      soil_temperature_0cm: [15, 16, 17.5, 18],
      et0_fao_evapotranspiration: [0.1, 0.2, 0.35, 0.4],
    },
    daily: {
      time: ['2026-11-21'],
      weather_code: [0],
      temperature_2m_max: [12],
      temperature_2m_min: [0],
      precipitation_sum: [0],
      precipitation_probability_max: [0],
      wind_speed_10m_max: [null],
      uv_index_max: [0],
    },
  };

  const normalized = normalizeOpenMeteoPayload(payload, '2026-11-21T08:45:00.000Z');
  assert.ok(normalized.current);
  // Legitimate 0 values preserved
  assert.equal(normalized.current?.temperatureC, 0);
  assert.equal(normalized.current?.feelsLikeC, 0);
  assert.equal(normalized.current?.precipitationMm, 0);
  assert.equal(normalized.current?.windSpeedKmh, 0);
  assert.equal(normalized.current?.dewPointC, 0);
  assert.equal(normalized.current?.windDirection, 'N (0°)');
  // Missing values stay undefined (never 1013 hPa or 0%)
  assert.equal(normalized.current?.pressureHpa, undefined);
  assert.equal(normalized.current?.humidity, undefined);
  assert.equal(normalized.current?.visibilityKm, undefined);
  // Timestamp-matched hourly index = 2 (14:00 matches 14:15, NOT blind index 0!)
  assert.equal(normalized.current?.precipitationProbability, 72);
  assert.equal(normalized.soilMoisture, 0.28);
  assert.equal(normalized.soilTemperature, 17.5);
  assert.equal(normalized.evapotranspiration, 0.35);
  // Daily 0 values preserved, missing wind stays undefined
  assert.equal(normalized.forecast?.daily[0].minTempC, 0);
  assert.equal(normalized.forecast?.daily[0].precipitationProbability, 0);
  assert.equal(normalized.forecast?.daily[0].uvIndexMax, 0);
  assert.equal(normalized.forecast?.daily[0].windSpeedKmh, undefined);
  // Hourly slice starts from matched hour index 2
  assert.equal(normalized.forecast?.hourly.length, 2);
  assert.equal(normalized.forecast?.hourly[0].precipitationProbability, 72);
  assert.equal(normalized.forecast?.hourly[1].humidity, undefined);
});

test('2. Weather service derivations never fabricate humidity (60%), wind (10 km/h), wave height, or SST from air temperature', () => {
  const sparseCurrent = {
    temperatureC: 30,
    condition: 'Clear Sky',
  };

  const ag = deriveAgricultureContext(sparseCurrent);
  assert.ok(ag);
  assert.equal(ag?.humidity, undefined);
  assert.equal(ag?.rainfall24hMm, undefined);
  assert.equal(ag?.precipitationProbability, undefined);
  assert.equal(ag?.soilMoisture0To1cm, undefined);

  const marine = deriveMarineContext(true, sparseCurrent);
  assert.ok(marine);
  assert.equal(marine?.waveHeightM, undefined);
  assert.equal(marine?.seaSurfaceTempC, undefined);
  assert.equal(marine?.windSpeedKts, undefined);
  assert.equal(marine?.seaCondition, undefined);
  assert.match(marine?.coastalAdvisory || '', /unavailable/i);

  const marineWithLiveBuoy = deriveMarineContext(
    true,
    { temperatureC: 29, windSpeedKmh: 20, condition: 'Partly Cloudy' },
    { waveHeightM: 1.4, seaSurfaceTempC: 27.6, tideStatus: 'Rising' }
  );
  assert.equal(marineWithLiveBuoy?.waveHeightM, 1.4);
  assert.equal(marineWithLiveBuoy?.seaSurfaceTempC, 27.6);
  assert.equal(marineWithLiveBuoy?.seaCondition, 'Moderate');
});

test('3. Assistant state query never reports climatology normals as active telemetry for non-active states', () => {
  const activeStation = {
    id: 'BBSR',
    code: '42971',
    name: 'Bhubaneswar',
    state: 'Odisha',
    district: 'Khordha',
    lat: 20.2961,
    lng: 85.8245,
    elevation: '45m',
    status: 'active',
    temp: 25,
    windSpeed: 8,
    windDirection: 'NE',
    pressure: 1011,
  } as unknown as WeatherStation;
  const activeWeather = {
    temp: 25,
    feelsLike: 26,
    humidity: 80,
    windSpeed: 8,
    windDirection: 'NE',
    pressure: 1011,
    condition: 'Clear Night',
    aqiIndex: 52,
    aqiStatus: 'Good',
  } as unknown as CurrentWeather;

  // Query non-active state (Maharashtra) while synced to Odisha
  const resNonActive = matchMausamQuery(
    'What is the weather in Maharashtra?',
    { station: activeStation, weather: activeWeather, preferredLanguage: 'English' },
    'English'
  );
  assert.equal(resNonActive.modeUsed, 'state-climatology-reference');
  assert.match(resNonActive.answer, /not loaded for Maharashtra/i);
  assert.match(resNonActive.answer, /Historical Climatology Baseline/i);
  assert.ok(!resNonActive.answer.includes('Active Atmospheric Telemetry & Baseline'));

  // Query active state (Odisha)
  const resActive = matchMausamQuery(
    'What is the weather in Odisha?',
    { station: activeStation, weather: activeWeather, preferredLanguage: 'English' },
    'English'
  );
  assert.equal(resActive.modeUsed, 'state-grounded-live-telemetry');
  assert.match(resActive.answer, /25°C/);
  assert.match(resActive.answer, /80%/);
});

test('4. Shared CacheService supports HIT/MISS/STALE, composite key isolation, single-flight dedupe, and preserves valid cache on upstream error', async () => {
  const cache = new CacheService({ maxEntries: 50, env: {} });
  assert.equal(cache.getMode(), 'IN_MEMORY_DEGRADED');

  const keyA = buildCompositeCacheKey({
    provider: 'open-meteo',
    model: 'ecmwf',
    lat: 20.2961,
    lon: 85.8245,
    vars: ['temp', 'wind'],
    horizon: '24h',
  });
  const keyB = buildCompositeCacheKey({
    provider: 'open-meteo',
    model: 'gfs',
    lat: 20.2961,
    lon: 85.8245,
    vars: ['wind', 'temp'],
    horizon: '24h',
  });
  assert.notEqual(keyA, keyB);

  // MISS -> populate
  assert.equal(cache.get(keyA, 1000).status, 'MISS');
  cache.set(keyA, { temp: 24.5 }, 10, 60, 1000);

  // Fresh HIT
  const hit = cache.get(keyA, 5000);
  assert.equal(hit.status, 'HIT');
  assert.deepEqual(hit.data, { temp: 24.5 });

  // Stale HIT after TTL (10s) but inside stale window (+60s)
  const stale = cache.get(keyA, 20000);
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.isStale, true);

  // Failed upstream refresh NEVER overwrites valid cached entry
  const fallback = await cache.getOrFetch(
    keyA,
    async () => {
      throw new Error('HTTP 503 upstream outage');
    },
    { ttlSeconds: 10, staleSeconds: 60, now: 20000 }
  );
  assert.equal(fallback.status, 'STALE');
  assert.equal(fallback.fromFallbackStale, true);
  assert.deepEqual(fallback.value, { temp: 24.5 });

  // Single-flight deduplication across concurrent misses
  let upstreamCalls = 0;
  const dedupeKey = 'mausam:test:singleflight';
  const fetcher = async () => {
    upstreamCalls++;
    await new Promise((r) => setTimeout(r, 20));
    return { value: 42 };
  };
  const [r1, r2, r3] = await Promise.all([
    cache.getOrFetch(dedupeKey, fetcher, { ttlSeconds: 60 }),
    cache.getOrFetch(dedupeKey, fetcher, { ttlSeconds: 60 }),
    cache.getOrFetch(dedupeKey, fetcher, { ttlSeconds: 60 }),
  ]);
  assert.equal(upstreamCalls, 1);
  assert.deepEqual(r1.value, { value: 42 });
  assert.deepEqual(r2.value, { value: 42 });
  assert.deepEqual(r3.value, { value: 42 });

  // NWPCache refuses to overwrite valid run with UNAVAILABLE payload
  const nwp = new NWPCache();
  nwp.set('ECMWF', 20.3, 85.8, {
    modelId: 'ECMWF',
    status: 'LIVE',
    hourly: [],
    daily: [],
  } as any);
  nwp.set('ECMWF', 20.3, 85.8, {
    modelId: 'ECMWF',
    status: 'UNAVAILABLE',
    hourly: [],
    daily: [],
  } as any);
  const kept = nwp.getWithMeta('ECMWF', 20.3, 85.8);
  assert.equal(kept.status, 'HIT');
  assert.equal(kept.data?.status, 'LIVE');
});

test('5. Playback controller handles Loop ON/OFF, nowcast-only radar feeds, missing-timestamp honesty, mode switching, and refresh timestamp preservation', () => {
  // Loop ON wraps to 0
  assert.deepEqual(stepTimelineIndex(2, 3, true), { nextIndex: 0, shouldStop: false });
  // Loop OFF stops cleanly at last index
  assert.deepEqual(stepTimelineIndex(2, 3, false), { nextIndex: 2, shouldStop: true });
  // Single or empty series stops immediately
  assert.deepEqual(stepTimelineIndex(0, 1, true), { nextIndex: 0, shouldStop: true });

  // Nowcast-only radar feed activates radar mode
  const nowcastOnlyRadar: RadarApiResponse = {
    status: 'LIVE',
    available: true,
    host: 'https://tilecache.rainviewer.com',
    sourceAttribution: 'RainViewer',
    originalProvider: 'RainViewer',
    pastFrames: [],
    nowcastFrames: [
      {
        time: 1795250000,
        path: '/v2/radar/nowcast-1',
        formattedTime: '01:40 pm IST',
        relativeLabel: '+10m',
        ageMinutes: -10,
      },
    ],
  };
  const radarSeries = buildTimelineSeries('radar', [], nowcastOnlyRadar);
  assert.equal(radarSeries.modeKey, 'radar');
  assert.equal(radarSeries.frames.length, 1);
  assert.equal(radarSeries.frames[0].kind, 'NOWCAST');

  // Missing timestamp is NEVER classified as NOWCAST
  const missingTsRadar: RadarApiResponse = {
    status: 'LIVE',
    available: true,
    host: 'https://tilecache.rainviewer.com',
    sourceAttribution: 'RainViewer',
    originalProvider: 'RainViewer',
    pastFrames: [
      {
        time: 0,
        path: '/v2/radar/no-ts',
        formattedTime: '',
        relativeLabel: '',
        ageMinutes: undefined as any,
      },
    ],
    nowcastFrames: [],
  };
  const missingSeries = buildTimelineSeries('radar', [], missingTsRadar);
  assert.equal(missingSeries.frames[0].kind, 'UNAVAILABLE');
  assert.equal(missingSeries.frames[0].timeLabel, 'Time unavailable');

  // Mode switching between radar and forecast changes modeKey
  const sampleHourly: HourlyForecastItem[] = [
    {
      time: 'Now',
      hourNumber: 14,
      temp: 24,
      condition: 'Clear',
      icon: 'sunny',
      rainProb: 0,
      windSpeed: 5,
      aqi: 45,
      uv: 4,
      humidity: 70,
      isNow: true,
    },
    {
      time: '3 PM',
      hourNumber: 15,
      temp: 26,
      condition: 'Clear',
      icon: 'sunny',
      rainProb: 10,
      windSpeed: 7,
      aqi: 48,
      uv: 3,
      humidity: 68,
    },
  ];
  const forecastSeries = buildTimelineSeries('wind', sampleHourly, nowcastOnlyRadar);
  assert.equal(forecastSeries.modeKey, 'forecast');
  assert.notEqual(forecastSeries.modeKey, radarSeries.modeKey);

  // Refresh preserves selected timestamp slot even when oldest frame rolls off
  const prevFrames = [
    { timestampKey: 'radar:100', timeLabel: '1:00', kind: 'OBSERVED' as const, detail: '', source: '' },
    { timestampKey: 'radar:200', timeLabel: '1:10', kind: 'OBSERVED' as const, detail: '', source: '' },
    { timestampKey: 'radar:300', timeLabel: '1:20', kind: 'OBSERVED' as const, detail: '', source: '' },
  ];
  const nextFrames = [
    { timestampKey: 'radar:200', timeLabel: '1:10', kind: 'OBSERVED' as const, detail: '', source: '' },
    { timestampKey: 'radar:300', timeLabel: '1:20', kind: 'OBSERVED' as const, detail: '', source: '' },
    { timestampKey: 'radar:400', timeLabel: '1:30', kind: 'OBSERVED' as const, detail: '', source: '' },
  ];
  // User was viewing index 2 ('radar:300'); after rollover, it is now at index 1
  assert.equal(reconcileIndexOnRefresh(prevFrames, 2, nextFrames), 1);

  // Empty series returns 0 frames
  assert.equal(buildTimelineSeries('wind', [], null).frames.length, 0);
});

test('6. geoMath resolveMergedStatePoints omits unmatched states instead of fabricating 22.5, 78.9 coordinates', () => {
  const states = [
    { id: 'IN-OR', name: 'Odisha', city: 'Bhubaneswar' },
    { id: 'IN-XX', name: 'Unknown Phantom Territory', city: 'Nowhere' },
  ] as any[];
  const regions = [
    { name: 'Odisha', representativeCity: 'Bhubaneswar', latitude: 20.2961, longitude: 85.8245, code: 'OR' },
  ];
  const merged = resolveMergedStatePoints(states, regions);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].code, 'OR');
  assert.equal(merged[0].lat, 20.2961);
  assert.equal(merged[0].lng, 85.8245);
});

test('7. MausamAssistantService normalizes Gemini OpenAI-compatible URLs, enforces HTTPS/SSRF rules, uses Bearer auth + default model, and redacts secrets', async () => {
  // SSRF and malformed URL protection
  assert.equal(validateAssistantEndpointUrl('http://127.0.0.1:8080/v1').valid, false);
  assert.equal(validateAssistantEndpointUrl('http://169.254.169.254/latest/meta-data').valid, false);
  assert.equal(validateAssistantEndpointUrl('http://localhost:3000/v1').valid, false);
  assert.equal(validateAssistantEndpointUrl('http://10.0.0.5/v1').valid, false);
  assert.equal(validateAssistantEndpointUrl('file:///etc/passwd').valid, false);
  assert.equal(validateAssistantEndpointUrl('https://user:pass@api.openai.com/v1').valid, false);
  assert.equal(validateAssistantEndpointUrl('https://api.openai.com/v1?foo=bar').valid, false);

  // Endpoint normalization across Gemini and standard OpenAI-compatible base URLs
  assert.equal(
    validateAssistantEndpointUrl('https://generativelanguage.googleapis.com/v1beta/openai/').normalizedUrl,
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  );
  assert.equal(
    validateAssistantEndpointUrl('https://generativelanguage.googleapis.com/v1beta').normalizedUrl,
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  );
  assert.equal(
    validateAssistantEndpointUrl('https://api.openai.com/v1').normalizedUrl,
    'https://api.openai.com/v1/chat/completions'
  );
  assert.equal(
    validateAssistantEndpointUrl('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions').normalizedUrl,
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  );

  // Zero-secret runtime locks assistant mode to keyless 'local'
  assert.equal(getAssistantMode({}), 'local');
  assert.equal(getAssistantMode({ CUSTOM_MODE: 'remote' }), 'local');

  // Health check in default keyless mode reports OPERATIONAL without API keys
  const defaultHealth = await MausamAssistantService.checkHealth({});
  assert.equal(defaultHealth.configured, true);
  assert.equal(defaultHealth.operational, true);
  assert.equal(defaultHealth.error, 'Grounded local assistant active. No API key required.');

  // Default keyless mode returns grounded-local with ZERO remote calls
  let remoteCalledInDefault = false;
  const defaultRes = await MausamAssistantService.askMausam(
    {
      prompt: 'Current weather?',
      location: { city: 'Bhubaneswar', state: 'Odisha' },
      observation: { temperatureC: 24.2, condition: 'Clear Night', relativeHumidity: 88, windSpeedKmh: 6 },
      airQuality: { aqi: 44, category: 'Good' },
      metadata: { source: 'Open-Meteo' },
    },
    {
      env: {},
      fetchImpl: (async () => {
        remoteCalledInDefault = true;
        return new Response('should not be called', { status: 500 });
      }) as typeof fetch,
    }
  );
  assert.equal(remoteCalledInDefault, false);
  assert.equal(defaultRes.modeUsed, 'grounded-local');
  assert.equal(defaultRes.error, undefined);
  assert.match(defaultRes.response, /24\.2°C/);
  assert.match(defaultRes.response, /88%/);
  assert.ok(DEFAULT_ASSISTANT_MODEL.length > 0);
});

test('8. IMD direct adapter stays disabled in zero-secret keyless mode and never makes unauthenticated requests', async () => {
  const disabledCfg = resolveImdConfig({});
  assert.equal(disabledCfg.enabled, false);

  let calledWhenDisabled = false;
  const disabledObs = await fetchImdObservation('42971', 20.3, 85.8, {
    env: {},
    fetchImpl: (async () => {
      calledWhenDisabled = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(calledWhenDisabled, false);
  assert.equal(disabledObs.available, false);
  assert.equal(disabledObs.source.status, 'UNAVAILABLE');
});

test('9. Keyless operation guard: zero browser API-key inputs, no runtime process.env mutation, and /api/ai returns HTTP 200 grounded-local without keys', async () => {
  const healthUiSource = readFileSync(
    join(process.cwd(), 'src/components/common/MausamDataHealth.tsx'),
    'utf8'
  );
  assert.ok(!healthUiSource.includes('handleSaveProviderConfig'), 'Must not contain browser credential-save handler');
  assert.ok(!healthUiSource.includes('configKeyInput'), 'Must not contain browser API-key input state');
  assert.ok(!healthUiSource.includes('mode=config'), 'Must not call deprecated credential config endpoint');
  assert.ok(healthUiSource.includes('Optional Integration'), 'Must render concise Optional Integration notice');

  const unifiedRoutesSource = readFileSync(
    join(process.cwd(), 'server/routes/unifiedApiRoutes.ts'),
    'utf8'
  );
  assert.ok(
    !/process\.env\.[A-Z0-9_]+\s*=/.test(unifiedRoutesSource),
    'unifiedApiRoutes must never mutate process.env from HTTP request bodies'
  );

  // /api/ai returns HTTP 200 grounded-local with zero credentials
  let statusCode = 0;
  let body = '';
  const mockRes = {
    setHeader() {},
    status(code: number) {
      statusCode = code;
      return this;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
    },
  };

  await aiHandler(
    {
      method: 'POST',
      url: '/api/ai',
      body: {
        prompt: 'Current weather summary?',
        location: { name: 'Bhubaneswar', state: 'Odisha' },
        observation: { temperatureC: 25.5, condition: 'Clear Sky', relativeHumidity: 74, windSpeedKmh: 8 },
      },
    },
    mockRes
  );

  assert.equal(statusCode, 200);
  const parsed = JSON.parse(body);
  assert.equal(parsed.modeUsed, 'grounded-local');
  assert.match(parsed.response, /25\.5°C/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCoordinates,
  formatCoordinatePair,
  PersonaDataBundleSchema,
  isWeatherTelemetryComplete,
} from '../shared/weatherContract';
import { resolveWeatherCondition } from '../src/services/weatherResolver';
import { getWeatherCondition, getConditionLabel } from '../src/services/weatherConditions';
import weatherHandler from '../api/weather';
import cycloneHandler, {
  extractOfficialClassification,
  parseCycloneBulletinText,
} from '../api/cyclone';
import {
  weatherService,
  OpenMeteoPayloadError,
} from '../src/services/weatherService';
import { getMetricStatus } from '../src/types/dataProvenance';
import { getAgrometBulletin } from '../src/services/agrometService';
import { CycloneLiveDataService } from '../src/services/CycloneLiveDataService';
import { calculateSolarAstronomicalData } from '../src/utils/astronomyCalculator';
import { formatLocationTitle, formatLocationShort } from '../src/utils/locationFormatter';
import { warningService } from '../src/services/warningService';
import {
  normalizeSpokenText,
  buildBroadcastBulletinChunks,
} from '../src/services/WarningReadoutService';
import {
  clearTransientMausamCaches,
  isStorageAvailable,
  safeStorageGet,
  safeStorageGetJson,
  safeStorageSet,
} from '../src/utils/safeStorage';
import { createInitialProviderStore } from '../src/store/providerStore';
import { isChunkLoadError, loadModuleWithRetry } from '../src/utils/lazyWithRetry';
import type { LocationRecord } from '../src/types';
import type { WarningRecord } from '../src/types/warningTypes';

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
    json(obj: any) {
      body = JSON.stringify(obj);
    },
    getStatus: () => statusCode,
    getHeaders: () => headers,
    getJson: () => (body ? JSON.parse(body) : null),
  };
}

const SAMPLE_LOCATION: LocationRecord = {
  id: 'odisha-chandaka',
  state: 'Odisha',
  district: 'Khordha',
  city: 'Chandaka',
  lat: 20.36,
  lng: 85.81,
  timezone: 'Asia/Kolkata',
  displayName: 'Chandaka, Odisha',
};

test('parseCoordinates preserves (0,0), rejects missing/NaN/out-of-range coordinates', () => {
  const eq = parseCoordinates({ lat: '0', lon: '0' });
  assert.equal(eq.ok, true);
  assert.equal(eq.lat, 0);
  assert.equal(eq.lon, 0);

  const numEq = parseCoordinates({ latitude: 0, longitude: 0 });
  assert.equal(numEq.ok, true);
  assert.equal(numEq.lat, 0);
  assert.equal(numEq.lon, 0);

  const missing = parseCoordinates({});
  assert.equal(missing.ok, false);

  const blank = parseCoordinates({ lat: '   ', lon: '85.8' });
  assert.equal(blank.ok, false);

  const nan = parseCoordinates({ lat: 'abc', lon: '85.8' });
  assert.equal(nan.ok, false);

  const outOfRangeLat = parseCoordinates({ lat: '91', lon: '85.8' });
  assert.equal(outOfRangeLat.ok, false);

  const outOfRangeLon = parseCoordinates({ lat: '20', lon: '-181' });
  assert.equal(outOfRangeLon.ok, false);
});

test('formatCoordinatePair formats N/S/E/W hemispheres and handles invalid inputs', () => {
  assert.equal(formatCoordinatePair(20.36, 85.81, 2), '20.36°N, 85.81°E');
  assert.equal(formatCoordinatePair(-33.87, -151.21, 2), '33.87°S, 151.21°W');
  assert.equal(formatCoordinatePair(0, 0, 2), '0.00°N, 0.00°E');
  assert.equal(formatCoordinatePair(null, 85.81), 'Coordinates unavailable');
  assert.equal(formatCoordinatePair(undefined, undefined), 'Coordinates unavailable');
  assert.equal(formatCoordinatePair(Number.NaN, 10), 'Coordinates unavailable');
});

test('resolveWeatherCondition & getWeatherCondition distinguish clear vs precip probability and preserve 0 values', () => {
  const clearWithHighProb = resolveWeatherCondition({
    wmoCode: 0,
    precipitationMm: 0,
    precipitationProbability: 90,
    windSpeedKmH: 0,
    isDaytime: true,
  });
  assert.equal(clearWithHighProb.isRainingNow, false);
  assert.equal(clearWithHighProb.normalizedCondition, 'CLEAR');
  assert.equal(clearWithHighProb.conditionLabel, 'Clear Sky');
  assert.match(clearWithHighProb.atmosphericDescription, /Wind 0 km\/h/);

  const missingInput = resolveWeatherCondition({});
  assert.equal(missingInput.normalizedCondition, 'UNKNOWN');
  assert.equal(missingInput.conditionLabel, 'Condition Unavailable');
  assert.equal(missingInput.isRainingNow, false);

  const condMissing = getWeatherCondition(undefined);
  assert.equal(condMissing, 'UNKNOWN');
  assert.equal(getConditionLabel(condMissing), 'Condition Unavailable');

  const condClearProb = getWeatherCondition({ wmoCode: 0, precipitation: 0, isDay: true });
  assert.equal(condClearProb, 'CLEAR_DAY');
});

test('/api/weather handler rejects missing coordinates and missing IMD route with HTTP 400', async () => {
  const resNoCoords = createMockRes();
  await weatherHandler({ method: 'GET', query: { mode: 'current' }, url: '/api/weather?mode=current' }, resNoCoords);
  assert.equal(resNoCoords.getStatus(), 400);
  const bodyNoCoords = resNoCoords.getJson();
  assert.equal(bodyNoCoords.status, 'error');
  assert.equal(bodyNoCoords.dataStatus, 'UNAVAILABLE');

  const resNoRoute = createMockRes();
  await weatherHandler({ method: 'GET', query: { mode: 'imd' }, url: '/api/weather?mode=imd' }, resNoRoute);
  assert.equal(resNoRoute.getStatus(), 400);
  const bodyNoRoute = resNoRoute.getJson();
  assert.equal(bodyNoRoute.status, 'error');
  assert.equal(bodyNoRoute.error?.code, 'MISSING_ROUTE');
});

test('PersonaDataBundleSchema validates null-metric bundles and isWeatherTelemetryComplete enforces primary metrics', () => {
  const validNullBundle = {
    location: { city: 'Chandaka', state: 'Odisha', lat: 20.36, lng: 85.81, isCoastal: false },
    health: {
      aqi: {
        source: 'Open-Meteo Air Quality',
        stationName: 'Chandaka',
        aqi: null,
        category: 'Unavailable',
        dominantPollutant: 'Unavailable',
        pm25: null,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
        healthAdvice: 'Telemetry unavailable',
        colorCode: '#8295A8',
        lastUpdated: new Date().toISOString(),
        isOfficialFeed: false,
      },
      pollen: {
        source: 'Open-Meteo',
        overallIndex: null,
        riskCategory: 'Unavailable',
        treePollen: null,
        grassPollen: null,
        weedPollen: null,
        allergyTip: 'Unavailable',
        lastUpdated: new Date().toISOString(),
      },
      uvIndex: null,
      uvRiskLabel: 'Unavailable',
      uvAdvice: 'Unavailable',
      humidity: null,
    },
    fitness: {
      sunrise: null,
      sunset: null,
      bestRunningHours: 'Awaiting telemetry',
      workoutSuitability: 'Unavailable',
      heatAlertActive: false,
      heatAlertMessage: null,
      windSpeedKmh: null,
      windDirection: '—',
      hydrationRateMlHour: null,
      thermalStressLevel: 'Unavailable',
    },
    beachAndSurf: { isCoastal: false, tides: null, marine: null },
    travel: { activeAlerts: [], packingSuggestions: [], travelSafetyRating: 'Unknown' },
    familyCommute: {
      morningCommuteStatus: 'Unknown',
      eveningCommuteStatus: 'Unknown',
      morningWindow: '07:30 - 09:30 AM',
      eveningWindow: '05:30 - 07:30 PM',
      rainExpectedDuringCommute: false,
      commuteRainSummary: 'Unavailable',
      schoolBusSafetyNote: 'Unavailable',
      severeWarnings: [],
    },
    agriculture: {
      soilMoisturePercent: null,
      soilMoistureStatus: 'Unavailable',
      threeDayRainfallTotalMm: null,
      frostAlertActive: false,
      frostAlertMessage: null,
      currentCropSeason: 'Kharif',
      seasonalPlantingTip: 'Monitor telemetry',
      irrigationRecommendation: 'Monitor telemetry',
    },
    commuter: {
      roadCondition: 'Unknown',
      roadSafetyIndex: 'Unknown',
      roadSafetyLabel: 'Unavailable',
      visibilityKm: null,
      visibilityStatus: 'Unavailable',
      travelHazards: [],
    },
    eventPlanner: {
      extendedForecast: [],
      comfortIndexToday: null,
      comfortCategoryToday: 'Comfortable',
      eventRecommendation: 'Monitor telemetry',
    },
    fetchedAt: new Date().toISOString(),
  };

  const parsed = PersonaDataBundleSchema.safeParse(validNullBundle);
  assert.equal(parsed.success, true);

  assert.equal(isWeatherTelemetryComplete({ temp: 29.4, humidity: 70, windSpeed: 12 }), true);
  assert.equal(isWeatherTelemetryComplete({ temp: 29.4, humidity: null, windSpeed: null }), false);
  assert.equal(isWeatherTelemetryComplete({ temp: null, humidity: 70, windSpeed: 12 }), false);
});

test('weatherService unwraps { raw: { current, hourly, daily } } and createUnavailableBundle returns UNAVAILABLE', async () => {
  const unavailable = weatherService.createUnavailableBundle(SAMPLE_LOCATION, 'Network offline');
  assert.equal(unavailable.current.observationStatus, 'UNAVAILABLE');
  assert.equal(unavailable.current.temp, null);
  assert.equal(unavailable.current.humidity, null);
  assert.equal(unavailable.current.windSpeed, null);
  assert.equal(unavailable.isLive, false);

  const originalFetch = globalThis.fetch;
  const nowIso = new Date().toISOString().slice(0, 13) + ':00';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('mode=air')) {
      return new Response(JSON.stringify({ raw: { current: { pm2_5: 24.2, pm10: 41.0 } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        status: 'success',
        dataStatus: 'MODEL_LIVE',
        cached: false,
        raw: {
          current: {
            time: nowIso,
            temperature_2m: 28.6,
            apparent_temperature: 31.2,
            relative_humidity_2m: 66,
            pressure_msl: 1009.4,
            wind_speed_10m: 11.4,
            wind_direction_10m: 180,
            weather_code: 2,
            is_day: 1,
            precipitation: 0,
            cloud_cover: 35,
          },
          hourly: {
            time: [nowIso],
            temperature_2m: [28.6],
            relative_humidity_2m: [66],
            precipitation_probability: [15],
            precipitation: [0],
            weather_code: [2],
            wind_speed_10m: [11.4],
          },
          daily: {
            time: [nowIso.slice(0, 10)],
            temperature_2m_max: [32.1],
            temperature_2m_min: [23.4],
            precipitation_probability_max: [20],
            precipitation_sum: [0],
            weather_code: [2],
            uv_index_max: [7.2],
            wind_speed_10m_max: [16],
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const freshLoc: LocationRecord = { ...SAMPLE_LOCATION, id: 'test-unwrap-loc' };
    const bundle = await weatherService.fetchWeatherForLocation(freshLoc, true);
    assert.equal(bundle.current.temp, 28.6);
    assert.equal(bundle.current.humidity, 66);
    assert.equal(bundle.current.windSpeed, 11);
    assert.equal(bundle.current.observationStatus, 'LIVE');
    assert.equal(bundle.daily.length, 1);
    assert.equal(bundle.hourly.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Cyclone gateway and service never fabricate active cyclones', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
  try {
    const res = createMockRes();
    await cycloneHandler({ method: 'GET', query: { mode: 'bundle', force: '1' }, url: '/api/cyclone?mode=bundle&force=1' }, res);
    assert.equal(res.getStatus(), 200);
    const payload = res.getJson();
    assert.equal(payload.activeCount, 0);
    assert.deepEqual(payload.systems, []);

    const svc = CycloneLiveDataService.getInstance();
    const summary = svc.getSystemStatus();
    assert.equal(summary.hasActiveMarineCyclone, false);
    assert.equal(summary.activeCycloneCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('agrometService uses dynamic current dates instead of stale 2026 static dates', () => {
  const bulletin = getAgrometBulletin('Odisha', 'Khordha (Bhubaneswar)');
  assert.notEqual(bulletin.issueDate, 'August 24, 2026');
  assert.notEqual(bulletin.validPeriod, '24 Aug - 28 Aug 2026');
  const currentYear = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  }).format(new Date());
  assert.ok(bulletin.issueDate.includes(currentYear));
  assert.ok(!bulletin.validPeriod.includes('30 Aug'));
});

test('calculateSolarAstronomicalData computes local sunrise, solar zenith, sunset, and peak elevation', () => {
  const testDate = new Date('2026-11-18T06:00:00Z'); // 11:30 AM IST
  const bbsr = calculateSolarAstronomicalData(20.2961, 85.8245, testDate, 'Asia/Kolkata');

  assert.equal(bbsr.timeZoneUsed, 'Asia/Kolkata');
  assert.ok(bbsr.sunriseStr.length > 0 && bbsr.sunriseStr !== '—');
  assert.ok(bbsr.solarNoonStr.length > 0 && bbsr.solarNoonStr !== '—');
  assert.ok(bbsr.sunsetStr.length > 0 && bbsr.sunsetStr !== '—');
  assert.ok(bbsr.dayLengthMinutes > 600 && bbsr.dayLengthMinutes < 840);
  assert.equal(bbsr.dayLengthMinutes + bbsr.nightDurationMinutes, 1440);
  assert.ok(bbsr.zenithElevationDeg > 40 && bbsr.zenithElevationDeg < 90);
  assert.equal(Math.round((bbsr.zenithElevationDeg + bbsr.zenithAngleDeg) * 10) / 10, 90);

  // Eastern India (Guwahati, ~91.7°E) reaches solar zenith earlier than Western India (Ahmedabad, ~72.6°E)
  const guwahati = calculateSolarAstronomicalData(26.1445, 91.7362, testDate, 'Asia/Kolkata');
  const ahmedabad = calculateSolarAstronomicalData(23.0225, 72.5714, testDate, 'Asia/Kolkata');
  assert.notEqual(guwahati.solarNoonStr, ahmedabad.solarNoonStr);
  assert.notEqual(guwahati.sunriseStr, ahmedabad.sunriseStr);
});

test('weatherService.parseOpenMeteoBundle preserves valid 0°C temp and 0 mm rainfall, keeps missing feelsLike null, and avoids fabricating isDay/Clear Sky', () => {
  const nowIso = '2026-11-19T06:00:00Z';
  const bundle = weatherService.parseOpenMeteoBundle(
    SAMPLE_LOCATION,
    {
      current: {
        time: nowIso,
        temperature_2m: 0,
        // apparent_temperature intentionally omitted
        relative_humidity_2m: 0,
        pressure_msl: 1013.2,
        wind_speed_10m: 0,
        precipitation: 0,
        // weather_code and is_day intentionally omitted
      },
      hourly: {
        time: [nowIso],
        temperature_2m: [0],
        precipitation: [0],
        precipitation_probability: [0],
      },
      daily: {
        time: ['2026-11-19'],
        temperature_2m_max: [0],
        temperature_2m_min: [-2],
        precipitation_sum: [0],
        precipitation_probability_max: [0],
      },
    },
    null
  );

  assert.equal(bundle.current.temp, 0);
  assert.equal(bundle.current.precipitation, 0);
  assert.equal(bundle.current.rainfallLast1h, 0);
  assert.equal(bundle.current.windSpeed, 0);
  assert.equal(bundle.current.humidity, 0);
  assert.equal(bundle.current.feelsLike, null);
  assert.equal(bundle.current.isDay, undefined);
  assert.equal(bundle.current.observedAt, new Date(nowIso).toISOString());
  assert.equal(bundle.current.validAt, new Date(nowIso).toISOString());
  assert.notEqual(bundle.current.condition, 'Clear Sky');
  assert.equal(bundle.hourly[0].temp, 0);
  assert.equal(bundle.hourly[0].feelsLike, null);
  assert.equal(bundle.hourly[0].precipitation, 0);
  assert.equal(bundle.daily[0].high, 0);
  assert.equal(bundle.daily[0].precipMm, 0);
});

test('weatherService.parseOpenMeteoBundle rejects malformed {} payload with OpenMeteoPayloadError', () => {
  assert.throws(
    () => weatherService.parseOpenMeteoBundle(SAMPLE_LOCATION, {}, null),
    (err: unknown) => {
      assert.ok(err instanceof OpenMeteoPayloadError);
      assert.equal(err.code, 'OPEN_METEO_INVALID_PAYLOAD');
      return true;
    }
  );
});

test('getMetricStatus distinguishes all 6 truthful metric states including valid 0', () => {
  assert.equal(getMetricStatus(0), 'available');
  assert.equal(getMetricStatus(0, { isStale: true }), 'stale');
  assert.equal(getMetricStatus(null), 'unavailable');
  assert.equal(getMetricStatus(undefined), 'unavailable');
  assert.equal(getMetricStatus(Number.NaN), 'unavailable');
  assert.equal(getMetricStatus(null, { isLoading: true }), 'loading');
  assert.equal(getMetricStatus(null, { hasError: true }), 'error');
  assert.equal(getMetricStatus(null, { notApplicable: true }), 'not-applicable');
});

test('PersonaDataBundleSchema rejects malformed wrong-shape payloads', () => {
  const bad = PersonaDataBundleSchema.safeParse({
    location: { city: 'InvalidOnly' },
    health: 'wrong-type',
  });
  assert.equal(bad.success, false);
});

test('formatLocationTitle and formatLocationShort deduplicate repeated administrative levels', () => {
  assert.equal(
    formatLocationTitle({ city: 'Bhubaneswar', district: 'Khordha', state: 'Odisha' }),
    'Bhubaneswar, Khordha, Odisha'
  );

  assert.equal(
    formatLocationTitle({
      city: 'Bhubaneswar',
      district: 'Khordha',
      state: 'Odisha',
      displayName: 'Bhubaneswar, Khordha, Odisha, Odisha',
    }),
    'Bhubaneswar, Khordha, Odisha'
  );

  assert.equal(
    formatLocationTitle({
      displayName: 'Bhubaneswar, Khordha, Odisha, odisha',
    }),
    'Bhubaneswar, Khordha, Odisha'
  );

  assert.equal(
    formatLocationTitle({ city: 'New Delhi', district: 'New Delhi', state: 'Delhi', country: 'India' }),
    'New Delhi, Delhi'
  );

  assert.equal(
    formatLocationTitle(
      { city: 'New Delhi', district: 'New Delhi', state: 'Delhi', country: 'India' },
      { includeCountry: true }
    ),
    'New Delhi, Delhi, India'
  );

  assert.equal(
    formatLocationTitle('Bhubaneswar, Khordha, Odisha, Odisha'),
    'Bhubaneswar, Khordha, Odisha'
  );

  assert.equal(
    formatLocationTitle('  Mumbai , Mumbai , Maharashtra , maharashtra  '),
    'Mumbai, Maharashtra'
  );

  assert.equal(
    formatLocationShort({ city: 'Bhubaneswar', district: 'Khordha', state: 'Odisha' }),
    'Bhubaneswar, Odisha'
  );

  assert.equal(
    formatLocationShort({ city: 'Delhi', district: 'Delhi', state: 'Delhi' }),
    'Delhi'
  );

  assert.equal(formatLocationTitle(null), 'Selected location');
});

test('warningService.reconcileNationalWarnings reconciles multi-bulletin states, resolves aliases (OR/TS), filters expired alerts, and reports offline honestly', () => {
  const nowMs = Date.UTC(2026, 10, 20, 12, 0, 0);
  const futureTs = nowMs + 6 * 3600 * 1000;
  const pastTs = nowMs - 2 * 3600 * 1000;

  const makeWarn = (overrides: Partial<WarningRecord>): WarningRecord => ({
    id: 'w-1',
    bulletinNo: 'CAP-1',
    title: 'Thunderstorm & Lightning Watch',
    severity: 'yellow',
    severityLabel: 'Yellow Watch',
    hazardCategory: 'thunderstorm',
    hazardLabel: 'Thunderstorm',
    hazardIcon: 'cloud-lightning',
    state: 'Chhattisgarh',
    stateCode: 'CG',
    subdivision: 'Chhattisgarh',
    region: 'central',
    affectedDistricts: ['Raipur'],
    affectedAreaText: 'Raipur, Bilaspur',
    issuedAt: '20 Nov 2026, 05:00 pm IST',
    validFrom: '20 Nov 2026, 05:00 pm IST',
    validUntil: '20 Nov 2026, 11:00 pm IST',
    validityTimestamp: futureTs,
    description: 'Isolated thunderstorm activity likely.',
    impacts: ['Minor localized disruption.'],
    recommendedActions: ['Stay indoors during lightning'],
    expectedConditions: {},
    timeline: [],
    source: 'SACHET NDMA / IMD CAP',
    authorityAgency: 'NDMA SACHET / IMD',
    emergencyContact: { title: 'NDMA', number: '112', description: 'Emergency' },
    isRedAlert: false,
    ...overrides,
  });

  // 7 active yellow bulletins across 3 states (CG: 4, TG via alias TS: 2, OD via alias OR: 1) + 1 expired bulletin
  const warnings: WarningRecord[] = [
    makeWarn({ id: 'cg-1', state: 'Chhattisgarh', stateCode: 'CG' }),
    makeWarn({ id: 'cg-2', state: 'Chhattisgarh', stateCode: 'CG' }),
    makeWarn({ id: 'cg-3', state: 'Chhattisgarh', stateCode: 'CG' }),
    makeWarn({ id: 'cg-4', state: 'Chhattisgarh', stateCode: 'CG' }),
    makeWarn({ id: 'tg-1', state: 'Telangana', stateCode: 'TS' }),
    makeWarn({ id: 'tg-2', state: 'Telangana', stateCode: 'TS' }),
    makeWarn({ id: 'od-1', state: 'Odisha', stateCode: 'OR' }),
    makeWarn({ id: 'expired-1', state: 'Bihar', stateCode: 'BR', validityTimestamp: pastTs }),
  ];

  const reconciled = warningService.reconcileNationalWarnings(warnings, { nowMs });
  assert.equal(reconciled.totalStatesAndUTs, 36);
  assert.equal(reconciled.totalBulletins, 7);
  assert.equal(reconciled.yellowBulletins, 7);
  assert.equal(reconciled.affectedStateCount, 3);
  assert.equal(reconciled.yellowStates, 3);
  assert.equal(reconciled.normalStateCount, 33);
  assert.equal(reconciled.stateSummaries['cg'].activeCount, 4);
  assert.equal(reconciled.stateSummaries['tg'].activeCount, 2);
  assert.equal(reconciled.stateSummaries['od'].activeCount, 1);
  assert.equal(reconciled.stateSummaries['br'].activeCount, 0);

  // Offline / unavailable mode must NOT claim 36 normal states
  const offline = warningService.reconcileNationalWarnings([], { isUnavailable: true, nowMs });
  assert.equal(offline.isUnavailable, true);
  assert.equal(offline.normalStateCount, 0);
  assert.equal(offline.affectedStateCount, 0);

  // CAP RSS XML parser produces structured active records
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"><channel>
    <item>
      <title>Orange Alert: Heavy Rain over Coastal Odisha</title>
      <description>Deep Depression over south coastal Odisha likely to bring heavy rain across Puri and Khordha.</description>
      <pubDate>Fri, 20 Nov 2026 15:30:00 +0530</pubDate>
      <guid>sachet-od-20261120-01</guid>
      <author>India Meteorological Department</author>
    </item>
  </channel></rss>`;
  const parsedCap = warningService.parseCapRssFeedXml(sampleXml);
  assert.equal(parsedCap.length, 1);
  assert.equal(parsedCap[0].severity, 'orange');
  assert.equal(parsedCap[0].stateCode, 'in-od');
});

test('parseCycloneBulletinText preserves weakened Deep Depression status for Akvan remnant and never fabricates forecastTrack', () => {
  const akvanBulletin =
    'As of 21:04 IST on 20 November 2026, Cyclone Akvan had weakened into a Deep Depression (remnant of Severe Cyclonic Storm Akvan) over south coastal Odisha near 20.0°N, 84.9°E, about 80 km north of Gopalpur, moving northwards at 15 km/h. Forecast to weaken into a Depression and then a Well-Marked Low Pressure Area.';

  assert.equal(extractOfficialClassification(akvanBulletin), 'Deep Depression');

  const parsed = parseCycloneBulletinText(akvanBulletin, {
    id: 'imd-akvan-20261120',
    title: 'IMD National Weather Forecasting Centre Bulletin',
    source: 'IMD National Weather Forecasting Centre',
    issuedAt: '2026-11-20T15:34:00.000Z',
  });

  assert.ok(parsed);
  assert.equal(parsed!.classification, 'Deep Depression');
  assert.notEqual(parsed!.classification, 'Severe Cyclonic Storm');
  assert.equal(parsed!.latitude, 20);
  assert.equal(parsed!.longitude, 84.9);
  assert.equal(parsed!.movementSpeed, '15 km/h');
  assert.equal(parsed!.forecastTrack.length, 0);
});

test('weatherService.parseOpenMeteoBundle reports US EPA AQI honestly and never synthesizes CPCB AQI from PM2.5 alone', () => {
  const nowIso = '2026-11-20T09:00:00Z';
  const baseWeather = {
    current: {
      time: nowIso,
      temperature_2m: 26.4,
      relative_humidity_2m: 74,
      pressure_msl: 1008.2,
      wind_speed_10m: 14,
      precipitation: 0,
      weather_code: 3,
      is_day: 1,
    },
    hourly: { time: [nowIso], temperature_2m: [26.4], precipitation: [0], precipitation_probability: [10] },
    daily: { time: ['2026-11-20'], temperature_2m_max: [29], temperature_2m_min: [22], precipitation_sum: [0], precipitation_probability_max: [10] },
  };

  // When us_aqi is absent (only pm2_5 present), aqi must stay null — never fake a CPCB AQI number
  const noUsAqiBundle = weatherService.parseOpenMeteoBundle(SAMPLE_LOCATION, baseWeather, {
    current: { pm2_5: 55.0, pm10: 90.0 },
  });
  assert.equal(noUsAqiBundle.current.aqi, null);
  assert.equal(noUsAqiBundle.current.aqiStatus, 'Unavailable');

  // When us_aqi is present (e.g., 215), classify via official US EPA AQI band ('Very Unhealthy')
  const withUsAqiBundle = weatherService.parseOpenMeteoBundle(SAMPLE_LOCATION, baseWeather, {
    current: { us_aqi: 215, pm2_5: 140.2, pm10: 195.0 },
  });
  assert.equal(withUsAqiBundle.current.aqi, 215);
  assert.equal(withUsAqiBundle.current.aqiStatus, 'Very Unhealthy');
});

test('agrometService never emits fake official bulletin IDs or fabricated soil moisture when telemetry is absent', () => {
  const withoutSoil = getAgrometBulletin('Odisha', 'Khordha (Bhubaneswar)');
  assert.equal(withoutSoil.bulletinNo, 'Weather-Derived Operational Guidance');
  assert.equal(withoutSoil.soilMoisture.available, false);
  assert.equal(withoutSoil.soilMoisture.status, 'Unavailable');
  assert.ok(!withoutSoil.issueDate.includes('August 24, 2026'));

  const withSoil = getAgrometBulletin('Odisha', 'Khordha (Bhubaneswar)', {
    current: {
      temp: 27,
      unit: 'C',
      high: 30,
      low: 23,
      condition: 'Overcast',
      normalizedCondition: 'CLOUDY',
      weatherType: 'rain',
      icon: 'cloudy',
      feelsLike: 29,
      humidity: 82,
      dewPoint: 23,
      visibility: 8,
      windSpeed: 12,
      windDirection: 'NE',
      pressure: 1009,
      uvIndex: 4,
      pollen: 'Low',
      aqi: 75,
      aqiPm25: 24,
      aqiStatus: 'Moderate',
      precipitation: 2,
      precipitationProbability: 60,
      isRainingNow: true,
      soilMoisture: 0.34,
      stationName: 'Khordha',
      stationCode: 'KHD',
      lastUpdated: new Date().toISOString(),
      source: 'Open-Meteo',
      dataSource: 'Open-Meteo',
    },
    hourly: [],
    daily: [],
    trends: [],
    alerts: [],
    isLive: true,
    lastFetchedAt: new Date(),
  });
  assert.equal(withSoil.soilMoisture.available, true);
  assert.ok(withSoil.soilMoisture.overallPct > 0);
});

test('WarningReadoutService normalizes units/acronyms cleanly in English & Hindi with zero raw markdown or English leak in Hindi', () => {
  const enNorm = normalizeSpokenText('IMD alert: 55 km/h winds, 1004 hPa, 20.0°N 84.9°E. Visit https://mausam.imd.gov.in', 'en');
  assert.ok(enNorm.includes('India Meteorological Department'));
  assert.match(enNorm, /kilomet(?:er|re)s per hour/i);
  assert.ok(enNorm.includes('hectopascals'));
  assert.ok(!enNorm.includes('https://'));

  const hiNorm = normalizeSpokenText('IMD: 55 km/h winds, 1004 hPa in Odisha & Bay of Bengal.', 'hi');
  assert.ok(hiNorm.includes('भारतीय मौसम विज्ञान विभाग'));
  assert.ok(hiNorm.includes('किलोमीटर प्रति घंटा'));
  assert.ok(hiNorm.includes('ओडिशा'));
  assert.ok(!hiNorm.includes('km/h'));

  const sampleWarning = {
    name: 'Deep Depression (Remnant of Akvan)',
    classification: 'Deep Depression',
    basin: 'Bay of Bengal',
    status: 'ACTIVE',
    threatLevel: 'HIGH',
    intensityKmh: 55,
    pressureHpa: 1004,
    movementSpeedKmh: 15,
    movementDirection: 'North',
    coordinates: { lat: 20.0, lng: 84.9 },
    affectedRegions: ['Odisha', 'Andhra Pradesh'],
    issuedAt: '2026-11-20T15:34:00.000Z',
    source: 'India Meteorological Department',
    advisoryText: 'Weakened into a Deep Depression over south coastal Odisha.',
    guidance: ['Fishermen advised not to venture into sea.'],
  };

  const enChunks = buildBroadcastBulletinChunks(sampleWarning, 'en');
  const hiChunks = buildBroadcastBulletinChunks(sampleWarning, 'hi');
  assert.ok(enChunks.length >= 4);
  assert.ok(hiChunks.length >= 4);
  assert.ok(enChunks[0].text.includes('MAUSAM'));
  assert.ok(hiChunks.every((c) => !/\b(Deep Depression|Bay of Bengal|Odisha|km\/h|hPa)\b/.test(c.text)));
});

test('safeStorage & createInitialProviderStore survive blocked storage getters (SecurityError), quota errors, and corrupted JSON', () => {
  const origWindow = (globalThis as any).window;
  try {
    // Failure injection 1: window.sessionStorage & window.localStorage property getters throw SecurityError
    const restrictedWindow: Record<string, unknown> = {};
    Object.defineProperty(restrictedWindow, 'sessionStorage', {
      get() {
        throw new DOMException('Blocked by privacy policy', 'SecurityError');
      },
      configurable: true,
    });
    Object.defineProperty(restrictedWindow, 'localStorage', {
      get() {
        throw new DOMException('Blocked by privacy policy', 'SecurityError');
      },
      configurable: true,
    });
    (globalThis as any).window = restrictedWindow;

    assert.equal(isStorageAvailable('local'), false);
    assert.equal(isStorageAvailable('session'), false);
    assert.equal(safeStorageGet('local', 'mausam_language'), null);
    assert.equal(safeStorageSet('session', 'provider:sachet', '{}'), false);

    // Must never throw during ProviderStoreProvider initialization
    const storeFromBlocked = createInitialProviderStore(true);
    assert.equal(storeFromBlocked.SACHET.status, 'LOADING');
    assert.equal(storeFromBlocked.WEATHER.status, 'LOADING');

    // Failure injection 2: corrupted JSON & non-destructive transient cache reset
    const localMap = new Map<string, string>([
      ['mausam_saved_locations', '["bhubaneswar","puri"]'],
      ['mausam_language', 'hi'],
      ['mausam_surface_theme_v3', 'dark'],
      ['mausam_weather_cache_v1', '{broken-json'],
    ]);
    const sessionMap = new Map<string, string>([
      ['provider:sachet', '{"status":"INVALID_ENUM","_cachedAt":"not-a-number"}'],
      ['provider:weather', '{malformed'],
      ['mausam_retry_lazy_reload_ts', '123456'],
      ['unrelated_app_key', 'keep-me'],
    ]);

    const makeMockStorage = (map: Map<string, string>): Storage => ({
      get length() {
        return map.size;
      },
      clear() {
        map.clear();
      },
      getItem(k: string) {
        return map.has(k) ? map.get(k)! : null;
      },
      key(index: number) {
        return Array.from(map.keys())[index] ?? null;
      },
      removeItem(k: string) {
        map.delete(k);
      },
      setItem(k: string, v: string) {
        map.set(k, String(v));
      },
    });

    (globalThis as any).window = {
      localStorage: makeMockStorage(localMap),
      sessionStorage: makeMockStorage(sessionMap),
    };

    // Corrupted provider JSON is discarded cleanly without throwing
    const storeFromCorrupt = createInitialProviderStore(true);
    assert.equal(storeFromCorrupt.SACHET.status, 'LOADING');
    assert.equal(storeFromCorrupt.WEATHER.status, 'LOADING');
    assert.equal(safeStorageGetJson('local', 'mausam_weather_cache_v1'), null);

    // Non-destructive cache reset clears ONLY transient caches and preserves user data
    sessionMap.set('provider:imd', '{"status":"LIVE"}');
    localMap.set('mausam_weather_cache_v1', '{"cached":true}');
    clearTransientMausamCaches();

    assert.equal(localMap.has('mausam_weather_cache_v1'), false);
    assert.equal(sessionMap.has('provider:imd'), false);
    assert.equal(sessionMap.has('mausam_retry_lazy_reload_ts'), false);
    assert.equal(sessionMap.get('unrelated_app_key'), 'keep-me');
    assert.equal(localMap.get('mausam_saved_locations'), '["bhubaneswar","puri"]');
    assert.equal(localMap.get('mausam_language'), 'hi');
    assert.equal(localMap.get('mausam_surface_theme_v3'), 'dark');
  } finally {
    if (origWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = origWindow;
    }
  }
});

test('lazyWithRetry classifies genuine chunk errors strictly, retries bounded times, and never masks runtime TypeErrors', async () => {
  assert.equal(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/Alerts-abc.js')), true);
  assert.equal(isChunkLoadError(new Error('Importing a module script failed.')), true);
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')")), false);

  // Non-chunk runtime TypeError must fail immediately on attempt 1 without retrying
  let runtimeAttempts = 0;
  await assert.rejects(
    loadModuleWithRetry(
      async () => {
        runtimeAttempts++;
        throw new TypeError('Synthetic component runtime bug');
      },
      { retries: 3, intervalMs: 5, allowReload: false }
    ),
    /Synthetic component runtime bug/
  );
  assert.equal(runtimeAttempts, 1);

  // Genuine chunk load error retries and resolves when a subsequent attempt succeeds
  let chunkAttempts = 0;
  const FakeComponent = () => null;
  const loaded = await loadModuleWithRetry(
    async () => {
      chunkAttempts++;
      if (chunkAttempts < 2) {
        throw new Error('Failed to fetch dynamically imported module: /assets/Alerts.js');
      }
      return { AlertsPage: FakeComponent };
    },
    { exportName: 'AlertsPage', retries: 3, intervalMs: 5, allowReload: false }
  );
  assert.equal(chunkAttempts, 2);
  assert.equal(loaded.default, FakeComponent);
});






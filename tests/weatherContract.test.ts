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
import cycloneHandler from '../api/cyclone';
import { weatherService } from '../src/services/weatherService';
import { getAgrometBulletin } from '../src/services/agrometService';
import { CycloneLiveDataService } from '../src/services/CycloneLiveDataService';
import { calculateSolarAstronomicalData } from '../src/utils/astronomyCalculator';
import type { LocationRecord } from '../src/types';

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


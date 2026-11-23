import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeInitialGlobeZoom,
  DEFAULT_GLOBAL_LOCATION,
  GLOBAL_MAJOR_ANCHORS,
  GLOBAL_MAP_CONFIG,
  GLOBAL_MAP_STYLE,
  GLOBAL_MAP_FALLBACK_STYLE,
  GLOBAL_RASTER_FALLBACK_STYLE,
  WORLD_LOCATIONS,
} from '../src/config/globalMapConfig';
import {
  buildGlobalGraticuleGeoJSON,
  parseCoordinateSearchQuery,
} from '../src/utils/globalMapCamera';
import {
  fixMapGlyphFonts,
  isValidMausamFontStack,
  MAUSAM_MAP_FONT,
} from '../src/utils/map/fixGlyphFonts';
import {
  classifyMapError,
  formatMapErrorMessage,
  isRetryableMapError,
} from '../src/services/map/mapErrorClassifier';
import {
  attachViewportWeatherSync,
  computeRoundedViewportKey,
} from '../src/services/map/viewportWeatherSync';
import {
  normalizeLongitude,
  sampleGlobalWindField,
  windSpeedDirToUV,
  type GlobalAtmosphericField,
  type GlobalGridSample,
} from '../src/services/globalWindService';
import { searchGlobalLocationsSync } from '../src/services/globalGeocodingService';
import { locationService } from '../src/services/locationService';

test('Global map config defaults to full Earth view and NOT India/Bhubaneswar', () => {
  assert.ok(GLOBAL_MAP_CONFIG.zoom <= 2.2, 'Default zoom must show planet-wide Earth');
  assert.ok(GLOBAL_MAP_CONFIG.minZoom <= 1.0, 'Users must be able to zoom out to entire planet');
  assert.equal(GLOBAL_MAP_CONFIG.renderWorldCopies, true);
  assert.equal(GLOBAL_MAP_CONFIG.attributionControl, false);
  assert.match(GLOBAL_MAP_STYLE, /openfreemap\.org/);
  assert.match(GLOBAL_MAP_FALLBACK_STYLE, /openfreemap\.org/);
  assert.equal(GLOBAL_RASTER_FALLBACK_STYLE.version, 8);

  // Ensure default primary location is global, not Bhubaneswar
  assert.notEqual(DEFAULT_GLOBAL_LOCATION.city, 'Bhubaneswar');
  assert.equal(locationService.getAllLocations()[0].id, DEFAULT_GLOBAL_LOCATION.id);

  // Ensure all major continents / regions are present in WORLD_LOCATIONS
  for (const key of [
    'global',
    'northAmerica',
    'southAmerica',
    'europe',
    'africa',
    'middleEast',
    'asia',
    'southAsia',
    'australia',
    'pacific',
    'antarctica',
  ] as const) {
    assert.ok(WORLD_LOCATIONS[key], `Missing WORLD_LOCATIONS.${key}`);
  }
});

test('computeInitialGlobeZoom scales responsively across mobile, laptop, desktop, and 4K', () => {
  const mobile = computeInitialGlobeZoom(390, 844);
  const laptop = computeInitialGlobeZoom(1366, 768);
  const desktop = computeInitialGlobeZoom(1920, 1080);
  const ultra4k = computeInitialGlobeZoom(3840, 2160);

  assert.ok(mobile >= 1.4 && mobile <= 1.9, `Unexpected mobile zoom ${mobile}`);
  assert.ok(laptop >= 1.9 && laptop <= 2.2, `Unexpected laptop zoom ${laptop}`);
  assert.ok(desktop >= 2.1 && desktop <= 2.4, `Unexpected desktop zoom ${desktop}`);
  assert.ok(ultra4k >= desktop && ultra4k <= 2.4, `Unexpected 4K zoom ${ultra4k}`);
});

test('Global observatory anchors cover all 7 continents', () => {
  const continents = new Set<string>(GLOBAL_MAJOR_ANCHORS.map((a) => a.continent));
  for (const expected of [
    'North America',
    'South America',
    'Europe',
    'Africa',
    'Asia',
    'Oceania',
    'Antarctica',
  ]) {
    assert.ok(continents.has(expected), `Expected continent ${expected} in GLOBAL_MAJOR_ANCHORS`);
  }
  assert.ok(GLOBAL_MAJOR_ANCHORS.length >= 40);
});

test('parseCoordinateSearchQuery parses decimal, negative, and N/S/E/W coordinates and rejects out-of-range', () => {
  const tokyo = parseCoordinateSearchQuery('35.6762, 139.6503');
  assert.deepEqual(tokyo, { lat: 35.6762, lng: 139.6503 });

  const sydney = parseCoordinateSearchQuery('33.8688° S, 151.2093° E');
  assert.ok(sydney);
  assert.ok(Math.abs(sydney.lat - -33.8688) < 1e-4);
  assert.ok(Math.abs(sydney.lng - 151.2093) < 1e-4);

  const nyc = parseCoordinateSearchQuery('40.7128N 74.0060W');
  assert.ok(nyc);
  assert.ok(Math.abs(nyc.lat - 40.7128) < 1e-4);
  assert.ok(Math.abs(nyc.lng - -74.006) < 1e-4);

  assert.equal(parseCoordinateSearchQuery('95.0, 12.0'), null);
  assert.equal(parseCoordinateSearchQuery('12.0, 195.0'), null);
  assert.equal(parseCoordinateSearchQuery('London'), null);
});

test('Global wind vectors convert meteorological direction to U/V and wrap antimeridian seamlessly', () => {
  // Meteorological 270 deg = wind blowing FROM west TOWARD east => u > 0, v ~ 0
  const westerly = windSpeedDirToUV(36, 270);
  assert.ok(westerly.u > 35, `Expected positive eastward u, got ${westerly.u}`);
  assert.ok(Math.abs(westerly.v) < 0.01);

  // Meteorological 180 deg = wind blowing FROM south TOWARD north => u ~ 0, v > 0
  const southerly = windSpeedDirToUV(20, 180);
  assert.ok(Math.abs(southerly.u) < 0.01);
  assert.ok(southerly.v > 19.9);

  // Antimeridian longitude normalization
  assert.equal(normalizeLongitude(185), -175);
  assert.equal(normalizeLongitude(-185), 175);
  assert.equal(normalizeLongitude(540), 180);

  // Bilinear sampling across antimeridian (-180 / +180)
  const lats = [-30, 0, 30];
  const lngs = [-165, -90, 0, 90, 165];
  const samples: GlobalGridSample[] = [];
  for (const lat of lats) {
    for (const lng of lngs) {
      samples.push({
        lat,
        lng,
        temperatureC: 24,
        windSpeedKmh: 28,
        windDirDeg: 270,
        u: 28,
        v: 0,
        rainMm: 0,
        cloudCoverPct: 40,
      });
    }
  }
  const field: GlobalAtmosphericField = {
    fetchedAt: new Date().toISOString(),
    source: 'Test Open-Meteo Grid',
    status: 'LIVE',
    lats,
    lngs,
    samples,
  };

  const fijiEast = sampleGlobalWindField(field, 178.0, -17.7);
  const fijiWest = sampleGlobalWindField(field, -179.0, -17.7);
  assert.ok(fijiEast && fijiEast.speedKmh > 25 && fijiEast.u > 25);
  assert.ok(fijiWest && fijiWest.speedKmh > 25 && fijiWest.u > 25);
});

test('searchGlobalLocationsSync resolves worldwide cities, countries, and coordinates without India lock', () => {
  for (const query of ['London', 'New York', 'Tokyo', 'Sydney', 'Cape Town', 'Dubai', 'Bhubaneswar']) {
    const matches = searchGlobalLocationsSync(query);
    assert.ok(matches.length > 0, `Expected global match for "${query}"`);
  }

  const coordMatches = searchGlobalLocationsSync('-33.87, 151.21');
  assert.equal(coordMatches.length, 1);
  assert.ok(Math.abs(coordMatches[0].lat - -33.87) < 0.01);
  assert.ok(Math.abs(coordMatches[0].lng - 151.21) < 0.01);
});

test('buildGlobalGraticuleGeoJSON produces full-planet meridians and parallels', () => {
  const graticule = buildGlobalGraticuleGeoJSON(30);
  assert.equal(graticule.type, 'FeatureCollection');
  assert.ok(graticule.features.length >= 15);
  const hasWest = graticule.features.some(
    (f) => f.geometry.type === 'LineString' && f.geometry.coordinates.some(([lng]) => lng <= -150)
  );
  const hasEast = graticule.features.some(
    (f) => f.geometry.type === 'LineString' && f.geometry.coordinates.some(([lng]) => lng >= 150)
  );
  assert.ok(hasWest && hasEast, 'Graticule must span both western and eastern hemispheres');
});

test('fixMapGlyphFonts normalizes missing or Open Sans font stacks to Noto Sans Regular and skips icon-only layers', () => {
  assert.equal(isValidMausamFontStack(['Noto Sans Regular']), true);
  assert.equal(isValidMausamFontStack(['Open Sans Regular', 'Arial Unicode MS Regular']), false);
  assert.equal(isValidMausamFontStack(undefined), false);

  const updates: Array<{ id: string; prop: string; value: unknown }> = [];
  const mockMap = {
    getStyle: () => ({
      layers: [
        { id: 'bg', type: 'background' },
        { id: 'icon-only', type: 'symbol', layout: { 'icon-image': 'airport' } },
        {
          id: 'country-valid',
          type: 'symbol',
          layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'] },
        },
        {
          id: 'mausam-anchor-labels',
          type: 'symbol',
          layout: { 'text-field': ['get', 'city'] },
        },
        {
          id: 'legacy-label',
          type: 'symbol',
          layout: {
            'text-field': '{name}',
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          },
        },
      ],
    }),
    setLayoutProperty: (id: string, prop: string, value: unknown) => {
      updates.push({ id, prop, value });
    },
  };

  const count = fixMapGlyphFonts(mockMap as unknown as import('maplibre-gl').Map);
  assert.equal(count, 2);
  assert.deepEqual(
    updates.map((u) => ({ id: u.id, prop: u.prop, value: u.value })),
    [
      { id: 'mausam-anchor-labels', prop: 'text-font', value: MAUSAM_MAP_FONT },
      { id: 'legacy-label', prop: 'text-font', value: MAUSAM_MAP_FONT },
    ]
  );
});

test('classifyMapError separates 404/network/rate-limit/5xx from authentication and prevents false API-key errors', () => {
  assert.equal(classifyMapError(404, 'AJAXError: (404): fonts/Open Sans/0-255.pbf'), 'missing-resource');
  assert.equal(classifyMapError(401, 'Unauthorized'), 'authentication');
  assert.equal(classifyMapError(403, 'Forbidden'), 'forbidden');
  assert.equal(classifyMapError(429, 'Too Many Requests'), 'rate-limit');
  assert.equal(classifyMapError(503, 'Service Unavailable'), 'provider');
  assert.equal(classifyMapError(undefined, 'TypeError: Failed to fetch'), 'network');

  assert.equal(isRetryableMapError('network'), true);
  assert.equal(isRetryableMapError('rate-limit'), true);
  assert.equal(isRetryableMapError('provider'), true);
  assert.equal(isRetryableMapError('missing-resource'), false);
  assert.equal(isRetryableMapError('authentication'), false);
  assert.equal(isRetryableMapError('forbidden'), false);

  const missingMsg = formatMapErrorMessage('missing-resource', 'Radar overlay');
  assert.doesNotMatch(missingMsg.toLowerCase(), /api key/);
});

test('attachViewportWeatherSync debounces rapid moveend bursts, aborts superseded calls, and reuses rounded cache', async () => {
  // Tiny sub-0.05 jitter must hash to identical rounded key
  const keyA = computeRoundedViewportKey(-10.01, 10.02, 40.01, 50.03, 3.1);
  const keyB = computeRoundedViewportKey(-10.04, 10.01, 40.04, 50.01, 3.2);
  assert.equal(keyA, keyB);

  const listeners: Record<string, Array<() => void>> = {};
  let bounds = { west: -20, south: -10, east: 40, north: 50 };
  let zoom = 2.5;

  const mockMap = {
    loaded: () => true,
    on: (ev: string, fn: () => void) => {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    once: (ev: string, fn: () => void) => {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    off: (ev: string, fn: () => void) => {
      listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn);
    },
    getBounds: () => ({
      getWest: () => bounds.west,
      getSouth: () => bounds.south,
      getEast: () => bounds.east,
      getNorth: () => bounds.north,
    }),
    getCenter: () => ({ lng: (bounds.west + bounds.east) / 2, lat: (bounds.south + bounds.north) / 2 }),
    getZoom: () => zoom,
  };

  let fetchCalls = 0;
  let abortedCount = 0;
  const received: string[] = [];

  const detach = attachViewportWeatherSync<string>(
    mockMap as unknown as import('maplibre-gl').Map,
    {
      debounceMs: 25,
      cacheTtlMs: 60_000,
      fetcher: (vp, signal) =>
        new Promise<string>((resolve, reject) => {
          fetchCalls += 1;
          const timer = setTimeout(() => resolve(`ok:${vp.key}`), 80);
          signal.addEventListener('abort', () => {
            abortedCount += 1;
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
      onData: (d) => received.push(d),
    }
  );

  // Trigger rapid burst of moveend events — debounce should collapse them into 1 fetch
  for (let i = 0; i < 4; i++) {
    listeners['moveend']?.forEach((fn) => fn());
  }
  await new Promise((r) => setTimeout(r, 140));
  assert.equal(fetchCalls, 1);
  assert.equal(received.length, 1);

  // Move to a new viewport, let fetch #2 start, then interrupt it while still in-flight
  bounds = { west: 50, south: 5, east: 120, north: 55 };
  zoom = 4.0;
  listeners['moveend']?.forEach((fn) => fn());
  await new Promise((r) => setTimeout(r, 40)); // debounce (25ms) elapsed; fetch #2 (80ms) is in-flight
  bounds = { west: -120, south: 15, east: -60, north: 55 };
  zoom = 4.5;
  listeners['moveend']?.forEach((fn) => fn());
  await new Promise((r) => setTimeout(r, 150));

  assert.ok(abortedCount >= 1, 'Superseded in-flight request must be aborted');
  assert.equal(fetchCalls, 3);
  assert.equal(received.length, 2);

  // Return to initial cached viewport — should serve from cache with ZERO additional fetch
  bounds = { west: -20, south: -10, east: 40, north: 50 };
  zoom = 2.5;
  listeners['moveend']?.forEach((fn) => fn());
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fetchCalls, 3, 'Cached viewport must not fire redundant network request');
  assert.equal(received.length, 3);

  detach();
});

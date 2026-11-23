import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BASEMAP_STYLES,
  BASEMAP_STYLE_ORDER,
  resolveBasemapSpec,
  FALLBACK_OSM_BASEMAP,
} from '../src/utils/mapBasemaps';
import {
  MAP_LAYER_REGISTRY,
  getMapLayerDefinition,
  type MapLayerId,
} from '../src/services/map/mapLayerRegistry';
import {
  VALID_PLAYBACK_SPEEDS,
  extractFrameEpochMs,
  extractFrameKey,
  sortFramesChronologically,
  clampFrameIndex,
  computePlaybackIntervalMs,
  advanceFrameIndex,
  stepFrameIndex,
  reconcilePlaybackIndex,
} from '../src/hooks/useFramePlayback';
import {
  buildRadarPlaybackFrames,
  buildCyclonePlaybackFrames,
  buildForecastPlaybackFrames,
  formatEpochIST,
} from '../src/services/map/mapFrameService';
import {
  getPlaybackIntervalMs,
  stepTimelineIndex,
  buildTimelineSeries,
  reconcileIndexOnRefresh,
} from '../src/utils/playbackController';
import type { WeatherSystemEvent } from '../src/types/cyclone';
import type { RadarApiResponse } from '../src/services/radarService';
import type { HourlyForecastItem } from '../src/types';

describe('Geospatial Basemap & Layer Registries', () => {
  it('registers all 4 verified zero-key basemaps and supports automatic OSM failover', () => {
    assert.deepEqual(BASEMAP_STYLE_ORDER, ['dark', 'satellite', 'terrain', 'light']);
    for (const styleId of BASEMAP_STYLE_ORDER) {
      const spec = resolveBasemapSpec(styleId, false);
      assert.equal(spec.styleId, styleId);
      assert.ok(spec.baseUrl.startsWith('https://'));
      assert.ok(spec.attribution.length > 0);
    }

    const darkFallback = resolveBasemapSpec('dark', true);
    assert.equal(darkFallback.baseUrl, FALLBACK_OSM_BASEMAP.baseUrl);
    assert.equal(darkFallback.isLightSurface, false);

    const lightFallback = resolveBasemapSpec('light', true);
    assert.equal(lightFallback.baseUrl, FALLBACK_OSM_BASEMAP.baseUrl);
    assert.equal(lightFallback.isLightSurface, true);
  });

  it('defines units, color stops, and provenance for all 9 meteorological map layers', () => {
    const requiredLayers: MapLayerId[] = [
      'radar',
      'temperature',
      'rainfall',
      'wind',
      'humidity',
      'aqi',
      'warnings',
      'agromet',
      'marine',
    ];
    for (const layerId of requiredLayers) {
      const def = getMapLayerDefinition(layerId);
      assert.equal(def.id, layerId);
      assert.ok(def.unit.length > 0);
      assert.ok(def.source.length > 0);
      assert.ok(def.stops.length >= 4);
      assert.ok(MAP_LAYER_REGISTRY[layerId] === def);
    }
  });
});

describe('Unified Frame Playback Engine (useFramePlayback pure helpers)', () => {
  it('supports 0.5x, 1x, 1.5x, and 2x speeds with deterministic intervals', () => {
    assert.deepEqual([...VALID_PLAYBACK_SPEEDS], [0.5, 1, 1.5, 2]);
    assert.equal(computePlaybackIntervalMs(0.5, 900), 1800);
    assert.equal(computePlaybackIntervalMs(1, 900), 900);
    assert.equal(computePlaybackIntervalMs(1.5, 900), 600);
    assert.equal(computePlaybackIntervalMs(2, 900), 450);

    // Forecast timeline playbackController also supports 1.5x
    assert.equal(getPlaybackIntervalMs(0.5), 2200);
    assert.equal(getPlaybackIntervalMs(1), 1100);
    assert.equal(getPlaybackIntervalMs(1.5), 733);
    assert.equal(getPlaybackIntervalMs(2), 550);
  });

  it('advances frames chronologically and handles loop ON vs loop OFF cleanly', () => {
    // Mid-series advance
    assert.deepEqual(advanceFrameIndex(1, 5, true), { nextIndex: 2, reachedEnd: false });
    assert.deepEqual(advanceFrameIndex(1, 5, false), { nextIndex: 2, reachedEnd: false });

    // Last frame with loop ON -> wraps cleanly to frame 0
    assert.deepEqual(advanceFrameIndex(4, 5, true), { nextIndex: 0, reachedEnd: false });

    // Last frame with loop OFF -> stops at final frame
    assert.deepEqual(advanceFrameIndex(4, 5, false), { nextIndex: 4, reachedEnd: true });

    // Single / empty frame safety
    assert.deepEqual(advanceFrameIndex(0, 1, true), { nextIndex: 0, reachedEnd: true });
    assert.deepEqual(advanceFrameIndex(0, 0, true), { nextIndex: 0, reachedEnd: true });

    // Bidirectional stepFrameIndex wrapping & clamping
    assert.equal(stepFrameIndex(0, -1, 5, true), 4);
    assert.equal(stepFrameIndex(4, 1, 5, true), 0);
    assert.equal(stepFrameIndex(0, -1, 5, false), 0);
    assert.equal(stepFrameIndex(4, 2, 5, false), 4);

    // Mirror check on playbackController.stepTimelineIndex
    assert.deepEqual(stepTimelineIndex(3, 4, true), { nextIndex: 0, shouldStop: false });
    assert.deepEqual(stepTimelineIndex(3, 4, false), { nextIndex: 3, shouldStop: true });
  });

  it('sorts unordered frames chronologically and preserves frame identity across live refreshes', () => {
    const unordered = [
      { id: 'c', time: 1700001800 },
      { id: 'a', time: 1700000600 },
      { id: 'b', time: 1700001200 },
    ];
    const sorted = sortFramesChronologically(unordered);
    assert.deepEqual(
      sorted.map((f) => f.id),
      ['a', 'b', 'c']
    );

    assert.equal(extractFrameEpochMs({ time: 1700000600 }), 1700000600 * 1000);
    assert.equal(extractFrameEpochMs({ timestamp: '2026-11-22T06:00:00Z' }), Date.parse('2026-11-22T06:00:00Z'));
    assert.equal(extractFrameKey({ id: 'sweep-1', time: 1700000600 }, 0), 'id:sweep-1');
    assert.equal(clampFrameIndex(-4, 10), 0);
    assert.equal(clampFrameIndex(99, 10), 9);
    assert.equal(clampFrameIndex(3, 0), 0);

    // Hydrating from empty -> honors 'latest' initial position
    assert.equal(reconcilePlaybackIndex([], 0, sorted, 'latest'), 2);

    // Rolling window refresh: oldest frame 'a' drops, new frame 'd' appends
    // User viewing frame 'b' (index 1) stays pinned on 'b' (now index 0)
    const nextWindow = [
      { id: 'b', time: 1700001200 },
      { id: 'c', time: 1700001800 },
      { id: 'd', time: 1700002400 },
    ];
    assert.equal(reconcilePlaybackIndex(sorted, 1, nextWindow, 'latest'), 0);

    // Shrinking list when active frame disappeared -> safely clamps
    assert.equal(reconcilePlaybackIndex(sorted, 2, [{ id: 'x', time: 1700009999 }], 'first'), 0);
  });
});

describe('Map Frame Builders (Radar, Cyclone, Forecast)', () => {
  it('builds chronologically sorted radar frames distinguishing OBSERVED vs NOWCAST with lookback filtering', () => {
    const base = 1700010000;
    const mockRadar: RadarApiResponse = {
      status: 'LIVE',
      available: true,
      host: 'https://tilecache.rainviewer.com',
      pastFrames: [
        {
          time: base - 7200, // 2h ago (outside 1h lookback)
          path: '/v2/radar/old',
          formattedTime: '10:00 AM IST',
          relativeLabel: '120m ago',
          ageMinutes: 120,
        },
        {
          time: base - 600,
          path: '/v2/radar/p2',
          formattedTime: '11:50 AM IST',
          relativeLabel: '10m ago',
          ageMinutes: 10,
        },
        {
          time: base - 1200,
          path: '/v2/radar/p1',
          formattedTime: '11:40 AM IST',
          relativeLabel: '20m ago',
          ageMinutes: 20,
        },
      ],
      nowcastFrames: [
        {
          time: base + 600,
          path: '/v2/radar/n1',
          formattedTime: '12:10 PM IST',
          relativeLabel: '+10m nowcast',
          ageMinutes: -10,
        },
      ],
      sourceAttribution: 'RainViewer Composite',
      originalProvider: 'RainViewer',
    };

    const frames1h = buildRadarPlaybackFrames(mockRadar, { lookbackHours: 1, includeNowcast: true });
    assert.equal(frames1h.length, 3);
    assert.deepEqual(
      frames1h.map((f) => f.dataType),
      ['OBSERVED', 'OBSERVED', 'NOWCAST']
    );
    assert.ok(frames1h[0].time < frames1h[1].time && frames1h[1].time < frames1h[2].time);
    assert.ok(frames1h[0].tileUrl.startsWith('https://tilecache.rainviewer.com/v2/radar/p1/'));
    assert.ok(formatEpochIST(base).includes('IST'));
  });

  it('builds chronological cyclone track frames from WeatherSystemEvent and returns empty when calm', () => {
    assert.deepEqual(buildCyclonePlaybackFrames(null), []);

    const system: WeatherSystemEvent = {
      id: 'BOB-TEST-01',
      name: 'Cyclonic Storm Test',
      classification: 'Cyclonic Storm',
      basin: 'Bay of Bengal',
      source: 'RSMC New Delhi',
      sourceUrl: 'https://rsmcnewdelhi.imd.gov.in',
      latitude: 16.5,
      longitude: 85.2,
      pressure: 994,
      maxSustainedWind: '75 km/h',
      windGust: '90 km/h',
      movementDirection: 'NW',
      movementSpeed: '14 km/h',
      currentLocation: 'Westcentral Bay of Bengal',
      historicalTrack: [
        {
          time: '2026-11-21T18:00:00Z',
          latitude: 15.1,
          longitude: 86.4,
          expectedClassification: 'Deep Depression',
          windSpeed: '55 km/h',
        },
      ],
      forecastTrack: [
        {
          time: '2026-11-22T06:00:00Z',
          latitude: 17.8,
          longitude: 84.1,
          expectedClassification: 'Severe Cyclonic Storm',
          windSpeed: '95 km/h',
        },
      ],
      expectedLandfall: 'Odisha-AP Coast',
      expectedLandfallWindow: '23 Nov Morning',
      issuedAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:00:00Z',
      nextBulletinAt: '2026-11-22T03:00:00Z',
      status: 'ACTIVE',
      affectedStates: ['Odisha', 'Andhra Pradesh'],
      affectedDistricts: ['Puri', 'Ganjam'],
      rainfallThreat: 'ORANGE',
      windThreat: 'ORANGE',
      stormSurgeThreat: 'YELLOW',
      thunderstormThreat: 'YELLOW',
      sourceStatus: 'LIVE',
      fetchedAt: '2026-11-22T00:05:00Z',
    };

    const trackFrames = buildCyclonePlaybackFrames(system);
    assert.equal(trackFrames.length, 3);
    assert.deepEqual(
      trackFrames.map((f) => f.dataType),
      ['HISTORICAL', 'CURRENT', 'FORECAST']
    );
    assert.equal(trackFrames[1].lat, 16.5);
    assert.equal(trackFrames[1].pressureLabel, '994 hPa');
  });

  it('normalizes hourly forecast frames and reconciles timeline index across refreshes', () => {
    const hourly: HourlyForecastItem[] = [
      { time: '12:00 PM', temp: 30, rainProb: 10, windSpeed: 12, condition: 'Clear', isNow: true } as HourlyForecastItem,
      { time: '1:00 PM', temp: 31, rainProb: 20, windSpeed: 14, condition: 'Cloudy' } as HourlyForecastItem,
      { time: '2:00 PM', temp: 32, rainProb: 35, windSpeed: 15, condition: 'Showers' } as HourlyForecastItem,
    ];

    const normalized = buildForecastPlaybackFrames(hourly);
    assert.equal(normalized.length, 3);
    assert.equal(normalized[0].dataType, 'MODEL VALID');
    assert.equal(normalized[1].dataType, 'FORECAST');

    const series1 = buildTimelineSeries('conditions', hourly);
    const series2 = buildTimelineSeries('conditions', hourly.slice(1));
    // User selected index 1 ('1:00 PM') -> after series shifts by 1 hour, '1:00 PM' is now at index 0
    assert.equal(reconcileIndexOnRefresh(series1.frames, 1, series2.frames), 0);
  });
});

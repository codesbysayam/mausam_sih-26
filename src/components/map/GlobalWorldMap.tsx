// ====================================================================
// MAUSAM - Global World Map (MapLibre GL JS + OpenFreeMap Vector Tiles)
// Planet-wide 3D Globe & Flat Mercator interactive weather engine preserving
// MAUSAM's exact dark charcoal, muted champagne-gold, atmospheric aesthetic,
// global animated white wind streamlines, RainViewer global radar loop,
// normalized Noto Sans Regular glyphs, debounced viewport sync, and
// resilient error isolation so optional weather feeds never break the map.
// ====================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type MapMouseEvent,
  type GeoJSONSource,
} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

if (typeof window !== 'undefined' && typeof maplibreWorkerUrl === 'string' && maplibreWorkerUrl) {
  setWorkerUrl(maplibreWorkerUrl);
}

import {
  computeInitialGlobeZoom,
  GLOBAL_MAJOR_ANCHORS,
  GLOBAL_MAP_CONFIG,
  GLOBAL_MAP_FALLBACK_STYLE,
  GLOBAL_MAP_STYLE,
  GLOBAL_RASTER_FALLBACK_STYLE,
  type GlobalMapProjection,
  type WorldRegionKey,
} from '../../config/globalMapConfig';
import {
  applyMausamCartographicTheme,
  flyToCoordinates,
  flyToRegion,
  resetGlobalView,
} from '../../utils/globalMapCamera';
import { fixMapGlyphFonts, MAUSAM_MAP_FONT } from '../../utils/map/fixGlyphFonts';
import {
  classifyMapError,
  formatMapErrorMessage,
} from '../../services/map/mapErrorClassifier';
import { attachViewportWeatherSync } from '../../services/map/viewportWeatherSync';
import {
  fetchGlobalAtmosphericField,
  normalizeLongitude,
  sampleGlobalWindField,
  type GlobalAtmosphericField,
} from '../../services/globalWindService';
import { reverseGeocodeGlobalPoint } from '../../services/globalGeocodingService';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { RadarApiResponse } from '../../services/radarService';
import type {
  InspectedSpatialFeature,
  SpatialLayerId,
} from '../../context/ExperienceContext';
import { AlertTriangle, Globe2, Loader2, Map as MapIcon, RefreshCw } from 'lucide-react';

export interface GlobalWorldMapProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
  radarData?: RadarApiResponse | null;
  activeLayer: SpatialLayerId;
  projection: GlobalMapProjection;
  onProjectionChange?: (projection: GlobalMapProjection) => void;
  timelineIndex: number;
  playbackSpeed: 0.5 | 1 | 1.5 | 2;
  reducedMotion: boolean;
  windFlowPaused: boolean;
  cameraFlyTarget: { lat: number; lng: number; zoom?: number; distance?: number; nonce: number } | null;
  regionFlyTarget?: { region: WorldRegionKey; nonce: number } | null;
  onSelectLocation: (loc: LocationRecord) => void;
  onSelectFeature: (feature: InspectedSpatialFeature) => void;
  onWebGLUnavailable?: (reason: string) => void;
  embedded?: boolean;
}

interface WindParticle {
  lng: number;
  lat: number;
  age: number;
  maxAge: number;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Checks whether a geographic coordinate lies on the camera-facing hemisphere
 * of the 3D globe so back-side particles never bleed across the limb.
 */
function isPointOnFrontHemisphere(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number
): boolean {
  const lat1 = lat * DEG_TO_RAD;
  const lat2 = centerLat * DEG_TO_RAD;
  const dLng = (lng - centerLng) * DEG_TO_RAD;
  const cosAngle =
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return cosAngle > 0.04;
}

function buildGlobalAnchorGeoJSON(selectedLocation: LocationRecord): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = GLOBAL_MAJOR_ANCHORS.map((anchor) => ({
    type: 'Feature',
    properties: {
      id: anchor.id,
      city: anchor.city,
      country: anchor.country || anchor.state,
      continent: anchor.continent,
      iso2: anchor.iso2,
      displayName: anchor.displayName,
      isSelected:
        Math.abs(anchor.lat - selectedLocation.lat) < 0.25 &&
        Math.abs(anchor.lng - selectedLocation.lng) < 0.25,
    },
    geometry: {
      type: 'Point',
      coordinates: [anchor.lng, anchor.lat],
    },
  }));

  // Also include the currently selected location if it is not already in GLOBAL_MAJOR_ANCHORS
  const alreadyPresent = features.some((f) => Boolean(f.properties?.isSelected));
  if (!alreadyPresent && Number.isFinite(selectedLocation.lat) && Number.isFinite(selectedLocation.lng)) {
    features.push({
      type: 'Feature',
      properties: {
        id: selectedLocation.id,
        city: selectedLocation.city || selectedLocation.name || 'Selected',
        country: selectedLocation.country || selectedLocation.state || 'Global',
        continent: 'Selected',
        iso2: '',
        displayName: selectedLocation.displayName || selectedLocation.name || 'Selected Location',
        isSelected: true,
      },
      geometry: {
        type: 'Point',
        coordinates: [selectedLocation.lng, selectedLocation.lat],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

function buildAtmosphericGridGeoJSON(
  field: GlobalAtmosphericField | null
): GeoJSON.FeatureCollection {
  if (!field || field.status !== 'LIVE') {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: field.samples.map((s, idx) => ({
      type: 'Feature',
      properties: {
        id: `grid-${idx}`,
        temp: s.temperatureC ?? 20,
        wind: s.windSpeedKmh,
        rain: s.rainMm ?? 0,
        cloud: s.cloudCoverPct ?? 0,
      },
      geometry: {
        type: 'Point',
        coordinates: [s.lng, s.lat],
      },
    })),
  };
}

export const GlobalWorldMap: React.FC<GlobalWorldMapProps> = ({
  selectedLocation,
  radarData,
  activeLayer,
  projection,
  onProjectionChange,
  timelineIndex,
  playbackSpeed,
  reducedMotion,
  windFlowPaused,
  cameraFlyTarget,
  regionFlyTarget,
  onSelectLocation,
  onSelectFeature,
  onWebGLUnavailable,
  embedded = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleStageRef = useRef<0 | 1 | 2>(0); // 0 = OpenFreeMap dark, 1 = OpenFreeMap fiord, 2 = Carto global raster
  const styleLoadedOnceRef = useRef<boolean>(false);
  const prevProjectionRef = useRef<GlobalMapProjection>(projection);
  const projectionRef = useRef<GlobalMapProjection>(projection);
  const windFieldRef = useRef<GlobalAtmosphericField | null>(null);
  const activeLayerRef = useRef<SpatialLayerId>(activeLayer);
  const windPausedRef = useRef<boolean>(windFlowPaused);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const speedRef = useRef<number>(playbackSpeed);
  const selectedLocRef = useRef<LocationRecord>(selectedLocation);
  const onSelectLocRef = useRef(onSelectLocation);
  const onSelectFeatureRef = useRef(onSelectFeature);

  activeLayerRef.current = activeLayer;
  projectionRef.current = projection;
  windPausedRef.current = windFlowPaused;
  reducedMotionRef.current = reducedMotion;
  speedRef.current = playbackSpeed;
  selectedLocRef.current = selectedLocation;
  onSelectLocRef.current = onSelectLocation;
  onSelectFeatureRef.current = onSelectFeature;

  const [isStyleLoading, setIsStyleLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [overlayNotice, setOverlayNotice] = useState<string | null>(null);
  const [styleProviderLabel, setStyleProviderLabel] = useState<string>('OpenFreeMap Dark Vector');
  const [globalField, setGlobalField] = useState<GlobalAtmosphericField | null>(null);
  const [styleRevision, setStyleRevision] = useState(0);

  // Initial fetch of real global Open-Meteo 10m wind & surface atmospheric grid
  useEffect(() => {
    let active = true;
    fetchGlobalAtmosphericField()
      .then((field) => {
        if (!active) return;
        windFieldRef.current = field;
        setGlobalField(field);
        setOverlayNotice(null);
      })
      .catch((err) => {
        if (!active) return;
        const category = classifyMapError(undefined, err instanceof Error ? err.message : '');
        setOverlayNotice(formatMapErrorMessage(category, 'Wind & surface grid'));
      });
    return () => {
      active = false;
    };
  }, []);

  // Resolve active RainViewer global radar frame synced to ForecastTimeline
  const activeRadarFrame = useMemo(() => {
    if (!radarData?.host) return null;
    const past = Array.isArray(radarData.pastFrames) ? radarData.pastFrames : [];
    const nowcast = Array.isArray(radarData.nowcastFrames) ? radarData.nowcastFrames : [];
    const combined = [
      ...past.map((frame) => ({ frame, kind: 'OBSERVED' as const })),
      ...nowcast.map((frame) => ({ frame, kind: 'NOWCAST' as const })),
    ];
    if (combined.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(timelineIndex, combined.length - 1));
    return combined[safeIdx];
  }, [radarData, timelineIndex]);

  const activeRadarTileUrl = useMemo(() => {
    if (!radarData?.host || !activeRadarFrame?.frame?.path) return null;
    return `${radarData.host}${activeRadarFrame.frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
  }, [radarData, activeRadarFrame]);

  // Attach MAUSAM custom overlays (global anchors, thermal/cloud grid) & normalize glyph fonts
  const attachMausamOverlayLayers = useCallback((map: MapLibreMap) => {
    applyMausamCartographicTheme(map);

    // 1. Global Atmospheric Grid (Temperature / Cloud / Rain surface veil)
    if (!map.getSource('mausam-global-grid')) {
      map.addSource('mausam-global-grid', {
        type: 'geojson',
        data: buildAtmosphericGridGeoJSON(windFieldRef.current),
      });
    }

    if (!map.getLayer('mausam-thermal-glow')) {
      map.addLayer({
        id: 'mausam-thermal-glow',
        type: 'circle',
        source: 'mausam-global-grid',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.8, 34, 3, 62, 6, 90],
          'circle-blur': 0.92,
          'circle-opacity': 0.36,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            -15,
            '#6086B8',
            5,
            '#78AEB6',
            20,
            '#89977B',
            30,
            '#E6B96B',
            40,
            '#E27B55',
          ],
        },
      });
    }

    if (!map.getLayer('mausam-cloud-veil')) {
      map.addLayer({
        id: 'mausam-cloud-veil',
        type: 'circle',
        source: 'mausam-global-grid',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.8, 38, 3, 72, 6, 110],
          'circle-blur': 0.95,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'cloud'],
            0,
            0.0,
            50,
            0.22,
            100,
            0.46,
          ],
          'circle-color': '#DFE4E2',
        },
      });
    }

    // 2. Global Gold Observatory Anchors & Selected Location Beacon
    if (!map.getSource('mausam-global-anchors')) {
      map.addSource('mausam-global-anchors', {
        type: 'geojson',
        data: buildGlobalAnchorGeoJSON(selectedLocRef.current),
      });
    }

    if (!map.getLayer('mausam-anchor-halo')) {
      map.addLayer({
        id: 'mausam-anchor-halo',
        type: 'circle',
        source: 'mausam-global-anchors',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['case', ['boolean', ['get', 'isSelected'], false], 12.5, 4.8],
            4,
            ['case', ['boolean', ['get', 'isSelected'], false], 14, 7.2],
            7,
            ['case', ['boolean', ['get', 'isSelected'], false], 15.5, 8.5],
          ],
          'circle-color': '#E6B96B',
          'circle-opacity': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            0.28,
            0.12,
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            1.5,
            0,
          ],
          'circle-stroke-color': '#E6B96B',
        },
      });
    }

    if (!map.getLayer('mausam-anchor-dots')) {
      map.addLayer({
        id: 'mausam-anchor-dots',
        type: 'circle',
        source: 'mausam-global-anchors',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['case', ['boolean', ['get', 'isSelected'], false], 5.2, 2.6],
            4,
            ['case', ['boolean', ['get', 'isSelected'], false], 5.6, 3.8],
            7,
            ['case', ['boolean', ['get', 'isSelected'], false], 6.0, 4.6],
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#F5D89E',
            '#C5A46D',
          ],
          'circle-stroke-width': 1.25,
          'circle-stroke-color': '#15191A',
        },
      });
    }

    // Progressive city beacon labels (hidden on full-globe overview, revealed on zoom >= 3.4)
    // Explicitly specifies OpenFreeMap's verified Noto Sans Regular glyph font stack
    if (!map.getLayer('mausam-anchor-labels')) {
      map.addLayer({
        id: 'mausam-anchor-labels',
        type: 'symbol',
        source: 'mausam-global-anchors',
        minzoom: 3.4,
        layout: {
          'text-field': ['get', 'city'],
          'text-font': [...MAUSAM_MAP_FONT],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3.4, 10, 6, 12],
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-padding': 8,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-optional': true,
        },
        paint: {
          'text-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#F5D89E',
            '#D4CFC0',
          ],
          'text-halo-color': 'rgba(15, 18, 18, 0.92)',
          'text-halo-width': 1.3,
        },
      });
    }

    // Guarantee every text-bearing layer uses Noto Sans Regular (eliminates 404 glyph requests)
    fixMapGlyphFonts(map);
  }, []);

  // Initialize MapLibre GL JS once (strict single-mount, full cleanup)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const initialZoom =
      projectionRef.current === 'globe'
        ? computeInitialGlobeZoom(container.clientWidth, container.clientHeight)
        : 1.5;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: GLOBAL_MAP_STYLE,
        ...GLOBAL_MAP_CONFIG,
        zoom: initialZoom,
        attributionControl: false,
      });
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'WebGL context unavailable for global vector map.';
      setMapError(reason);
      setIsStyleLoading(false);
      onWebGLUnavailable?.(reason);
      return;
    }

    mapRef.current = map;
    styleLoadedOnceRef.current = false;

    map.addControl(
      new NavigationControl({ visualizePitch: true, showCompass: true }),
      'bottom-right'
    );
    map.addControl(
      new ScaleControl({ maxWidth: 110, unit: 'metric' }),
      'bottom-left'
    );

    const handleStyleLoad = () => {
      styleLoadedOnceRef.current = true;
      try {
        if (typeof map.setProjection === 'function') {
          map.setProjection({ type: projectionRef.current });
        }
      } catch {
        // Fallback smoothly if projection switch is unsupported
      }
      attachMausamOverlayLayers(map);
      setIsStyleLoading(false);
      setMapError(null);
      setStyleRevision((r) => r + 1);
    };

    const handleError = (ev: {
      error?: { message?: string; status?: number };
      message?: string;
      status?: number;
      sourceId?: string;
    }) => {
      const msg = String(ev?.error?.message || ev?.message || '');
      const status = ev?.error?.status ?? ev?.status;
      const sourceId = String(ev?.sourceId || '');
      const normalized = msg.toLowerCase();
      const category = classifyMapError(status, msg);

      // Optional weather overlay errors (e.g., RainViewer radar tiles) must NEVER affect the basemap
      if (sourceId.includes('radar') || normalized.includes('rainviewer')) {
        setOverlayNotice(formatMapErrorMessage(category, 'Radar overlay'));
        return;
      }

      // Ignore glyph range misses or individual tile 404s once the basemap style is running
      if (normalized.includes('/fonts/') || normalized.includes('.pbf')) {
        return;
      }

      if (styleLoadedOnceRef.current) {
        // Never reload or break a healthy basemap during zoom/pan due to transient tile misses
        return;
      }

      // Only cascade basemap style fallback on initial style bootstrap network/5xx failures
      const isBootstrapStyleFailure =
        category === 'network' ||
        category === 'provider' ||
        normalized.includes('styles/');

      if (!isBootstrapStyleFailure) {
        return;
      }

      if (styleStageRef.current === 0) {
        styleStageRef.current = 1;
        setStyleProviderLabel('OpenFreeMap Fiord Vector');
        map.setStyle(GLOBAL_MAP_FALLBACK_STYLE);
      } else if (styleStageRef.current === 1) {
        styleStageRef.current = 2;
        setStyleProviderLabel('CARTO Global Dark Raster Fallback');
        map.setStyle(GLOBAL_RASTER_FALLBACK_STYLE);
      } else {
        setIsStyleLoading(false);
        setMapError(formatMapErrorMessage(category, 'Global basemap'));
      }
    };

    // Debounced, abort-safe viewport sync: refreshes cached global atmospheric field
    // only after camera movement settles (`moveend`), never per wheel/zoom tick
    const detachViewportSync = attachViewportWeatherSync<GlobalAtmosphericField>(map, {
      debounceMs: 750,
      cacheTtlMs: 60_000,
      fetcher: async (_viewport, signal) => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const field = await fetchGlobalAtmosphericField();
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return field;
      },
      onData: (field) => {
        windFieldRef.current = field;
        setGlobalField(field);
        setOverlayNotice(null);
      },
      onError: (_err, category) => {
        setOverlayNotice(formatMapErrorMessage(category, 'Wind & surface grid'));
      },
    });

    // Interactive click handler: select anchor beacon OR click any country/point on Earth
    const handleClick = async (e: MapMouseEvent) => {
      const clickedAnchors = map.getLayer('mausam-anchor-dots')
        ? map.queryRenderedFeatures(e.point, { layers: ['mausam-anchor-dots'] })
        : [];

      if (clickedAnchors.length > 0) {
        const props = clickedAnchors[0].properties || {};
        const anchor = GLOBAL_MAJOR_ANCHORS.find((a) => a.id === props.id);
        if (anchor) {
          onSelectLocRef.current(anchor);
          flyToCoordinates(map, anchor.lng, anchor.lat, Math.max(map.getZoom(), 4.6));
          const windSample = sampleGlobalWindField(windFieldRef.current, anchor.lng, anchor.lat);
          onSelectFeatureRef.current({
            kind: 'location',
            id: anchor.id,
            title: anchor.city,
            subtitle: `${anchor.country || anchor.state} · ${anchor.continent}`,
            lat: anchor.lat,
            lng: anchor.lng,
            stateName: anchor.country || anchor.state,
            source: 'Open-Meteo Global Model Grid',
            metrics: [
              { label: 'Country', value: anchor.country || anchor.state },
              { label: 'Continent', value: anchor.continent },
              {
                label: 'Wind (10m)',
                value: windSample ? `${Math.round(windSample.speedKmh)} km/h` : 'Syncing…',
              },
              { label: 'ISO Code', value: anchor.iso2 },
            ],
          });
          return;
        }
      }

      // Inspect vector features under cursor to identify country / place label
      let hintName = '';
      try {
        const features = map.queryRenderedFeatures(e.point);
        for (const f of features) {
          const p = f.properties || {};
          const candidate =
            p.name_en || p['name:en'] || p.name || p.country || p.admin || '';
          if (typeof candidate === 'string' && candidate.trim().length > 1) {
            hintName = candidate.trim();
            break;
          }
        }
      } catch {
        // Ignore query failures on fallback raster styles
      }

      const lat = Math.max(-85, Math.min(85, e.lngLat.lat));
      const lng = normalizeLongitude(e.lngLat.lng);
      const resolved = await reverseGeocodeGlobalPoint(lat, lng, hintName);
      onSelectLocRef.current(resolved);

      const windSample = sampleGlobalWindField(windFieldRef.current, lng, lat);
      onSelectFeatureRef.current({
        kind: 'location',
        id: resolved.id,
        title: resolved.city,
        subtitle: `${resolved.country || resolved.state}`,
        lat: resolved.lat,
        lng: resolved.lng,
        stateName: resolved.country || resolved.state,
        source: 'Open-Meteo Global Model Grid',
        metrics: [
          { label: 'Country / Region', value: resolved.country || resolved.state },
          {
            label: 'Coordinates',
            value: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`,
          },
          {
            label: 'Wind (10m)',
            value: windSample ? `${Math.round(windSample.speedKmh)} km/h` : 'Syncing…',
          },
          { label: 'Coverage', value: 'Global Grid' },
        ],
      });
    };

    const handleMouseEnterAnchor = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeaveAnchor = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('style.load', handleStyleLoad);
    map.on('error', handleError as unknown as () => void);
    map.on('click', handleClick);
    map.on('mouseenter', 'mausam-anchor-dots', handleMouseEnterAnchor);
    map.on('mouseleave', 'mausam-anchor-dots', handleMouseLeaveAnchor);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      detachViewportSync();
      resizeObserver.disconnect();
      map.off('style.load', handleStyleLoad);
      map.off('error', handleError as unknown as () => void);
      map.off('click', handleClick);
      map.off('mouseenter', 'mausam-anchor-dots', handleMouseEnterAnchor);
      map.off('mouseleave', 'mausam-anchor-dots', handleMouseLeaveAnchor);
      map.remove();
      mapRef.current = null;
    };
  }, [attachMausamOverlayLayers, onWebGLUnavailable]);

  // Switch seamlessly between 3D Globe & Flat Mercator ONLY when projection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const projectionChanged = prevProjectionRef.current !== projection;
    prevProjectionRef.current = projection;

    try {
      if (typeof map.setProjection === 'function') {
        map.setProjection({ type: projection });
      }
      if (!projectionChanged) return;

      const container = containerRef.current;
      if (projection === 'mercator') {
        map.easeTo({
          zoom: Math.max(map.getZoom(), 1.5),
          pitch: 10,
          bearing: 0,
          duration: 650,
        });
      } else if (projection === 'globe' && map.getZoom() <= 2.6) {
        const targetGlobeZoom = container
          ? computeInitialGlobeZoom(container.clientWidth, container.clientHeight)
          : 2.1;
        map.easeTo({
          zoom: targetGlobeZoom,
          pitch: 18,
          bearing: -6,
          duration: 650,
        });
      }
    } catch {
      // Ignore if projection not supported
    }
  }, [projection, styleRevision]);

  // Update GeoJSON sources whenever global field or selectedLocation changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const anchorSrc = map.getSource('mausam-global-anchors') as GeoJSONSource | undefined;
    if (anchorSrc) {
      anchorSrc.setData(buildGlobalAnchorGeoJSON(selectedLocation));
    }
    const gridSrc = map.getSource('mausam-global-grid') as GeoJSONSource | undefined;
    if (gridSrc && globalField) {
      gridSrc.setData(buildAtmosphericGridGeoJSON(globalField));
    }
  }, [selectedLocation, globalField, styleRevision]);

  // Sync active weather layer visibility & live RainViewer Global Radar raster tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVis('mausam-thermal-glow', activeLayer === 'conditions' || activeLayer === 'agromet' || activeLayer === 'aqi');
    setVis('mausam-cloud-veil', activeLayer === 'satellite');

    const wantsRadar = activeLayer === 'radar' || activeLayer === 'rain';
    const radarSourceId = 'mausam-global-radar-src';
    const radarLayerId = 'mausam-global-radar-layer';

    if (wantsRadar && activeRadarTileUrl) {
      if (map.getLayer(radarLayerId)) map.removeLayer(radarLayerId);
      if (map.getSource(radarSourceId)) map.removeSource(radarSourceId);

      map.addSource(radarSourceId, {
        type: 'raster',
        tiles: [activeRadarTileUrl],
        tileSize: 256,
        maxzoom: 10,
      });

      const beforeId = map.getLayer('mausam-anchor-halo') ? 'mausam-anchor-halo' : undefined;
      map.addLayer(
        {
          id: radarLayerId,
          type: 'raster',
          source: radarSourceId,
          paint: {
            'raster-opacity': activeLayer === 'radar' ? 0.72 : 0.56,
            'raster-fade-duration': 180,
          },
        },
        beforeId
      );
    } else {
      if (map.getLayer(radarLayerId)) map.removeLayer(radarLayerId);
      if (map.getSource(radarSourceId)) map.removeSource(radarSourceId);
    }
  }, [activeLayer, activeRadarTileUrl, styleRevision]);

  // Respond to external camera flyTo commands (global search, station click, recenter World)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraFlyTarget) return;
    if (cameraFlyTarget.zoom !== undefined && cameraFlyTarget.zoom <= 1.8) {
      resetGlobalView(map, projection);
      return;
    }
    const targetZoom =
      cameraFlyTarget.zoom ??
      (cameraFlyTarget.distance && cameraFlyTarget.distance >= 3.4 ? 2.1 : 5.4);
    try {
      flyToCoordinates(map, cameraFlyTarget.lng, cameraFlyTarget.lat, targetZoom);
    } catch {
      resetGlobalView(map, projection);
    }
  }, [cameraFlyTarget, projection]);

  // Respond to continent / region quick-jump commands
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionFlyTarget) return;
    flyToRegion(map, regionFlyTarget.region);
  }, [regionFlyTarget]);

  // Global Animated White Wind Streamlines Canvas Overlay
  // Synchronized cleanly with zoom/pan/rotation and clipped to front hemisphere in 3D Globe view
  useEffect(() => {
    const canvas = windCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const clearCanvas = () => {
      ctx.clearRect(0, 0, width, height);
    };

    const resizeCanvas = () => {
      width = container.clientWidth || 800;
      height = container.clientHeight || 500;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clearCanvas();
    };
    resizeCanvas();

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);

    // Clear stale motion trails during zoom/pan/rotation so streamlines stay tightly registered
    let attachedMap: MapLibreMap | null = null;
    const bindMapMotionListeners = (map: MapLibreMap) => {
      if (attachedMap === map) return;
      if (attachedMap) {
        attachedMap.off('movestart', clearCanvas);
        attachedMap.off('zoomstart', clearCanvas);
        attachedMap.off('move', clearCanvas);
      }
      attachedMap = map;
      map.on('movestart', clearCanvas);
      map.on('zoomstart', clearCanvas);
      map.on('move', clearCanvas);
    };

    const particleCount = width < 768 ? 150 : 380;
    const spawnParticle = (): WindParticle => ({
      lng: Math.random() * 360 - 180,
      lat: Math.random() * 124 - 62,
      age: Math.floor(Math.random() * 55),
      maxAge: 55 + Math.floor(Math.random() * 55),
    });

    const particles: WindParticle[] = Array.from({ length: particleCount }, spawnParticle);

    const renderFrame = () => {
      animId = window.requestAnimationFrame(renderFrame);
      if (typeof document !== 'undefined' && document.hidden) return;

      const map = mapRef.current;
      const layer = activeLayerRef.current;

      if (!map || layer !== 'wind' || !windFieldRef.current || windFieldRef.current.status !== 'LIVE') {
        clearCanvas();
        return;
      }

      bindMapMotionListeners(map);

      if (windPausedRef.current || reducedMotionRef.current) {
        return;
      }

      // Soft translucent fade for crisp atmospheric streamline tails
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      const zoom = map.getZoom();
      const center = map.getCenter();
      const isGlobeClipActive = projectionRef.current === 'globe' && zoom < 4.5;
      const stepScale = (0.011 / Math.max(0.7, Math.pow(zoom, 0.72))) * (speedRef.current || 1);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += 1;
        if (p.age >= p.maxAge || p.lat < -75 || p.lat > 78) {
          particles[i] = spawnParticle();
          continue;
        }

        const sample = sampleGlobalWindField(windFieldRef.current, p.lng, p.lat);
        if (!sample || sample.speedKmh < 0.8) {
          particles[i] = spawnParticle();
          continue;
        }

        const nextLng = normalizeLongitude(p.lng + sample.u * stepScale);
        const nextLat = Math.max(-76, Math.min(78, p.lat + sample.v * stepScale * 0.85));

        // Skip drawing particles on the back hemisphere of the 3D globe
        if (
          isGlobeClipActive &&
          (!isPointOnFrontHemisphere(p.lng, p.lat, center.lng, center.lat) ||
            !isPointOnFrontHemisphere(nextLng, nextLat, center.lng, center.lat))
        ) {
          p.lng = nextLng;
          p.lat = nextLat;
          continue;
        }

        const prevPt = map.project([p.lng, p.lat]);
        const nextPt = map.project([nextLng, nextLat]);

        if (
          !Number.isFinite(prevPt.x) ||
          !Number.isFinite(prevPt.y) ||
          !Number.isFinite(nextPt.x) ||
          !Number.isFinite(nextPt.y)
        ) {
          p.lng = nextLng;
          p.lat = nextLat;
          continue;
        }

        // Prevent long horizontal artifact streaks across antimeridian or globe edge wrap
        const screenDist = Math.hypot(nextPt.x - prevPt.x, nextPt.y - prevPt.y);
        if (
          screenDist > 0.35 &&
          screenDist < 38 &&
          nextPt.x >= -16 &&
          nextPt.x <= width + 16 &&
          nextPt.y >= -16 &&
          nextPt.y <= height + 16
        ) {
          const speedRatio = Math.min(1, sample.speedKmh / 48);
          const alpha = (0.38 + speedRatio * 0.52) * Math.sin((p.age / p.maxAge) * Math.PI);
          ctx.beginPath();
          ctx.moveTo(prevPt.x, prevPt.y);
          ctx.lineTo(nextPt.x, nextPt.y);
          ctx.strokeStyle =
            speedRatio > 0.68
              ? `rgba(230, 185, 107, ${alpha.toFixed(3)})`
              : `rgba(244, 242, 235, ${alpha.toFixed(3)})`;
          ctx.lineWidth = speedRatio > 0.68 ? 1.55 : 1.15;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        p.lng = nextLng;
        p.lat = nextLat;
      }
    };

    animId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animId);
      ro.disconnect();
      if (attachedMap) {
        attachedMap.off('movestart', clearCanvas);
        attachedMap.off('zoomstart', clearCanvas);
        attachedMap.off('move', clearCanvas);
      }
    };
  }, []);

  const handleRetryBasemap = () => {
    const map = mapRef.current;
    if (!map) return;
    styleStageRef.current = 0;
    styleLoadedOnceRef.current = false;
    setMapError(null);
    setOverlayNotice(null);
    setIsStyleLoading(true);
    setStyleProviderLabel('OpenFreeMap Dark Vector');
    map.setStyle(GLOBAL_MAP_STYLE);
  };

  // Coverage notice for layers whose official feed is regional vs global
  const layerCoverageNotice = useMemo(() => {
    if (overlayNotice) {
      return overlayNotice;
    }
    if (activeLayer === 'warnings' || activeLayer === 'agromet' || activeLayer === 'cyclones') {
      return 'Official SACHET / IMD / GKMS network: India & North Indian Ocean · Global surface grid active everywhere else';
    }
    if (activeLayer === 'radar' || activeLayer === 'rain') {
      return activeRadarFrame
        ? `RainViewer Global Radar Composite (${activeRadarFrame.kind}) · ${activeRadarFrame.frame.formattedTime || activeRadarFrame.frame.relativeLabel || 'Live'}`
        : 'RainViewer Global Radar · Regional precipitation coverage where radar stations operate';
    }
    if (activeLayer === 'wind') {
      return globalField?.status === 'LIVE'
        ? 'Global 10m Wind Streamlines · Open-Meteo Global Model Grid'
        : 'Syncing Open-Meteo Global 10m Wind Vectors…';
    }
    return `Global Coverage · ${styleProviderLabel}`;
  }, [activeLayer, activeRadarFrame, globalField, overlayNotice, styleProviderLabel]);

  return (
    <div
      className={`global-map-shell ${embedded ? 'global-map-shell--embedded' : ''}`}
      data-map-interactive="true"
    >
      <div
        ref={containerRef}
        className="global-map-canvas"
        aria-label="MAUSAM interactive global world weather map"
      />

      {/* Real Global Wind Streamlines Overlay Canvas */}
      <canvas ref={windCanvasRef} className="global-wind-canvas" aria-hidden="true" />

      {/* Top-Center Compact Projection Switcher (Globe / Flat Map) & Coverage Strip */}
      <div className="pointer-events-none absolute top-[72px] left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-2 max-w-[calc(100vw-580px)]">
        {onProjectionChange && (
          <div
            role="group"
            aria-label="Map projection mode"
            className="pointer-events-auto spatial-hud-surface rounded-[10px] p-1 flex items-center gap-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => onProjectionChange('globe')}
              aria-pressed={projection === 'globe'}
              className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap ${
                projection === 'globe'
                  ? 'bg-[var(--m-accent)] text-[#111314]'
                  : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Globe</span>
            </button>
            <button
              type="button"
              onClick={() => onProjectionChange('mercator')}
              aria-pressed={projection === 'mercator'}
              className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer m-focus-ring whitespace-nowrap ${
                projection === 'mercator'
                  ? 'bg-[var(--m-accent)] text-[#111314]'
                  : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Flat Map</span>
            </button>
          </div>
        )}

        <div className="spatial-hud-surface rounded-[10px] px-2.5 min-h-[32px] hidden xl:flex items-center text-[10px] font-mono text-[var(--m-text-secondary)] truncate">
          <span className="truncate">{layerCoverageNotice}</span>
        </div>
      </div>

      {/* Style Loading Indicator */}
      {isStyleLoading && (
        <div
          role="status"
          className="absolute inset-0 z-20 flex items-center justify-center bg-[#15191A]/75 backdrop-blur-xs pointer-events-none"
        >
          <div className="spatial-hud-surface-elevated rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-mono text-[var(--m-text-primary)]">
            <Loader2 className="w-4 h-4 text-[var(--m-accent)] animate-spin" />
            <span>Loading Global Atmospheric World Map…</span>
          </div>
        </div>
      )}

      {/* Explicit Basemap Error / Retry Banner (never silently replaced with India-only fallback) */}
      {mapError && (
        <div
          role="alert"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 spatial-hud-surface-elevated rounded-xl px-4 py-3 flex items-center gap-3 text-xs max-w-[min(460px,calc(100vw-24px))]"
        >
          <AlertTriangle className="w-4 h-4 text-[var(--m-watch)] shrink-0" />
          <span className="text-[var(--m-text-secondary)]">{mapError}</span>
          <button
            type="button"
            onClick={handleRetryBasemap}
            className="min-h-[34px] px-3 rounded-lg bg-[var(--m-accent)] text-[#111314] font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalWorldMap;

// ====================================================================
// MAUSAM - Global World Map Camera, Coordinate Parser & Cartographic Theme
// Pure camera navigation utilities + MAUSAM dark charcoal & muted-gold
// OpenFreeMap vector style customization + 15° planetary graticule.
// ====================================================================

import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  computeInitialGlobeZoom,
  WORLD_LOCATIONS,
  type GlobalMapProjection,
  type WorldRegionKey,
} from '../config/globalMapConfig';
import { fixMapGlyphFonts, MAUSAM_MAP_FONT } from './map/fixGlyphFonts';

export function resetGlobalView(
  map: MapLibreMap,
  projection: GlobalMapProjection = 'globe'
): void {
  const target = WORLD_LOCATIONS.global;
  const container = map.getContainer();
  const responsiveGlobeZoom = container
    ? computeInitialGlobeZoom(container.clientWidth, container.clientHeight)
    : target.zoom;

  map.flyTo({
    center: [...target.center],
    zoom: projection === 'globe' ? responsiveGlobeZoom : 1.5,
    pitch: projection === 'globe' ? target.pitch : 10,
    bearing: projection === 'globe' ? target.bearing : 0,
    duration: 1100,
    essential: true,
  });
}

export function flyToRegion(map: MapLibreMap, region: WorldRegionKey): void {
  const target = WORLD_LOCATIONS[region];
  map.flyTo({
    center: [...target.center],
    zoom: target.zoom,
    pitch: target.pitch,
    bearing: target.bearing,
    duration: 1200,
    essential: true,
  });
}

export function flyToCoordinates(
  map: MapLibreMap,
  longitude: number,
  latitude: number,
  zoom = 6.2
): void {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -85.05 ||
    latitude > 85.05
  ) {
    throw new Error('Invalid geographic coordinates');
  }

  map.flyTo({
    center: [longitude, latitude],
    zoom: Math.min(14.5, Math.max(1.2, zoom)),
    pitch: 24,
    duration: 1150,
    essential: true,
  });
}

/**
 * Pure parser for direct geographic coordinate search queries.
 * Supports: "35.68, 139.77", "-33.86 151.20", "51.5N, 0.12W", "20.30°N 85.82°E".
 */
export function parseCoordinateSearchQuery(
  raw: string
): { lat: number; lng: number } | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Match decimal or hemisphere-tagged coordinate pairs
  const match = cleaned.match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?[\s,;]+(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?$/i
  );
  if (!match) return null;

  let lat = Number.parseFloat(match[1]);
  const latHem = match[2]?.toUpperCase();
  let lng = Number.parseFloat(match[3]);
  const lngHem = match[4]?.toUpperCase();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (latHem === 'S' && lat > 0) lat = -lat;
  if (lngHem === 'W' && lng > 0) lng = -lng;

  if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Generates a subtle 15° latitude/longitude graticule GeoJSON FeatureCollection
 * matching the signature subtle coordinate grid in the MAUSAM screenshot.
 */
export function buildGlobalGraticuleGeoJSON(stepDeg = 15): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 5) {
      coords.push([lon, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind: lon === 0 ? 'prime' : 'meridian', value: lon },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  for (let lat = -75; lat <= 75; lat += stepDeg) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 5) {
      coords.push([lon, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind: lat === 0 ? 'equator' : 'parallel', value: lat },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Restyles any OpenFreeMap vector style (Dark or Fiord) into the exact
 * MAUSAM atmospheric palette with progressive geographic label hierarchy:
 * - Matte charcoal landmasses (#272C2B) with clear ocean depth (#121617)
 * - Crisp muted champagne-gold country boundaries (#C8A870)
 * - Clean single-language labels with generous padding (zero Europe/Africa crowding)
 * - Progressive zoom reveal (continents & spaced major countries at low zoom -> cities at medium -> regional detail at high)
 * - Normalized `Noto Sans Regular` glyph stack across all text-bearing layers
 */
export function applyMausamCartographicTheme(map: MapLibreMap): void {
  const style = map.getStyle();
  if (!style || !Array.isArray(style.layers)) return;

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();

    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#262B2A');
      } else if (
        layer.type === 'fill' &&
        (id.includes('water') || id.includes('ocean') || id.includes('sea'))
      ) {
        map.setPaintProperty(layer.id, 'fill-color', '#121617');
        map.setPaintProperty(layer.id, 'fill-opacity', 1);
      } else if (
        layer.type === 'fill' &&
        (id.includes('land') ||
          id.includes('earth') ||
          id.includes('park') ||
          id.includes('wood') ||
          id.includes('forest') ||
          id.includes('grass') ||
          id.includes('residential') ||
          id.includes('glacier') ||
          id.includes('ice'))
      ) {
        const fillHex =
          id.includes('glacier') || id.includes('ice')
            ? '#313736'
            : id.includes('park') || id.includes('wood') || id.includes('forest')
            ? '#2A302E'
            : '#272C2B';
        map.setPaintProperty(layer.id, 'fill-color', fillHex);
      } else if (
        layer.type === 'line' &&
        (id.includes('boundary') || id.includes('border') || id.includes('admin'))
      ) {
        const isCountry =
          id.includes('country') ||
          id.includes('2') ||
          (!id.includes('state') && !id.includes('4') && !id.includes('3'));
        map.setPaintProperty(
          layer.id,
          'line-color',
          isCountry ? '#C8A870' : 'rgba(197, 164, 109, 0.32)'
        );
        map.setPaintProperty(layer.id, 'line-opacity', isCountry ? 0.86 : 0.42);
        if (isCountry) {
          map.setPaintProperty(layer.id, 'line-width', [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            0.75,
            3,
            1.05,
            6,
            1.4,
          ]);
        }
      } else if (
        layer.type === 'line' &&
        (id.includes('waterway') || id.includes('coast'))
      ) {
        map.setPaintProperty(layer.id, 'line-color', 'rgba(197, 164, 109, 0.24)');
      } else if (
        layer.type === 'line' &&
        (id.includes('road') || id.includes('highway') || id.includes('rail'))
      ) {
        map.setPaintProperty(layer.id, 'line-opacity', 0.2);
      } else if (layer.type === 'symbol') {
        const layout = (layer as { layout?: Record<string, unknown> }).layout;
        const hasTextField = Boolean(layout && 'text-field' in layout && layout['text-field'] != null);
        if (!hasTextField) continue;

        const isContinent = id.includes('continent');
        const isCountry = id.includes('country');
        const isState = id.includes('state') || id.includes('province');
        const isOcean = id.includes('ocean') || id.includes('sea') || id.includes('water');
        const isCity =
          id.includes('city') ||
          id.includes('town') ||
          id.includes('village') ||
          id.includes('place') ||
          id.includes('capital') ||
          id.includes('settlement');

        // Always enforce OpenFreeMap's verified Noto Sans Regular font stack
        map.setLayoutProperty(layer.id, 'text-font', [...MAUSAM_MAP_FONT]);

        // Use clean single-language labels to eliminate dual-script clutter on Africa/Asia
        if (isContinent || isCountry || isState || isCity) {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name:en'],
            ['get', 'name_en'],
            ['get', 'name:latin'],
            ['get', 'name'],
          ]);
        }

        // Progressive label hierarchy & generous anti-overlap padding
        if (isContinent) {
          map.setLayoutProperty(layer.id, 'text-padding', 16);
          map.setLayoutProperty(layer.id, 'text-letter-spacing', 0.14);
          map.setPaintProperty(layer.id, 'text-color', 'rgba(229, 219, 196, 0.72)');
        } else if (isCountry) {
          // Generous padding at globe zoom prevents Europe/Africa label collision
          map.setLayoutProperty(layer.id, 'text-padding', [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            24,
            3.0,
            14,
            5.0,
            6,
          ]);
          map.setLayoutProperty(layer.id, 'text-size', [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            9.5,
            3.5,
            11.5,
            6,
            13,
          ]);
          map.setLayoutProperty(layer.id, 'text-allow-overlap', false);
          map.setLayoutProperty(layer.id, 'text-ignore-placement', false);
          map.setLayerZoomRange(layer.id, 1.85, 24);
          map.setPaintProperty(layer.id, 'text-color', '#E5DEC9');
        } else if (isState) {
          map.setLayerZoomRange(layer.id, 4.2, 24);
          map.setLayoutProperty(layer.id, 'text-padding', 10);
          map.setPaintProperty(layer.id, 'text-color', 'rgba(206, 200, 184, 0.76)');
        } else if (isOcean) {
          map.setLayoutProperty(layer.id, 'text-padding', 18);
          map.setPaintProperty(layer.id, 'text-color', 'rgba(182, 192, 188, 0.42)');
        } else if (isCity) {
          const minCityZoom = id.includes('capital') || id.includes('major') ? 3.8 : 5.2;
          map.setLayerZoomRange(layer.id, minCityZoom, 24);
          map.setLayoutProperty(layer.id, 'text-padding', 10);
          map.setPaintProperty(layer.id, 'text-color', '#CBC6B8');
        } else {
          // Secondary POIs / road shields stay hidden until zoomed in
          map.setLayerZoomRange(layer.id, 7.5, 24);
          map.setPaintProperty(layer.id, 'text-color', '#B8B4A7');
        }

        map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(12, 15, 15, 0.94)');
        map.setPaintProperty(layer.id, 'text-halo-width', 1.35);
      }
    } catch {
      // Ignore individual layer property mutations unsupported on a specific style layer
    }
  }

  // Final pass guaranteeing every text-bearing layer uses Noto Sans Regular
  fixMapGlyphFonts(map);

  // Add subtle 15° lat/lon geographic grid
  if (!map.getSource('mausam-global-graticule')) {
    map.addSource('mausam-global-graticule', {
      type: 'geojson',
      data: buildGlobalGraticuleGeoJSON(15),
    });

    const firstSymbolId = style.layers.find((l) => l.type === 'symbol')?.id;
    map.addLayer(
      {
        id: 'mausam-graticule-lines',
        type: 'line',
        source: 'mausam-global-graticule',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'kind'], 'equator'],
            'rgba(197, 164, 109, 0.16)',
            ['==', ['get', 'kind'], 'prime'],
            'rgba(197, 164, 109, 0.13)',
            'rgba(226, 219, 200, 0.055)',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'kind'], 'equator'],
            1.0,
            0.65,
          ],
        },
      },
      firstSymbolId
    );
  }

  // Apply restrained golden-charcoal atmospheric rim lighting when MapLibre sky API is available
  try {
    if (typeof (map as unknown as { setSky?: (cfg: Record<string, unknown>) => void }).setSky === 'function') {
      (map as unknown as { setSky: (cfg: Record<string, unknown>) => void }).setSky({
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.78, 3.5, 0.32, 6, 0],
        'sky-color': '#131717',
        'horizon-color': '#3A3429',
        'sky-horizon-blend': 0.52,
      });
    }
  } catch {
    // Graceful no-op if sky API unavailable
  }
}

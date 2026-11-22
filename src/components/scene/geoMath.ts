// ====================================================================
// MAUSAM 3D Geo-Spatial Projection & Procedural India Texture Engine
// Converts lat/lng coordinates to Three.js sphere coordinates and renders
// a high-contrast equirectangular oceanic/subcontinent globe texture
// using authentic @svg-maps/india state boundary vectors (zero external image fetches).
// ====================================================================

import * as THREE from 'three';
import IndiaSvgMap from '@svg-maps/india';
import { INDIA_STATES_UTS } from '../../data/indiaRegions';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import type { SpatialLayerId } from '../../context/ExperienceContext';

export const GLOBE_RADIUS = 1.65;

// Geographic bounding box matching @svg-maps/india (viewBox 0 0 612 696)
const INDIA_GEO_BOUNDS = {
  west: 68.05,
  east: 97.42,
  north: 37.12,
  south: 6.72,
  svgWidth: 612,
  svgHeight: 696,
};

/**
 * Converts geographic latitude & longitude (degrees) into a 3D point on a sphere of given radius.
 * Standard Three.js SphereGeometry UV mapping puts:
 *  - +Y = North Pole (+90° lat)
 *  - lon 0° -> phi = pi/2? Let's match SphereGeometry's exact equirectangular UV projection:
 *    u = (lng + 180) / 360  (ranges 0..1)
 *    v = (90 - lat) / 180   (top of canvas to bottom)
 * In Three.js SphereGeometry:
 *    phi = u * 2 * Math.PI
 *    theta = v * Math.PI
 *    x = -r * cos(phi) * sin(theta)
 *    y =  r * cos(theta)
 *    z =  r * sin(phi) * sin(theta)
 * Verified: at lng = 0 (u=0.5, phi=PI): x = +r, z = 0. At lng = +90 (u=0.75, phi=1.5*PI): x = 0, z = -r.
 * Wait: let's double check Three.js SphereGeometry formula:
 * vertex.x = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
 * vertex.y =   radius * Math.cos( thetaStart + v * thetaLength );
 * vertex.z =   radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
 * Using the EXACT inverse matches painted equirectangular textures down to sub-pixel precision!
 */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const u = (lng + 180) / 360;
  const v = (90 - lat) / 180;
  const phi = u * Math.PI * 2;
  const theta = v * Math.PI;

  const sinTheta = Math.sin(theta);
  const x = -radius * Math.cos(phi) * sinTheta;
  const y = radius * Math.cos(theta);
  const z = radius * Math.sin(phi) * sinTheta;

  return new THREE.Vector3(x, y, z);
}

/**
 * Inverse transform from a 3D point near the globe back to geographic lat/lng.
 */
export function vector3ToLatLng(vec: THREE.Vector3): { lat: number; lng: number } {
  const norm = vec.clone().normalize();
  const theta = Math.acos(THREE.MathUtils.clamp(norm.y, -1, 1));
  const lat = 90 - (theta / Math.PI) * 180;

  let phi = Math.atan2(norm.z, -norm.x);
  if (phi < 0) phi += Math.PI * 2;
  const lng = (phi / (Math.PI * 2)) * 360 - 180;

  return { lat, lng };
}

/**
 * Compass label (e.g., "WSW", "SE", "NNE") or numeric degrees -> meteorological bearing in degrees (direction wind blows FROM).
 */
export function windDirToDegrees(dir?: string | number): number {
  if (typeof dir === 'number' && Number.isFinite(dir)) return dir;
  if (!dir) return 225;
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  return map[String(dir).trim().toUpperCase()] ?? 225;
}

export interface SpatialRegionPoint {
  state: StateWeatherData;
  lat: number;
  lng: number;
  code: string;
}

/**
 * Pure join of StateWeatherData records with verified coordinates from indiaRegions.ts.
 * Any state without verified finite coordinates is omitted rather than plotted at a
 * fabricated central-India fallback coordinate.
 */
export function resolveMergedStatePoints(
  states: readonly StateWeatherData[],
  regions: readonly {
    name: string;
    representativeCity: string;
    latitude: number;
    longitude: number;
    code: string;
  }[]
): SpatialRegionPoint[] {
  const points: SpatialRegionPoint[] = [];
  for (const state of states) {
    const norm = state.name.toLowerCase().trim();
    const region = regions.find(
      (r) =>
        r.name.toLowerCase() === norm ||
        r.name.toLowerCase().includes(norm) ||
        norm.includes(r.name.toLowerCase()) ||
        (state.city && r.representativeCity.toLowerCase() === state.city.toLowerCase())
    );
    if (!region || !Number.isFinite(region.latitude) || !Number.isFinite(region.longitude)) {
      continue;
    }
    points.push({
      state,
      lat: region.latitude,
      lng: region.longitude,
      code: region.code || state.id.replace('IN-', ''),
    });
  }
  return points;
}

/**
 * Joins the live-schema StateWeatherData records with verified coordinates from indiaRegions.ts.
 */
export function getMergedStatePoints(): SpatialRegionPoint[] {
  return resolveMergedStatePoints(INDIA_WEATHER_DATA, INDIA_STATES_UTS);
}

/**
 * Color mapping for a state data point according to the active atmospheric layer.
 */
export function getColorForStateLayer(state: StateWeatherData, layer: SpatialLayerId): string {
  switch (layer) {
    case 'conditions': {
      const t = state.temperature;
      if (t >= 35) return '#E27B55';
      if (t >= 31) return '#D98548';
      if (t >= 27) return '#E6B96B';
      if (t >= 22) return '#89977B';
      return '#91B6CC';
    }
    case 'wind': {
      const w = state.windSpeed;
      if (w >= 24) return '#E6B96B';
      if (w >= 16) return '#C5A46D';
      return '#9CAF9A';
    }
    case 'rain':
    case 'radar':
    case 'satellite': {
      const r = state.rainfall;
      if (r >= 25) return '#E6B96B';
      if (r >= 12) return '#78AEB6';
      if (r >= 3) return '#A7C5C5';
      return '#5F6662';
    }
    case 'aqi': {
      const aqi = state.aqi;
      if (aqi <= 50) return '#5C9A79';
      if (aqi <= 100) return '#89977B';
      if (aqi <= 150) return '#D8B14F';
      if (aqi <= 250) return '#D98548';
      return '#C94F4B';
    }
    case 'warnings':
    case 'cyclones': {
      if (state.warningLevel === 'severe') return '#C94F4B';
      if (state.warningLevel === 'alert') return '#D98548';
      if (state.warningLevel === 'watch') return '#D8B14F';
      return '#5C9A79';
    }
    case 'agromet': {
      if (state.humidity >= 82 || state.rainfall >= 18) return '#78AEB6';
      if (state.humidity >= 60) return '#89977B';
      return '#E6B96B';
    }
    default:
      return '#C5A46D';
  }
}

/**
 * Draws simplified surrounding continental silhouettes so India sits convincingly within
 * the Afro-Eurasian landmass and Indian Ocean basin without any external network textures.
 */
function drawSurroundingLandmasses(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const toXY = (lng: number, lat: number): [number, number] => [
    ((lng + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  const drawPoly = (coords: Array<[number, number]>, fill: string, stroke: string) => {
    if (coords.length < 3) return;
    ctx.beginPath();
    coords.forEach(([lng, lat], i) => {
      const [x, y] = toXY(lng, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };

  const landmassFill = '#1A1E1C';
  const landmassStroke = 'rgba(226, 219, 200, 0.16)';

  // Arabian Peninsula + Middle East + Iran/Pakistan/Central Asia landmass connecting smoothly north of India
  drawPoly(
    [
      [34, 32],
      [40, 38],
      [55, 42],
      [75, 46],
      [95, 50],
      [118, 52],
      [135, 42],
      [122, 32],
      [109, 20],
      [104, 2],
      [98, 8],
      [95, 16],
      [91, 22],
      [88, 22],
      [84, 28],
      [78, 34],
      [71, 35],
      [67, 25],
      [61, 25],
      [56, 26],
      [54, 24],
      [59, 22],
      [55, 17],
      [44, 12],
      [39, 21],
      [35, 29],
    ],
    landmassFill,
    landmassStroke
  );

  // Sri Lanka
  drawPoly(
    [
      [79.7, 9.7],
      [81.2, 8.9],
      [81.8, 7.2],
      [80.6, 5.95],
      [79.8, 7.1],
    ],
    '#242A25',
    'rgba(197, 164, 109, 0.30)'
  );

  // East Africa Horn (for Arabian Sea context)
  drawPoly(
    [
      [32, 31],
      [42, 15],
      [51, 11.8],
      [48, 4],
      [40, -5],
      [39, -15],
      [33, -25],
      [20, -34],
      [14, -18],
      [10, 4],
      [-17, 15],
      [-6, 35],
      [10, 37],
      [25, 32],
    ],
    '#151817',
    'rgba(226, 219, 200, 0.12)'
  );

  // Maritime SE Asia / Sumatra / Malay / Borneo
  drawPoly(
    [
      [95, 5.5],
      [100, 3],
      [106, -6],
      [104, -5],
      [99, 1],
    ],
    landmassFill,
    landmassStroke
  );
  drawPoly(
    [
      [109, 2],
      [117, 6],
      [118, -3],
      [110, -3],
    ],
    landmassFill,
    landmassStroke
  );

  // Northern Australia (southern hemisphere edge)
  drawPoly(
    [
      [114, -22],
      [129, -14],
      [142, -11],
      [152, -26],
      [146, -38],
      [130, -32],
      [115, -34],
    ],
    '#151817',
    'rgba(226, 219, 200, 0.12)'
  );

  // Americas & Europe faint global context so rotating full globe remains geographically grounded
  drawPoly(
    [
      [-10, 36],
      [0, 43],
      [8, 54],
      [24, 60],
      [36, 56],
      [40, 42],
      [28, 38],
      [12, 42],
    ],
    '#151817',
    'rgba(226, 219, 200, 0.10)'
  );
  drawPoly(
    [
      [-125, 48],
      [-95, 55],
      [-70, 45],
      [-80, 26],
      [-97, 20],
      [-105, 22],
      [-118, 33],
    ],
    '#151817',
    'rgba(226, 219, 200, 0.10)'
  );
  drawPoly(
    [
      [-78, 9],
      [-60, 5],
      [-36, -6],
      [-48, -24],
      [-65, -42],
      [-74, -50],
      [-72, -18],
      [-80, -4],
    ],
    '#151817',
    'rgba(226, 219, 200, 0.10)'
  );
}

/**
 * Synthesizes crisp equirectangular Earth albedo & elevation bump CanvasTextures
 * featuring real @svg-maps/india state polygons, Indian Ocean bathymetry, and scientific graticules.
 */
export function buildProceduralEarthTextures(): {
  albedoTexture: THREE.CanvasTexture;
  bumpTexture: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  // 1. Deep obsidian ocean base
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0B0C0D');
  oceanGrad.addColorStop(0.35, '#0F1214');
  oceanGrad.addColorStop(0.5, '#121618');
  oceanGrad.addColorStop(0.65, '#0F1214');
  oceanGrad.addColorStop(1, '#0B0C0D');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  bctx.fillStyle = '#141414';
  bctx.fillRect(0, 0, width, height);

  // Subtle bathymetric halo in Bay of Bengal & Arabian Sea
  const indiaCenterX = ((79 + 180) / 360) * width;
  const indiaCenterY = ((90 - 20) / 180) * height;
  const shelfGlow = ctx.createRadialGradient(
    indiaCenterX,
    indiaCenterY,
    24,
    indiaCenterX,
    indiaCenterY,
    210
  );
  shelfGlow.addColorStop(0, 'rgba(167, 197, 197, 0.10)');
  shelfGlow.addColorStop(0.55, 'rgba(137, 151, 123, 0.05)');
  shelfGlow.addColorStop(1, 'rgba(11, 12, 13, 0)');
  ctx.fillStyle = shelfGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Scientific 15-degree graticule grid
  ctx.strokeStyle = 'rgba(226, 219, 200, 0.06)';
  ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 15) {
    const x = ((lng + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Tropic of Cancer subtle warm-brass reference line
  ctx.strokeStyle = 'rgba(197, 164, 109, 0.18)';
  ctx.setLineDash([6, 6]);
  const tropicY = ((90 - 23.437) / 180) * height;
  ctx.beginPath();
  ctx.moveTo(0, tropicY);
  ctx.lineTo(width, tropicY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Surrounding Eurasian / Indian Ocean landmasses
  drawSurroundingLandmasses(ctx, width, height);

  // 4. Crisp @svg-maps/india state polygons aligned to [west..east, south..north]
  const rawIndia: any = (IndiaSvgMap as any)?.default || IndiaSvgMap;
  const locations: Array<{ id: string; name: string; path: string }> = rawIndia?.locations || [];

  const westX = ((INDIA_GEO_BOUNDS.west + 180) / 360) * width;
  const eastX = ((INDIA_GEO_BOUNDS.east + 180) / 360) * width;
  const northY = ((90 - INDIA_GEO_BOUNDS.north) / 180) * height;
  const southY = ((90 - INDIA_GEO_BOUNDS.south) / 180) * height;

  const scaleX = (eastX - westX) / INDIA_GEO_BOUNDS.svgWidth;
  const scaleY = (southY - northY) / INDIA_GEO_BOUNDS.svgHeight;

  if (locations.length > 0 && typeof Path2D !== 'undefined') {
    // Draw onto color canvas
    ctx.save();
    ctx.translate(westX, northY);
    ctx.scale(scaleX, scaleY);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const loc of locations) {
      const p = new Path2D(loc.path);
      ctx.fillStyle = '#2B302C';
      ctx.fill(p);
      ctx.strokeStyle = 'rgba(197, 164, 109, 0.45)';
      ctx.lineWidth = 1.65;
      ctx.stroke(p);
    }
    ctx.restore();

    // Draw elevation relief onto bump canvas (Himalayan highlands brighter -> slight height bump)
    bctx.save();
    bctx.translate(westX, northY);
    bctx.scale(scaleX, scaleY);
    for (const loc of locations) {
      const p = new Path2D(loc.path);
      const isHimalayan = /jammu|ladakh|himachal|uttarakhand|sikkim|arunachal/i.test(loc.name);
      bctx.fillStyle = isHimalayan ? '#B0B0B0' : '#646464';
      bctx.fill(p);
      bctx.strokeStyle = '#888888';
      bctx.lineWidth = 1.2;
      bctx.stroke(p);
    }
    bctx.restore();
  }

  const albedoTexture = new THREE.CanvasTexture(colorCanvas);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  albedoTexture.anisotropy = 4;
  albedoTexture.needsUpdate = true;

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.anisotropy = 4;
  bumpTexture.needsUpdate = true;

  return { albedoTexture, bumpTexture };
}

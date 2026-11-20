// ====================================================================
// MAUSAM 3D Geographically Grounded India Relief Terrain Builder
// Generates a recognisable 3D physiographic model of the Indian
// Subcontinent (Himalayas, Western Ghats, Deccan Plateau, Thar Desert,
// Indo-Gangetic Plain, Coastline, Arabian Sea & Bay of Bengal) using
// authentic @svg-maps/india state paths — zero external 404 assets.
// ====================================================================

import * as THREE from 'three';
import IndiaSvgMap from '@svg-maps/india';

// Geographic projection domain centered over the Indian Subcontinent & adjoining seas
export const TERRAIN_BOUNDS = {
  west: 58.0,
  east: 104.0,
  south: 2.0,
  north: 41.0,
};

// Authentic @svg-maps/india bounding box (viewBox 0 0 612 696)
const INDIA_SVG_BOUNDS = {
  west: 68.05,
  east: 97.42,
  north: 37.12,
  south: 6.72,
  svgWidth: 612,
  svgHeight: 696,
};

// World-space dimensions of the primary subcontinent relief plane
export const WORLD_WIDTH = 36.0;
export const WORLD_DEPTH = 32.0;

// Approximate km-to-world conversion near 21°N (1° lat ≈ 111 km, 1° lon ≈ 103.5 km)
export const KM_TO_WORLD_X = WORLD_WIDTH / ((TERRAIN_BOUNDS.east - TERRAIN_BOUNDS.west) * 103.5);
export const KM_TO_WORLD_Z = WORLD_DEPTH / ((TERRAIN_BOUNDS.north - TERRAIN_BOUNDS.south) * 111.0);

/**
 * Converts geographic (lat, lng) into UV coordinates [0..1] on the terrain plane.
 */
export function latLngToTerrainUV(lat: number, lng: number): { u: number; v: number } {
  const u = (lng - TERRAIN_BOUNDS.west) / (TERRAIN_BOUNDS.east - TERRAIN_BOUNDS.west);
  // v = 0 at north edge (top of canvas), v = 1 at south edge (bottom of canvas)
  const v = (TERRAIN_BOUNDS.north - lat) / (TERRAIN_BOUNDS.north - TERRAIN_BOUNDS.south);
  return { u, v };
}

/**
 * Converts geographic (lat, lng) into Three.js world coordinates (x, y, z).
 * -X = West (Arabian Sea), +X = East (Bay of Bengal), -Z = North (Himalayas), +Z = South (Indian Ocean)
 */
export function latLngToTerrain(
  lat: number,
  lng: number,
  altitudeOffset = 0,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const { u, v } = latLngToTerrainUV(lat, lng);
  const x = (u - 0.5) * WORLD_WIDTH;
  const z = (v - 0.5) * WORLD_DEPTH;
  const y = getTerrainElevation(lat, lng) + altitudeOffset;
  return out.set(x, y, z);
}

/**
 * Inverse transform from world (x, z) back to approximate geographic (lat, lng).
 */
export function terrainToLatLng(x: number, z: number): { lat: number; lng: number } {
  const u = x / WORLD_WIDTH + 0.5;
  const v = z / WORLD_DEPTH + 0.5;
  const lng = TERRAIN_BOUNDS.west + u * (TERRAIN_BOUNDS.east - TERRAIN_BOUNDS.west);
  const lat = TERRAIN_BOUNDS.north - v * (TERRAIN_BOUNDS.north - TERRAIN_BOUNDS.south);
  return { lat, lng };
}

// Smooth Gaussian helper for physiographic relief modeling
function gaussian2D(
  lat: number,
  lng: number,
  cLat: number,
  cLng: number,
  sLat: number,
  sLng: number
): number {
  const dLat = (lat - cLat) / sLat;
  const dLng = (lng - cLng) / sLng;
  return Math.exp(-0.5 * (dLat * dLat + dLng * dLng));
}

// Cached rasterized India landmass mask (512x512) for fast exact coast & elevation queries
let cachedMaskData: Uint8ClampedArray | null = null;
const MASK_SIZE = 512;

function ensureIndiaLandMask(): Uint8ClampedArray {
  if (cachedMaskData) return cachedMaskData;

  const canvas = document.createElement('canvas');
  canvas.width = MASK_SIZE;
  canvas.height = MASK_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);

  // Subtle soft continental shelf blur pass first, then crisp landmass fill
  const drawIndiaPaths = (fill: string, blurPx: number) => {
    ctx.save();
    if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;

    const { u: uMin, v: vMin } = latLngToTerrainUV(INDIA_SVG_BOUNDS.north, INDIA_SVG_BOUNDS.west);
    const { u: uMax, v: vMax } = latLngToTerrainUV(INDIA_SVG_BOUNDS.south, INDIA_SVG_BOUNDS.east);

    const x0 = uMin * MASK_SIZE;
    const y0 = vMin * MASK_SIZE;
    const drawW = (uMax - uMin) * MASK_SIZE;
    const drawH = (vMax - vMin) * MASK_SIZE;

    ctx.translate(x0, y0);
    ctx.scale(drawW / INDIA_SVG_BOUNDS.svgWidth, drawH / INDIA_SVG_BOUNDS.svgHeight);
    ctx.fillStyle = fill;

    const locations = (IndiaSvgMap as any)?.locations || [];
    for (const loc of locations) {
      if (!loc?.path) continue;
      try {
        const path2d = new Path2D(loc.path);
        ctx.fill(path2d);
      } catch {
        // Skip malformed path
      }
    }
    ctx.restore();
  };

  // Draw neighbouring Sri Lanka silhouette for geographic grounding
  const drawPolyMask = (coords: Array<[number, number]>, fill: string) => {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    coords.forEach(([lng, lat], idx) => {
      const { u, v } = latLngToTerrainUV(lat, lng);
      const px = u * MASK_SIZE;
      const py = v * MASK_SIZE;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Faint northern Eurasian / Tibetan plateau context (stored in G channel so India stays distinct in R channel)
  drawPolyMask(
    [
      [58, 41],
      [104, 41],
      [104, 20],
      [98, 16],
      [92, 22],
      [88, 22],
      [84, 27],
      [78, 32],
      [71, 34],
      [67, 25],
      [61, 25],
      [58, 26],
    ],
    'rgb(0, 145, 0)'
  );

  // Sri Lanka (stored in G channel + slight R)
  drawPolyMask(
    [
      [80.0, 9.8],
      [81.8, 8.2],
      [81.8, 6.2],
      [80.5, 5.9],
      [79.7, 7.2],
      [79.8, 9.1],
    ],
    'rgb(110, 170, 0)'
  );

  // India primary landmass in R channel (soft halo + solid interior)
  drawIndiaPaths('rgb(120, 0, 0)', 3);
  drawIndiaPaths('rgb(255, 0, 0)', 0);

  cachedMaskData = ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
  return cachedMaskData;
}

function sampleMask(lat: number, lng: number): { india: number; neighbor: number } {
  const data = ensureIndiaLandMask();
  const { u, v } = latLngToTerrainUV(lat, lng);
  if (u < 0 || u > 1 || v < 0 || v > 1) return { india: 0, neighbor: 0 };
  const px = Math.min(MASK_SIZE - 1, Math.max(0, Math.round(u * (MASK_SIZE - 1))));
  const py = Math.min(MASK_SIZE - 1, Math.max(0, Math.round(v * (MASK_SIZE - 1))));
  const idx = (py * MASK_SIZE + px) * 4;
  return {
    india: data[idx] / 255,
    neighbor: data[idx + 1] / 255,
  };
}

/**
 * Deterministic physiographic elevation function for the Indian Subcontinent.
 * Produces recognisable Himalayas, Western Ghats, Deccan Plateau, Eastern Ghats,
 * Vindhya-Satpura ranges, Aravallis, and Indo-Gangetic plains cleanly grounded above ocean.
 */
export function getTerrainElevation(lat: number, lng: number): number {
  const { india, neighbor } = sampleMask(lat, lng);
  const landWeight = Math.max(india, neighbor * 0.45);
  if (landWeight < 0.05) return 0;

  // Base coastal elevation shelf (gives crisp peninsula silhouette above ocean)
  let h = 0.14 * india + 0.07 * neighbor * (1 - india);

  // 1. Himalayan & Karakoram Arc (West Ladakh/J&K -> HP/UK -> Sikkim -> Arunachal)
  const himalayaWest = gaussian2D(lat, lng, 34.4, 76.2, 2.3, 3.6) * 1.38;
  const himalayaCentral = gaussian2D(lat, lng, 30.8, 79.8, 1.8, 3.8) * 1.22;
  const himalayaEast = gaussian2D(lat, lng, 28.2, 88.2, 1.6, 4.4) * 1.15;
  const arunachalRidge = gaussian2D(lat, lng, 28.5, 94.8, 1.7, 2.6) * 1.05;

  // 2. Western Ghats Escarpment (Sahyadri -> Nilgiris -> Cardamom Hills)
  const ghatsNorth = gaussian2D(lat, lng, 18.2, 73.7, 2.5, 0.85) * 0.44;
  const ghatsMid = gaussian2D(lat, lng, 13.8, 75.3, 2.4, 0.85) * 0.48;
  const nilgiris = gaussian2D(lat, lng, 10.6, 76.9, 1.7, 0.95) * 0.54;

  // 3. Deccan Plateau Tableland
  const deccan = gaussian2D(lat, lng, 17.0, 77.2, 4.2, 3.4) * 0.28;

  // 4. Central Indian Ranges (Vindhya / Satpura / Chota Nagpur) & Aravalli
  const centralHighlands = gaussian2D(lat, lng, 22.8, 79.8, 2.1, 4.2) * 0.24;
  const aravalli = gaussian2D(lat, lng, 25.4, 73.6, 2.3, 1.1) * 0.22;

  // 5. Eastern Ghats & Northeast Hills (Meghalaya Plateau / Patkai)
  const easternGhats = gaussian2D(lat, lng, 18.6, 82.8, 2.6, 1.2) * 0.26;
  const northeastHills = gaussian2D(lat, lng, 25.4, 92.6, 1.7, 2.0) * 0.42;

  // Subtle deterministic micro-relief ridge modulation (never noisy)
  const micro =
    0.03 *
    (Math.sin(lat * 2.1 + lng * 1.4) * 0.5 + 0.5) *
    (Math.cos(lng * 1.7 - lat * 1.2) * 0.5 + 0.5);

  const relief =
    himalayaWest +
    himalayaCentral +
    himalayaEast +
    arunachalRidge +
    ghatsNorth +
    ghatsMid +
    nilgiris +
    deccan +
    centralHighlands +
    aravalli +
    easternGhats +
    northeastHills +
    micro;

  // Keep Indo-Gangetic plain visibly recessed below the Himalayan foothills
  const gangeticTrough = gaussian2D(lat, lng, 26.4, 82.0, 1.9, 5.2) * 0.14;

  h += Math.max(0, relief - gangeticTrough) * (0.45 + 0.55 * india);
  return Math.max(0.02 * landWeight, h * landWeight);
}

/**
 * Generates the high-resolution procedural Observatory Albedo Texture (SRGB)
 * featuring deep ocean bathymetry, terrain shading, authentic @svg-maps/india
 * state boundaries, glacial cyan coastline, graticule, and geographic labels.
 */
export function buildIndiaObservatoryTexture(
  resolution: 1024 | 2048 = 2048,
  maxAnisotropy = 8
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;

  const toXY = (lat: number, lng: number): [number, number] => {
    const { u, v } = latLngToTerrainUV(lat, lng);
    return [u * resolution, v * resolution];
  };

  // 1. Deep Ocean Gradient (Explore Palette: #071A2B -> #0B2338)
  const oceanGrad = ctx.createRadialGradient(
    resolution * 0.5,
    resolution * 0.52,
    resolution * 0.08,
    resolution * 0.5,
    resolution * 0.5,
    resolution * 0.72
  );
  oceanGrad.addColorStop(0, '#0C263D');
  oceanGrad.addColorStop(0.55, '#081D30');
  oceanGrad.addColorStop(1, '#061524');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, resolution, resolution);

  // 2. Subtle Lat/Lon Graticule Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(85, 216, 242, 0.08)';
  ctx.lineWidth = Math.max(1, resolution / 1400);
  for (let lat = 5; lat <= 40; lat += 5) {
    const [, y] = toXY(lat, TERRAIN_BOUNDS.west);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(resolution, y);
    ctx.stroke();
  }
  for (let lng = 60; lng <= 100; lng += 5) {
    const [x] = toXY(TERRAIN_BOUNDS.north, lng);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, resolution);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Surrounding Continental Context (Muted Deep Slate)
  const drawPoly = (coords: Array<[number, number]>, fill: string, stroke: string) => {
    ctx.save();
    ctx.beginPath();
    coords.forEach(([lng, lat], i) => {
      const [x, y] = toXY(lat, lng);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, resolution / 1100);
    ctx.stroke();
    ctx.restore();
  };

  // Surrounding Eurasian landmass (quiet background context)
  drawPoly(
    [
      [58, 41],
      [104, 41],
      [104, 18],
      [98, 15],
      [92, 22],
      [88, 22],
      [84, 27],
      [78, 32],
      [71, 34],
      [67, 25],
      [61, 25],
      [58, 26],
    ],
    '#0E2233',
    'rgba(85, 216, 242, 0.14)'
  );

  // Sri Lanka
  drawPoly(
    [
      [80.0, 9.8],
      [81.8, 8.2],
      [81.8, 6.2],
      [80.5, 5.9],
      [79.7, 7.2],
      [79.8, 9.1],
    ],
    '#1A3346',
    'rgba(85, 216, 242, 0.28)'
  );

  // 4. Authentic India Subcontinent SVG Layer with Continental Shelf Halo & Physiographic Shading
  const { u: uMin, v: vMin } = latLngToTerrainUV(INDIA_SVG_BOUNDS.north, INDIA_SVG_BOUNDS.west);
  const { u: uMax, v: vMax } = latLngToTerrainUV(INDIA_SVG_BOUNDS.south, INDIA_SVG_BOUNDS.east);
  const x0 = uMin * resolution;
  const y0 = vMin * resolution;
  const drawW = (uMax - uMin) * resolution;
  const drawH = (vMax - vMin) * resolution;
  const scaleX = drawW / INDIA_SVG_BOUNDS.svgWidth;
  const scaleY = drawH / INDIA_SVG_BOUNDS.svgHeight;

  const locations = (IndiaSvgMap as any)?.locations || [];
  const path2ds: Path2D[] = [];
  for (const loc of locations) {
    if (!loc?.path) continue;
    try {
      path2ds.push(new Path2D(loc.path));
    } catch {
      // Ignore invalid SVG paths
    }
  }

  // 4a. Soft glacial cyan continental shelf glow around India's coast
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(scaleX, scaleY);
  ctx.shadowColor = 'rgba(85, 216, 242, 0.42)';
  ctx.shadowBlur = resolution * 0.018;
  ctx.fillStyle = '#244154';
  for (const p of path2ds) ctx.fill(p);
  ctx.restore();

  // 4b. Clip inside India silhouette to paint physiographic shading (Himalayas, Thar, Deccan, Ghats)
  ctx.save();
  ctx.beginPath();
  ctx.translate(x0, y0);
  ctx.scale(scaleX, scaleY);
  // Paint base terrain slate (#315165 -> #45677A)
  const landGrad = ctx.createLinearGradient(0, 0, 0, INDIA_SVG_BOUNDS.svgHeight);
  landGrad.addColorStop(0, '#5B7C90'); // Northern alpine foothills
  landGrad.addColorStop(0.28, '#395A6E'); // Indo-Gangetic plain
  landGrad.addColorStop(0.62, '#45677A'); // Deccan slate
  landGrad.addColorStop(1, '#36586C'); // Southern peninsula
  ctx.fillStyle = landGrad;
  for (const p of path2ds) ctx.fill(p);
  ctx.restore();

  // Helper to paint soft regional terrain tint masked naturally onto India
  const paintTerrainHighlight = (
    lat: number,
    lng: number,
    radiusFrac: number,
    innerColor: string
  ) => {
    const [cx, cy] = toXY(lat, lng);
    const r = radiusFrac * resolution;
    const g = ctx.createRadialGradient(cx, cy, r * 0.06, cx, cy, r);
    g.addColorStop(0, innerColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Apply subtle physiographic accents inside India bounds
  ctx.save();
  // Thar Desert warm highlight (#B8A77A)
  paintTerrainHighlight(26.8, 71.8, 0.09, 'rgba(184, 167, 122, 0.34)');
  // Deccan Plateau warm ochre-slate highlight
  paintTerrainHighlight(17.5, 76.8, 0.13, 'rgba(184, 167, 122, 0.22)');
  // Western Ghats emerald-slate ridge
  paintTerrainHighlight(14.5, 75.0, 0.075, 'rgba(53, 201, 138, 0.18)');
  paintTerrainHighlight(10.5, 76.8, 0.055, 'rgba(53, 201, 138, 0.18)');
  // Himalayan snow-ice crest (#EAF5FA)
  paintTerrainHighlight(34.3, 76.2, 0.085, 'rgba(234, 245, 250, 0.42)');
  paintTerrainHighlight(31.0, 79.4, 0.075, 'rgba(234, 245, 250, 0.36)');
  paintTerrainHighlight(28.0, 88.5, 0.065, 'rgba(234, 245, 250, 0.30)');
  paintTerrainHighlight(28.4, 94.6, 0.06, 'rgba(234, 245, 250, 0.30)');
  ctx.restore();

  // 4c. Crisp State Boundaries & Coastline Outline
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(scaleX, scaleY);
  ctx.strokeStyle = 'rgba(139, 230, 255, 0.34)';
  ctx.lineWidth = 1.05;
  ctx.lineJoin = 'round';
  for (const p of path2ds) ctx.stroke(p);
  ctx.restore();

  // 5. Refined Cartographic Geographic Labels (Ocean Basins & Physiography)
  const drawMapLabel = (
    text: string,
    lat: number,
    lng: number,
    fontSizePx: number,
    color: string,
    letterSpacing = 0.22
  ) => {
    const [x, y] = toXY(lat, lng);
    ctx.save();
    ctx.font = `600 ${fontSizePx}px "IBM Plex Mono", "Inter", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Render spaced uppercase cartographic text
    const spaced = letterSpacing > 0 ? text.split('').join(' ') : text;
    ctx.fillText(spaced, x, y);
    ctx.restore();
  };

  const scaleF = resolution / 2048;
  drawMapLabel('ARABIAN SEA', 15.2, 66.8, Math.round(24 * scaleF), 'rgba(130, 175, 205, 0.42)');
  drawMapLabel('BAY OF BENGAL', 15.2, 88.8, Math.round(24 * scaleF), 'rgba(130, 175, 205, 0.42)');
  drawMapLabel('INDIAN OCEAN', 5.2, 78.2, Math.round(24 * scaleF), 'rgba(130, 175, 205, 0.34)');
  drawMapLabel('HIMALAYAS', 31.8, 80.5, Math.round(17 * scaleF), 'rgba(234, 245, 250, 0.62)');
  drawMapLabel('DECCAN PLATEAU', 16.8, 77.6, Math.round(14 * scaleF), 'rgba(234, 245, 250, 0.44)');
  drawMapLabel('WESTERN GHATS', 13.5, 73.2, Math.round(13 * scaleF), 'rgba(139, 230, 255, 0.48)');

  // Coordinate edge ticks (subtle scientific telemetry markers)
  ctx.save();
  ctx.font = `500 ${Math.round(14 * scaleF)}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = 'rgba(130, 153, 170, 0.38)';
  for (const lat of [10, 20, 30]) {
    const [, y] = toXY(lat, TERRAIN_BOUNDS.west);
    ctx.fillText(`${lat}°N`, 22 * scaleF, y - 6 * scaleF);
  }
  for (const lng of [70, 80, 90]) {
    const [x] = toXY(TERRAIN_BOUNDS.south, lng);
    ctx.fillText(`${lng}°E`, x + 6 * scaleF, resolution - 18 * scaleF);
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 16);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the displaced 3D relief PlaneGeometry for India + adjoining seas.
 * Segments adapt cleanly to quality tier (High: 168, Balanced: 112, Low: 64).
 */
export function buildIndiaTerrainGeometry(segments = 112): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const { lat, lng } = terrainToLatLng(x, z);
    const y = getTerrainElevation(lat, lng);
    pos.setY(i, y);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

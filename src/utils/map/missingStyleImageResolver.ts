// ====================================================================
// MAUSAM - MapLibre Missing Style Image Resolver
// Intercepts missing sprite image requests (specifically OpenFreeMap's
// 'circle-11' symbol sprite) immediately after MapLibre initialization
// and supplies a locally generated 22x22 retina (pixelRatio: 2)
// champagne-gold halo beacon matching MAUSAM's observatory aesthetic.
// ====================================================================

import type { Map as MapLibreMap } from 'maplibre-gl';

export const MISSING_CIRCLE_ICON_ID = 'circle-11';
export const GOLD_HALO_ICON_SIZE = 22;
export const GOLD_HALO_ICON_PIXEL_RATIO = 2;

export interface RawStyleImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

let cachedGoldHaloIcon: RawStyleImageData | null = null;

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generates a crisp anti-aliased 22x22 RGBA pixel buffer representing a
 * MAUSAM champagne-gold halo beacon (11x11 logical px at pixelRatio 2):
 *  - Outer translucent gold halo (#E6B96B) with delicate perimeter ring
 *  - Dark obsidian separation ring (#15191A) for high legibility on any terrain
 *  - Luminous champagne-gold core (#F5D89E -> #C5A46D)
 */
export function createGoldHaloIconData(
  size: number = GOLD_HALO_ICON_SIZE
): RawStyleImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = (size - 1) / 2;
  const scale = size / GOLD_HALO_ICON_SIZE;

  const haloOuterR = 10.2 * scale;
  const ringMidR = 8.7 * scale;
  const ringHalfW = 0.7 * scale;
  const strokeOuterR = 6.0 * scale;
  const coreR = 4.5 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.hypot(dx, dy);

      // Composite layers from back to front using standard straight-alpha over
      let outR = 0;
      let outG = 0;
      let outB = 0;
      let outA = 0;

      const blendOver = (sr: number, sg: number, sb: number, sa: number) => {
        if (sa <= 0) return;
        const clampedA = Math.max(0, Math.min(1, sa));
        const inv = 1 - clampedA;
        const nextA = clampedA + outA * inv;
        if (nextA > 0) {
          outR = (sr * clampedA + outR * outA * inv) / nextA;
          outG = (sg * clampedA + outG * outA * inv) / nextA;
          outB = (sb * clampedA + outB * outA * inv) / nextA;
          outA = nextA;
        }
      };

      // 1. Soft radial champagne-gold atmospheric halo (#E6B96B)
      if (dist <= haloOuterR) {
        const haloFalloff = 1 - smoothstep(strokeOuterR * 0.85, haloOuterR, dist);
        blendOver(230, 185, 107, 0.32 * haloFalloff);
      }

      // 2. Delicate perimeter ring (#E6B96B)
      const ringDist = Math.abs(dist - ringMidR);
      if (ringDist <= ringHalfW + 0.85 * scale) {
        const ringAlpha = 1 - smoothstep(ringHalfW * 0.45, ringHalfW + 0.85 * scale, ringDist);
        blendOver(230, 185, 107, 0.56 * ringAlpha);
      }

      // 3. Crisp dark obsidian separation stroke (#15191A)
      if (dist <= strokeOuterR + 0.85 * scale) {
        const strokeAlpha = 1 - smoothstep(strokeOuterR - 0.65 * scale, strokeOuterR + 0.85 * scale, dist);
        blendOver(21, 25, 26, 0.94 * strokeAlpha);
      }

      // 4. Champagne-gold center dot (#F5D89E highlight -> #C5A46D rim)
      if (dist <= coreR + 0.75 * scale) {
        const coreAlpha = 1 - smoothstep(coreR - 0.65 * scale, coreR + 0.75 * scale, dist);
        const t = Math.max(0, Math.min(1, dist / Math.max(coreR, 0.001)));
        const coreRCh = 245 + (197 - 245) * t;
        const coreGCh = 216 + (164 - 216) * t;
        const coreBCh = 158 + (109 - 158) * t;
        blendOver(coreRCh, coreGCh, coreBCh, coreAlpha);
      }

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(outR);
      data[idx + 1] = Math.round(outG);
      data[idx + 2] = Math.round(outB);
      data[idx + 3] = Math.round(Math.max(0, Math.min(1, outA)) * 255);
    }
  }

  return { width: size, height: size, data };
}

/**
 * Returns the memoized 22x22 MAUSAM gold-halo RGBA icon buffer so repeated
 * style reloads never reallocate pixel buffers.
 */
export function getGoldHaloIconData(): RawStyleImageData {
  if (!cachedGoldHaloIcon) {
    cachedGoldHaloIcon = createGoldHaloIconData(GOLD_HALO_ICON_SIZE);
  }
  return cachedGoldHaloIcon;
}

/**
 * Determines whether a missing sprite ID should be resolved with MAUSAM's
 * local gold-halo circular icon.
 */
export function shouldResolveWithGoldHaloIcon(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const normalized = id.trim().toLowerCase();
  return (
    normalized === MISSING_CIRCLE_ICON_ID ||
    normalized.startsWith('circle-') ||
    normalized.startsWith('dot-')
  );
}

/**
 * Registers MapLibre GL JS's `map.setMissingStyleImageResolver` immediately
 * after map creation so missing `'circle-11'` (and related dot/circle sprite)
 * requests resolve locally to MAUSAM's 22x22 champagne-gold halo beacon.
 *
 * Returns a cleanup callback that clears the resolver when the map unmounts.
 */
export function registerMissingStyleImageResolver(map: MapLibreMap): () => void {
  const resolveImage = (id: string) => {
    if (!shouldResolveWithGoldHaloIcon(id)) return;
    try {
      if (typeof map.hasImage === 'function' && map.hasImage(id)) return;
      map.addImage(id, getGoldHaloIconData(), {
        pixelRatio: GOLD_HALO_ICON_PIXEL_RATIO,
      });
    } catch {
      // Ignore transient style teardown races during map unmount
    }
  };

  if (typeof map.setMissingStyleImageResolver === 'function') {
    map.setMissingStyleImageResolver(resolveImage);
    return () => {
      try {
        map.setMissingStyleImageResolver(null);
      } catch {
        // Ignore if map is already removed
      }
    };
  }

  // Fallback for older MapLibre runtimes without setMissingStyleImageResolver
  const onStyleImageMissing = (ev: { id?: string }) => {
    if (ev?.id) resolveImage(ev.id);
  };
  map.on('styleimagemissing', onStyleImageMissing);
  return () => {
    try {
      map.off('styleimagemissing', onStyleImageMissing);
    } catch {
      // Ignore if map is already removed
    }
  };
}

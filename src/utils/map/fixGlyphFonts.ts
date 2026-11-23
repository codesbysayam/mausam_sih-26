// ====================================================================
// MAUSAM - MapLibre / OpenFreeMap Glyph Font Normalizer
// OpenFreeMap Dark & Fiord styles serve Noto Sans Regular glyphs at:
//   https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf
// If any text-bearing symbol layer omits `text-font` (or specifies
// Open Sans / Arial Unicode MS), MapLibre requests a nonexistent
// combined fontstack and logs repeated HTTP 404 glyph errors.
// This utility audits every symbol layer and enforces Noto Sans Regular.
// ====================================================================

import type { Map as MapLibreMap } from 'maplibre-gl';

export const OPENFREEMAP_GLYPHS_URL =
  'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export const MAUSAM_MAP_FONT: string[] = ['Noto Sans Regular'];

export function isValidMausamFontStack(textFont: unknown): boolean {
  return (
    Array.isArray(textFont) &&
    textFont.length === 1 &&
    textFont[0] === 'Noto Sans Regular'
  );
}

/**
 * Inspects all symbol layers currently loaded in a MapLibre style and
 * normalizes `text-font` to `["Noto Sans Regular"]` for every text-bearing
 * layer. Skips icon-only symbol layers and layers already correctly configured.
 *
 * Returns the number of layers updated (useful for diagnostics & unit tests).
 */
export function fixMapGlyphFonts(map: MapLibreMap): number {
  const style = map.getStyle();
  if (!style || !Array.isArray(style.layers)) return 0;

  let updatedCount = 0;

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;

    const layout = (layer as { layout?: Record<string, unknown> }).layout;
    // Icon-only symbol layers do not request text glyph ranges.
    if (!layout || !('text-field' in layout) || layout['text-field'] == null) {
      continue;
    }

    const currentFont = layout['text-font'];
    if (isValidMausamFontStack(currentFont)) continue;

    try {
      map.setLayoutProperty(layer.id, 'text-font', [...MAUSAM_MAP_FONT]);
      updatedCount += 1;
    } catch {
      // Ignore if a transient style mutation removed the layer mid-iteration
    }
  }

  return updatedCount;
}

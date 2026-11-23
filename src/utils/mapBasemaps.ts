/**
 * MAUSAM Verified Zero-Key Basemap Registry
 * Supports Dark Observatory, Clean Light, Satellite Imagery, and Topographic Terrain
 * using verified no-key public tile endpoints with automatic failover to OpenStreetMap.
 */

export type BasemapStyleId = 'dark' | 'light' | 'satellite' | 'terrain';

export interface BasemapLayerSpec {
  id: 'esri-dark-gray' | 'esri-light-gray' | 'esri-satellite' | 'esri-topo' | 'osm-dark-fallback';
  styleId: BasemapStyleId;
  name: string;
  shortLabel: string;
  baseUrl: string;
  referenceUrl?: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string | string[];
  className?: string;
  isLightSurface?: boolean;
}

export const BASEMAP_STYLES: Record<BasemapStyleId, BasemapLayerSpec> = {
  dark: {
    id: 'esri-dark-gray',
    styleId: 'dark',
    name: 'Esri Dark Gray Observatory',
    shortLabel: 'Dark',
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors',
    maxZoom: 16,
    className: 'mausam-esri-dark-tiles',
    isLightSurface: false,
  },
  light: {
    id: 'esri-light-gray',
    styleId: 'light',
    name: 'Esri Light Cartographic',
    shortLabel: 'Light',
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, &copy; OpenStreetMap contributors',
    maxZoom: 16,
    className: 'mausam-esri-light-tiles',
    isLightSurface: true,
  },
  satellite: {
    id: 'esri-satellite',
    styleId: 'satellite',
    name: 'Esri World Satellite Imagery',
    shortLabel: 'Satellite',
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    referenceUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, IGN, IGP, GIS User Community',
    maxZoom: 17,
    className: 'mausam-esri-satellite-tiles',
    isLightSurface: false,
  },
  terrain: {
    id: 'esri-topo',
    styleId: 'terrain',
    name: 'Esri World Topographic Terrain',
    shortLabel: 'Terrain',
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, Intermap, USGS, METI/NASA, &copy; OpenStreetMap contributors',
    maxZoom: 17,
    className: 'mausam-esri-topo-tiles',
    isLightSurface: true,
  },
};

export const BASEMAP_STYLE_ORDER: readonly BasemapStyleId[] = [
  'dark',
  'satellite',
  'terrain',
  'light',
] as const;

export const PRIMARY_OBSERVATORY_BASEMAP: BasemapLayerSpec = BASEMAP_STYLES.dark;

export const FALLBACK_OSM_BASEMAP: BasemapLayerSpec = {
  id: 'osm-dark-fallback',
  styleId: 'dark',
  name: 'OpenStreetMap Standard (Automatic Failover)',
  shortLabel: 'OSM Fallback',
  baseUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 18,
  className: 'mausam-osm-dark-tiles',
  isLightSurface: false,
};

export function resolveBasemapSpec(
  styleId: BasemapStyleId,
  useFallback: boolean
): BasemapLayerSpec {
  if (useFallback) {
    return {
      ...FALLBACK_OSM_BASEMAP,
      styleId,
      className: styleId === 'light' || styleId === 'terrain' ? '' : 'mausam-osm-dark-tiles',
      isLightSurface: styleId === 'light' || styleId === 'terrain',
    };
  }
  return BASEMAP_STYLES[styleId] ?? PRIMARY_OBSERVATORY_BASEMAP;
}

export const INDIA_GEOGRAPHIC_BOUNDS: [[number, number], [number, number]] = [
  [6.2, 67.5],
  [36.5, 97.6],
];

export const NORTH_INDIAN_OCEAN_BOUNDS: [[number, number], [number, number]] = [
  [5.0, 64.0],
  [26.5, 96.5],
];
